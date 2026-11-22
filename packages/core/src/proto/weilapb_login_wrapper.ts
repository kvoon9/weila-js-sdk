import { WLBuildMsgRet } from './weilapb_wrapper_data'
import { WL } from './weilapb'
import { BuildWeilaMsg } from './weilapb_wrapper'
import { MD5 } from 'crypto-js'
import Long from 'long'

const WeilaPBLoginWrapper = {
  buildLoginAppReq(
    account: string,
    password: string,
    countryCode: string,
    appId: string,
    appKey: string,
    md5: boolean = true,
  ): WLBuildMsgRet {
    const et = '' + (Math.floor(Date.now() / 1000) + 20)

    const signature = JSON.stringify({
      et,
      app_id: appId,
      sign: MD5(et + appKey).toString(),
    })

    const loginMsg = WL.Login.LoginMessage.create({
      reqLoginApp: {
        account,
        password: md5 ? MD5(password).toString() : password,
        countryCode,
        signature,
        pduVersion: 4,
        clientType: WL.Common.ClientType.CLIENT_WINDOWS,
      },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_LOGIN_APP,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
    )
  },

  buildLogoutReq(): WLBuildMsgRet {
    const loginMsg = WL.Login.LoginMessage.create({ reqLogout: {} })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_LOGOUT,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
    )
  },

  buildHeartbeatReq(): WLBuildMsgRet {
    const loginMsg = WL.Login.LoginMessage.create({
      reqHeartbeat: { serverTime: Long.fromNumber(Date.now(), true) },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_HEARTBEAT,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
    )
  },

  buildBindExtensionReq(verifyCode: string): WLBuildMsgRet {
    const loginMsg = WL.Login.LoginMessage.create({
      reqBindExtension: { verificationCode: verifyCode },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_BIND_EXTENSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
    )
  },

  buildUnbindExtensionReq(subUserId: number): WLBuildMsgRet {
    const loginMsg = WL.Login.LoginMessage.create({ reqUnbindExtension: {} })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_UNBIND_EXTENSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
      subUserId,
    )
  },

  buildGetExtensionInfoReq(subUserId: number): WLBuildMsgRet {
    const loginMsg = WL.Login.LoginMessage.create({ reqGetExtensionInfo: {} })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_GET_EXTENSIONINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
      subUserId,
    )
  },

  buildGetExtensionListReq(): WLBuildMsgRet {
    const loginMsg = WL.Login.LoginMessage.create({ reqGetExtensionList: {} })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_GET_EXTENSIONLIST,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
    )
  },

  buildSetExtensionConfig(
    subUserId: number,
    configKey: string,
    configValue: string,
  ): WLBuildMsgRet {
    const loginMsg = WL.Login.LoginMessage.create({
      reqSetExtensionConfig: { name: configKey, content: configValue },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_SET_EXTENSION_CONFIG,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
      subUserId,
    )
  },

  buildShutdownExtensionReq(subUserId: number): WLBuildMsgRet {
    const loginMsg = WL.Login.LoginMessage.create({ reqShutdownExtension: {} })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_SHUTDOWN_EXTENSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
      subUserId,
    )
  },

  buildLockExtensionReq(subUserId: number): WLBuildMsgRet {
    const loginMsg = WL.Login.LoginMessage.create({ reqLockExtension: {} })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_LOCK_EXTENSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
      subUserId,
    )
  },

  buildUnlockExtensionReq(subUserId: number): WLBuildMsgRet {
    const loginMsg = WL.Login.LoginMessage.create({ reqUnlockExtension: {} })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_UNLOCK_EXTENSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
      subUserId,
    )
  },

  buildGetTokenReq(token: string): WLBuildMsgRet {
    const loginMsg = WL.Login.LoginMessage.create({ reqToken: { token } })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_TOKEN,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
    )
  },

  buildRefreshTokenReq(): WLBuildMsgRet {
    const loginMsg = WL.Login.LoginMessage.create({ reqRefreshAccessToken: {} })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOGIN,
      WL.Login.LoginCommandId.LOGIN_COMMAND_REFRESH_ACCESS_TOKEN,
      WL.Service.CommandType.COMMAND_REQUEST,
      loginMsg,
    )
  },
}

export { WeilaPBLoginWrapper }
