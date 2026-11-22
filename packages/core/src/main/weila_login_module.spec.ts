import { describe, expect, it, vi } from 'vitest'
import { WL } from 'proto/weilapb'
import { WL_CoreInterface, WL_PbMsgHandler } from 'main/weila_internal_data'
import WLLoginModule from 'main/weila_login_module'

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

function buildResponse(commandId: WL.Login.LoginCommandId, loginMessage?: WL.Login.LoginMessage) {
  return new WL.Service.ServiceMessage({
    serviceHead: new WL.Service.ServiceHead({
      seq: 42,
      serviceId: WL.Service.ServiceID.SERVICE_LOGIN,
      commandType: WL.Service.CommandType.COMMAND_RESPONSE,
      commandId,
      resultCode: 0,
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
})
