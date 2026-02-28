import { WLAudioRecorderEvent } from './weila_audio_data'
import { WeilaRingBuffer } from './weila_ringbuffer'
import opus from './opus.js'
import { getLogger } from 'log/weila_log'

const wllog = getLogger('AUDIO:recorder_worker:info')
const wlerr = getLogger('AUDIO:recorder_worker:err')

const RECORD_OPENING = 0
const RECORD_OPENED = 1
const RECORD_CLOSING = 2
const RECORD_CLOSED = 3
const RECORD_STARTING = 4
const RECORD_STARTED = 5
const RECORD_STOPPING = 9
const RECORD_STOPPED = 10

class WLRecorderWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super(options)
    this.state = RECORD_CLOSED
    this.wasmData = options.processorOptions.wasmData
    this.port.onmessage = this.onMessage.bind(this)
    this.opusModule = null
    this.encoder = 0
    this.pcmBuffer = 0
    this.encodedData = 0
    this.sampleRate = 48000
    this.bitRate = 15000
    this.pcmArray = null
    this.frameRingBuffer = null
    this.transportWithList = options.processorOptions.transportWithList
    wllog('传输类型:%s', this.transportWithList ? '数组' : '缓存')
  }

  reportRspEvent(event, result, errorMsg) {
    this.port.postMessage({ event: event, data: { result: result, errorMsg: errorMsg } })
  }

  reset() {
    if (this.encoder) {
      this.opusModule._Opus_destroyEncoder(this.encoder)
      this.encoder = 0
    }

    if (this.pcmBuffer) {
      this.opusModule._free(this.pcmBuffer)
      this.pcmBuffer = 0
    }

    if (this.encodedData) {
      this.opusModule._free(this.encodedData)
      this.encodedData = 0
    }

    this.opusModule = null
  }

  onMessage(event) {
    const ev = event.data
    wllog('录音器收到事件:%d', ev.event)
    switch (ev.event) {
      case WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_REQ:
        {
          this.sampleRate = ev.data.sampleRate
          this.bitRate = ev.data.bitRate
          this.state = RECORD_OPENING

          this.frameRingBuffer = new WeilaRingBuffer(this.sampleRate * 60, false)
          this.processFrameCount = Math.ceil(this.sampleRate / 50)
          this.pcmArray = new Int16Array(this.processFrameCount)

          const Module = {}
          Module['wasmBinary'] = this.wasmData
          opus(Module)
            .then(async (value) => {
              if (this.state === RECORD_CLOSING) {
                this.reset()
                return
              }

              this.opusModule = value
              this.encoder = this.opusModule._Opus_initEncoder(this.sampleRate, 1, this.bitRate)
              if (!this.encoder) {
                this.reset()
                this.reportRspEvent(
                  WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP,
                  false,
                  '编码器初始化失败',
                )
                return
              }

              this.pcmBuffer = this.opusModule._malloc(
                this.processFrameCount * Int16Array.BYTES_PER_ELEMENT,
              )
              if (!this.pcmBuffer) {
                this.reset()
                this.reportRspEvent(
                  WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP,
                  false,
                  '申请内存失败',
                )
                return
              }

              this.encodedData = this.opusModule._malloc(256)
              if (!this.encodedData) {
                this.reset()
                this.reportRspEvent(
                  WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP,
                  false,
                  '申请内存失败',
                )
                return
              }

              this.state = RECORD_OPENED
              this.reportRspEvent(WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP, true)
            })
            .catch((reason) => {
              this.reportRspEvent(
                WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP,
                false,
                '出现异常:' + reason,
              )
              this.reset()
            })
        }
        break

      case WLAudioRecorderEvent.WL_WORKLET_NODE_START_REQ:
        {
          this.state = RECORD_STARTING
        }
        break

      case WLAudioRecorderEvent.WL_WORKLET_NODE_STOP_REQ:
        {
          this.state = RECORD_STOPPING
        }
        break

      case WLAudioRecorderEvent.WL_WORKLET_NODE_CLOSE_REQ:
        {
          if (this.state === RECORD_STARTED) {
            this.state = RECORD_CLOSING
          } else {
            this.state = RECORD_CLOSING
            this.closeRecorder()
          }
        }
        break
    }
  }

  static get parameterDescriptors() {
    return [
      {
        name: 'gainChannel_0',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate',
      },
      {
        name: 'gainChannel_1',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate',
      },
    ]
  }

  encodeData() {
    if (this.state === RECORD_STARTED) {
      this.frameRingBuffer.pull(this.pcmArray)
      const bytesBuffer = new Uint8Array(this.pcmArray.buffer)
      this.opusModule.writeArrayToMemory(bytesBuffer, this.pcmBuffer)
      const encodedLen = this.opusModule._Opus_encode(
        this.encoder,
        this.pcmBuffer,
        this.processFrameCount,
        this.encodedData,
        128,
      )
      if (encodedLen > 0) {
        const dataBuffer = new Uint8Array(
          this.opusModule.HEAPU8.buffer,
          this.encodedData,
          encodedLen,
        )

        if (this.transportWithList) {
          const dataList = []
          dataBuffer.forEach((value) => {
            dataList.push(value)
          })

          this.port.postMessage({
            event: WLAudioRecorderEvent.WL_WORKLET_NODE_DATA_IND,
            data: { type: 'array', data: dataList },
          })
        } else {
          try {
            this.port.postMessage(
              {
                event: WLAudioRecorderEvent.WL_WORKLET_NODE_DATA_IND,
                data: { type: 'buffer', data: dataBuffer },
              },
              [dataBuffer.buffer],
            )
          } catch (e) {
            this.transportWithList = true
            const dataList = []
            dataBuffer.forEach((value) => {
              dataList.push(value)
            })

            this.port.postMessage({
              event: WLAudioRecorderEvent.WL_WORKLET_NODE_DATA_IND,
              data: { type: 'array', data: dataList },
            })
          }
        }
      }
    }
  }

  closeRecorder() {
    this.reset()
    if (this.frameRingBuffer) {
      this.frameRingBuffer.clear()
      this.frameRingBuffer = null
    }

    this.pcmArray = null
    this.state = RECORD_CLOSED
    this.reportRspEvent(WLAudioRecorderEvent.WL_WORKLET_NODE_CLOSE_RSP, true)
  }

  process(inputs, outputs, params) {
    if (this.state !== RECORD_STARTED) {
      if (this.state === RECORD_STARTING) {
        this.frameRingBuffer.clear()
        this.state = RECORD_STARTED
        this.reportRspEvent(WLAudioRecorderEvent.WL_WORKLET_NODE_START_RSP, true)
      } else if (this.state === RECORD_STOPPING) {
        this.state = RECORD_STOPPED
        this.frameRingBuffer.clear()
        this.reportRspEvent(WLAudioRecorderEvent.WL_WORKLET_NODE_STOP_RSP, true)
      } else if (this.state === RECORD_CLOSING) {
        this.closeRecorder()
      }

      return true
    }

    const inputBuffer = inputs[0][0]
    const gain = params['gainChannel_0']
    if (this.frameRingBuffer == null) {
      return true
    }

    this.frameRingBuffer.push(
      new Int16Array(
        inputBuffer.map((v) => {
          return Math.ceil(v * 32768)
        }),
      ),
    )

    if (this.frameRingBuffer.frameAvailable >= this.processFrameCount) {
      this.encodeData()
    }

    return true
  }
}

registerProcessor('weila_recorder_processor', WLRecorderWorklet)
