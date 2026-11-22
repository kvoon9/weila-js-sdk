import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createActor, fromCallback, fromPromise } from 'xstate'
import type { Actor, AnyEventObject } from 'xstate'
import { fsmEvents, mainFsm, pttFsm } from './weila_fsmScript'
import type { WL_LoginParam, WL_PromiseCallback, WL_PttAudioItem } from 'main/weila_internal_data'
import { WL_IDbMsgDataStatus, WL_IDbMsgDataType } from 'db/weila_db_data'
import { WLPlayerType } from 'audio/weila_audio_data'

const MAIN_HANDLER_NAMES = [
  'onResourceLoadFail',
  'onLoadingResource',
  'onException',
  'onCoreInited',
  'onReadyEntry',
  'onReadyExit',
  'onSysTimeChecking',
  'onDataInit',
  'onDataInited',
  'onDataPrepareFail',
  'onLoginServerSucc',
  'onLoginServerFail',
  'connectServer',
  'onConnecting',
  'onDisconnectInReadyState',
  'onLoginRetryFail',
  'onLoginTryEntry',
]

const PTT_HANDLER_NAMES = [
  'onIdle',
  'onPttPayloadPlaying',
  'onPttPayloadWaiting',
  'feedData',
  'onEnterRealtime',
  'onExitRealtime',
  'onPlayItemFinish',
  'onSinglePlayEntry',
  'onSinglePlayExit',
  'onSinglePlayFinish',
  'onHistoryPlaying',
  'onPlayNextItem',
  'onPlayHistoryItemFinish',
  'onTalking',
  'stopPlay',
  'onStopPttPlay',
  'onRequestTalkResult',
  'stopAndPlayNext',
]

interface Recording {
  fired: string[]
  invoked: string[]
}

type MainService = (context: any, event: AnyEventObject) => Promise<any>

function namedStubs(names: string[], recording: Recording) {
  const stubs: Record<string, () => void> = {}

  for (const name of names) {
    stubs[name] = () => {
      recording.fired.push(name)
    }
  }

  return stubs
}

function stubServices(
  names: string[],
  defaults: Record<string, boolean | Record<string, never> | null>,
  overrides: Record<string, MainService>,
  recording: Recording,
) {
  const actors: Record<
    string,
    ReturnType<typeof fromPromise<any, { context: any; event: AnyEventObject }>>
  > = {}

  for (const name of names) {
    const impl = overrides[name] ?? (async () => defaults[name])
    actors[name] = fromPromise(
      async ({ input }: { input: { context: any; event: AnyEventObject } }) => {
        recording.invoked.push(name)

        return impl(input.context, input.event)
      },
    )
  }

  return actors
}

function startMainMachine(
  recording: Recording,
  overrides: {
    services?: Record<string, MainService>
    guards?: Record<string, () => boolean>
  } = {},
): Actor<typeof mainFsm> {
  const machine = mainFsm.provide({
    actors: {
      ...stubServices(
        ['loadResource', 'loginServer', 'prepareData', 'logout'],
        { loadResource: true, loginServer: {}, prepareData: true, logout: true },
        overrides.services ?? {},
        recording,
      ),
      systemWatchdog: fromCallback(() => {}),
    },
    actions: namedStubs(MAIN_HANDLER_NAMES, recording),
    guards: {
      canRetry: () => true,
      ...overrides.guards,
    },
  })

  const actor = createActor(machine, { input: { loginParam: null, core: null } })
  let previous = actor.getSnapshot()
  actor.subscribe((state) => {
    if (JSON.stringify(state.value) !== JSON.stringify(previous.value)) {
      recording.fired.push(`state:${JSON.stringify(state.value)}`)
    }

    previous = state
  })

  return actor.start()
}

function startPttMachine(recording: Recording): Actor<typeof pttFsm> {
  const machine = pttFsm.provide({
    actors: stubServices(
      ['checkHistoryList', 'checkPttPlayingList', 'startPlayback', 'startTalking', 'stopTalk'],
      {
        checkHistoryList: null,
        checkPttPlayingList: null,
        startPlayback: null,
        startTalking: true,
        stopTalk: true,
      },
      {},
      recording,
    ),
    actions: namedStubs(PTT_HANDLER_NAMES, recording),
  })

  return createActor(machine, {
    input: { pttCore: null },
  }).start()
}

async function settle() {
  await vi.advanceTimersByTimeAsync(0)
}

/** Actions are stubbed in these tests; payloads only need to satisfy the event types. */
function promiseCallback(): WL_PromiseCallback {
  return { resolve: vi.fn(), reject: vi.fn() }
}

function loginParam(): WL_LoginParam {
  return {
    retryCount: 0,
    account: '70009790',
    password: 'pw',
    countryCode: '0',
    md5: false,
    callback: promiseCallback(),
  }
}

function audioItem(): WL_PttAudioItem {
  return {
    id: 'spec-item',
    msgData: {
      combo_id: 'spec',
      senderId: 1,
      sessionId: '1001',
      sessionType: 17,
      msgId: 1,
      msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE,
      created: 0,
      autoReply: 0,
      status: WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW,
    },
    payloadList: [],
    playIndex: 0,
    playerType: WLPlayerType.WL_PTT_STREAM_PLAYER,
    priority: 0,
    isCompleted: true,
    shouldSave: false,
    recvWaitTimerId: undefined,
  }
}

async function reachInited(actor: Actor<typeof mainFsm>) {
  actor.send({ type: fsmEvents.FSM_LOAD_RESOURCE_EVT, data: promiseCallback() })
  await settle()
}

async function reachReady(actor: Actor<typeof mainFsm>) {
  await reachInited(actor)
  actor.send({ type: fsmEvents.FSM_LOGIN_SERVER_EVT, data: loginParam() })
  await settle()
  actor.send({ type: fsmEvents.FSM_NET_CONNECTED_IND_EVT })
  await settle()
  actor.send({ type: fsmEvents.FSM_LOGIN_PROCEDURE_SUCC_EVT })
  await settle()
}

describe('main state machine transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in uninit', () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    expect(actor.getSnapshot().matches('uninit')).toBe(true)
  })

  it('loads resources and lands in inited', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachInited(actor)

    expect(actor.getSnapshot().matches('inited')).toBe(true)
    expect(recording.invoked).toContain('loadResource')
    expect(recording.fired).toContain('onLoadingResource')
  })

  it('enters the final exception state when resource loading fails', async () => {
    const recording: Recording = { fired: [], invoked: [] }

    const actor = startMainMachine(recording, {
      services: {
        loadResource: async () => {
          throw new Error('wasm missing')
        },
      },
    })

    actor.send({ type: fsmEvents.FSM_LOAD_RESOURCE_EVT, data: promiseCallback() })
    await settle()

    expect(actor.getSnapshot().matches('exception')).toBe(true)
    expect(actor.getSnapshot().status).toBe('done')
    expect(recording.fired).toContain('onResourceLoadFail')
  })

  it('starts the login procedure and stores the login parameter', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachInited(actor)
    actor.send({ type: fsmEvents.FSM_LOGIN_SERVER_EVT, data: loginParam() })
    await settle()

    expect(actor.getSnapshot().matches({ loginProcedure: 'connecting' })).toBe(true)
    expect(recording.fired).toContain('connectServer')
    expect(actor.getSnapshot().context.loginParam).toMatchObject({ account: '70009790' })
  })

  it('moves from connecting to logining once the network connects', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachInited(actor)
    actor.send({ type: fsmEvents.FSM_LOGIN_SERVER_EVT, data: loginParam() })
    await settle()
    actor.send({ type: fsmEvents.FSM_NET_CONNECTED_IND_EVT })
    await settle()

    expect(actor.getSnapshot().matches({ loginProcedure: 'logining' })).toBe(true)
    expect(recording.invoked).toContain('loginServer')
  })

  it('retries through loginTry while the retry guard passes', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachInited(actor)
    actor.send({ type: fsmEvents.FSM_LOGIN_SERVER_EVT, data: loginParam() })
    await settle()
    actor.send({ type: fsmEvents.FSM_NET_EXCEPTION_IND_EVT })
    await settle()

    expect(actor.getSnapshot().matches('loginTry')).toBe(true)
    expect(recording.fired).toContain('onLoginTryEntry')

    await vi.advanceTimersByTimeAsync(2000)

    expect(actor.getSnapshot().matches({ loginProcedure: 'connecting' })).toBe(true)
    expect(recording.fired.filter((name) => name === 'connectServer')).toHaveLength(2)
  })

  it('stops retrying and returns to inited when the retry guard fails', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording, { guards: { canRetry: () => false } })

    await reachInited(actor)
    actor.send({ type: fsmEvents.FSM_LOGIN_SERVER_EVT, data: loginParam() })
    await settle()
    actor.send({ type: fsmEvents.FSM_NET_DISCONNECT_IND_EVT })
    await settle()

    expect(actor.getSnapshot().matches('loginTry')).toBe(true)

    await vi.advanceTimersByTimeAsync(2000)

    expect(actor.getSnapshot().matches('inited')).toBe(true)
    expect(recording.fired).toContain('onLoginRetryFail')
  })

  it('runs data prepare after a successful login and lands in ready', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachReady(actor)

    expect(actor.getSnapshot().matches('ready')).toBe(true)
    expect(recording.invoked).toContain('prepareData')
    expect(recording.fired).toContain('onDataInited')
    expect(recording.fired).toContain('onReadyEntry')
  })

  it('enters exception when data prepare fails', async () => {
    const recording: Recording = { fired: [], invoked: [] }

    const actor = startMainMachine(recording, {
      services: {
        prepareData: async () => {
          throw new Error('friend sync failed')
        },
      },
    })

    await reachReady(actor)

    expect(actor.getSnapshot().matches('exception')).toBe(true)
    expect(recording.fired).toContain('onDataPrepareFail')
  })

  it('logs out from ready and returns to inited', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachReady(actor)
    actor.send({ type: fsmEvents.FSM_LOGOUT_EVT })
    await settle()

    expect(actor.getSnapshot().matches('inited')).toBe(true)
    expect(recording.invoked).toContain('logout')
    expect(recording.fired).toContain('onReadyExit')
  })

  it('re-enters the login procedure after a disconnect in ready', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachReady(actor)
    actor.send({ type: fsmEvents.FSM_NET_DISCONNECT_IND_EVT })
    await settle()

    expect(actor.getSnapshot().matches({ loginProcedure: 'connecting' })).toBe(true)
    expect(recording.fired).toContain('onDisconnectInReadyState')
  })
})

describe('ptt state machine transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts idle and dispatches to single playing', () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startPttMachine(recording)

    expect(actor.getSnapshot().matches('idle')).toBe(true)

    actor.send({ type: fsmEvents.FSM_PLAY_SINGLE_EVT, data: audioItem() })

    expect(actor.getSnapshot().matches('singlePlaying')).toBe(true)
    expect(recording.fired).toContain('onSinglePlayEntry')
  })

  it('enters realtime playing and waits when the payload runs out', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startPttMachine(recording)

    actor.send({ type: fsmEvents.FSM_PLAY_REALTIME_EVT, data: audioItem() })
    await settle()

    expect(actor.getSnapshot().matches({ realtimePlaying: 'playing' })).toBe(true)
    expect(recording.fired).toContain('onEnterRealtime')

    actor.send({ type: fsmEvents.FSM_PTT_OUT_OF_PAYLOAD_EVT })
    await settle()

    expect(actor.getSnapshot().matches({ realtimePlaying: 'waitPayload' })).toBe(true)
    expect(recording.fired).toContain('onPttPayloadWaiting')
  })

  it('walks the talk flow from idle through talking back to idle', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startPttMachine(recording)

    actor.send({ type: fsmEvents.FSM_REQ_TALK_EVT, data: { callback: promiseCallback() } })
    await settle()

    expect(recording.invoked).toContain('startTalking')

    actor.send({ type: fsmEvents.FSM_REL_TALK_EVT })
    await settle()

    expect(actor.getSnapshot().matches('idle')).toBe(true)
    expect(recording.invoked).toContain('stopTalk')
  })
})
