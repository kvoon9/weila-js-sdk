import { fsmEvents, pttFsm } from 'fsm/weila_fsmScript';
import {
  WL_PromiseCallback,
  WL_PttAudioItem,
  WL_PttFsmListener,
  WL_PttPacket,
  WL_PttPackType,
  WL_PttPayload,
} from 'main/weila_internal_data';
import {
  WL_IDbAudioData,
  WL_IDbMsgData,
  WL_IDbMsgDataStatus,
  WL_IDbMsgDataType,
} from 'db/weila_db_data';
import { WeilaDB } from 'db/weila_db';
import { getLogger } from 'log/weila_log';
import { interpret } from 'xstate';
import { WLAudio } from 'audio/weila_audio';
import { WLAudioEvent, WLPlayerType } from 'audio/weila_audio_data';
import WeilaRingPlayer from 'audio/weila_ring_player';
import { WL_ConfigID } from 'main/weila_config';
import {
  calculateOpusDataFrame,
  decompositionAudioData,
  fetchWithTimeout,
  getOpusDataListFromPttData,
} from 'main/weila_utils';
import {
  WL_PttAudioPlaySource,
  WL_PttAudioPlayState,
  WL_PttPlayIndData,
} from 'main/weila_external_data';

const wllog = getLogger('FSM:info');
const wlerr = getLogger('FSM:err');

interface WL_TalkingInfo {
  seqOfPackage: number;
  curMarker: WL_PttPackType;
  callback?: WL_PromiseCallback;
  frameBufferCache: Uint8Array[];
  stopByErr: boolean;
}

export default class WLPttFsm {
  readonly PLAY_DELAY = 200;
  static pttSeq = 0;
  static readonly FRAME_COUNT = 25;
  pttFsm?: any;
  pttFsmService?: any;
  playingAudioList: string[];
  playingAudioMap: Map<string, WL_PttAudioItem>;
  waitingAudioMap: Map<string, WL_PttAudioItem>;
  audioManager: WLAudio;
  streamPttPlayItem: WL_PttAudioItem | null;
  singlePttPlayItem: WL_PttAudioItem | null;
  historyPttPlayItems: WL_PttAudioItem[] | null;
  historyPttPlayIndex: number;
  talkingInfo: WL_TalkingInfo | null;

  constructor(private pttFsmListener: WL_PttFsmListener) {
    this.talkingInfo = null;
    this.historyPttPlayIndex = 0;
    this.playingAudioList = [];
    this.playingAudioMap = new Map<string, WL_PttAudioItem>();
    this.waitingAudioMap = new Map<string, WL_PttAudioItem>();
    this.audioManager = new WLAudio();
    this.audioManager.onAudioEvent(this.onAudioMessage.bind(this));

    this.pttFsm = pttFsm
      .withContext({
        pttCore: this as WLPttFsm,
        singlePlayOrigin: '',
        historyPlayOrigin: '',
        talkOrigin: '',
      })
      .withConfig({
        actions: {
          onIdle: this.onIdle.bind(this),
          onPttPayloadPlaying: this.onPttPayloadPlaying.bind(this),
          onPttPayloadWaiting: this.onPttPayloadWaiting.bind(this),
          feedData: this.feedData.bind(this),
          onEnterRealtime: this.onEnterRealtime.bind(this),
          onExitRealtime: this.onExitRealtime.bind(this),
          onPlayItemFinish: this.onPlayItemFinish.bind(this),
          onSinglePlayEntry: this.onSinglePlayEntry.bind(this),
          onSinglePlayExit: this.onSinglePlayExit.bind(this),
          onSinglePlayFinish: this.onSinglePlayFinish.bind(this),
          onHistoryPlaying: this.onHistoryPlaying.bind(this),
          onPlayNextItem: this.onPlayNextItem.bind(this),
          onPlayHistoryItemFinish: this.onPlayHistoryItemFinish.bind(this),
          onTalking: this.onTalking.bind(this),
          stopPlay: this.stopPlay.bind(this),
          onStopPttPlay: this.onStopPttPlay.bind(this),
          onRequestTalkResult: this.onRequestTalkResult.bind(this),
          onTalkInterrupt: this.onTalkInterrupt.bind(this),
          stopAndPlayNext: this.stopAndPlayNext.bind(this),
        },
        services: {
          checkHistoryList: this.checkHistoryList.bind(this),
          checkPttPlayingList: this.checkPttPlayingList.bind(this),
          startTalking: this.startTalking.bind(this),
          stopTalk: this.stopTalk.bind(this),
        },
      });

    this.pttFsmService = interpret(this.pttFsm);
    this.pttFsmService
      .onTransition((state, event) => {
        wllog(
          '事件:%s 从状态:%s ===> 到状态:%s',
          event.type,
          state.history ? JSON.stringify(state.history.value) : '空',
          JSON.stringify(state.value),
        );
      })
      .onEvent((event) => {
        wllog('执行了事件:%s', event.type);
      })
      .start();
  }

  // actions
  onIdle(context: any, event: any, actionMeta: any) {
    this.notifyPttDataReady().catch((reason) => {
    });
  }

  getPttAudioSource(playerType: WLPlayerType): WL_PttAudioPlaySource {
    let source = WL_PttAudioPlaySource.PTT_AUDIO_SRC_HISTORY;
    switch (playerType) {
      case WLPlayerType.WL_PTT_HISTORY_PLAYER:
        {
          source = WL_PttAudioPlaySource.PTT_AUDIO_SRC_HISTORY;
        }
        break;

      case WLPlayerType.WL_PTT_SINGLE_PLAYER:
        {
          source = WL_PttAudioPlaySource.PTT_AUDIO_SRC_SINGLE;
        }
        break;

      case WLPlayerType.WL_PTT_STREAM_PLAYER:
        {
          source = WL_PttAudioPlaySource.PTT_AUDIO_SRC_STREAM;
        }
        break;
    }

    return source;
  }

  onPttPayloadPlaying(context: any, event: any, actionMeta: any) {
    wllog('进入了Playing状态', event, context);
    const audioItem = event.data as WL_PttAudioItem;
    if (event.type === 'FSM_FEED_PTT_PAYLOAD_EVT') {
      this.feedAudioPayload(audioItem, audioItem.playerType);
    } else if (event.type === 'FSM_PLAY_NEXT_PTT_ITEM_EVT') {
      WeilaRingPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_START_PLAY_ID)
        .then((playRet) => {
          wllog('播放铃声成功');
        })
        .finally(() => {
          this.onPlayInd(
            audioItem,
            audioItem.playerType,
            WL_PttAudioPlayState.PTT_AUDIO_PLAYING_START,
          );
          setTimeout(() => {
            this.feedAudioPayload(audioItem, audioItem.playerType);
          }, this.PLAY_DELAY);
        });
    }
  }

  onExitRealtime(context: any, event: any, actionMeta: any) {
    wllog('onExitRealtime', event.type);
  }

  onPlayItemFinish(context: any, event: any, actionMeta: any) {
    wllog('onPlayItemFinish', event.type);
    const audioItemId = this.playingAudioList.shift();
    this.playingAudioMap.delete(audioItemId);

    wllog('after finish', this.playingAudioList, this.playingAudioMap);

    this.streamPttPlayItem = null;
    WeilaRingPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_STOP_PLAY_ID).finally(() => {
      this.pttFsmService.send(fsmEvents.FSM_PTT_CHECK_RESOURCE_EVT);

      this.onPlayInd(
        null,
        WLPlayerType.WL_PTT_STREAM_PLAYER,
        WL_PttAudioPlayState.PTT_AUDIO_PLAYING_END,
      );
    });
  }

  private onPlayInd(
    audioItem: WL_PttAudioItem | null,
    playerType: WLPlayerType,
    state: WL_PttAudioPlayState,
  ) {
    const playIndData = {} as WL_PttPlayIndData;
    playIndData.state = state;
    playIndData.source = this.getPttAudioSource(playerType);
    this.pttFsmListener.onPlayInd(audioItem, playIndData);
  }

  onSinglePlayEntry(context: any, event: any, actionMeta: any) {
    wllog('onSinglePlayEntry', event);
    context.singlePlayOrigin = event.type;
    this.audioManager.openPlayer(WLPlayerType.WL_PTT_SINGLE_PLAYER, 16000).then((openRet) => {
      WeilaRingPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_START_PLAY_ID)
        .then((playRet) => {
          wllog('播放铃声成功');
        })
        .finally(() => {
          this.audioManager
            .startPlay(WLPlayerType.WL_PTT_SINGLE_PLAYER)
            .then((startRet) => {
              //TODO:
              this.singlePttPlayItem = event.data as WL_PttAudioItem;
              this.onPlayInd(
                this.singlePttPlayItem,
                WLPlayerType.WL_PTT_SINGLE_PLAYER,
                WL_PttAudioPlayState.PTT_AUDIO_PLAYING_START,
              );
              setTimeout(() => {
                this.feedAudioPayload(this.singlePttPlayItem, this.singlePttPlayItem.playerType);
              }, this.PLAY_DELAY);
            })
            .catch((reason) => {
              //TODO: 执行STOP事件
              this.pttFsmService.send('FSM_STOP_EVT', { data: reason });
            });
        });
    });
  }

  onSinglePlayExit(context: any, event: any, actionMeta: any) {
    wllog('onSinglePlayExit', event);
  }

  onSinglePlayFinish(context: any, event: any, actionMeta: any) {
    wllog('onSinglePlayFinish', event);
    WeilaRingPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_STOP_PLAY_ID).finally(() => {
      this.pttFsmService.send(fsmEvents.FSM_PLAY_END_EVT);
    });
  }

  onEnterRealtime(context: any, event: any, actionMeta: any) {
    const audioItem = event.data as WL_PttAudioItem;
    wllog('onEnterRealtime', event.type, event);
    if (event.type === 'FSM_PLAY_REALTIME_EVT') {
      this.streamPttPlayItem = audioItem;
      this.audioManager
        .openPlayer(audioItem.playerType, 16000)
        .then((openRet) => {
          WeilaRingPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_START_PLAY_ID)
            .then((playRet) => {
              wllog('播放铃声成功');
            })
            .finally(() => {
              this.audioManager.startPlay(audioItem.playerType).then((startRet) => {
                wllog('播放器开始:', startRet);
                this.streamPttPlayItem.msgData.status =
                  WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ;
                if (this.streamPttPlayItem.shouldSave) {
                  WeilaDB.getInstance()
                    .putMsgData(this.streamPttPlayItem.msgData)
                    .then((value) => {
                      wllog('更新消息结果', value);
                    });
                }

                this.onPlayInd(
                  audioItem,
                  audioItem.playerType,
                  WL_PttAudioPlayState.PTT_AUDIO_PLAYING_START,
                );
                setTimeout(() => {
                  this.feedAudioPayload(audioItem, audioItem.playerType);
                }, this.PLAY_DELAY);
              });
            });
        })
        .catch((reason) => {
          wlerr('打开播放器失败:', reason);
          this.pttFsmService.send(fsmEvents.FSM_STOP_EVT, { data: reason });
        });
    }
  }

  onPttPayloadWaiting(context: any, event: any, actionMeta: any) {
    wllog('进入了Waiting状态', event.type);
  }

  feedData(_context: any, event: any, _actionMeta: any) {
    const audioItem = event.data as WL_PttAudioItem;
    wllog('喂PTT数据:', audioItem);
    this.feedAudioPayload(audioItem, audioItem.playerType);
  }

  // services
  async startTalking(_context: any, event: any): Promise<boolean> {
    this.talkingInfo = event.data;
    await this.audioManager.openRecorder(16000, 20000);
    try {
      await WeilaRingPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_START_RECORD_ID);
    } catch (_e) {
      wlerr('播放铃声失败');
    }

    try {
      await this.audioManager.startRecord();
    } catch (_e) {
      await this.audioManager.closeRecorder();
      return Promise.reject(_e);
    }

    return true;
  }

  async stopTalk(_context: any, event: any): Promise<boolean> {
    if (!this.talkingInfo.stopByErr) {
      this.packetLastPttMsg();
    }
    try {
      await this.audioManager.stopRecord();
    } finally {
      try {
        await WeilaRingPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_STOP_RECORD_ID);
      } catch (_e) {
        wlerr('播放结束铣声错误', _e);
      }
      await this.audioManager.closeRecorder();
    }
    return true;
  }

  async checkPttPlayingList(_context: any, event: any): Promise<WL_PttAudioItem> {
    return this.getNextPlayingItem();
  }

  onHistoryPlaying(_context: any, event: any, _actionMeta: any) {
    if (event.type === fsmEvents.FSM_PLAY_HISTORY_EVT) {
      this.historyPttPlayIndex = 0;
      this.historyPttPlayItems = event.data;
      _context.historyPlayOrigin = event.type;
      this.audioManager
        .openPlayer(WLPlayerType.WL_PTT_HISTORY_PLAYER, 16000)
        .then((_openRet) => {
          WeilaRingPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_START_PLAY_ID)
            .then((_playRet) => {
              wllog('播放铃声成功');
            })
            .finally(() => {
              if (!this.audioManager.isPlayerStarted(WLPlayerType.WL_PTT_HISTORY_PLAYER)) {
                this.audioManager.startPlay(WLPlayerType.WL_PTT_HISTORY_PLAYER).then((_startRet) => {
                  wllog('播放器开始:', _startRet);

                  this.onPlayInd(
                    this.historyPttPlayItems[this.historyPttPlayIndex],
                    WLPlayerType.WL_PTT_HISTORY_PLAYER,
                    WL_PttAudioPlayState.PTT_AUDIO_PLAYING_START,
                  );

                  setTimeout(() => {
                    this.feedAudioPayload(
                      this.historyPttPlayItems[this.historyPttPlayIndex],
                      WLPlayerType.WL_PTT_HISTORY_PLAYER,
                    );
                  }, this.PLAY_DELAY);
                });
              }
            });
        })
        .catch((reason) => {
          wlerr('打开播放器失败:', reason);
          this.pttFsmService.send(fsmEvents.FSM_PLAY_END_EVT, { data: reason });
        });
    }
  }

  onPlayNextItem(_context: any, event: any, _actionMeta: any) {
    wllog('onPlayNextItem', event.type);
  }

  onPlayHistoryItemFinish(_context: any, event: any, _actionMeta: any) {
    if (this.historyPttPlayItems.length) {
      this.historyPttPlayItems.shift();
    }

    WeilaRingPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_STOP_PLAY_ID).finally(() => {
      this.pttFsmService.send(fsmEvents.FSM_PTT_CHECK_RESOURCE_EVT);
      this.onPlayInd(
        event.data,
        WLPlayerType.WL_PTT_HISTORY_PLAYER,
        WL_PttAudioPlayState.PTT_AUDIO_PLAYING_END,
      );
    });
  }

  async checkHistoryList(context: any, event: any): Promise<WL_PttAudioItem> {
    if (this.historyPttPlayItems.length) {
      return this.historyPttPlayItems[0];
    }

    return Promise.reject(new Error('历史音频数据播放完毕'));
  }

  onRequestTalkResult(context: any, event: any, actionMeta: any) {
    wllog('onRequestTalkResult', event);
    if (this.talkingInfo && this.talkingInfo.callback) {
      if (event.type === 'error.platform.request_talk') {
        this.talkingInfo.callback.reject(event.data);
      } else {
        WLPttFsm.pttSeq++;
        this.talkingInfo.seqOfPackage = 0;
        this.talkingInfo.curMarker = WL_PttPackType.PTT_FIRST_PACK;
        this.talkingInfo.callback.resolve(true);
        this.talkingInfo.frameBufferCache = [];
      }
    }
  }

  stopAndPlayNext(context: any, event: any, actionMeta: any) {
    const metaObject = actionMeta.state.machine.id + '.' + actionMeta.state.value;
    const playType = actionMeta.state.meta[metaObject].playType;
    this.audioManager.stopPlay(playType).finally(() => {
      this.pttFsmService.send(fsmEvents.FSM_PTT_CHECK_RESOURCE_EVT);
    });
  }

  onTalkInterrupt(context: any, event: any, actionMeta: any) {
    if (this.talkingInfo && this.talkingInfo.callback) {
      this.talkingInfo.callback.reject(event.data);
    }
  }

  onStopPttPlay(context: any, event: any, actionMeta: any) {
    this.playingAudioList = [];
    this.playingAudioMap.clear();
    this.streamPttPlayItem = null;
  }

  stopPlay(context: any, event: any, actionMeta: any) {
    const metaObject = actionMeta.state.machine.id + '.' + actionMeta.state.value;
    const playType = actionMeta.state.meta[metaObject].playType;
    wllog('stopPlay playType:', playType);

    this.onPlayInd(null, playType, WL_PttAudioPlayState.PTT_AUDIO_PLAYING_END);

    this.audioManager.stopPlay(playType).finally(() => {
      this.audioManager.closePlayer(playType).finally(() => {
        if (
          event.type === fsmEvents.FSM_PLAY_SINGLE_EVT ||
          event.type === fsmEvents.FSM_PLAY_HISTORY_EVT ||
          event.type === fsmEvents.FSM_REQ_TALK_EVT
        ) {
          this.pttFsmService.send(event);
        } else if (
          event.type === fsmEvents.FSM_PLAY_END_EVT ||
          event.type === fsmEvents.FSM_STOP_EVT ||
          event.type === fsmEvents.FSM_PTT_ITEM_PLAY_END_EVT
        ) {
          this.pttFsmService.send(fsmEvents.FSM_END_BACK_TO_IDLE_EVT);
        }
      });
    });
  }

  onTalking(context: any, event: any, actionMeta: any) {
    wllog('onTalking');
  }

  feedAudioPayload(audioItem: WL_PttAudioItem, playerType: WLPlayerType): boolean {
    wllog(
      '喂播放器:%d 数据:',
      playerType,
      audioItem.playIndex,
      audioItem.payloadList.length,
      audioItem.isCompleted,
    );
    if (audioItem && audioItem.playIndex < audioItem.payloadList.length) {
      const opusData = audioItem.payloadList[audioItem.playIndex++];
      const opusRawDataList = getOpusDataListFromPttData(opusData.data);
      this.audioManager.putPlayerOpusData(playerType, opusRawDataList);

      this.onPlayInd(audioItem, playerType, WL_PttAudioPlayState.PTT_AUDIO_PLAYING);
    }

    if (audioItem.playIndex === audioItem.payloadList.length && audioItem.isCompleted) {
      this.audioManager.putPlayerOpusData(playerType, null);
      return true;
    } else if (audioItem.payloadList.length > audioItem.playIndex) {
      this.pttFsmService.send(fsmEvents.FSM_FEED_PTT_PAYLOAD_EVT, { data: audioItem });
      return true;
    }

    this.pttFsmService.send(fsmEvents.FSM_PTT_OUT_OF_PAYLOAD_EVT, { to: '.playing' });
  }

  private onAudioMessage(event: WLAudioEvent, data: any): void {
    switch (event) {
      case WLAudioEvent.WL_AUDIO_FINISH_PLAY_IND:
        {
          wllog('播放完毕...');
          this.pttFsmService.send(fsmEvents.FSM_PTT_ITEM_PLAY_END_EVT);
        }
        break;

      case WLAudioEvent.WL_AUDIO_OPUS_CODED_DATA_IND:
        {
          if (
            this.talkingInfo.curMarker === WL_PttPackType.PTT_END_PACK ||
            this.talkingInfo.curMarker === WL_PttPackType.PTT_WHOLE_PACK
          ) {
            break;
          }

          this.talkingInfo.frameBufferCache.push(data);
          if (this.talkingInfo.frameBufferCache.length >= 25) {
            this.packetPttMsg(
              this.talkingInfo.frameBufferCache.slice(0, WLPttFsm.FRAME_COUNT),
              false,
            );
            this.talkingInfo.frameBufferCache.splice(0, WLPttFsm.FRAME_COUNT);
          }
        }
        break;
    }
  }

  private fillPttAudioData(audioItem: WL_PttAudioItem, msgData: WL_IDbMsgData) {
    if (audioItem.msgData.audioData === undefined) {
      audioItem.msgData.audioData = {} as WL_IDbAudioData;
      audioItem.msgData.audioData.data = new Uint8Array(0);
      audioItem.msgData.audioData.frameCount = 0;
    }

    if (msgData.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE) {
      const newBufferLength = audioItem.msgData.audioData.data.length + msgData.pttData.data.length;
      const newBuffer = new Uint8Array(newBufferLength);
      newBuffer.set(audioItem.msgData.audioData.data, 0);
      newBuffer.set(msgData.pttData.data, audioItem.msgData.audioData.data.length);
      audioItem.msgData.audioData.data = newBuffer;
      audioItem.msgData.audioData.frameCount += msgData.pttData.frameCount;
    }
  }

  getAudioMsgDataPriority(msgData: WL_IDbMsgData): number {
    //TODO: 后续会有依据的
    return 0;
  }

  async canAudioMsgDataPlay(msgData: WL_IDbMsgData): Promise<boolean> {
    const sessionSetting = await WeilaDB.getInstance().getSessionSetting(
      msgData.sessionId,
      msgData.sessionType,
    );
    if (sessionSetting) {
      return !sessionSetting.mute;
    }

    return true;
  }

  async getNextPlayingItem(): Promise<WL_PttAudioItem> {
    wllog('getNextPlayingItem', this.playingAudioList.length);
    if (this.playingAudioList.length) {
      // 跳过不能播放的项，并把不能播且未收集完的项存入等待队列
      let result = false;
      while (this.playingAudioList.length) {
        const audioItem = this.playingAudioMap.get(this.playingAudioList[0]);
        wllog('getNextPlayingItem 1', this.playingAudioList, this.playingAudioMap);
        if (audioItem) {
          result = await this.canAudioMsgDataPlay(audioItem.msgData);
          if (result) {
            audioItem.msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ;
            if (audioItem.shouldSave) {
              WeilaDB.getInstance()
                .putMsgData(audioItem.msgData)
                .then((value) => {
                  wllog('更新成功:', audioItem.msgData);
                });
            }
            break;
          } else {
            this.playingAudioMap.delete(this.playingAudioList[0]);
            this.playingAudioList.shift();
            wllog('getNextPlayingItem 2', this.playingAudioList, this.playingAudioMap);
            if (!audioItem.isCompleted) {
              this.waitingAudioMap.set(audioItem.id, audioItem);
            }
          }
        } else {
          this.playingAudioList.shift();
        }
      }

      if (result) {
        return this.playingAudioMap.get(this.playingAudioList[0]);
      }
    }

    return Promise.reject(new Error('没有其他数据了'));
  }

  async notifyPttDataReady(): Promise<void> {
    wllog('当前的状态:', this.pttFsmService.state.value, this.pttFsmService.state.historyValue);
    if (
      this.pttFsmService.state.matches('idle') ||
      this.pttFsmService.state.matches('realtimePlaying.waitPayload')
    ) {
      wllog('当前播放数据:', this.playingAudioList.length);
      try {
        let audioItem = null;
        if (this.streamPttPlayItem) {
          audioItem = this.streamPttPlayItem;
        } else {
          audioItem = await this.getNextPlayingItem();
        }

        if (this.pttFsmService.state.matches('idle')) {
          this.pttFsmService.send(fsmEvents.FSM_PLAY_REALTIME_EVT, { data: audioItem });
        } else {
          this.pttFsmService.send(fsmEvents.FSM_FEED_PTT_PAYLOAD_EVT, { data: audioItem });
        }
      } catch (e) {
        wlerr('获取数据异常:', e);
      }
    }
  }

  putAudioMsgData(msgData: WL_IDbMsgData, shouldSave: boolean) {
    if (msgData.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE) {
      const audioItem = {} as WL_PttAudioItem;
      audioItem.id = msgData.combo_id;
      audioItem.playerType = WLPlayerType.WL_PTT_STREAM_PLAYER;
      audioItem.isCompleted = true;
      audioItem.msgData = msgData;
      audioItem.priority = this.getAudioMsgDataPriority(msgData);
      audioItem.playIndex = 0;

      if (msgData.audioData.data) {
        audioItem.payloadList = decompositionAudioData(audioItem.msgData.audioData.data);
        audioItem.shouldSave = shouldSave;
        this.playingAudioMap.set(audioItem.id, audioItem);
        this.playingAudioList.push(audioItem.id);
        this.notifyPttDataReady().catch((reason) => {
          wlerr('播放异常:', reason);
        });
      } else if (msgData.audioData.audioUrl && msgData.audioData.audioUrl.length > 0) {
        // let matchResult = msgData.audioData.audioUrl.match(/(http|https):\/\/([^\/]+)\/(.+)/i);
        // const newUrl = '/audio/' + matchResult[3];
        const newUrl = msgData.audioData.audioUrl;
        fetchWithTimeout(newUrl, { method: 'GET', mode: 'cors' }, 5000)
          .then(async (result) => {
            if (result.ok) {
              try {
                const audioData = {} as WL_IDbAudioData;
                const data = await result.arrayBuffer();
                audioData.data = new Uint8Array(data.slice(10));
                audioData.frameCount = calculateOpusDataFrame(audioData.data);
                audioItem.payloadList = decompositionAudioData(audioData.data);
                audioItem.shouldSave = shouldSave;

                msgData.audioData.audioUrl = undefined;
                msgData.audioData.data = audioData.data;
                msgData.audioData.frameCount = audioData.frameCount;

                this.playingAudioMap.set(audioItem.id, audioItem);
                this.playingAudioList.push(audioItem.id);
                this.notifyPttDataReady().catch((reason) => {
                  wlerr('播放异常:', reason);
                });
              } catch (e) {
                wlerr('获取语音数据出错', e);
              }
            }
          })
          .catch((reason) => {
            wlerr('获取数据异常', reason);
          });
      }
    }
  }

  async putPttMsgData(msgData: WL_IDbMsgData): Promise<WL_IDbMsgData> {
    wllog('消息类型:', msgData.msgType);

    const setAudioMsgWaitTimer = (audioItem: WL_PttAudioItem) => {
      audioItem.recvWaitTimerId = setTimeout(async () => {
        audioItem.isCompleted = true;
        audioItem.msgData.pttData = undefined;
        audioItem.msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE;
        try {
          await WeilaDB.getInstance().putMsgData(audioItem.msgData);
          wllog('超时保存消息成功');
        } catch (e) {
          wlerr('超时保存消息失败', e);
        }
        this.waitingAudioMap.delete(audioItem.id);
      }, 30000);
    };

    if (msgData.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE) {
      const id = msgData.combo_id;
      if (this.waitingAudioMap.has(id)) {
        wllog('等待队列拥有消息:', id);
        const audioItem: WL_PttAudioItem = this.waitingAudioMap.get(id)!;
        if (audioItem.recvWaitTimerId) {
          clearTimeout(audioItem.recvWaitTimerId);
          audioItem.recvWaitTimerId = null;
        }
        this.fillPttAudioData(audioItem, msgData);
        audioItem.msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE;
        audioItem.isCompleted = msgData.pttData.mark === 0x02 || msgData.pttData.mark === 0x03;
        wllog('消息是完整的？', audioItem.isCompleted, msgData.pttData.mark);
        if (audioItem.isCompleted) {
          audioItem.msgData.pttData = undefined;
          audioItem.msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE;
          this.waitingAudioMap.delete(id);
        } else {
          wllog('设置消息超时时间');
          setAudioMsgWaitTimer(audioItem);
        }

        try {
          audioItem.msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW;
          await WeilaDB.getInstance().putMsgData(audioItem.msgData);
          wllog('保存音频消息成功');
        } catch (e) {
          wlerr('保存音频消息异常:', e);
        }

        return audioItem.msgData;
      } else {
        wllog('消息不在等待队列中', id);
        let audioItem = {} as WL_PttAudioItem;
        const payload = {} as WL_PttPayload;

        audioItem.playerType = WLPlayerType.WL_PTT_STREAM_PLAYER;
        payload.data = msgData.pttData.data;
        payload.frameCount = msgData.pttData.frameCount;

        wllog('处理音频消息:', this.playingAudioList, this.playingAudioMap);

        if (this.playingAudioMap.has(id)) {
          wllog('消息在播放队列中', id);
          audioItem = this.playingAudioMap.get(id)!;
          if (audioItem.recvWaitTimerId) {
            clearTimeout(audioItem.recvWaitTimerId);
            audioItem.recvWaitTimerId = null;
          }
          this.fillPttAudioData(audioItem, msgData);
          audioItem.msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE;
          audioItem.isCompleted = msgData.pttData.mark === 0x02 || msgData.pttData.mark === 0x03;
        } else {
          wllog('消息不在播放队列中', id);
          this.playingAudioList.push(id);
          audioItem.shouldSave = true;
          audioItem.msgData = msgData;
          audioItem.msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW;
          this.fillPttAudioData(audioItem, msgData);
          audioItem.msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE;
          audioItem.isCompleted = msgData.pttData.mark === 0x02 || msgData.pttData.mark === 0x03;

          audioItem.id = id;
          audioItem.priority = this.getAudioMsgDataPriority(msgData);
          audioItem.payloadList = [];
          audioItem.playIndex = 0;
        }

        if (audioItem.shouldSave) {
          try {
            await WeilaDB.getInstance().putMsgData(audioItem.msgData);
            wllog('保存音频消息成功');
          } catch (e) {
            wlerr('保存音频消息异常:', e);
          }
        }

        audioItem.payloadList.push(payload);

        if (audioItem.isCompleted) {
          wllog('音频消息是完整的');
          audioItem.msgData.pttData = undefined;
          audioItem.msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE;
        } else {
          wllog('音频消息是不完整的');
          setAudioMsgWaitTimer(audioItem);
        }

        this.playingAudioMap.set(id, audioItem);
        wllog('通知播放');
        this.notifyPttDataReady().catch((reason) => {
          wlerr('播放异常:', reason);
        });

        return audioItem.msgData;
      }
    }
  }

  async initAudio(): Promise<boolean> {
    return this.audioManager.init();
  }

  async playSingle(msgData: WL_IDbMsgData): Promise<boolean> {
    if (msgData && msgData.msgType !== WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE) {
      return false;
    }

    const audioItem = {} as WL_PttAudioItem;
    audioItem.msgData = msgData;
    audioItem.id = msgData.combo_id;
    audioItem.playerType = WLPlayerType.WL_PTT_SINGLE_PLAYER;
    audioItem.playIndex = 0;
    audioItem.payloadList = decompositionAudioData(msgData.audioData.data);
    audioItem.isCompleted = true;
    audioItem.priority = 0;

    this.pttFsmService.send('FSM_PLAY_SINGLE_EVT', { data: audioItem });
    return true;
  }

  async playHistory(msgDatas: WL_IDbMsgData[]): Promise<boolean> {
    if (msgDatas.length === 0) {
      return false;
    }

    const audioItems: WL_PttAudioItem[] = [];
    msgDatas.forEach((value) => {
      if (value.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE) {
        const audioItem = {} as WL_PttAudioItem;
        audioItem.msgData = value;
        audioItem.id = value.combo_id;
        audioItem.playerType = WLPlayerType.WL_PTT_HISTORY_PLAYER;
        audioItem.playIndex = 0;
        audioItem.payloadList = decompositionAudioData(value.audioData.data);
        audioItem.isCompleted = true;
        audioItem.priority = 0;

        audioItems.push(audioItem);
      }
    });

    this.pttFsmService.send('FSM_PLAY_HISTORY_EVT', { data: audioItems });

    return true;
  }

  async requestTalk(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const talkingInfo = {} as WL_TalkingInfo;
      talkingInfo.callback = {} as WL_PromiseCallback;
      talkingInfo.callback.resolve = resolve;
      talkingInfo.callback.reject = reject;
      talkingInfo.stopByErr = false;
      this.pttFsmService.send(fsmEvents.FSM_REQ_TALK_EVT, { data: talkingInfo });
    });
  }

  async releaseTalkByError(): Promise<boolean> {
    this.talkingInfo.stopByErr = true;
    this.talkingInfo.curMarker = WL_PttPackType.PTT_END_PACK;
    this.pttFsmService.send(fsmEvents.FSM_REL_TALK_EVT);
    return true;
  }

  async releaseTalk(): Promise<boolean> {
    this.talkingInfo.stopByErr = false;
    this.talkingInfo.curMarker = WL_PttPackType.PTT_END_PACK;
    this.pttFsmService.send(fsmEvents.FSM_REL_TALK_EVT);
    return true;
  }

  private packetPttMsg(dataList: Uint8Array[], lastPacket: boolean): void {
    let offset = 0;
    let totalLen = 0;
    let currentLen = 0;
    const wlOpusList = [];
    wllog('打包%d ptt语音并发送最后一个包', dataList.length, lastPacket);
    while (dataList.length) {
      const opusRawData = dataList.shift()!;
      const wlOpusData = new Uint8Array(opusRawData.length + 4);
      const flag = opusRawData[0];
      wlOpusData[0] = flag;
      if (flag & 0x80) {
        const wlOpusDataView = new DataView(wlOpusData.buffer);
        wlOpusDataView.setUint16(1, opusRawData.length - 1, false);
        wlOpusData.set(opusRawData.subarray(1), 3);
        totalLen += opusRawData.length + 2;
        currentLen = opusRawData.length + 2;
      } else {
        wlOpusData[1] = opusRawData.length - 1;
        wlOpusData.set(opusRawData.subarray(1), 2);
        totalLen += opusRawData.length + 1;
        currentLen = opusRawData.length + 1;
      }
      wlOpusList.push(wlOpusData.subarray(0, currentLen));
    }

    const outputMsgData = new Uint8Array(totalLen);
    wlOpusList.forEach((value) => {
      outputMsgData.set(value, offset);
      offset += value.length;
    });

    const pttMsgData = {} as WL_PttPacket;
    pttMsgData.mark = this.talkingInfo.curMarker;
    pttMsgData.data = outputMsgData;
    pttMsgData.sourceType = 5;
    pttMsgData.frameCount = wlOpusList.length;
    pttMsgData.seq = WLPttFsm.pttSeq;
    pttMsgData.seqInPackage = this.talkingInfo.seqOfPackage++;

    if (lastPacket) {
      wllog('最后一帧录音, 分段标志:', this.talkingInfo.curMarker);
      if (this.talkingInfo.curMarker === WL_PttPackType.PTT_FIRST_PACK) {
        pttMsgData.mark = WL_PttPackType.PTT_WHOLE_PACK;
      } else {
        pttMsgData.mark = WL_PttPackType.PTT_END_PACK;
      }
    }

    this.talkingInfo.curMarker = lastPacket
      ? WL_PttPackType.PTT_END_PACK
      : WL_PttPackType.PTT_INTER_PACK;
    this.pttFsmListener.onRecordPttPacketInd(pttMsgData);
  }

  private packetLastPttMsg(): void {
    if (this.talkingInfo.frameBufferCache.length > 0) {
      while (this.talkingInfo.frameBufferCache.length >= WLPttFsm.FRAME_COUNT) {
        this.packetPttMsg(
          this.talkingInfo.frameBufferCache.slice(0, WLPttFsm.FRAME_COUNT),
          this.talkingInfo.frameBufferCache.length === WLPttFsm.FRAME_COUNT,
        );
        this.talkingInfo.frameBufferCache.splice(0, WLPttFsm.FRAME_COUNT);
      }

      if (this.talkingInfo.frameBufferCache.length > 0) {
        this.packetPttMsg(this.talkingInfo.frameBufferCache, true);
      }
    } else {
      this.packetPttMsg([], true);
    }
  }

  public stopPlayAudio() {
    try {
      this.pttFsmService.send({ type: fsmEvents.FSM_STOP_EVT });
    } catch (e) {
      wllog('pttFsmService.send fail', e);
      this.pttFsmService.send({ type: fsmEvents.FSM_STOP_EVT });
    }
  }

  public playNext() {
    this.pttFsmService.send(fsmEvents.FSM_STOP_AND_PLAY_NEXT_EVT);
  }
}
