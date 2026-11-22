// The session module's constructor builds the real PTT FSM, whose module
// graph evaluates the audio worklets against globals jsdom lacks; the
// shared vitest setup shims them so the genuine graph can load.
import { describe, expect, it, vi } from 'vitest'
import { WL } from 'proto/weilapb'
import { WL_CoreInterface, WL_PbMsgHandler } from 'main/weila_internal_data'
import WLSessionModule from 'main/weila_session_module'
import { WeilaPBSessionWrapper } from 'proto/weilapb_session_wrapper'

function makeSessionModule() {
  const rspPbMsg = vi.fn()
  const handlers = new Map<number, WL_PbMsgHandler>()

  const coreInterface: WL_CoreInterface = {
    sendExtEvent: vi.fn(),
    sendPbMsg: vi.fn(),
    rspPbMsg,
    registerPbMsgHandler: (serviceId: number, handler: WL_PbMsgHandler) => {
      handlers.set(serviceId, handler)
    },
    executeCoreFunc: vi.fn(),
    getLoginUserInfo: vi.fn(),
  }

  const sessionModule = new WLSessionModule(coreInterface)
  expect(sessionModule).toBeInstanceOf(WLSessionModule)

  const handler = handlers.get(WL.Service.ServiceID.SERVICE_SESSION)

  if (!handler) throw new Error('session module did not register its handler')

  return { rspPbMsg, handler }
}

function buildResponse(
  commandId: WL.Session.SessionCommandId,
  sessionMessage?: WL.Session.SessionMessage,
  resultCode = 0,
) {
  return new WL.Service.ServiceMessage({
    serviceHead: new WL.Service.ServiceHead({
      seq: 42,
      serviceId: WL.Service.ServiceID.SERVICE_SESSION,
      commandType: WL.Service.CommandType.COMMAND_RESPONSE,
      commandId,
      resultCode,
    }),
    sessionMessage,
  })
}

describe('WLSessionModule response routing', () => {
  it('routes MSGDATA responses so every send path can resolve', () => {
    const { rspPbMsg, handler } = makeSessionModule()

    // Text, audio, PTT, and withdraw sends all await the same rspMsg.
    const rspMsg = new WL.Session.RspMsg({ msgId: 16191652001 })

    const message = buildResponse(
      WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
      new WL.Session.SessionMessage({ rspMsg }),
    )

    handler(message)

    expect(rspPbMsg).toHaveBeenCalledTimes(1)
    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, rspMsg)
  })

  it('forwards a null payload when the sessionMessage container is absent', () => {
    const { rspPbMsg, handler } = makeSessionModule()

    handler(buildResponse(WL.Session.SessionCommandId.SESSION_COMMAND_GET_MSG))

    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, null)
  })

  it('resolves REMOVE_SESSION with true instead of a payload', () => {
    const { rspPbMsg, handler } = makeSessionModule()

    handler(buildResponse(WL.Session.SessionCommandId.SESSION_COMMAND_REMOVE_SESSION))

    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, true)
  })

  it('leaves unrouted commands silent instead of acking with a wrong payload', () => {
    const { rspPbMsg, handler } = makeSessionModule()

    // No case routes SESSION_COMMAND_GET_UNREAD_MSG today. A missing case
    // must stay silent (the caller times out) rather than resolve with a
    // wrong payload. This is exactly the failure mode that hid the broken
    // token refresh.
    handler(buildResponse(WL.Session.SessionCommandId.SESSION_COMMAND_GET_UNREAD_MSG))

    expect(rspPbMsg).not.toHaveBeenCalled()
  })

  /** Every session builder and the command it emits, so the routing guard below covers them all. */
  const SESSION_BUILDER_COMMANDS = {
    buildGetSessionReq: WL.Session.SessionCommandId.SESSION_COMMAND_GET_SESSION,
    buildRemoveSessionReq: WL.Session.SessionCommandId.SESSION_COMMAND_REMOVE_SESSION,
    buildMsgReadReq: WL.Session.SessionCommandId.SESSION_COMMAND_READ_MSG,
    buildMsgGetUnReadReq: WL.Session.SessionCommandId.SESSION_COMMAND_GET_UNREAD_MSG,
    buildMsgGetMsgReq: WL.Session.SessionCommandId.SESSION_COMMAND_GET_MSG,
    buildBurstControlReq: WL.Session.SessionCommandId.SESSION_COMMAND_BURST_CONTROL,
    buildMonitorControlReq: WL.Session.SessionCommandId.SESSION_COMMAND_MONITOR_CONTROL,
    buildMsgDataReq: WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
    buildTextSessionMsgReq: WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
    buildImageSessionMsgReq: WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
    buildMediaInfoSessionMsgReq: WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
    buildLocationInfoSessionMsgReq: WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
    buildAudioSessionMsgReq: WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
    buildPttSessionMsgReq: WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
    buildServiceSessionMsgReq: WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
    buildSwitchSessionMsgReq: WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
    buildWithDrawMsgReq: WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
  } satisfies Record<string, WL.Session.SessionCommandId>

  /** Built but nothing awaits their response yet; wiring one up is a conscious act. */
  const NOT_AWAITED = new Set<number>([
    WL.Session.SessionCommandId.SESSION_COMMAND_GET_UNREAD_MSG,
    WL.Session.SessionCommandId.SESSION_COMMAND_BURST_CONTROL,
    WL.Session.SessionCommandId.SESSION_COMMAND_MONITOR_CONTROL,
  ])

  it('covers every builder the session wrapper exposes', () => {
    expect(Object.keys(SESSION_BUILDER_COMMANDS).toSorted()).toEqual(
      Object.keys(WeilaPBSessionWrapper).toSorted(),
    )
  })

  it('routes every awaited session command and only those', () => {
    const { rspPbMsg, handler } = makeSessionModule()

    for (const commandId of Object.values(SESSION_BUILDER_COMMANDS)) {
      handler(buildResponse(commandId))

      if (NOT_AWAITED.has(commandId)) {
        expect(
          rspPbMsg,
          `${WL.Session.SessionCommandId[commandId]} should stay unrouted`,
        ).not.toHaveBeenCalled()
      } else {
        expect(
          rspPbMsg,
          `${WL.Session.SessionCommandId[commandId]} must route`,
        ).toHaveBeenCalledTimes(1)
      }

      rspPbMsg.mockClear()
    }
  })
})
