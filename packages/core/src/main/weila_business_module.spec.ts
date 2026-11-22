import { describe, expect, it, vi } from 'vitest'
import { WL } from 'proto/weilapb'
import { WL_CoreInterface, WL_PbMsgHandler } from 'main/weila_internal_data'
import WLBusinessModule from 'main/weila_business_module'
import { WeilaPbBusinessWrapper } from 'proto/weilapb_business_wrapper'

function makeBusinessModule() {
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

  const businessModule = new WLBusinessModule(coreInterface)
  expect(businessModule).toBeInstanceOf(WLBusinessModule)

  const handler = handlers.get(WL.Service.ServiceID.SERVICE_BUSINESS)

  if (!handler) throw new Error('business module did not register its handler')

  return { rspPbMsg, handler }
}

function buildResponse(
  commandId: WL.Business.BusinessCommandId,
  businessMessage?: WL.Business.BusinessMessage,
  resultCode = 0,
) {
  return new WL.Service.ServiceMessage({
    serviceHead: new WL.Service.ServiceHead({
      seq: 42,
      serviceId: WL.Service.ServiceID.SERVICE_BUSINESS,
      commandType: WL.Service.CommandType.COMMAND_RESPONSE,
      commandId,
      resultCode,
    }),
    businessMessage,
  })
}

describe('WLBusinessModule response routing', () => {
  it('routes COMMON_GET_SESSION responses so getSessionServiceFromServer() can resolve', () => {
    const { rspPbMsg, handler } = makeBusinessModule()

    const rspCommonGetSessions = new WL.Business.RspCommonGetSessions()

    const message = buildResponse(
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_GET_SESSION,
      new WL.Business.BusinessMessage({ rspCommonGetSessions }),
    )

    handler(message)

    expect(rspPbMsg).toHaveBeenCalledTimes(1)
    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, rspCommonGetSessions)
  })

  it('keeps the failure contract: nonzero resultCode forwards a null payload', () => {
    const { rspPbMsg, handler } = makeBusinessModule()

    const message = buildResponse(
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_SEARCH_STAFFS,
      new WL.Business.BusinessMessage(),
      1,
    )

    handler(message)

    expect(rspPbMsg).toHaveBeenCalledWith(42, 1, null)
  })

  it('resolves the ten ack commands with true instead of a payload', () => {
    const { rspPbMsg, handler } = makeBusinessModule()

    handler(buildResponse(WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_CLOSE_SESSION))

    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, true)
  })

  it('leaves unrouted commands silent instead of acking with a wrong payload', () => {
    const { rspPbMsg, handler } = makeBusinessModule()

    // No case routes BUSINESS_COMMAND_COMMON_STAFF_EXIT today. A missing
    // case must stay silent (the caller times out) rather than resolve with
    // a wrong payload. This is exactly the failure mode that hid the broken
    // token refresh.
    handler(buildResponse(WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_EXIT))

    expect(rspPbMsg).not.toHaveBeenCalled()
  })

  /** Every business builder and the command it emits, so the routing guard below covers them all. */
  const BUSINESS_BUILDER_COMMANDS = {
    buildCommonGetSessionsReq: WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_GET_SESSION,
    buildCommonStaffInviteReq: WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_INVITE,
    buildCommonAnswerStaffInviteReq:
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_ANSWER_STAFF_INVITE,
    buildCommonGetStaffInviteReq:
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_GET_STAFF_INVITE,
    buildCommonStaffExitReq: WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_EXIT,
    buildCommonStaffDeleteReq: WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_DELETE,
    buildStaffAcceptSessionReq: WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_ACCEPT_SESSION,
    buildStaffExitSessionReq: WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_EXIT_SESSION,
    buildStaffCloseSessionReq: WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_CLOSE_SESSION,
    buildStaffSessionInviteReq: WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_SESSION_INVITE,
    buildStaffAnswerSessionInviteReq:
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_ANSWER_SESSION_INVITE,
    buildStaffRemoveSessionStaffReq:
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_REMOVE_SESSION_STAFFS,
    buildStaffSearchStaffsReq: WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_SEARCH_STAFFS,
    buildStaffResetSessionReq: WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_RESET_SESSION,
  } satisfies Record<string, WL.Business.BusinessCommandId>

  /** Built but nothing awaits their response yet; wiring one up is a conscious act. */
  const NOT_AWAITED = new Set<number>([
    WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_EXIT,
  ])

  it('covers every builder the business wrapper exposes', () => {
    expect(Object.keys(BUSINESS_BUILDER_COMMANDS).toSorted()).toEqual(
      Object.keys(WeilaPbBusinessWrapper).toSorted(),
    )
  })

  it('routes every awaited business command and only those', () => {
    const { rspPbMsg, handler } = makeBusinessModule()

    for (const commandId of Object.values(BUSINESS_BUILDER_COMMANDS)) {
      handler(buildResponse(commandId))

      if (NOT_AWAITED.has(commandId)) {
        expect(
          rspPbMsg,
          `${WL.Business.BusinessCommandId[commandId]} should stay unrouted`,
        ).not.toHaveBeenCalled()
      } else {
        expect(
          rspPbMsg,
          `${WL.Business.BusinessCommandId[commandId]} must route`,
        ).toHaveBeenCalledTimes(1)
      }

      rspPbMsg.mockClear()
    }
  })
})
