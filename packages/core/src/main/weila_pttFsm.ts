import { fsmEvents, pttFsm } from 'fsm/weila_fsmScript'
import type {
  PttFsmContext,
  PttFsmEvent,
  PttFsmInput,
  StartPlaybackFamily,
  StartPlaybackInput,
} from 'fsm/weila_fsmScript'
import {
  WL_PttAudioItem,
  WL_PttFsmListener,
  WL_PttPackType,
  WL_PttPayload,
  WL_TalkingInfo,
} from 'main/weila_internal_data'
import {
  WL_IDbAudioData,
  WL_IDbMsgData,
  WL_IDbMsgDataStatus,
  WL_IDbMsgDataType,
} from 'db/weila_db_data'
import { WeilaDB } from 'db/weila_db'
import { getLogger } from 'log/weila_log'
import { createActor, fromPromise } from 'xstate'
import type { StateValue } from 'xstate'
import { WLAudio } from 'audio/weila_audio'
import { WLAudioEvent, WLPlayerType } from 'audio/weila_audio_data'
import WeilaRingPlayer from 'audio/weila_ring_player'
import { WL_ConfigID } from 'main/weila_config'
import {
  calculateOpusDataFrame,
  decompositionAudioData,
  fetchWithTimeout,
  getOpusDataListFromPttData,
  packPttPacket,
} from 'main/weila_utils'
import {
  WL_PttAudioPlaySource,
  WL_PttAudioPlayState,
  WL_PttPlayIndData,
} from 'main/weila_external_data'

const wllog = getLogger('FSM:info')
const wlerr = getLogger('FSM:err')

interface WL_PttMsgDataResult {
  msgData: WL_IDbMsgData
  isNewAudioItem: boolean
}

// 动作执行时的状态快照：v5 动作不再收到 actionMeta，改由订阅缓存最近一次快照。
type PttState = {
  value: StateValue
  historyValue: unknown
  matches: (partialStateValue: string | Record<string, string>) => boolean
  machine: { id: string }
  getMeta: () => Record<string, { playType?: WLPlayerType } | undefined>
}

interface PttActionArgs {
  context: PttFsmContext
  event: PttFsmEvent
}

// xstate v5 的 Actor 泛型对具体机型实例化过深（TS2589），在使用边界收窄为结构化接口
type PttActor = {
  getSnapshot(): PttState
  subscribe(observer: (state: PttState) => void): { unsubscribe(): void }
  send(event: PttFsmEvent): void
  start(): unknown
}

/** Ring-tone source, injectable so specs can observe playback orchestration. */
type WLRingPlayer = { weila_playRing(id: WL_ConfigID): Promise<boolean> }

/** Resolves after the given milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export default class WLPttFsm {
  readonly PLAY_DELAY = 200
  private static readonly RECENT_COMPLETED_PTT_LIMIT = 100
  static pttSeq = 0
  static readonly FRAME_COUNT = 25
  pttFsm: typeof pttFsm
  pttFsmService: PttActor
  playingAudioList: string[]
  playingAudioMap: Map<string, WL_PttAudioItem>
  waitingAudioMap: Map<string, WL_PttAudioItem>
  recentCompletedAudioMap: Map<string, WL_IDbMsgData>
  audioManager: WLAudio
  ringPlayer: WLRingPlayer
  streamPttPlayItem: WL_PttAudioItem | null = null
  singlePttPlayItem: WL_PttAudioItem | null = null
  historyPttPlayItems: WL_PttAudioItem[] | null = null
  historyPttPlayIndex: number
  talkingInfo: Partial<WL_TalkingInfo> | null

  constructor(
    private pttFsmListener: WL_PttFsmListener,
    audioManager?: WLAudio,
    ringPlayer?: WLRingPlayer,
  ) {
    this.talkingInfo = null
    this.historyPttPlayIndex = 0
    this.playingAudioList = []
    this.playingAudioMap = new Map<string, WL_PttAudioItem>()
    this.waitingAudioMap = new Map<string, WL_PttAudioItem>()
    this.recentCompletedAudioMap = new Map<string, WL_IDbMsgData>()
    this.audioManager = audioManager ?? new WLAudio()
    this.audioManager.onAudioEvent(this.onAudioMessage.bind(this))
    this.ringPlayer = ringPlayer ?? WeilaRingPlayer

    const context: PttFsmInput = { pttCore: this }

    this.pttFsm = pttFsm.provide({
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
        stopAndPlayNext: this.stopAndPlayNext.bind(this),
        onPausePlay: this.onPausePlay.bind(this),
        onResumePlay: this.onResumePlay.bind(this),
      },
      actors: {
        checkHistoryList: fromPromise(() => this.checkHistoryList()),
        checkPttPlayingList: fromPromise(() => this.checkPttPlayingList()),
        startPlayback: fromPromise(({ input }: { input: StartPlaybackInput }) =>
          this.runStartPlayback(input),
        ),
        finishStop: fromPromise(({ input }: { input: { playerType: WLPlayerType | null } }) =>
          this.finishStopPlayback(input),
        ),
        startTalking: fromPromise(({ input }: { input: PttFsmEvent }) => this.startTalking(input)),
        stopTalk: fromPromise(() => this.stopTalk()),
      },
    })

    this.pttFsmService = createActor(this.pttFsm, { input: context })
    this.pttFsmService.start()
  }

  private getPttAudioItemId(msgData: WL_IDbMsgData): string {
    if (msgData.pttData) {
      return [msgData.sessionId, msgData.sessionType, msgData.senderId, msgData.pttData.seq].join(
        '_',
      )
    }

    return msgData.combo_id
  }

  private rememberCompletedAudio(id: string, msgData: WL_IDbMsgData): void {
    this.recentCompletedAudioMap.set(id, msgData)

    if (this.recentCompletedAudioMap.size > WLPttFsm.RECENT_COMPLETED_PTT_LIMIT) {
      const [oldestId] = this.recentCompletedAudioMap.keys()
      this.recentCompletedAudioMap.delete(oldestId)
    }
  }

  // actions

  /** Handles entry into the idle state. */
  onIdle() {
    this.notifyPttDataReady().catch((_reason) => {})
  }

  getPttAudioSource(playerType: WLPlayerType): WL_PttAudioPlaySource {
    let source = WL_PttAudioPlaySource.PTT_AUDIO_SRC_HISTORY

    switch (playerType) {
      case WLPlayerType.WL_PTT_HISTORY_PLAYER:
        {
          source = WL_PttAudioPlaySource.PTT_AUDIO_SRC_HISTORY
        }

        break

      case WLPlayerType.WL_PTT_SINGLE_PLAYER:
        {
          source = WL_PttAudioPlaySource.PTT_AUDIO_SRC_SINGLE
        }

        break

      case WLPlayerType.WL_PTT_STREAM_PLAYER:
        {
          source = WL_PttAudioPlaySource.PTT_AUDIO_SRC_STREAM
        }

        break
    }

    return source
  }

  onPttPayloadPlaying({ context, event }: PttActionArgs) {
    wllog('进入了Playing状态', event, context)

    if (event.type === 'FSM_FEED_PTT_PAYLOAD_EVT') {
      this.feedAudioPayload(event.data, event.data.playerType)
    } else if (event.type === 'FSM_PLAY_NEXT_PTT_ITEM_EVT' && event.data) {
      const audioItem = event.data

      void this.ringPlayer
        .weila_playRing(WL_ConfigID.WL_RES_RING_START_PLAY_ID)
        .then((_playRet) => {
          wllog('播放铃声成功')
        })
        .finally(() => {
          this.onPlayInd(
            audioItem,
            audioItem.playerType,
            WL_PttAudioPlayState.PTT_AUDIO_PLAYING_START,
          )
          setTimeout(() => {
            this.feedAudioPayload(audioItem, audioItem.playerType)
          }, this.PLAY_DELAY)
        })
    }
  }

  onExitRealtime({ event }: PttActionArgs) {
    wllog('onExitRealtime', event.type)
  }

  onPlayItemFinish({ event }: PttActionArgs) {
    wllog('onPlayItemFinish', event.type)
    const audioItemId = this.playingAudioList.shift()

    if (audioItemId !== undefined) {
      this.playingAudioMap.delete(audioItemId)
    }

    wllog('after finish', this.playingAudioList, this.playingAudioMap)

    this.streamPttPlayItem = null
    void this.ringPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_STOP_PLAY_ID).finally(() => {
      this.pttFsmService.send({ type: fsmEvents.FSM_PTT_CHECK_RESOURCE_EVT })

      this.onPlayInd(
        null,
        WLPlayerType.WL_PTT_STREAM_PLAYER,
        WL_PttAudioPlayState.PTT_AUDIO_PLAYING_END,
      )
    })
  }

  private onPlayInd(
    audioItem: WL_PttAudioItem | null | undefined,
    playerType: WLPlayerType,
    state: WL_PttAudioPlayState,
  ) {
    const playIndData: WL_PttPlayIndData = {
      state,
      source: this.getPttAudioSource(playerType),
    }

    this.pttFsmListener.onPlayInd(audioItem, playIndData)
  }

  onSinglePlayEntry({ event }: PttActionArgs) {
    wllog('onSinglePlayEntry', event)

    if (event.type === 'FSM_PLAY_SINGLE_EVT') {
      this.singlePttPlayItem = event.data
    }
  }

  onSinglePlayExit({ event }: PttActionArgs) {
    wllog('onSinglePlayExit', event)
  }

  onSinglePlayFinish({ event }: PttActionArgs) {
    wllog('onSinglePlayFinish', event)
    void this.ringPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_STOP_PLAY_ID).finally(() => {
      this.pttFsmService.send({ type: fsmEvents.FSM_PLAY_END_EVT })
    })
  }

  onEnterRealtime({ event }: PttActionArgs) {
    wllog('onEnterRealtime', event.type, event)

    if (event.type === 'FSM_PLAY_REALTIME_EVT') {
      this.streamPttPlayItem = event.data
    }
  }

  onPttPayloadWaiting({ event }: PttActionArgs) {
    wllog('进入了Waiting状态', event.type)
  }

  feedData({ event }: PttActionArgs) {
    if (event.type !== 'FSM_FEED_PTT_PAYLOAD_EVT') return

    wllog('喂PTT数据:', event.data)
    this.feedAudioPayload(event.data, event.data.playerType)
  }

  // services

  /** Resolves the item the given family is currently playing, if any. */
  private playbackItem(family: StartPlaybackFamily): WL_PttAudioItem | null | undefined {
    if (family === 'realtime') {
      return this.streamPttPlayItem
    }

    if (family === 'single') {
      return this.singlePttPlayItem
    }

    return this.historyPttPlayItems?.[this.historyPttPlayIndex]
  }

  /**
   * Shared playback start for all three families: open the player, play the
   * start ring, start the player, announce PLAYING_START, then feed the first
   * payload after PLAY_DELAY. A rejection reaches the machine's onError,
   * which raises the family's failure event.
   */
  private async runStartPlayback(input: StartPlaybackInput): Promise<void> {
    try {
      await this.audioManager.openPlayer(input.playerType, 16000)

      try {
        await this.ringPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_START_PLAY_ID)
        wllog('播放铃声成功')
      } catch {
        // A failed start ring does not stop playback.
      }

      if (input.family === 'history' && this.audioManager.isPlayerStarted(input.playerType)) {
        return
      }

      const startRet = await this.audioManager.startPlay(input.playerType)
      wllog('播放器开始:', startRet)

      const item = this.playbackItem(input.family)

      if (!item) return

      if (input.family === 'realtime') {
        item.msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ

        if (item.shouldSave) {
          void WeilaDB.getInstance()
            .putMsgData(item.msgData)
            .then((value) => {
              wllog('更新消息结果', value)
            })
        }
      }

      this.onPlayInd(item, input.playerType, WL_PttAudioPlayState.PTT_AUDIO_PLAYING_START)

      await delay(this.PLAY_DELAY)

      const feedItem = this.playbackItem(input.family)

      if (feedItem) {
        this.feedAudioPayload(feedItem, input.playerType)
      }
    } catch (reason) {
      wlerr('启动播放失败:', reason)

      throw reason
    }
  }

  /** Opens the recorder and plays the start ring before talking. */
  async startTalking(event: PttFsmEvent): Promise<boolean> {
    this.talkingInfo = event.type === 'FSM_REQ_TALK_EVT' ? (event.data ?? null) : null
    await this.audioManager.openRecorder(16000, 20000)

    try {
      await this.ringPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_START_RECORD_ID)
    } catch {
      wlerr('播放铃声失败')
    }

    try {
      await this.audioManager.startRecord()
    } catch (_e) {
      await this.audioManager.closeRecorder()

      return Promise.reject(_e)
    }

    return true
  }

  async stopTalk(): Promise<boolean> {
    if (this.talkingInfo && !this.talkingInfo.stopByErr) {
      this.packetLastPttMsg()
    }

    try {
      await this.audioManager.stopRecord()
    } finally {
      try {
        await this.ringPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_STOP_RECORD_ID)
      } catch (_e) {
        wlerr('播放结束铣声错误', _e)
      }

      await this.audioManager.closeRecorder()
    }

    return true
  }

  async checkPttPlayingList(): Promise<WL_PttAudioItem> {
    return this.getNextPlayingItem()
  }

  onHistoryPlaying({ event }: PttActionArgs) {
    if (event.type === fsmEvents.FSM_PLAY_HISTORY_EVT) {
      this.historyPttPlayIndex = 0
      this.historyPttPlayItems = event.data
    }
  }

  onPlayNextItem({ event }: PttActionArgs) {
    wllog('onPlayNextItem', event.type)
  }

  onPlayHistoryItemFinish({ event }: PttActionArgs) {
    if (this.historyPttPlayItems?.length) {
      this.historyPttPlayItems.shift()
    }

    void this.ringPlayer.weila_playRing(WL_ConfigID.WL_RES_RING_STOP_PLAY_ID).finally(() => {
      this.pttFsmService.send({ type: fsmEvents.FSM_PTT_CHECK_RESOURCE_EVT })
      this.onPlayInd(
        event.type === 'FSM_PLAY_NEXT_PTT_ITEM_EVT' ? event.data : undefined,
        WLPlayerType.WL_PTT_HISTORY_PLAYER,
        WL_PttAudioPlayState.PTT_AUDIO_PLAYING_END,
      )
    })
  }

  async checkHistoryList(): Promise<WL_PttAudioItem> {
    if (this.historyPttPlayItems?.length) {
      return this.historyPttPlayItems[0]
    }

    return Promise.reject(new Error('历史音频数据播放完毕'))
  }

  onRequestTalkResult({ event }: PttActionArgs) {
    wllog('onRequestTalkResult', event)

    if (this.talkingInfo && this.talkingInfo.callback) {
      if ('error' in event) {
        this.talkingInfo.callback.reject(event.error)
      } else {
        WLPttFsm.pttSeq++
        this.talkingInfo.seqOfPackage = 0
        this.talkingInfo.curMarker = WL_PttPackType.PTT_FIRST_PACK
        this.talkingInfo.callback.resolve(true)
        this.talkingInfo.frameBufferCache = []
      }
    }
  }

  stopAndPlayNext({ context }: PttActionArgs) {
    const playType = context.activePlayerType!
    void this.audioManager.stopPlay(playType).finally(() => {
      this.pttFsmService.send({ type: fsmEvents.FSM_PTT_CHECK_RESOURCE_EVT })
    })
  }

  onStopPttPlay() {
    this.playingAudioList = []
    this.playingAudioMap.clear()
    this.streamPttPlayItem = null
  }

  /** Pauses the single player in place; the machine stays in singlePlaying. */
  onPausePlay() {
    wllog('onPausePlay')

    this.audioManager.pausePlay(WLPlayerType.WL_PTT_SINGLE_PLAYER).catch((reason) => {
      wlerr('暂停播放失败:', reason)
    })
  }

  /** Resumes the single player from the paused position. */
  onResumePlay() {
    wllog('onResumePlay')

    this.audioManager.resumePlay(WLPlayerType.WL_PTT_SINGLE_PLAYER).catch((reason) => {
      wlerr('恢复播放失败:', reason)
    })
  }

  /** Announces the end of playback; the machine's finishStop actor stops and closes. */
  stopPlay({ context }: PttActionArgs) {
    const playType = context.activePlayerType!
    wllog('stopPlay playType:', playType)

    this.onPlayInd(null, playType, WL_PttAudioPlayState.PTT_AUDIO_PLAYING_END)
  }

  /** Stops and closes the active player; failures are logged, the stop still completes. */
  async finishStopPlayback(input: { playerType: WLPlayerType | null }): Promise<void> {
    const playerType = input.playerType

    if (playerType === null) return

    try {
      await this.audioManager.stopPlay(playerType)
    } catch (reason) {
      wlerr('停止播放失败:', reason)
    }

    try {
      await this.audioManager.closePlayer(playerType)
    } catch (reason) {
      wlerr('关闭播放器失败:', reason)
    }
  }

  onTalking() {
    wllog('onTalking')
  }

  feedAudioPayload(audioItem: WL_PttAudioItem, playerType: WLPlayerType): boolean {
    wllog(
      '喂播放器:%d 数据:',
      playerType,
      audioItem.playIndex,
      audioItem.payloadList.length,
      audioItem.isCompleted,
    )

    if (audioItem && audioItem.playIndex < audioItem.payloadList.length) {
      const opusData = audioItem.payloadList[audioItem.playIndex++]
      const opusRawDataList = getOpusDataListFromPttData(opusData.data)
      this.audioManager.putPlayerOpusData(playerType, opusRawDataList)

      this.onPlayInd(audioItem, playerType, WL_PttAudioPlayState.PTT_AUDIO_PLAYING)
    }

    if (audioItem.playIndex === audioItem.payloadList.length && audioItem.isCompleted) {
      this.audioManager.putPlayerOpusData(playerType, null)

      return true
    } else if (audioItem.payloadList.length > audioItem.playIndex) {
      this.pttFsmService.send({ type: fsmEvents.FSM_FEED_PTT_PAYLOAD_EVT, data: audioItem })

      return true
    }

    this.pttFsmService.send({ type: fsmEvents.FSM_PTT_OUT_OF_PAYLOAD_EVT })

    return false
  }

  private onAudioMessage(event: WLAudioEvent, data: any): void {
    switch (event) {
      case WLAudioEvent.WL_AUDIO_FINISH_PLAY_IND:
        {
          wllog('播放完毕...')
          this.pttFsmService.send({ type: fsmEvents.FSM_PTT_ITEM_PLAY_END_EVT })
        }

        break

      case WLAudioEvent.WL_AUDIO_OPUS_CODED_DATA_IND:
        {
          const talkingInfo = this.talkingInfo

          // Frames arrive only while talking, after onRequestTalkResult completed the info.
          if (!talkingInfo?.frameBufferCache) break

          if (
            talkingInfo.curMarker === WL_PttPackType.PTT_END_PACK ||
            talkingInfo.curMarker === WL_PttPackType.PTT_WHOLE_PACK
          ) {
            break
          }

          talkingInfo.frameBufferCache.push(data)

          if (talkingInfo.frameBufferCache.length >= 25) {
            this.packetPttMsg(talkingInfo.frameBufferCache.slice(0, WLPttFsm.FRAME_COUNT), false)
            talkingInfo.frameBufferCache.splice(0, WLPttFsm.FRAME_COUNT)
          }
        }

        break
    }
  }

  private fillPttAudioData(audioItem: WL_PttAudioItem, msgData: WL_IDbMsgData) {
    if (audioItem.msgData.audioData === undefined) {
      audioItem.msgData.audioData = { frameCount: 0, data: new Uint8Array(0) }
    }

    if (msgData.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE) {
      const pttData = msgData.pttData
      const audioData = audioItem.msgData.audioData

      if (!pttData || !audioData?.data) return

      const newBufferLength = audioData.data.length + pttData.data.length
      const newBuffer = new Uint8Array(newBufferLength)
      newBuffer.set(audioData.data, 0)
      newBuffer.set(pttData.data, audioData.data.length)
      audioData.data = newBuffer
      audioData.frameCount += pttData.frameCount
    }
  }

  getAudioMsgDataPriority(_msgData: WL_IDbMsgData): number {
    //TODO: 后续会有依据的
    return 0
  }

  async canAudioMsgDataPlay(msgData: WL_IDbMsgData): Promise<boolean> {
    const sessionSetting = await WeilaDB.getInstance().getSessionSetting(
      msgData.sessionId,
      msgData.sessionType,
    )

    if (sessionSetting) {
      return !sessionSetting.mute
    }

    return true
  }

  async getNextPlayingItem(): Promise<WL_PttAudioItem> {
    wllog('getNextPlayingItem', this.playingAudioList.length)

    if (this.playingAudioList.length) {
      // 跳过不能播放的项，并把不能播且未收集完的项存入等待队列
      let result = false

      while (this.playingAudioList.length) {
        const audioItem = this.playingAudioMap.get(this.playingAudioList[0])
        wllog('getNextPlayingItem 1', this.playingAudioList, this.playingAudioMap)

        if (audioItem) {
          result = await this.canAudioMsgDataPlay(audioItem.msgData)

          if (result) {
            audioItem.msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ

            if (audioItem.shouldSave) {
              void WeilaDB.getInstance()
                .putMsgData(audioItem.msgData)
                .then((_value) => {
                  wllog('更新成功:', audioItem.msgData)
                })
            }

            break
          } else {
            this.playingAudioMap.delete(this.playingAudioList[0])
            this.playingAudioList.shift()
            wllog('getNextPlayingItem 2', this.playingAudioList, this.playingAudioMap)

            if (!audioItem.isCompleted) {
              this.waitingAudioMap.set(audioItem.id, audioItem)
            }
          }
        } else {
          this.playingAudioList.shift()
        }
      }

      if (result) {
        const nextItem = this.playingAudioMap.get(this.playingAudioList[0])

        if (nextItem) return nextItem
      }
    }

    return Promise.reject(new Error('没有其他数据了'))
  }

  async notifyPttDataReady(): Promise<void> {
    wllog(
      '当前的状态:',
      this.pttFsmService.getSnapshot().value,
      this.pttFsmService.getSnapshot().historyValue,
    )

    if (
      this.pttFsmService.getSnapshot().matches('idle') ||
      this.pttFsmService.getSnapshot().matches('realtimePlaying.waitPayload')
    ) {
      wllog('当前播放数据:', this.playingAudioList.length)

      try {
        let audioItem = null

        if (this.streamPttPlayItem) {
          audioItem = this.streamPttPlayItem
        } else {
          audioItem = await this.getNextPlayingItem()
        }

        if (this.pttFsmService.getSnapshot().matches('idle')) {
          this.pttFsmService.send({ type: fsmEvents.FSM_PLAY_REALTIME_EVT, data: audioItem })
        } else {
          this.pttFsmService.send({ type: fsmEvents.FSM_FEED_PTT_PAYLOAD_EVT, data: audioItem })
        }
      } catch (e) {
        wlerr('获取数据异常:', e)
      }
    }
  }

  putAudioMsgData(msgData: WL_IDbMsgData, shouldSave: boolean) {
    if (msgData.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE) {
      const msgAudioData = msgData.audioData

      if (!msgAudioData) return

      const audioItem: WL_PttAudioItem = {
        id: msgData.combo_id,
        playerType: WLPlayerType.WL_PTT_STREAM_PLAYER,
        isCompleted: true,
        msgData,
        priority: this.getAudioMsgDataPriority(msgData),
        playIndex: 0,
        recvWaitTimerId: undefined,
        shouldSave,
        payloadList: [],
      }

      if (msgAudioData.data) {
        audioItem.payloadList = decompositionAudioData(msgAudioData.data)
        this.playingAudioMap.set(audioItem.id, audioItem)
        this.playingAudioList.push(audioItem.id)
        this.notifyPttDataReady().catch((reason) => {
          wlerr('播放异常:', reason)
        })
      } else if (msgAudioData.audioUrl && msgAudioData.audioUrl.length > 0) {
        // let matchResult = msgData.audioData.audioUrl.match(/(http|https):\/\/([^\/]+)\/(.+)/i);
        // const newUrl = '/audio/' + matchResult[3];
        const newUrl = msgAudioData.audioUrl
        fetchWithTimeout(newUrl, { method: 'GET', mode: 'cors' }, 5000)
          .then(async (result) => {
            if (result.ok) {
              try {
                const data = await result.arrayBuffer()
                const audioRaw = new Uint8Array(data.slice(10))

                const audioData: WL_IDbAudioData = {
                  data: audioRaw,
                  frameCount: calculateOpusDataFrame(audioRaw),
                }

                audioItem.payloadList = decompositionAudioData(audioRaw)

                msgAudioData.audioUrl = undefined
                msgAudioData.data = audioRaw
                msgAudioData.frameCount = audioData.frameCount

                this.playingAudioMap.set(audioItem.id, audioItem)
                this.playingAudioList.push(audioItem.id)
                this.notifyPttDataReady().catch((reason) => {
                  wlerr('播放异常:', reason)
                })
              } catch (e) {
                wlerr('获取语音数据出错', e)
              }
            }
          })
          .catch((reason) => {
            wlerr('获取数据异常', reason)
          })
      }
    }
  }

  async putPttMsgData(msgData: WL_IDbMsgData): Promise<WL_PttMsgDataResult> {
    wllog('消息类型:', msgData.msgType)

    const setAudioMsgWaitTimer = (audioItem: WL_PttAudioItem) => {
      audioItem.recvWaitTimerId = setTimeout(async () => {
        audioItem.isCompleted = true
        audioItem.msgData.pttData = undefined
        audioItem.msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
        this.rememberCompletedAudio(audioItem.id, audioItem.msgData)

        try {
          await WeilaDB.getInstance().putMsgData(audioItem.msgData)
          wllog('超时保存消息成功')
        } catch (e) {
          wlerr('超时保存消息失败', e)
        }

        this.waitingAudioMap.delete(audioItem.id)
      }, 30000)
    }

    if (msgData.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE) {
      const pttData = msgData.pttData

      if (!pttData) {
        return { msgData, isNewAudioItem: false }
      }

      const id = this.getPttAudioItemId(msgData)
      const recentMsgData = this.recentCompletedAudioMap.get(id)

      if (recentMsgData && !this.waitingAudioMap.has(id) && !this.playingAudioMap.has(id)) {
        return {
          msgData: recentMsgData,
          isNewAudioItem: false,
        }
      }

      if (this.waitingAudioMap.has(id)) {
        wllog('等待队列拥有消息:', id)
        const audioItem: WL_PttAudioItem = this.waitingAudioMap.get(id)!
        audioItem.msgData.msgId = Math.max(audioItem.msgData.msgId || 0, msgData.msgId || 0)
        audioItem.msgData.created = Math.max(audioItem.msgData.created || 0, msgData.created || 0)

        if (audioItem.recvWaitTimerId) {
          clearTimeout(audioItem.recvWaitTimerId)
          audioItem.recvWaitTimerId = null
        }

        this.fillPttAudioData(audioItem, msgData)
        audioItem.msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
        audioItem.isCompleted = pttData.mark === 0x02 || pttData.mark === 0x03
        wllog('消息是完整的？', audioItem.isCompleted, pttData.mark)

        if (audioItem.isCompleted) {
          audioItem.msgData.pttData = undefined
          audioItem.msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
          this.waitingAudioMap.delete(id)
          this.rememberCompletedAudio(id, audioItem.msgData)
        } else {
          wllog('设置消息超时时间')
          setAudioMsgWaitTimer(audioItem)
        }

        try {
          audioItem.msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW
          await WeilaDB.getInstance().putMsgData(audioItem.msgData)
          wllog('保存音频消息成功')
        } catch (e) {
          wlerr('保存音频消息异常:', e)
        }

        return {
          msgData: audioItem.msgData,
          isNewAudioItem: false,
        }
      } else {
        wllog('消息不在等待队列中', id)
        const existingItem = this.playingAudioMap.get(id)
        const payload: WL_PttPayload = { data: pttData.data, frameCount: pttData.frameCount }
        let audioItem: WL_PttAudioItem
        let isNewAudioItem = false

        wllog('处理音频消息:', this.playingAudioList, this.playingAudioMap)

        if (existingItem) {
          wllog('消息在播放队列中', id)
          audioItem = existingItem
          audioItem.msgData.msgId = Math.max(audioItem.msgData.msgId || 0, msgData.msgId || 0)
          audioItem.msgData.created = Math.max(audioItem.msgData.created || 0, msgData.created || 0)

          if (audioItem.recvWaitTimerId) {
            clearTimeout(audioItem.recvWaitTimerId)
            audioItem.recvWaitTimerId = null
          }

          this.fillPttAudioData(audioItem, msgData)
          audioItem.msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
          audioItem.isCompleted = pttData.mark === 0x02 || pttData.mark === 0x03
        } else {
          wllog('消息不在播放队列中', id)
          this.playingAudioList.push(id)
          isNewAudioItem = true
          audioItem = {
            playerType: WLPlayerType.WL_PTT_STREAM_PLAYER,
            shouldSave: true,
            msgData,
            id,
            priority: this.getAudioMsgDataPriority(msgData),
            payloadList: [],
            playIndex: 0,
            isCompleted: pttData.mark === 0x02 || pttData.mark === 0x03,
            recvWaitTimerId: undefined,
          }
          audioItem.msgData.combo_id = id
          audioItem.msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW
          this.fillPttAudioData(audioItem, msgData)
          audioItem.msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
        }

        if (audioItem.shouldSave) {
          try {
            await WeilaDB.getInstance().putMsgData(audioItem.msgData)
            wllog('保存音频消息成功')
          } catch (e) {
            wlerr('保存音频消息异常:', e)
          }
        }

        audioItem.payloadList.push(payload)

        if (audioItem.isCompleted) {
          wllog('音频消息是完整的')
          audioItem.msgData.pttData = undefined
          audioItem.msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
          this.rememberCompletedAudio(id, audioItem.msgData)
        } else {
          wllog('音频消息是不完整的')
          setAudioMsgWaitTimer(audioItem)
        }

        this.playingAudioMap.set(id, audioItem)
        wllog('通知播放')
        this.notifyPttDataReady().catch((reason) => {
          wlerr('播放异常:', reason)
        })

        return {
          msgData: audioItem.msgData,
          isNewAudioItem,
        }
      }
    }

    return { msgData, isNewAudioItem: false }
  }

  async initAudio(): Promise<boolean> {
    return this.audioManager.init()
  }

  async playSingle(msgData: WL_IDbMsgData): Promise<boolean> {
    if (msgData && msgData.msgType !== WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE) {
      return false
    }

    // 确保音频系统已初始化（initAudio 内部有 isInited flag，重复调用无副作用）
    await this.initAudio()

    const audioData = msgData.audioData

    if (!audioData?.data) return false

    const audioItem: WL_PttAudioItem = {
      msgData,
      id: msgData.combo_id,
      playerType: WLPlayerType.WL_PTT_SINGLE_PLAYER,
      playIndex: 0,
      payloadList: decompositionAudioData(audioData.data),
      isCompleted: true,
      priority: 0,
      recvWaitTimerId: undefined,
      shouldSave: false,
    }

    this.pttFsmService.send({ type: fsmEvents.FSM_PLAY_SINGLE_EVT, data: audioItem })

    return true
  }

  async playHistory(msgDatas: WL_IDbMsgData[]): Promise<boolean> {
    if (msgDatas.length === 0) {
      return false
    }

    // 历史播放同样依赖浏览器音频上下文，先沿用统一初始化逻辑。
    await this.initAudio()

    const audioItems: WL_PttAudioItem[] = []
    msgDatas.forEach((value) => {
      if (value.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE) {
        const audioData = value.audioData

        if (!audioData?.data) return

        const audioItem: WL_PttAudioItem = {
          msgData: value,
          id: value.combo_id,
          playerType: WLPlayerType.WL_PTT_HISTORY_PLAYER,
          playIndex: 0,
          payloadList: decompositionAudioData(audioData.data),
          isCompleted: true,
          priority: 0,
          recvWaitTimerId: undefined,
          shouldSave: false,
        }

        audioItems.push(audioItem)
      }
    })

    this.pttFsmService.send({ type: fsmEvents.FSM_PLAY_HISTORY_EVT, data: audioItems })

    return true
  }

  async requestTalk(): Promise<boolean> {
    // 确保音频系统已初始化（initAudio 内部有 isInited flag，重复调用无副作用）
    await this.initAudio()

    return new Promise<boolean>((resolve, reject) => {
      const talkingInfo: Partial<WL_TalkingInfo> = {
        callback: { resolve, reject },
        stopByErr: false,
      }

      this.pttFsmService.send({ type: fsmEvents.FSM_REQ_TALK_EVT, data: talkingInfo })
    })
  }

  async releaseTalkByError(): Promise<boolean> {
    if (this.talkingInfo) {
      this.talkingInfo.stopByErr = true
      this.talkingInfo.curMarker = WL_PttPackType.PTT_END_PACK
    }

    this.pttFsmService.send({ type: fsmEvents.FSM_REL_TALK_EVT })

    return true
  }

  async releaseTalk(): Promise<boolean> {
    if (this.talkingInfo) {
      this.talkingInfo.stopByErr = false
      this.talkingInfo.curMarker = WL_PttPackType.PTT_END_PACK
    }

    this.pttFsmService.send({ type: fsmEvents.FSM_REL_TALK_EVT })

    return true
  }

  private packetPttMsg(dataList: Uint8Array[], lastPacket: boolean): void {
    const talkingInfo = this.talkingInfo

    // Runs only while talking, i.e. after onRequestTalkResult completed the info.
    if (!talkingInfo?.frameBufferCache || talkingInfo.curMarker === undefined) return

    wllog('打包%d ptt语音并发送最后一个包', dataList.length, lastPacket)

    if (lastPacket) {
      wllog('最后一帧录音, 分段标志:', talkingInfo.curMarker)
    }

    const { packet, nextState } = packPttPacket(
      dataList,
      {
        curMarker: talkingInfo.curMarker,
        seqOfPackage: talkingInfo.seqOfPackage ?? 0,
        seq: WLPttFsm.pttSeq,
      },
      lastPacket,
    )

    talkingInfo.seqOfPackage = nextState.seqOfPackage
    talkingInfo.curMarker = nextState.curMarker

    this.pttFsmListener.onRecordPttPacketInd(packet)
  }

  private packetLastPttMsg(): void {
    const talkingInfo = this.talkingInfo

    // Before talking is granted the info is still a seed; there is nothing to packet.
    if (!talkingInfo?.frameBufferCache) return

    if (talkingInfo.frameBufferCache.length > 0) {
      while (talkingInfo.frameBufferCache.length >= WLPttFsm.FRAME_COUNT) {
        this.packetPttMsg(
          talkingInfo.frameBufferCache.slice(0, WLPttFsm.FRAME_COUNT),
          talkingInfo.frameBufferCache.length === WLPttFsm.FRAME_COUNT,
        )
        talkingInfo.frameBufferCache.splice(0, WLPttFsm.FRAME_COUNT)
      }

      if (talkingInfo.frameBufferCache.length > 0) {
        this.packetPttMsg(talkingInfo.frameBufferCache, true)
      }
    } else {
      this.packetPttMsg([], true)
    }
  }

  public stopPlayAudio() {
    this.pttFsmService.send({ type: fsmEvents.FSM_STOP_EVT })
  }

  /**
   * 等待机器回到空闲：事件驱动，替代对快照的定时轮询。
   * @param timeoutMs 最长等待毫秒数
   * @returns 回到空闲时兑现，超时拒绝
   */
  public waitForIdle(timeoutMs = 5000): Promise<void> {
    if (this.pttFsmService.getSnapshot().matches('idle')) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve, reject) => {
      const finish = (settled: () => void) => {
        clearTimeout(timer)
        subscription.unsubscribe()
        settled()
      }

      const timer = setTimeout(() => {
        finish(() => reject(new Error('stopPlayAudio timeout')))
      }, timeoutMs)

      const subscription = this.pttFsmService.subscribe((state) => {
        if (state.matches('idle')) {
          finish(resolve)
        }
      })
    })
  }

  public playNext() {
    this.pttFsmService.send({ type: fsmEvents.FSM_STOP_AND_PLAY_NEXT_EVT })
  }

  /** Pauses the current single playback in place. */
  public pausePlayAudio() {
    this.pttFsmService.send({ type: fsmEvents.FSM_PAUSE_PLAY_EVT })
  }

  /** Resumes the paused single playback from where it stopped. */
  public resumePlayAudio() {
    this.pttFsmService.send({ type: fsmEvents.FSM_RESUME_PLAY_EVT })
  }

  /**
   * 已播放的毫秒数，按单发播放器消费的 PCM 帧换算；暂停期间冻结。
   * @returns 已播放毫秒数，播放器未启动时为 0
   */
  public async getPlayProgressMs(): Promise<number> {
    return this.audioManager.getPlayerPlayedMs(WLPlayerType.WL_PTT_SINGLE_PLAYER)
  }
}
