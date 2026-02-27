// @ts-ignore
import PlayerWorklet from './weila_player.worklet.js';
// @ts-ignore
import RecorderWorklet from './weila_recorder.worklet.js';

import {
  WLAudioEvent,
  WLAudioPlayerEvent,
  WLAudioRecorderEvent,
  WLPlayerType,
} from './weila_audio_data';
import CompoUint8Array from './weila_compositor_array';
import { WL_ConfigID, WLConfig } from 'main/weila_config';
import { TinyEmitter } from 'tiny-emitter';
import { getLogger } from 'log/weila_log';

const wllog = getLogger('AUDIO:core:info');
const wlerr = getLogger('AUDIO:core:err');

interface WLAudioCallback {
  resolve(value: any): void;
  reject?(reason: any): void;
  waitRspTimer: any;
}

interface WLEventCallback {
  (event: number, data: any): void;
}

const defaulSampleRate = 16000;

enum WLPlayerState {
  WL_PLAYER_OPENING,
  WL_PLAYER_STOPPED,
  WL_PLAYER_STARTING,
  WL_PLAYER_STARTED,
  WL_PLAYER_STOPPING,
  WL_PLAYER_PAUSING,
  WL_PLAYER_PAUSED,
  WL_PLAYER_RESUMING,
  WL_PLAYER_CLOSING,
  WL_PLAYER_CLOSED,
}

enum WLRecorderState {
  WL_RECORDER_OPENING,
  WL_RECORDER_STOPPED,
  WL_RECORDER_STARTING,
  WL_RECORDER_STARTED,
  WL_RECORDER_STOPPING,
  WL_RECORDER_CLOSING,
  WL_RECORDER_CLOSED,
}

const wl_playerName = ['stream ptt', 'history ptt', 'single ptt'];

class WLAudio {
  private audioContext: AudioContext | null;
  private playerWorkNode: AudioWorkletNode[] | null;
  private recorderWorkNode: AudioWorkletNode | null;
  private playerSource: AudioBufferSourceNode[] | null;
  private sendingEventListMap: Map<number, WLAudioCallback>;
  private micMedia: any;
  private micSource: MediaStreamAudioSourceNode | null;
  private emitter: TinyEmitter;
  private playSampleRate: number[];
  private playState: WLPlayerState[];
  private recordState: WLRecorderState;
  private isInited: boolean;

  constructor() {
    this.audioContext = null;
    this.playerWorkNode = [null, null, null];
    this.recorderWorkNode = null;
    this.playerSource = [null, null, null];
    this.sendingEventListMap = new Map();
    this.micMedia = null;
    this.micSource = null;
    this.emitter = new TinyEmitter();
    this.playSampleRate = [16000, 16000, 16000];
    this.playState = [
      WLPlayerState.WL_PLAYER_CLOSED,
      WLPlayerState.WL_PLAYER_CLOSED,
      WLPlayerState.WL_PLAYER_CLOSED,
    ];
    this.recordState = WLRecorderState.WL_RECORDER_CLOSED;
    this.isInited = false;
  }

  public async init(): Promise<boolean> {
    if (!this.isInited) {
      this.audioContext = new AudioContext({ sampleRate: defaulSampleRate });
      if (this.audioContext.state !== 'running') {
        await this.audioContext.resume();
      }

      this.isInited = true;

      wllog('audioContext:', this.audioContext);
      wllog('audioContext audioWorklet is :', this.audioContext.audioWorklet);
      await this.audioContext.audioWorklet.addModule(PlayerWorklet);
      await this.audioContext.audioWorklet.addModule(RecorderWorklet);
    }
    return true;
  }

  public onAudioEvent(callback: WLEventCallback): void {
    this.emitter.on('event', callback);
  }

  private sendAudioEvent(event: number, data: any): void {
    this.emitter.emit('event', event, data);
  }

  private replyPlayRequest(rspEvent: WLAudioPlayerEvent, data: any): void {
    wllog('响应请求事件:%d, 数据:%O', rspEvent, data);
    if (this.sendingEventListMap.has(rspEvent)) {
      const callback = this.sendingEventListMap.get(rspEvent);
      this.sendingEventListMap.delete(rspEvent);
      if (callback.waitRspTimer) {
        clearTimeout(callback.waitRspTimer);
        callback.waitRspTimer = null;
      }
      if (data.result) {
        callback!.resolve(true);
      } else {
        if (callback!.reject) {
          callback!.reject(new Error(data.errorMsg));
        }
      }
    }
  }

  private onPlayerMessage(event: any): void {
    const ev = event.data;
    wllog('播放器%d 处理事件:%d 数据:%O', ev.playerType, ev.event, ev.data);
    switch (ev.event) {
      case WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_RSP:
        {
          this.replyPlayRequest(ev.event, ev.data);
          this.playState[ev.playerType] = WLPlayerState.WL_PLAYER_STOPPED;
        }
        break;

      case WLAudioPlayerEvent.WL_WORKLET_NODE_STOP_RSP:
      case WLAudioPlayerEvent.WL_WORKLET_NODE_CLOSE_RSP:
      case WLAudioPlayerEvent.WL_WORKLET_NODE_PAUSE_RSP:
        {
          if (ev.event === WLAudioPlayerEvent.WL_WORKLET_NODE_PAUSE_RSP) {
            this.playState[ev.playerType] = WLPlayerState.WL_PLAYER_PAUSED;
          } else if (ev.event === WLAudioPlayerEvent.WL_WORKLET_NODE_STOP_RSP) {
            this.playState[ev.playerType] = WLPlayerState.WL_PLAYER_STOPPED;
          } else {
            this.playState[ev.playerType] = WLPlayerState.WL_PLAYER_CLOSED;
          }

          this.stopAudioSource(ev.playerType);
          this.replyPlayRequest(ev.event, ev.data);
        }
        break;

      case WLAudioPlayerEvent.WL_WORKLET_NODE_START_RSP:
      case WLAudioPlayerEvent.WL_WORKLET_NODE_RESUME_RSP:
        {
          this.playState[ev.playerType] = WLPlayerState.WL_PLAYER_STARTED;
          this.replyPlayRequest(ev.event, ev.data);
        }
        break;

      case WLAudioPlayerEvent.WL_WORKLET_NODE_FINISH_PLAY:
        {
          this.sendAudioEvent(WLAudioEvent.WL_AUDIO_FINISH_PLAY_IND, ev.playerType);
        }
        break;
    }
  }

  private sendPlayerEvent(playerType: WLPlayerType, event: WLAudioPlayerEvent, data: any): void {
    if (this.playerWorkNode[playerType]) {
      wllog('发送播放器事件:', event);
      this.playerWorkNode[playerType].port.postMessage({ event: event, data: data });
    }
  }

  public async openPlayer(playerType: WLPlayerType, sampleRate: number): Promise<boolean> {
    wllog('打开播放器:%d 采样率:%d', playerType, sampleRate);
    if (this.playState[playerType] !== WLPlayerState.WL_PLAYER_CLOSED) {
      return Promise.reject(new Error('播放器状态不正确:' + this.playState));
    }

    try {
      if (this.playerWorkNode[playerType] === null) {
        const configData = await WLConfig.getConfigData(WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID);
        this.playerWorkNode[playerType] = new AudioWorkletNode(
          this.audioContext,
          'weila_player_processor',
          {
            channelCount: 2,
            processorOptions: {
              wasmData: configData.resource_data,
              workerName: wl_playerName[playerType],
              playerType: playerType,
            },
          },
        );
        this.playerWorkNode[playerType].port.addEventListener('message', this.onPlayerMessage.bind(this));
      }

      this.playSampleRate[playerType] = sampleRate;
      this.playState[playerType] = WLPlayerState.WL_PLAYER_OPENING;
    } catch (e) {
      this.playState[playerType] = WLPlayerState.WL_PLAYER_CLOSED;
      return Promise.reject(e);
    }
    return new Promise<boolean>((resolve, reject) => {
      this.sendPlayerEvent(playerType, WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_REQ, {
        sampleRate: sampleRate,
      });
      const callback = {} as WLAudioCallback;
      callback.resolve = resolve;
      callback.reject = reject;
      callback.waitRspTimer = setTimeout(
        (cb) => {
          if (cb.reject) {
            cb.reject(new Error('请求超时'));
          }
        },
        5000,
        callback,
      );
      this.sendingEventListMap.set(WLAudioPlayerEvent.WL_WORKLET_NODE_OPEN_RSP, callback);
    });
  }

  private playOperation(
    playerType: WLPlayerType,
    reqEvent: WLAudioPlayerEvent,
    rspEvent: WLAudioPlayerEvent,
    data: any,
  ): Promise<boolean> {
    wllog('播放器 %d 操作事件%d', playerType, reqEvent);
    return new Promise<boolean>((resolve, reject) => {
      this.sendPlayerEvent(playerType, reqEvent, data);
      if (this.playerWorkNode[playerType]) {
        const callback = {} as WLAudioCallback;
        callback.resolve = resolve;
        callback.reject = reject;
        callback.waitRspTimer = setTimeout(
          (cb) => {
            if (cb.reject) {
              cb.reject(new Error('请求超时'));
            }
          },
          5000,
          callback,
        );
        this.sendingEventListMap.set(rspEvent, callback);
      }
    });
  }

  private startAudioSource(playerType: WLPlayerType): void {
    if (this.playerSource[playerType] === null) {
      const audioBuffer = this.audioContext!.createBuffer(
        1,
        16000,
        this.playSampleRate[playerType],
      );
      this.playerSource[playerType] = this.audioContext!.createBufferSource();
      this.playerSource[playerType].buffer = audioBuffer;
      this.playerSource[playerType].loop = true;
      this.playerSource[playerType].connect(this.playerWorkNode[playerType]);
      this.playerWorkNode[playerType].connect(this.audioContext.destination);
      this.playerSource[playerType].start();
    }
  }

  private stopAudioSource(playerType: WLPlayerType): void {
    if (this.playerSource[playerType]) {
      this.playerSource[playerType].stop();
      this.playerSource[playerType].disconnect();
      this.playerWorkNode[playerType].disconnect();
      this.playerSource[playerType].buffer = null;
      this.playerSource[playerType] = null;
    }
  }

  public startPlay(playerType: WLPlayerType): Promise<boolean> {
    wllog('播放器:%d 开始播放:', playerType);
    if (this.playState[playerType] !== WLPlayerState.WL_PLAYER_STOPPED) {
      return Promise.reject(new Error('播放器状态不正确:' + this.playState[playerType]));
    }
    this.startAudioSource(playerType);
    this.playState[playerType] = WLPlayerState.WL_PLAYER_STARTING;
    return this.playOperation(
      playerType,
      WLAudioPlayerEvent.WL_WORKLET_NODE_START_REQ,
      WLAudioPlayerEvent.WL_WORKLET_NODE_START_RSP,
      null,
    );
  }

  public pausePlay(playerType: WLPlayerType): Promise<boolean> {
    wllog('播放器:%d 暂停播放', playerType);
    if (
      this.playState[playerType] !== WLPlayerState.WL_PLAYER_STARTED &&
      this.playState[playerType] !== WLPlayerState.WL_PLAYER_STARTING
    ) {
      return Promise.reject(new Error('播放器状态不正确:' + this.playState[playerType]));
    }

    this.playState[playerType] = WLPlayerState.WL_PLAYER_PAUSING;
    return this.playOperation(
      playerType,
      WLAudioPlayerEvent.WL_WORKLET_NODE_PAUSE_REQ,
      WLAudioPlayerEvent.WL_WORKLET_NODE_PAUSE_RSP,
      null,
    );
  }

  public resumePlay(playerType: WLPlayerType): Promise<boolean> {
    wllog('播放器:%d 恢复播放', playerType);
    if (
      this.playState[playerType] !== WLPlayerState.WL_PLAYER_PAUSED &&
      this.playState[playerType] !== WLPlayerState.WL_PLAYER_PAUSING
    ) {
      return Promise.reject(new Error('播放器状态不正确:' + this.playState[playerType]));
    }
    this.startAudioSource(playerType);
    this.playState[playerType] = WLPlayerState.WL_PLAYER_RESUMING;
    return this.playOperation(
      playerType,
      WLAudioPlayerEvent.WL_WORKLET_NODE_RESUME_REQ,
      WLAudioPlayerEvent.WL_WORKLET_NODE_RESUME_RSP,
      null,
    );
  }

  public stopPlay(playerType: WLPlayerType): Promise<boolean> {
    wllog('播放器:%d 停止播放', playerType);
    if (
      this.playState[playerType] !== WLPlayerState.WL_PLAYER_STARTING &&
      this.playState[playerType] !== WLPlayerState.WL_PLAYER_STARTED &&
      this.playState[playerType] !== WLPlayerState.WL_PLAYER_PAUSING &&
      this.playState[playerType] !== WLPlayerState.WL_PLAYER_PAUSED &&
      this.playState[playerType] !== WLPlayerState.WL_PLAYER_RESUMING
    ) {
      return Promise.reject(new Error('播放器状态不正确:' + this.playState[playerType]));
    }
    this.playState[playerType] = WLPlayerState.WL_PLAYER_STOPPING;
    return this.playOperation(
      playerType,
      WLAudioPlayerEvent.WL_WORKLET_NODE_STOP_REQ,
      WLAudioPlayerEvent.WL_WORKLET_NODE_STOP_RSP,
      null,
    );
  }

  public isPlayerPaused(playerType: WLPlayerType): boolean {
    return this.playState[playerType] === WLPlayerState.WL_PLAYER_PAUSED;
  }

  public isPlayerStarted(playerType: WLPlayerType): boolean {
    return this.playState[playerType] === WLPlayerState.WL_PLAYER_STARTED;
  }

  public closePlayer(playerType: WLPlayerType): Promise<boolean> {
    wllog('播放器:%d 关闭播放器', playerType);
    if (
      this.playState[playerType] === WLPlayerState.WL_PLAYER_CLOSED ||
      this.playState[playerType] === WLPlayerState.WL_PLAYER_CLOSING
    ) {
      return Promise.reject(new Error('播放器状态不正确:' + this.playState));
    }

    this.playState[playerType] = WLPlayerState.WL_PLAYER_CLOSING;
    return this.playOperation(
      playerType,
      WLAudioPlayerEvent.WL_WORKLET_NODE_CLOSE_REQ,
      WLAudioPlayerEvent.WL_WORKLET_NODE_CLOSE_RSP,
      null,
    );
  }

  public putPlayerOpusData(playerType: WLPlayerType, opusData: Uint8Array[] | null): void {
    if (opusData) {
      const compoArray = new CompoUint8Array();
      compoArray.putArrays(opusData);

      const compoBuffer = compoArray.getCompoArray();
      this.playerWorkNode[playerType].port.postMessage(
        {
          event: WLAudioPlayerEvent.WL_WORKLET_NODE_PUT_DATA,
          data: { buffer: compoBuffer, lengthList: compoArray.getCompoLengthList() },
        },
        [compoBuffer!.buffer],
      );
    } else {
      wllog('播放器:%d 播放最后一帧', playerType);
      this.sendPlayerEvent(playerType, WLAudioPlayerEvent.WL_WORKLET_NODE_END_DATA, null);
    }
  }

  private sendRecorderEvent(event: WLAudioRecorderEvent, data: any): void {
    wllog('发送录音器事件%d', event);
    if (this.recorderWorkNode) {
      this.recorderWorkNode.port.postMessage({ event: event, data: data });
    }
  }

  private replyRecordRequest(rspEvent: WLAudioRecorderEvent, data: any): void {
    wllog('回复录音器请求%d', rspEvent);
    if (this.sendingEventListMap.has(rspEvent)) {
      const callback = this.sendingEventListMap.get(rspEvent);
      this.sendingEventListMap.delete(rspEvent);
      if (data.result) {
        callback!.resolve(true);
      } else {
        if (callback!.reject) {
          callback!.reject(new Error(data.errorMsg));
        }
      }
    }
  }

  private onRecorderMessage(event: any): void {
    const ev = event.data;
    wllog('录音器事件处理%d', ev.event);
    switch (ev.event) {
      case WLAudioRecorderEvent.WL_WORKLET_NODE_START_RSP:
      case WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP:
        {
          if (ev.event === WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP) {
            this.recordState = WLRecorderState.WL_RECORDER_STOPPED;
          } else {
            this.recordState = WLRecorderState.WL_RECORDER_STARTED;
          }
          this.replyRecordRequest(ev.event, ev.data);
        }
        break;

      case WLAudioRecorderEvent.WL_WORKLET_NODE_STOP_RSP:
        {
          this.recordState = WLRecorderState.WL_RECORDER_STOPPED;
          if (this.recorderWorkNode && this.micSource) {
            this.recorderWorkNode.disconnect();
            this.micSource.disconnect();
          }
          this.replyRecordRequest(ev.event, ev.data);
        }
        break;

      case WLAudioRecorderEvent.WL_WORKLET_NODE_CLOSE_RSP:
        {
          this.recordState = WLRecorderState.WL_RECORDER_CLOSED;
          if (this.micSource) {
            this.micSource.disconnect();
            this.micSource = null;
          }

          if (this.micMedia) {
            this.micMedia = null;
          }

          this.recorderWorkNode.disconnect();
          this.replyRecordRequest(ev.event, ev.data);
        }
        break;

      case WLAudioRecorderEvent.WL_WORKLET_NODE_DATA_IND:
        {
          const buffer = new Uint8Array(ev.data.data);
          this.sendAudioEvent(WLAudioEvent.WL_AUDIO_OPUS_CODED_DATA_IND, buffer);
        }
        break;
    }
  }

  public async openRecorder(sampleRate: number, bitRate: number): Promise<boolean> {
    wllog('开启录音器, 采样率:%d 位宽:%d', sampleRate, bitRate);
    if (this.recordState !== WLRecorderState.WL_RECORDER_CLOSED) {
      wlerr('openRecorder error:', new Error('录音器状态不正确:' + this.playState));
      return Promise.reject(new Error('录音器状态不正确:' + this.playState));
    }
    try {
      wllog('浏览器:' + navigator.userAgent);
      if (this.recorderWorkNode === null) {
        const configData = await WLConfig.getConfigData(WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID);
        // 初始化录音器线程
        this.recorderWorkNode = new AudioWorkletNode(
          this.audioContext,
          'weila_recorder_processor',
          {
            processorOptions: { wasmData: configData.resource_data },
          },
        );
        this.recorderWorkNode.port.addEventListener('message', this.onRecorderMessage.bind(this));
      }

      this.recordState = WLRecorderState.WL_RECORDER_OPENING;
    } catch (e) {
      wlerr('openRecorder error:', e);
      this.recordState = WLRecorderState.WL_RECORDER_CLOSED;
      return Promise.reject(e);
    }

    return new Promise<boolean>((resolve, reject) => {
      // @ts-ignore
      // oxfmt-ignore
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
      // @ts-ignore
      navigator.getUserMedia(
        { audio: true },
        (stream) => {
          this.micMedia = stream;
          this.micSource = this.audioContext!.createMediaStreamSource(this.micMedia);
          this.sendRecorderEvent(WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_REQ, {
            sampleRate: sampleRate,
            bitRate: bitRate,
          });
          const callback = {} as WLAudioCallback;
          callback.resolve = resolve;
          callback.reject = reject;
          callback.waitRspTimer = setTimeout(
            (cb) => {
              if (cb.reject) {
                cb.reject(new Error('请求超时'));
              }
            },
            5000,
            callback,
          );
          this.sendingEventListMap.set(WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP, callback);
        },
        (error) => {
          wlerr('getUserMedia', error);
          reject(error);
          this.closeRecorder();
        },
      );
    });
  }

  private recordOperation(
    reqEvent: WLAudioRecorderEvent,
    rspEvent: WLAudioRecorderEvent,
    data: any,
  ): Promise<boolean> {
    wllog('录音器操作:%d', reqEvent);
    return new Promise<boolean>((resolve, reject) => {
      this.sendRecorderEvent(reqEvent, data);
      if (this.recorderWorkNode) {
        const callback = {} as WLAudioCallback;
        callback.resolve = resolve;
        callback.reject = reject;
        callback.waitRspTimer = setTimeout(
          (cb) => {
            if (cb.reject) {
              cb.reject(new Error('请求超时'));
            }
          },
          5000,
          callback,
        );
        this.sendingEventListMap.set(rspEvent, callback);
      }
    });
  }

  public startRecord(): Promise<boolean> {
    wllog('开始录音');
    if (this.recordState !== WLRecorderState.WL_RECORDER_STOPPED) {
      return Promise.reject(new Error('录音器状态不正确:' + this.playState));
    }
    if (this.micSource && this.recorderWorkNode) {
      this.micSource.connect(this.recorderWorkNode);
      this.recorderWorkNode.connect(this.audioContext!.destination);
    }
    this.recordState = WLRecorderState.WL_RECORDER_STARTING;
    return this.recordOperation(
      WLAudioRecorderEvent.WL_WORKLET_NODE_START_REQ,
      WLAudioRecorderEvent.WL_WORKLET_NODE_START_RSP,
      null,
    );
  }

  public stopRecord(): Promise<boolean> {
    wllog('停止录音');
    if (
      this.recordState !== WLRecorderState.WL_RECORDER_STARTING &&
      this.recordState !== WLRecorderState.WL_RECORDER_STARTED
    ) {
      return Promise.reject(new Error('录音器状态不正确:' + this.playState));
    }

    this.recordState = WLRecorderState.WL_RECORDER_STOPPING;
    return this.recordOperation(
      WLAudioRecorderEvent.WL_WORKLET_NODE_STOP_REQ,
      WLAudioRecorderEvent.WL_WORKLET_NODE_STOP_RSP,
      null,
    );
  }

  public closeRecorder(): Promise<boolean> {
    wllog('关闭录音器');
    if (
      this.recordState === WLRecorderState.WL_RECORDER_CLOSING ||
      this.recordState === WLRecorderState.WL_RECORDER_CLOSED
    ) {
      return Promise.reject(new Error('录音器状态不正确:' + this.playState));
    }

    this.recordState = WLRecorderState.WL_RECORDER_CLOSING;
    return this.recordOperation(
      WLAudioRecorderEvent.WL_WORKLET_NODE_CLOSE_REQ,
      WLAudioRecorderEvent.WL_WORKLET_NODE_CLOSE_RSP,
      null,
    );
  }
}

export { WLAudio };
