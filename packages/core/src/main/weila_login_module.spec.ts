import { describe, expect, it, vi } from 'vitest'
import { WL } from 'proto/weilapb'
import { WL_CoreInterface, WL_PbMsgHandler } from 'main/weila_internal_data'
import WLLoginModule from 'main/weila_login_module'
import { WeilaPBLoginWrapper } from 'proto/weilapb_login_wrapper'

function makeLoginModule() {
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

  const loginModule = new WLLoginModule(coreInterface)
  expect(loginModule).toBeInstanceOf(WLLoginModule)

  const handler = handlers.get(WL.Service.ServiceID.SERVICE_LOGIN)

  if (!handler) throw new Error('login module did not register its handler')

  return { rspPbMsg, handler }
}

function buildResponse(
  commandId: WL.Login.LoginCommandId,
  loginMessage?: WL.Login.LoginMessage,
  resultCode = 0,
) {
  return new WL.Service.ServiceMessage({
    serviceHead: new WL.Service.ServiceHead({
      seq: 42,
      serviceId: WL.Service.ServiceID.SERVICE_LOGIN,
      commandType: WL.Service.CommandType.COMMAND_RESPONSE,
      commandId,
      resultCode,
    }),
    loginMessage,
  })
}

describe('WLLoginModule response routing', () => {
  it('routes REFRESH_ACCESS_TOKEN responses so refreshToken() can resolve', () => {
    const { rspPbMsg, handler } = makeLoginModule()

    const rspRefreshAccessToken = new WL.Login.RspRefreshAccessToken({ accessToken: 'next-token' })

    const message = buildResponse(
      WL.Login.LoginCommandId.LOGIN_COMMAND_REFRESH_ACCESS_TOKEN,
      new WL.Login.LoginMessage({ rspRefreshAccessToken }),
    )

    handler(message)

    expect(rspPbMsg).toHaveBeenCalledTimes(1)
    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, rspRefreshAccessToken)
  })

  it('forwards a null payload when the loginMessage container is absent', () => {
    const { rspPbMsg, handler } = makeLoginModule()

    handler(buildResponse(WL.Login.LoginCommandId.LOGIN_COMMAND_REFRESH_ACCESS_TOKEN))

    expect(rspPbMsg).toHaveBeenCalledWith(42, 0, null)
  })

  it('leaves unrouted commands silent instead of acking with a wrong payload', () => {
    const { rspPbMsg, handler } = makeLoginModule()

    // No case routes LOGIN_COMMAND_TOKEN today. A missing case must stay
    // silent (the caller times out) rather than resolve with a wrong payload.
    // This is exactly the failure mode that hid the broken token refresh.
    handler(buildResponse(WL.Login.LoginCommandId.LOGIN_COMMAND_TOKEN))

    expect(rspPbMsg).not.toHaveBeenCalled()
  })

  /** Every login builder and the command it emits, so the routing guard below covers them all. */
  const LOGIN_BUILDER_COMMANDS = {
    buildLoginAppReq: WL.Login.LoginCommandId.LOGIN_COMMAND_LOGIN_APP,
    buildLogoutReq: WL.Login.LoginCommandId.LOGIN_COMMAND_LOGOUT,
    buildHeartbeatReq: WL.Login.LoginCommandId.LOGIN_COMMAND_HEARTBEAT,
    buildBindExtensionReq: WL.Login.LoginCommandId.LOGIN_COMMAND_BIND_EXTENSION,
    buildUnbindExtensionReq: WL.Login.LoginCommandId.LOGIN_COMMAND_UNBIND_EXTENSION,
    buildGetExtensionInfoReq: WL.Login.LoginCommandId.LOGIN_COMMAND_GET_EXTENSIONINFO,
    buildGetExtensionListReq: WL.Login.LoginCommandId.LOGIN_COMMAND_GET_EXTENSIONLIST,
    buildSetExtensionConfig: WL.Login.LoginCommandId.LOGIN_COMMAND_SET_EXTENSION_CONFIG,
    buildShutdownExtensionReq: WL.Login.LoginCommandId.LOGIN_COMMAND_SHUTDOWN_EXTENSION,
    buildLockExtensionReq: WL.Login.LoginCommandId.LOGIN_COMMAND_LOCK_EXTENSION,
    buildUnlockExtensionReq: WL.Login.LoginCommandId.LOGIN_COMMAND_UNLOCK_EXTENSION,
    buildGetTokenReq: WL.Login.LoginCommandId.LOGIN_COMMAND_TOKEN,
    buildRefreshTokenReq: WL.Login.LoginCommandId.LOGIN_COMMAND_REFRESH_ACCESS_TOKEN,
  } satisfies Record<string, WL.Login.LoginCommandId>

  /** Built but nothing awaits their response yet; wiring one up is a conscious act. */
  const NOT_AWAITED = new Set<number>([
    WL.Login.LoginCommandId.LOGIN_COMMAND_GET_EXTENSIONINFO,
    WL.Login.LoginCommandId.LOGIN_COMMAND_SHUTDOWN_EXTENSION,
    WL.Login.LoginCommandId.LOGIN_COMMAND_LOCK_EXTENSION,
    WL.Login.LoginCommandId.LOGIN_COMMAND_UNLOCK_EXTENSION,
    WL.Login.LoginCommandId.LOGIN_COMMAND_TOKEN,
  ])

  it('covers every builder the login wrapper exposes', () => {
    expect(Object.keys(LOGIN_BUILDER_COMMANDS).toSorted()).toEqual(
      Object.keys(WeilaPBLoginWrapper).toSorted(),
    )
  })

  it('routes every awaited login command and only those', () => {
    const { rspPbMsg, handler } = makeLoginModule()

    for (const commandId of Object.values(LOGIN_BUILDER_COMMANDS)) {
      // resultCode 1 keeps the LOGIN_APP route off the database init path.
      handler(buildResponse(commandId, undefined, 1))

      if (NOT_AWAITED.has(commandId)) {
        expect(
          rspPbMsg,
          `${WL.Login.LoginCommandId[commandId]} should stay unrouted`,
        ).not.toHaveBeenCalled()
      } else {
        expect(rspPbMsg, `${WL.Login.LoginCommandId[commandId]} must route`).toHaveBeenCalledTimes(
          1,
        )
      }

      rspPbMsg.mockClear()
    }
  })
})
