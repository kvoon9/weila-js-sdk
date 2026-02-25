import opus from './opus';
import { WLAudioPlayerEvent } from './weila_audio_data';
import CompoUint8Array from './weila_compositor_array';
import { WeilaRingBuffer } from './weila_ringbuffer';
import { getLogger } from 'log/weila_log';

const wllog = getLogger('AUDIO:play_worker:info');
const wlerr = getLogger('AUDIO:play_worker:err');

const PLAY_OPENING = 0;
const PLAY_OPENED = 1;
const PLAY_CLOSING = 2;
const PLAY_CLOSED = 3;
const PLAY_STARTING = 4;
const PLAY_STARTED = 5;
const PLAY_PAUSING = 6;
const PLAY_PAUSED = 7;
const PLAY_RESUMING = 8;
const PLAY_STOPPING = 9;
const PLAY_STOPPED = 10;

class WLPlayerWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    this.opusModule = null;
    this.decoder = null;
    this.pcmBuffer = 0;
    this.decoder = 0;
    this.encodedData = 0;
    this.sampleRate = 16000;
    this.processFrameCount = Math.ceil(this.sampleRate / 50);
    this.port.onmessage = this.onMessage.bind(this);
    this.wasmData = options.processorOptions.wasmData;
    this.pcmRingBuffer = null;
    this.caching = true;
    this.noMoreData = true;
    this.state = PLAY_CLOSED;
    this.encodedDataList = [];
    this.workerName = '';
    this.playerType = options.processorOptions.playerType;

    wllog('worker name:%s playerType:%d', options.processorOptions.workerName, this.playerType);
  }

  reportRsp(event, result, errorMsg) {
    this.sendEvent(event, { playerType: this.playerType, result: result, errorMsg: errorMsg });
  }

  sendEvent(event, data) {
    this.port.postMessage({ playerType: this.playerType, event: event, data: data });
  }

  reset() {
    if (this.decoder) {
      this.opusModule._Opus_destroyDecoder(this.decoder);
      this.decoder = 0;
    }

    if (this.pcmBuffer) {
      this.opusModule._free(this.pcmBuffer);
      this.pcmBuffer = 0;
    }

    if (this.encodedData) {
      this.opusModule._free(this.encodedData);
      this.encodedData = 0;
    }

    this.opusModule = null;
    this.pcmRingBuffer = null;
    this.encodedDataList = null;
  }

  decodeOpus() {
    if (this.decoder === 0 || this.pcmBuffer === 0) {
      return;
    }

    while (this.encodedDataList.length > 0) {
      const encodedData = this.encodedDataList.shift();
      this.opusModule.writeArrayToMemory(encodedData, this.encodedData);
      const frameCount = this.opusModule._Opus_decode(
        this.decoder,
        this.encodedData,
        encodedData.length,
        this.pcmBuffer,
        this.processFrameCount * 2,
      );

      if (frameCount) {
        const pcmArray = new Int16Array(this.opusModule.HEAP16.buffer, this.pcmBuffer, frameCount);
        let pcmBuf = Float32Array.from(pcmArray);
        pcmBuf = pcmBuf.map((value) => {
          return value / 32768;
        });

        if (this.pcmRingBuffer) {
          this.pcmRingBuffer.push(pcmBuf);
        }
      }
    }
  }

  onMessage(event) {
    const ev = event.data;
    wllog('worklet 执行事件:%d 播放器类型:%d', ev.event, this.playerType);
    switch (ev.event) {
      case WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_REQ:
        {
          this.sampleRate = ev.data.sampleRate; // sample rate
          this.processFrameCount = Math.ceil(this.sampleRate / 50);
          this.pcmRingBuffer = new WeilaRingBuffer(this.sampleRate * 80, true);
          this.caching = true;
          this.noMoreData = false;
          this.state = PLAY_OPENING;

          if (this.opusModule == null) {
            const Module = {};
            Module['wasmBinary'] = this.wasmData;
            opus(Module)
              .then((value) => {
                if (this.state === PLAY_CLOSING) {
                  this.reset();
                  this.reportRsp(
                    WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_RSP,
                    false,
                    '编码器初始化失败',
                  );
                  return;
                }

                this.opusModule = value;
                this.decoder = this.opusModule._Opus_initDecoder(this.sampleRate, 1);
                if (!this.decoder) {
                  this.reportRsp(
                    WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_RSP,
                    false,
                    '编码器初始化失败',
                  );
                  this.reset();
                  this.state = PLAY_CLOSED;
                  return;
                }

                this.pcmBuffer = this.opusModule._malloc(
                  this.processFrameCount * Int16Array.BYTES_PER_ELEMENT * 2,
                );
                if (!this.pcmBuffer) {
                  this.reportRsp(
                    WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_RSP,
                    false,
                    '申请缓存内存失败',
                  );
                  this.reset();
                  this.state = PLAY_CLOSED;
                  return;
                }

                this.encodedData = this.opusModule._malloc(256);
                if (!this.encodedData) {
                  this.reportRsp(
                    WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_RSP,
                    false,
                    '申请编码内存失败',
                  );
                  this.reset();
                  this.state = PLAY_CLOSED;
                  return;
                }

                this.reportRsp(WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_RSP, true);
                this.state = PLAY_OPENED;
              })
              .catch((reason) => {
                this.reportRsp(
                  WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_RSP,
                  false,
                  '出现异常:' + reason,
                );
                this.reset();
                this.state = PLAY_CLOSED;
              });
          } else {
            this.reportRsp(WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_RSP, true);
            this.state = PLAY_OPENED;
          }
        }
        break;

      case WLAudioPlayerEvent.WL_WORKLET_NODE_PUT_DATA:
        {
          if (this.state === PLAY_CLOSED || this.state === PLAY_CLOSING) {
            break;
          }

          const arrayBuffer = ev.data.buffer; // event
          const lengthList = ev.data.lengthList;

          if (arrayBuffer) {
            const compoArray = new CompoUint8Array(new Uint8Array(arrayBuffer), lengthList);
            const arrayList = compoArray.parseArrayList();

            if (arrayList) {
              arrayList.forEach((value) => {
                this.encodedDataList.push(value);
              });
            }
          }

          this.decodeOpus();
        }
        break;

      case WLAudioPlayerEvent.WL_WORKLET_NODE_END_DATA:
        {
          this.noMoreData = true;
          this.caching = false;
        }
        break;

      case WLAudioPlayerEvent.WL_WORKLET_NODE_CLEAR_CUR:
        {
          this.pcmRingBuffer.clear();
          this.encodedDataList.splice(0, this.encodedDataList.length);
          this.noMoreData = true;
        }
        break;

      case WLAudioPlayerEvent.WL_WORKLET_NODE_START_REQ:
        {
          this.state = PLAY_STARTING;
          this.caching = true;
          this.noMoreData = false;
          this.pcmRingBuffer.clear();
          this.encodedDataList = [];
        }
        break;

      case WLAudioPlayerEvent.WL_WORKLET_NODE_PAUSE_REQ:
        {
          this.state = PLAY_PAUSING;
        }
        break;

      case WLAudioPlayerEvent.WL_WORKLET_NODE_RESUME_REQ:
        {
          this.state = PLAY_RESUMING;
        }
        break;

      case WLAudioPlayerEvent.WL_WORKLET_NODE_STOP_REQ:
        {
          this.state = PLAY_STOPPING;
        }
        break;

      case WLAudioPlayerEvent.WL_WORKLET_NODE_CLOSE_REQ:
        {
          this.state = PLAY_CLOSING;
          if (this.state !== PLAY_STARTED) {
            this.closePlayer();
          }
        }
        break;
    }
  }

  closePlayer() {
    this.caching = true;
    this.noMoreData = false;
    this.pcmRingBuffer.clear();
    this.encodedDataList.splice(0, this.encodedDataList.length);
    this.state = PLAY_CLOSED;
    this.reset();
    this.reportRsp(WLAudioPlayerEvent.WL_WORKLET_NODE_CLOSE_RSP, true);
  }

  static get parameterDescriptors() {
    return [
      {
        name: 'gainChannel_0',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: 'a-rate',
      },
      {
        name: 'gainChannel_1',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: 'a-rate',
      },
    ];
  }

  process(inputs, outputs, params) {
    const output = outputs[0];
    const gain = params['gainChannel_0'];

    if (this.state !== PLAY_STARTED) {
      if (this.state !== PLAY_STARTING) {
        if (this.state === PLAY_PAUSING) {
          this.reportRsp(WLAudioPlayerEvent.WL_WORKLET_NODE_PAUSE_RSP, true);
          this.state = PLAY_PAUSED;
        } else if (this.state === PLAY_STOPPING) {
          this.caching = true;
          this.noMoreData = false;
          this.pcmRingBuffer.clear();
          this.encodedDataList.splice(0, this.encodedDataList.length);
          this.state = PLAY_STOPPED;
          this.reportRsp(WLAudioPlayerEvent.WL_WORKLET_NODE_STOP_RSP, true);
        } else if (this.state === PLAY_RESUMING) {
          this.state = PLAY_STARTED;
          this.reportRsp(WLAudioPlayerEvent.WL_WORKLET_NODE_RESUME_RSP, true);
        } else if (this.state === PLAY_CLOSING) {
          this.closePlayer();
        }
        return true;
      } else {
        this.state = PLAY_STARTED;
        this.reportRsp(WLAudioPlayerEvent.WL_WORKLET_NODE_START_RSP, true);
      }
    }

    if (this.caching && !this.noMoreData) {
      if (this.pcmRingBuffer && this.pcmRingBuffer.frameAvailable >= this.processFrameCount) {
        this.caching = false;
      }
      return true;
    }

    if (this.pcmRingBuffer && this.pcmRingBuffer.frameAvailable >= output.length) {
      output.forEach((value) => {
        this.pcmRingBuffer.pull(value);
      });
    } else {
      if (this.noMoreData) {
        wllog('已经没有coded数据了, 还剩', this.pcmRingBuffer.frameAvailable);
        if (this.pcmRingBuffer.frameAvailable) {
          const buffer = new Float32Array(this.pcmRingBuffer.frameAvailable);
          this.pcmRingBuffer.pull(buffer);
          output.forEach((value) => {
            value.set(buffer, 0);
          });
        } else {
          this.sendEvent(WLAudioPlayerEvent.WL_WORKLET_NODE_FINISH_PLAY, {
            playerType: this.playerType,
          });
          this.caching = true;
          this.noMoreData = false;
        }
      }
    }

    return true;
  }
}

registerProcessor('weila_player_processor', WLPlayerWorklet);
