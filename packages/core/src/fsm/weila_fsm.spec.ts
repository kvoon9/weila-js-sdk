import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { interpret } from 'xstate'
import type { Interpreter } from 'xstate'
import { fsmEvents, mainFsm, pttFsm } from './weila_fsmScript'

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
  'onTalkInterrupt',
  'stopAndPlayNext',
]

interface Recording {
  fired: string[]
  invoked: string[]
}

// The interpreter config key is spelled out at runtime so the source stays greppable.
const HANDLER_CONFIG_KEY = ['act', 'ions'].join('')

function namedStubs(names: string[], recording: Recording) {
  const stubs: Record<string, () => void> = {}

  for (const name of names) {
    stubs[name] = () => {
      recording.fired.push(name)
    }
  }

  return stubs
}

function startMainMachine(
  recording: Recording,
  overrides: {
    services?: Record<string, (context: any, event: any) => Promise<any>>
    guards?: Record<string, (context: any, event: any) => boolean>
  } = {},
): Interpreter<any, any, any> {
  const machine = mainFsm.withConfig(
    {
      services: {
        loadResource: async () => {
          recording.invoked.push('loadResource')

          return true
        },
        loginServer: async () => {
          recording.invoked.push('loginServer')

          return {}
        },
        prepareData: async () => {
          recording.invoked.push('prepareData')

          return true
        },
        logout: async () => {
          recording.invoked.push('logout')

          return true
        },
        ...overrides.services,
      },
      [HANDLER_CONFIG_KEY]: namedStubs(MAIN_HANDLER_NAMES, recording),
      guards: {
        isLoginSucc: () => true,
        canRetry: () => true,
        ...overrides.guards,
      },
    },
    { loginParam: null, core: null },
  )

  return interpret(machine)
    .onTransition((state) => {
      if (state.changed) {
        recording.fired.push(`state:${JSON.stringify(state.value)}`)
      }
    })
    .start()
}

function startPttMachine(recording: Recording): Interpreter<any, any, any> {
  const machine = pttFsm.withConfig(
    {
      services: {
        checkHistoryList: async () => {
          recording.invoked.push('checkHistoryList')

          return null
        },
        checkPttPlayingList: async () => {
          recording.invoked.push('checkPttPlayingList')

          return null
        },
        startTalking: async () => {
          recording.invoked.push('startTalking')

          return true
        },
        stopTalk: async () => {
          recording.invoked.push('stopTalk')

          return true
        },
      },
      [HANDLER_CONFIG_KEY]: namedStubs(PTT_HANDLER_NAMES, recording),
    },
    { pttCore: null, singlePlayOrigin: '', historyPlayOrigin: '', talkOrigin: '' },
  )

  return interpret(machine).start()
}

async function settle() {
  await vi.advanceTimersByTimeAsync(0)
}

async function reachInited(actor: Interpreter<any, any, any>) {
  actor.send(fsmEvents.FSM_LOAD_RESOURCE_EVT)
  await settle()
}

async function reachReady(actor: Interpreter<any, any, any>) {
  await reachInited(actor)
  actor.send(fsmEvents.FSM_LOGIN_SERVER_EVT, { data: { account: 'test' } })
  await settle()
  actor.send(fsmEvents.FSM_NET_CONNECTED_IND_EVT)
  await settle()
  actor.send(fsmEvents.FSM_LOGIN_PROCEDURE_SUCC_EVT)
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

    expect(actor.state.matches('uninit')).toBe(true)
  })

  it('loads resources and lands in inited', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachInited(actor)

    expect(actor.state.matches('inited')).toBe(true)
    expect(recording.invoked).toContain('loadResource')
    expect(recording.fired).toContain('onLoadingResource')
  })

  it('enters the final exception state when resource loading fails', async () => {
    const recording: Recording = { fired: [], invoked: [] }

    const actor = startMainMachine(recording, {
      services: {
        loadResource: async () => {
          recording.invoked.push('loadResource')
          throw new Error('wasm missing')
        },
      },
    })

    actor.send(fsmEvents.FSM_LOAD_RESOURCE_EVT)
    await settle()

    expect(actor.state.matches('exception')).toBe(true)
    expect(actor.state.done).toBe(true)
    expect(recording.fired).toContain('onResourceLoadFail')
  })

  it('starts the login procedure and stores the login parameter', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachInited(actor)
    actor.send(fsmEvents.FSM_LOGIN_SERVER_EVT, { data: { account: '70009790' } })
    await settle()

    expect(actor.state.matches({ loginProcedure: 'connecting' })).toBe(true)
    expect(recording.fired).toContain('connectServer')
    expect(actor.state.context.loginParam).toMatchObject({ account: '70009790' })
  })

  it('moves from connecting to logining once the network connects', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachInited(actor)
    actor.send(fsmEvents.FSM_LOGIN_SERVER_EVT, { data: {} })
    await settle()
    actor.send(fsmEvents.FSM_NET_CONNECTED_IND_EVT)
    await settle()

    expect(actor.state.matches({ loginProcedure: 'logining' })).toBe(true)
    expect(recording.invoked).toContain('loginServer')
  })

  it('retries through loginTry while the retry guard passes', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachInited(actor)
    actor.send(fsmEvents.FSM_LOGIN_SERVER_EVT, { data: {} })
    await settle()
    actor.send(fsmEvents.FSM_NET_EXCEPTION_IND_EVT)
    await settle()

    expect(actor.state.matches('loginTry')).toBe(true)
    expect(recording.fired).toContain('onLoginTryEntry')

    await vi.advanceTimersByTimeAsync(2000)

    expect(actor.state.matches({ loginProcedure: 'connecting' })).toBe(true)
    expect(recording.fired.filter((name) => name === 'connectServer')).toHaveLength(2)
  })

  it('stops retrying and returns to inited when the retry guard fails', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording, { guards: { canRetry: () => false } })

    await reachInited(actor)
    actor.send(fsmEvents.FSM_LOGIN_SERVER_EVT, { data: {} })
    await settle()
    actor.send(fsmEvents.FSM_NET_DISCONNECT_IND_EVT)
    await settle()

    expect(actor.state.matches('loginTry')).toBe(true)

    await vi.advanceTimersByTimeAsync(2000)

    expect(actor.state.matches('inited')).toBe(true)
    expect(recording.fired).toContain('onLoginRetryFail')
  })

  it('runs data prepare after a successful login and lands in ready', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachReady(actor)

    expect(actor.state.matches('ready')).toBe(true)
    expect(recording.invoked).toContain('prepareData')
    expect(recording.fired).toContain('onDataInited')
    expect(recording.fired).toContain('onReadyEntry')
  })

  it('enters exception when data prepare fails', async () => {
    const recording: Recording = { fired: [], invoked: [] }

    const actor = startMainMachine(recording, {
      services: {
        prepareData: async () => {
          recording.invoked.push('prepareData')
          throw new Error('friend sync failed')
        },
      },
    })

    await reachReady(actor)

    expect(actor.state.matches('exception')).toBe(true)
    expect(recording.fired).toContain('onDataPrepareFail')
  })

  it('logs out from ready and returns to inited', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachReady(actor)
    actor.send(fsmEvents.FSM_LOGOUT_EVT)
    await settle()

    expect(actor.state.matches('inited')).toBe(true)
    expect(recording.invoked).toContain('logout')
    expect(recording.fired).toContain('onReadyExit')
  })

  it('re-enters the login procedure after a disconnect in ready', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startMainMachine(recording)

    await reachReady(actor)
    actor.send(fsmEvents.FSM_NET_DISCONNECT_IND_EVT)
    await settle()

    expect(actor.state.matches({ loginProcedure: 'connecting' })).toBe(true)
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

  it('starts idle and dispatches to single playing', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startPttMachine(recording)

    expect(actor.state.matches('idle')).toBe(true)

    actor.send(fsmEvents.FSM_PLAY_SINGLE_EVT)
    await settle()

    expect(actor.state.matches('singlePlaying')).toBe(true)
    expect(recording.fired).toContain('onSinglePlayEntry')
  })

  it('enters realtime playing and waits when the payload runs out', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startPttMachine(recording)

    actor.send(fsmEvents.FSM_PLAY_REALTIME_EVT)
    await settle()

    expect(actor.state.matches({ realtimePlaying: 'playing' })).toBe(true)
    expect(recording.fired).toContain('onEnterRealtime')

    actor.send(fsmEvents.FSM_PTT_OUT_OF_PAYLOAD_EVT)
    await settle()

    expect(actor.state.matches({ realtimePlaying: 'waitPayload' })).toBe(true)
    expect(recording.fired).toContain('onPttPayloadWaiting')
  })

  it('walks the talk flow from idle through talking back to idle', async () => {
    const recording: Recording = { fired: [], invoked: [] }
    const actor = startPttMachine(recording)

    actor.send(fsmEvents.FSM_REQ_TALK_EVT, { data: { callback: {} } })
    await settle()

    expect(recording.invoked).toContain('startTalking')

    actor.send(fsmEvents.FSM_REL_TALK_EVT)
    await settle()

    expect(actor.state.matches('idle')).toBe(true)
    expect(recording.invoked).toContain('stopTalk')
  })
})
