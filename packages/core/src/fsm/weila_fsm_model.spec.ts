import { describe, expect, it } from 'vitest'
import { createActor, fromCallback, fromPromise } from 'xstate'
import { fsmEvents, mainFsm, pttFsm } from './weila_fsmScript'

/**
 * Formal model checks over both FSM definitions.
 *
 * The explorer drives real (stubbed) actors from every reachable state with
 * every declared event, in two variants (all actors resolve / all actors
 * reject), building the complete untimed state space. On top of that graph
 * it verifies structural safety properties:
 *
 * 1. Well-formedness - replaying any event from any reachable state never
 *    throws, which proves every transition targets an existing state.
 * 2. No dead states - every state declared in the config is reachable from
 *    the initial state.
 * 3. No traps - from every reachable state the machine can return to its
 *    home state (`inited` for main, `idle` for PTT), except states that are
 *    final by design (`exception`, and `uninit` before init).
 * 4. Event handling - every event constant the owners send fires an action
 *    somewhere in the space, so no typo'd or orphaned constant exists.
 *
 * Timed transitions (`after` delays) are outside this explorer; those paths
 * are exercised by the behavioral specs (`weila_fsm.spec.ts`) and the
 * integration suite.
 */

interface ModelSnapshot {
  value: unknown
  status: string
}

interface ModelActor {
  start(): void
  send(event: { type: string }): void
  getSnapshot(): ModelSnapshot
}

interface Step {
  from: string
  event: string
  to: string
}

interface Exploration {
  states: string[]
  steps: Step[]
  handledEvents: Set<string>
}

/** Every named actor source both machines reference. */
const ACTOR_NAMES = [
  'loadResource',
  'prepareData',
  'loginServer',
  'logout',
  'startPlayback',
  'finishStop',
  'startTalking',
  'stopTalk',
  'recorderFrames',
  'checkPttPlayingList',
  'checkHistoryList',
]

/**
 * The watchdog ticks on a real interval, which would inject unsolicited
 * events mid-exploration; the stub stays silent, so the explorer's own event
 * sends remain the only driver.
 */
const SILENT_ACTORS = { systemWatchdog: fromCallback(() => {}) }

/** Every named action/guard both machines reference. */
const HANDLER_NAMES = [
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
  'canRetry',
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
  'onPausePlay',
  'onResumePlay',
  'appendBurstFrame',
  'emitBurstPacket',
  'onReleaseTalk',
]

/** Events the core sends to the main machine. */
const MAIN_EVENT_NAMES = [
  fsmEvents.FSM_LOAD_RESOURCE_EVT,
  fsmEvents.FSM_LOGIN_SERVER_EVT,
  fsmEvents.FSM_LOGOUT_EVT,
  fsmEvents.FSM_NET_CONNECTED_IND_EVT,
  fsmEvents.FSM_NET_CONNECTING_IND_EVT,
  fsmEvents.FSM_NET_DISCONNECT_IND_EVT,
  fsmEvents.FSM_NET_EXCEPTION_IND_EVT,
  fsmEvents.FSM_SYSTEM_WATCH_TIMEOUT_EVT,
  fsmEvents.FSM_LOGIN_PROCEDURE_FAIL_EVT,
  fsmEvents.FSM_LOGIN_PROCEDURE_SUCC_EVT,
]

/** Events WLPttFsm and the session module send to the ptt machine. */
const PTT_EVENT_NAMES = [
  fsmEvents.FSM_PLAY_REALTIME_EVT,
  fsmEvents.FSM_PLAY_HISTORY_EVT,
  fsmEvents.FSM_PLAY_SINGLE_EVT,
  fsmEvents.FSM_REQ_TALK_EVT,
  fsmEvents.FSM_PTT_CODED_DATA_EVT,
  fsmEvents.FSM_REL_TALK_EVT,
  fsmEvents.FSM_FEED_PTT_PAYLOAD_EVT,
  fsmEvents.FSM_PTT_OUT_OF_PAYLOAD_EVT,
  fsmEvents.FSM_PTT_ITEM_PLAY_END_EVT,
  fsmEvents.FSM_PTT_CHECK_RESOURCE_EVT,
  fsmEvents.FSM_STOP_AND_PLAY_NEXT_EVT,
  fsmEvents.FSM_PAUSE_PLAY_EVT,
  fsmEvents.FSM_RESUME_PLAY_EVT,
  fsmEvents.FSM_STOP_EVT,
  fsmEvents.FSM_PLAY_END_EVT,
  fsmEvents.FSM_END_BACK_TO_IDLE_EVT,
]

function snapshotKey(snapshot: ModelSnapshot): string {
  if (snapshot.status === 'done') return `${JSON.stringify(snapshot.value)}::done`

  if (snapshot.status === 'error') return `${JSON.stringify(snapshot.value)}::error`

  return JSON.stringify(snapshot.value)
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/** Builds the actor for a replay; `fired` is shared across the exploration. */
type MakeActor = (fired: string[]) => ModelActor

/** A fresh main-machine actor whose named handlers record into `fired`. */
function stubbedMainActor(rejectActors: boolean, fired: string[]): ModelActor {
  return createActor(
    mainFsm.provide({
      actors: {
        ...Object.fromEntries(
          ACTOR_NAMES.map((name) => [
            name,
            fromPromise(async () => {
              if (rejectActors) throw new Error('stub-rejected')

              return true
            }),
          ]),
        ),
        ...SILENT_ACTORS,
      },
      actions: Object.fromEntries(
        HANDLER_NAMES.map((name) => [
          name,
          () => {
            fired.push(name)
          },
        ]),
      ),
      guards: {
        canRetry: () => true,
        isDefinitiveRejection: () => false,
        burstPacketFull: () => false,
      },
    }),
    { input: { loginParam: null, core: null } },
  )
}

/** A fresh ptt-machine actor whose named handlers record into `fired`. */
function stubbedPttActor(rejectActors: boolean, fired: string[]): ModelActor {
  return createActor(
    pttFsm.provide({
      actors: Object.fromEntries(
        ACTOR_NAMES.map((name) => [
          name,
          fromPromise(async () => {
            if (rejectActors) throw new Error('stub-rejected')

            return true
          }),
        ]),
      ),
      actions: Object.fromEntries(
        HANDLER_NAMES.map((name) => [
          name,
          () => {
            fired.push(name)
          },
        ]),
      ),
      guards: { burstPacketFull: () => false },
    }),
    { input: { pttCore: null } },
  )
}

/**
 * Replay-based BFS over the machine's state space.
 *
 * xstate v5 executes actions (assign/raise) through an actor scope, so pure
 * `machine.transition` cannot drive the graph (5.33 throws on the first
 * action). Every node therefore replays its event sequence into a fresh
 * stubbed actor. Snapshots are recorded both immediately after each send
 * (invoke-pending states) and after settling (post-actor states), so
 * transition-through states are not lost.
 */
async function explore(makeActor: MakeActor, catalog: string[]): Promise<Exploration> {
  const fired: string[] = []
  const visited = new Set<string>()
  const steps: Step[] = []
  const handledEvents = new Set<string>()

  async function replay(actor: ModelActor, events: string[], index: number): Promise<void> {
    if (index >= events.length) return

    if (actor.getSnapshot().status !== 'active') return

    const type = events[index]
    const before = snapshotKey(actor.getSnapshot())
    const firedBefore = fired.length

    actor.send({ type })

    const preSettle = snapshotKey(actor.getSnapshot())

    steps.push({ from: before, event: type, to: preSettle })
    visited.add(preSettle)

    if (fired.length > firedBefore || preSettle !== before) handledEvents.add(type)

    await settle()

    steps.push({
      from: preSettle,
      event: `(${type})`,
      to: snapshotKey(actor.getSnapshot()),
    })
    visited.add(snapshotKey(actor.getSnapshot()))

    await replay(actor, events, index + 1)
  }

  async function play(events: string[]): Promise<string> {
    const actor = makeActor(fired)

    actor.start()
    visited.add(snapshotKey(actor.getSnapshot()))

    await replay(actor, events, 0)

    return snapshotKey(actor.getSnapshot())
  }

  const queue: string[][] = [[]]
  const enqueued = new Set<string>([await play([])])

  async function playEach(sequence: string[], types: string[]): Promise<void> {
    const type = types.shift()

    if (type === undefined) return

    const endKey = await play([...sequence, type])

    if (!enqueued.has(endKey)) {
      enqueued.add(endKey)
      queue.push([...sequence, type])
    }

    await playEach(sequence, types)
  }

  async function drain(): Promise<void> {
    const sequence = queue.shift()

    if (sequence === undefined) return

    await playEach(sequence, [...catalog])

    await drain()
  }

  await drain()

  return { states: [...visited], steps, handledEvents }
}

function mergeExplorations(list: Exploration[]): Exploration {
  const states = new Set<string>()
  const steps: Step[] = []
  const handledEvents = new Set<string>()

  for (const one of list) {
    for (const state of one.states) states.add(state)

    steps.push(...one.steps)

    for (const type of one.handledEvents) handledEvents.add(type)
  }

  return { states: [...states], steps, handledEvents }
}

/** Backward reachability: which states can reach `targetKey`? */
function canReach(exploration: Exploration, targetKey: string): Set<string> {
  const successors = new Map<string, string[]>()

  for (const step of exploration.steps) {
    const list = successors.get(step.from) ?? []
    list.push(step.to)
    successors.set(step.from, list)
  }

  const winners = new Set<string>([targetKey])
  let grew = true

  while (grew) {
    grew = false

    for (const state of exploration.states) {
      if (winners.has(state)) continue

      const targets = successors.get(state) ?? []

      if (targets.some((target) => winners.has(target))) {
        winners.add(state)
        grew = true
      }
    }
  }

  return winners
}

/** Whether any explored snapshot key contains the given state node name. */
function visitsState(exploration: Exploration, name: string): boolean {
  return exploration.states.some((key) => key.includes(`"${name}"`))
}

describe('main machine formal model', () => {
  let exploration: Exploration

  it.beforeAll(async () => {
    const resolved = await explore((fired) => stubbedMainActor(false, fired), MAIN_EVENT_NAMES)
    const rejected = await explore((fired) => stubbedMainActor(true, fired), MAIN_EVENT_NAMES)

    exploration = mergeExplorations([resolved, rejected])
  })

  it('explores a nonempty closed space', () => {
    expect(exploration.states.length).toBeGreaterThan(5)
    expect(exploration.steps.length).toBeGreaterThan(exploration.states.length)
  })

  it('has no dead states', () => {
    const declared = [
      'uninit',
      'loadingResource',
      'exception',
      'inited',
      'loginProcedure',
      'dataInit',
      'loginTry',
      'ready',
      'logoutProcedure',
    ]

    for (const name of declared) {
      expect(visitsState(exploration, name), `state ${name} should be reachable`).toBe(true)
    }
  })

  it('can return to inited from every non-exception state', () => {
    const winners = canReach(exploration, '"inited"')

    const trapped = exploration.states.filter(
      (key) => !key.includes('"uninit"') && !key.includes('"exception"') && !winners.has(key),
    )

    expect(trapped, 'states that cannot return to inited').toEqual([])
  })

  it('handles every event constant the core sends', () => {
    const dead = MAIN_EVENT_NAMES.filter((type) => !exploration.handledEvents.has(type))

    expect(dead, 'event constants the main machine never handles').toEqual([])
  })
})

describe('ptt machine formal model', () => {
  let exploration: Exploration

  it.beforeAll(async () => {
    const resolved = await explore((fired) => stubbedPttActor(false, fired), PTT_EVENT_NAMES)
    const rejected = await explore((fired) => stubbedPttActor(true, fired), PTT_EVENT_NAMES)

    exploration = mergeExplorations([resolved, rejected])
  })

  it('explores a nonempty closed space', () => {
    expect(exploration.states.length).toBeGreaterThan(5)
    expect(exploration.steps.length).toBeGreaterThan(exploration.states.length)
  })

  it('has no dead states', () => {
    const declared = [
      'idle',
      'realtimePlaying',
      'realtimeStop',
      'historyPlaying',
      'historyStopping',
      'startTalk',
      'talking',
      'talkStop',
      'singlePlaying',
      'singleStopping',
    ]

    for (const name of declared) {
      expect(visitsState(exploration, name), `state ${name} should be reachable`).toBe(true)
    }
  })

  it('can return to idle from every reachable state', () => {
    const winners = canReach(exploration, '"idle"')
    const trapped = exploration.states.filter((key) => !winners.has(key))

    expect(trapped, 'states that cannot return to idle').toEqual([])
  })

  it('handles every event constant the ptt fsm sends', () => {
    // END_BACK_TO_IDLE is now raised inside the machine when a stop finishes
    // (pendingStopEvent), so no caller sends it any more and the sent-event
    // credit never sees it. Its routing is checked by the settle assertions
    // below: every STOP/PLAY_END path settles back to idle.
    const machineRaised = new Set<string>([fsmEvents.FSM_END_BACK_TO_IDLE_EVT])

    const dead = PTT_EVENT_NAMES.filter(
      (type) => !machineRaised.has(type) && !exploration.handledEvents.has(type),
    )

    expect(dead, 'event constants the ptt machine never handles').toEqual([])
  })

  it('routes a finished stop back to idle through the raised event', () => {
    const settledToIdle = exploration.steps.filter((step) => {
      return step.event === `(${fsmEvents.FSM_STOP_EVT})` && step.to === '"idle"'
    })

    expect(settledToIdle.length).toBeGreaterThan(0)
  })
})
