import { describe, expect, it, vi } from 'vitest'
import { WL } from 'proto/weilapb'
import { WL_CoreInterface, WL_PbMsgHandler } from 'main/weila_internal_data'
import WLUserModule from 'main/weila_user_module'
import { WeilaPbUserWrapper } from 'proto/weilapb_user_wrapper'

function makeUserModule() {
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

  const userModule = new WLUserModule(coreInterface)
  expect(userModule).toBeInstanceOf(WLUserModule)

  const handler = handlers.get(WL.Service.ServiceID.SERVICE_USER)

  if (!handler) throw new Error('user module did not register its handler')

  return { rspPbMsg, handler }
}

function buildResponse(
  commandId: WL.User.UserCommandId,
  userMessage?: WL.User.UserMessage,
  resultCode = 0,
) {
  return new WL.Service.ServiceMessage({
    serviceHead: new WL.Service.ServiceHead({
      seq: 42,
      serviceId: WL.Service.ServiceID.SERVICE_USER,
      commandType: WL.Service.CommandType.COMMAND_RESPONSE,
      commandId,
      resultCode,
    }),
    userMessage,
  })
}

describe('WLUserModule response routing', () => {
  it('routes GET_USERINFO responses so searchUserByNumber() can resolve', () => {
    const { rspPbMsg, handler } = makeUserModule()

    const rspGetUserInfo = new WL.User.RspGetUserInfo()

    const message = buildResponse(
      WL.User.UserCommandId.USER_COMMAND_GET_USERINFO,
      new WL.User.UserMessage({ rspGetUserInfo }),
    )

    handler(message)

    expect(rspPbMsg).toHaveBeenCalledTimes(1)
    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, rspGetUserInfo)
  })

  it('forwards a null payload when the userMessage container is absent', () => {
    const { rspPbMsg, handler } = makeUserModule()

    handler(buildResponse(WL.User.UserCommandId.USER_COMMAND_SET_CONFIG))

    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, null)
  })

  it('leaves unrouted commands silent instead of acking with a wrong payload', () => {
    const { rspPbMsg, handler } = makeUserModule()

    // No case routes USER_COMMAND_GET_CONFIG today. A missing case must
    // stay silent (the caller times out) rather than resolve with a wrong
    // payload. This is exactly the failure mode that hid the broken token
    // refresh.
    handler(buildResponse(WL.User.UserCommandId.USER_COMMAND_GET_CONFIG))

    expect(rspPbMsg).not.toHaveBeenCalled()
  })

  /** Every user builder and the command it emits, so the routing guard below covers them all. */
  const USER_BUILDER_COMMANDS = {
    buildGetUserInfoReq: WL.User.UserCommandId.USER_COMMAND_GET_USERINFO,
    buildChangeUserInfoReq: WL.User.UserCommandId.USER_COMMAND_CHANGE_USERINFO,
    buildGetConfigReq: WL.User.UserCommandId.USER_COMMAND_GET_CONFIG,
    buildSetConfigReq: WL.User.UserCommandId.USER_COMMAND_SET_CONFIG,
  } satisfies Record<string, WL.User.UserCommandId>

  /** Built but nothing awaits their response yet; wiring one up is a conscious act. */
  const NOT_AWAITED = new Set<number>([
    WL.User.UserCommandId.USER_COMMAND_CHANGE_USERINFO,
    WL.User.UserCommandId.USER_COMMAND_GET_CONFIG,
  ])

  it('covers every builder the user wrapper exposes', () => {
    expect(Object.keys(USER_BUILDER_COMMANDS).toSorted()).toEqual(
      Object.keys(WeilaPbUserWrapper).toSorted(),
    )
  })

  it('routes every awaited user command and only those', () => {
    const { rspPbMsg, handler } = makeUserModule()

    for (const commandId of Object.values(USER_BUILDER_COMMANDS)) {
      handler(buildResponse(commandId))

      if (NOT_AWAITED.has(commandId)) {
        expect(
          rspPbMsg,
          `${WL.User.UserCommandId[commandId]} should stay unrouted`,
        ).not.toHaveBeenCalled()
      } else {
        expect(rspPbMsg, `${WL.User.UserCommandId[commandId]} must route`).toHaveBeenCalledTimes(1)
      }

      rspPbMsg.mockClear()
    }
  })
})
