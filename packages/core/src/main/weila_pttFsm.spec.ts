import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WLAudio } from 'audio/weila_audio'
import { WLPlayerType } from 'audio/weila_audio_data'
import { WL_ConfigID } from 'main/weila_config'
import WLPttFsm from 'main/weila_pttFsm'
import { WL_IDbMsgData, WL_IDbMsgDataStatus, WL_IDbMsgDataType } from 'db/weila_db_data'
import type { WL_PttAudioItem, WL_PttFsmListener, WL_PttPayload } from 'main/weila_internal_data'
import { WL_PttAudioPlayState } from 'main/weila_external_data'
import { fsmEvents } from 'fsm/weila_fsmScript'

/**
 * Characterization pin for the three playback-start chains (realtime,
 * single, history). Each chain runs the same five-step orchestration: open
 * the player, play the start ring, start the player, emit PLAYING_START,
 * then feed the first payload after PLAY_DELAY. These specs observe the
 * orchestration through injected fakes so the upcoming consolidation onto
 * one startPlayback actor has a behavioral contract to hold.
 */

function makeOpusPayload(): WL_PttPayload {
  // One opus frame: flag 0x00, length 3, three payload bytes.
  return { frameCount: 1, data: new Uint8Array([0x00, 0x03, 0x11, 0x22, 0x33]) }
}

function makeMsgData(): WL_IDbMsgData {
  return {
    combo_id: 'combo-1',
    senderId: 7,
    sessionId: '1619165',
    sessionType: 18,
    msgId: 1,
    msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE,
    created: 1732300000,
    autoReply: 0,
    status: WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW,
  }
}

function makeItem(playerType: WLPlayerType): WL_PttAudioItem {
  return {
    id: 'item-1',
    msgData: makeMsgData(),
    payloadList: [makeOpusPayload()],
    priority: 0,
    isCompleted: false,
    recvWaitTimerId: null,
    playIndex: 0,
    playerType,
    shouldSave: false,
  }
}

class RecordingAudioManager extends WLAudio {
  openPlayer = vi.fn(async (_playerType: WLPlayerType, _sampleRate: number) => true)
  startPlay = vi.fn(async (_playerType: WLPlayerType) => true)
  isPlayerStarted = vi.fn((_playerType: WLPlayerType) => false)
  putPlayerOpusData = vi.fn((_playerType: WLPlayerType, _data: Uint8Array[] | null) => {})
  stopPlay = vi.fn(async (_playerType: WLPlayerType) => true)
  closePlayer = vi.fn(async (_playerType: WLPlayerType) => true)
  pausePlay = vi.fn(async (_playerType: WLPlayerType) => true)
  resumePlay = vi.fn(async (_playerType: WLPlayerType) => true)
  getPlayerPlayedMs = vi.fn(async (_playerType: WLPlayerType) => 0)
}

function makePttFsm() {
  const audio = new RecordingAudioManager()
  const ringPlayer = { weila_playRing: vi.fn(async (_id: WL_ConfigID) => true) }
  const onPlayInd = vi.fn()

  const listener: WL_PttFsmListener = {
    onPlayInd,
    onRecordPttPacketInd: vi.fn(),
  }

  const fsm = new WLPttFsm(listener, audio, ringPlayer)

  const visited: string[] = []
  fsm.pttFsmService.subscribe((state) => {
    visited.push(JSON.stringify(state.value))
  })

  return { audio, ringPlayer, onPlayInd, fsm, visited }
}

/** PLAY_DELAY plus slack, with the intermediate microtasks flushed. */
async function advancePastPlayDelay(): Promise<void> {
  await vi.advanceTimersByTimeAsync(250)
}

function playIndStates(onPlayInd: ReturnType<typeof vi.fn>): number[] {
  return onPlayInd.mock.calls.map((call) => call[1].state)
}

describe('WLPttFsm playback-start chains', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('realtime: opens, rings, starts, announces, and feeds after the delay', async () => {
    const { audio, ringPlayer, onPlayInd, fsm } = makePttFsm()
    const item = makeItem(WLPlayerType.WL_PTT_STREAM_PLAYER)

    fsm.pttFsmService.send({ type: fsmEvents.FSM_PLAY_REALTIME_EVT, data: item })
    await advancePastPlayDelay()

    expect(audio.openPlayer).toHaveBeenCalledWith(WLPlayerType.WL_PTT_STREAM_PLAYER, 16000)
    expect(ringPlayer.weila_playRing).toHaveBeenCalledWith(WL_ConfigID.WL_RES_RING_START_PLAY_ID)
    expect(audio.startPlay).toHaveBeenCalledWith(WLPlayerType.WL_PTT_STREAM_PLAYER)

    expect(audio.openPlayer.mock.invocationCallOrder[0]).toBeLessThan(
      audio.startPlay.mock.invocationCallOrder[0],
    )
    expect(audio.startPlay.mock.invocationCallOrder[0]).toBeLessThan(
      audio.putPlayerOpusData.mock.invocationCallOrder[0],
    )

    const states = playIndStates(onPlayInd)

    expect(states[0]).toBe(WL_PttAudioPlayState.PTT_AUDIO_PLAYING_START)
    expect(states).toContain(WL_PttAudioPlayState.PTT_AUDIO_PLAYING)
    expect(onPlayInd.mock.calls[0][0]).toBe(item)

    expect(audio.putPlayerOpusData).toHaveBeenCalledTimes(1)
    expect(audio.putPlayerOpusData.mock.calls[0][0]).toBe(WLPlayerType.WL_PTT_STREAM_PLAYER)
    expect(audio.putPlayerOpusData.mock.calls[0][1]).toHaveLength(1)

    // A single-frame item exhausts its payload, so realtime waits for more.
    expect(fsm.pttFsmService.getSnapshot().matches('realtimePlaying.waitPayload')).toBe(true)

    // Realtime playback marks the message read.
    expect(item.msgData.status).toBe(WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ)
  })

  it('realtime: a failed player open stops playback through FSM_STOP_EVT', async () => {
    const { audio, fsm, visited } = makePttFsm()
    audio.openPlayer.mockRejectedValueOnce(new Error('open failed'))

    fsm.pttFsmService.send({
      type: fsmEvents.FSM_PLAY_REALTIME_EVT,
      data: makeItem(WLPlayerType.WL_PTT_STREAM_PLAYER),
    })
    await advancePastPlayDelay()

    expect(audio.startPlay).not.toHaveBeenCalled()
    expect(visited.some((entry) => entry.includes('realtimeStop'))).toBe(true)

    // The stop completes: the stream player is stopped and closed, and the
    // machine returns to idle. Before the fix this entry action crashed on a
    // stale latestState and killed the actor.
    expect(audio.stopPlay).toHaveBeenCalledWith(WLPlayerType.WL_PTT_STREAM_PLAYER)
    expect(audio.closePlayer).toHaveBeenCalledWith(WLPlayerType.WL_PTT_STREAM_PLAYER)
    expect(fsm.pttFsmService.getSnapshot().matches('idle')).toBe(true)
  })

  it('single: starts the single player and holds state when payload runs out', async () => {
    const { audio, ringPlayer, onPlayInd, fsm } = makePttFsm()
    const item = makeItem(WLPlayerType.WL_PTT_SINGLE_PLAYER)

    fsm.pttFsmService.send({ type: fsmEvents.FSM_PLAY_SINGLE_EVT, data: item })
    await advancePastPlayDelay()

    expect(audio.openPlayer).toHaveBeenCalledWith(WLPlayerType.WL_PTT_SINGLE_PLAYER, 16000)
    expect(ringPlayer.weila_playRing).toHaveBeenCalledWith(WL_ConfigID.WL_RES_RING_START_PLAY_ID)
    expect(audio.startPlay).toHaveBeenCalledWith(WLPlayerType.WL_PTT_SINGLE_PLAYER)
    expect(audio.putPlayerOpusData).toHaveBeenCalledTimes(1)
    expect(playIndStates(onPlayInd)[0]).toBe(WL_PttAudioPlayState.PTT_AUDIO_PLAYING_START)

    // singlePlaying has no out-of-payload transition; the machine holds.
    expect(fsm.pttFsmService.getSnapshot().matches('singlePlaying')).toBe(true)
    expect(fsm.singlePttPlayItem).toBe(item)
  })

  it('single: a failed startPlay stops playback through FSM_STOP_EVT', async () => {
    const { audio, fsm, visited } = makePttFsm()
    audio.startPlay.mockRejectedValueOnce(new Error('start failed'))

    fsm.pttFsmService.send({
      type: fsmEvents.FSM_PLAY_SINGLE_EVT,
      data: makeItem(WLPlayerType.WL_PTT_SINGLE_PLAYER),
    })
    await advancePastPlayDelay()

    expect(audio.putPlayerOpusData).not.toHaveBeenCalled()
    expect(visited.some((entry) => entry.includes('singleStopping'))).toBe(true)

    expect(audio.stopPlay).toHaveBeenCalledWith(WLPlayerType.WL_PTT_SINGLE_PLAYER)
    expect(audio.closePlayer).toHaveBeenCalledWith(WLPlayerType.WL_PTT_SINGLE_PLAYER)
    expect(fsm.pttFsmService.getSnapshot().matches('idle')).toBe(true)
  })

  it('history: starts the history player and feeds the first item', async () => {
    const { audio, ringPlayer, onPlayInd, fsm } = makePttFsm()
    const item = makeItem(WLPlayerType.WL_PTT_HISTORY_PLAYER)

    fsm.pttFsmService.send({ type: fsmEvents.FSM_PLAY_HISTORY_EVT, data: [item] })
    await advancePastPlayDelay()

    expect(audio.openPlayer).toHaveBeenCalledWith(WLPlayerType.WL_PTT_HISTORY_PLAYER, 16000)
    expect(ringPlayer.weila_playRing).toHaveBeenCalledWith(WL_ConfigID.WL_RES_RING_START_PLAY_ID)
    expect(audio.isPlayerStarted).toHaveBeenCalledWith(WLPlayerType.WL_PTT_HISTORY_PLAYER)
    expect(audio.startPlay).toHaveBeenCalledWith(WLPlayerType.WL_PTT_HISTORY_PLAYER)
    expect(audio.putPlayerOpusData).toHaveBeenCalledTimes(1)

    expect(playIndStates(onPlayInd)[0]).toBe(WL_PttAudioPlayState.PTT_AUDIO_PLAYING_START)
    expect(onPlayInd.mock.calls[0][0]).toBe(item)

    // historyPlaying also has no out-of-payload transition; the machine holds.
    expect(fsm.pttFsmService.getSnapshot().matches('historyPlaying')).toBe(true)
  })

  it('history: a failed player open ends playback through FSM_PLAY_END_EVT', async () => {
    const { audio, fsm, visited } = makePttFsm()
    audio.openPlayer.mockRejectedValueOnce(new Error('open failed'))

    fsm.pttFsmService.send({
      type: fsmEvents.FSM_PLAY_HISTORY_EVT,
      data: [makeItem(WLPlayerType.WL_PTT_HISTORY_PLAYER)],
    })
    await advancePastPlayDelay()

    expect(audio.startPlay).not.toHaveBeenCalled()
    expect(visited.some((entry) => entry.includes('historyStopping'))).toBe(true)

    expect(audio.stopPlay).toHaveBeenCalledWith(WLPlayerType.WL_PTT_HISTORY_PLAYER)
    expect(audio.closePlayer).toHaveBeenCalledWith(WLPlayerType.WL_PTT_HISTORY_PLAYER)
    expect(fsm.pttFsmService.getSnapshot().matches('idle')).toBe(true)
  })

  it('history: skips startPlay when the player reports it is already started', async () => {
    const { audio, fsm } = makePttFsm()
    audio.isPlayerStarted.mockReturnValue(true)

    fsm.pttFsmService.send({
      type: fsmEvents.FSM_PLAY_HISTORY_EVT,
      data: [makeItem(WLPlayerType.WL_PTT_HISTORY_PLAYER)],
    })
    await advancePastPlayDelay()

    expect(audio.startPlay).not.toHaveBeenCalled()
    expect(audio.putPlayerOpusData).not.toHaveBeenCalled()
  })

  it('single: pause holds the state and resume goes back to playing', async () => {
    const { audio, fsm } = makePttFsm()
    const item = makeItem(WLPlayerType.WL_PTT_SINGLE_PLAYER)

    fsm.pttFsmService.send({ type: fsmEvents.FSM_PLAY_SINGLE_EVT, data: item })
    await advancePastPlayDelay()

    audio.pausePlay.mockClear()
    audio.resumePlay.mockClear()

    // Pause stays inside singlePlaying; only the player is paused.
    fsm.pttFsmService.send({ type: fsmEvents.FSM_PAUSE_PLAY_EVT })

    expect(audio.pausePlay).toHaveBeenCalledWith(WLPlayerType.WL_PTT_SINGLE_PLAYER)
    expect(audio.resumePlay).not.toHaveBeenCalled()
    expect(fsm.pttFsmService.getSnapshot().matches('singlePlaying')).toBe(true)

    // Resume continues in the same state through the single player.
    fsm.pttFsmService.send({ type: fsmEvents.FSM_RESUME_PLAY_EVT })

    expect(audio.resumePlay).toHaveBeenCalledWith(WLPlayerType.WL_PTT_SINGLE_PLAYER)
    expect(fsm.pttFsmService.getSnapshot().matches('singlePlaying')).toBe(true)
  })

  it('single: a stop after pause still completes the stop chain', async () => {
    const { audio, fsm } = makePttFsm()
    const item = makeItem(WLPlayerType.WL_PTT_SINGLE_PLAYER)

    fsm.pttFsmService.send({ type: fsmEvents.FSM_PLAY_SINGLE_EVT, data: item })
    await advancePastPlayDelay()

    fsm.pttFsmService.send({ type: fsmEvents.FSM_PAUSE_PLAY_EVT })
    fsm.pttFsmService.send({ type: fsmEvents.FSM_STOP_EVT })
    await advancePastPlayDelay()

    expect(audio.stopPlay).toHaveBeenCalledWith(WLPlayerType.WL_PTT_SINGLE_PLAYER)
    expect(audio.closePlayer).toHaveBeenCalledWith(WLPlayerType.WL_PTT_SINGLE_PLAYER)
    expect(fsm.pttFsmService.getSnapshot().matches('idle')).toBe(true)
  })

  it('waitForIdle resolves once the stop chain completes', async () => {
    const { fsm } = makePttFsm()
    const item = makeItem(WLPlayerType.WL_PTT_SINGLE_PLAYER)

    fsm.pttFsmService.send({ type: fsmEvents.FSM_PLAY_SINGLE_EVT, data: item })
    await advancePastPlayDelay()
    expect(fsm.pttFsmService.getSnapshot().matches('singlePlaying')).toBe(true)

    fsm.stopPlayAudio()

    await expect(fsm.waitForIdle(5000)).resolves.toBeUndefined()
    expect(fsm.pttFsmService.getSnapshot().matches('idle')).toBe(true)
  })

  it('waitForIdle resolves immediately when the machine is already idle', async () => {
    const { fsm } = makePttFsm()

    await expect(fsm.waitForIdle()).resolves.toBeUndefined()
  })

  it('waitForIdle rejects after the timeout when the machine stays busy', async () => {
    const { fsm } = makePttFsm()
    const item = makeItem(WLPlayerType.WL_PTT_SINGLE_PLAYER)

    fsm.pttFsmService.send({ type: fsmEvents.FSM_PLAY_SINGLE_EVT, data: item })
    await advancePastPlayDelay()

    // Attach the handler before the timer fires, or the rejection escapes
    // as unhandled before the assertion can observe it.
    const outcome = fsm.waitForIdle(50).then(
      () => 'resolved',
      (error: Error) => error.message,
    )
    await vi.advanceTimersByTimeAsync(60)

    expect(await outcome).toBe('stopPlayAudio timeout')
  })
})
