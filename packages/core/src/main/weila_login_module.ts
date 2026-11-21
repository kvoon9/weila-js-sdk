import { WL_CoreInterface } from 'main/weila_internal_data'
import { WeilaPBLoginWrapper } from 'proto/weilapb_login_wrapper'
import { WL } from 'proto/weilapb'
import { WeilaDB } from 'db/weila_db'
import {
  WL_IDbExtension,
  WL_IDbExtensionInfo,
  WL_IDbExtensionState,
  WL_IDbExtensionType,
  WL_IDbSetting,
  WL_IDbSettingID,
  WL_IDbUserInfo,
} from 'db/weila_db_data'
import { dbEnum } from 'db/db_enum'
import Long from 'long'
import { getLogger } from 'log/weila_log'
import { getAppKeyAndId } from 'main/weila_utils'
import {
  WL_AnswerStatus,
  WL_ExtEventID,
  WL_KickoutInfo,
  WL_bindAnswerInfo,
} from 'main/weila_external_data'

const wllog = getLogger('MOD:login:info')
const wlerr = getLogger('MOD:login:err')

export default class WLLoginModule {
  constructor(private coreInterface: WL_CoreInterface) {
    this.coreInterface.registerPbMsgHandler(
      WL.Service.ServiceID.SERVICE_LOGIN,
      this.onPbMsgHandler.bind(this),
    )
  }

  private onPbMsgHandler(data: any): void {
    const serverMessage: WL.Service.IServiceMessage = data
    const serviceHead = serverMessage.serviceHead

    if (!serviceHead) return

    if (serviceHead.commandType === WL.Service.CommandType.COMMAND_RESPONSE) {
      switch (serviceHead.commandId) {
        case WL.Login.LoginCommandId.LOGIN_COMMAND_LOGIN_APP:
          {
            const respond = () => {
              this.coreInterface.rspPbMsg(
                serviceHead.seq ?? 0,
                serviceHead.resultCode ?? 0,
                serverMessage.loginMessage ? serverMessage.loginMessage.rspLoginApp : null,
              )
            }

            if (serviceHead.resultCode === 0) {
              void WeilaDB.init(
                serverMessage.loginMessage!.rspLoginApp!.userInfo!.userId!.toString(),
                3,
              )
                .catch((error) => {
                  wlerr('初始化数据库失败:', error)
                })
                .finally(respond)

              break
            }

            respond()
          }

          break

        case WL.Login.LoginCommandId.LOGIN_COMMAND_LOGOUT:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serviceHead.resultCode === 0,
            )
            WeilaDB.close()
          }

          break

        case WL.Login.LoginCommandId.LOGIN_COMMAND_HEARTBEAT:
          {
            wllog('收到心跳响应')
            this.coreInterface.rspPbMsg(serviceHead.seq ?? 0, serviceHead.resultCode ?? 0, null)
          }

          break

        case WL.Login.LoginCommandId.LOGIN_COMMAND_GET_EXTENSIONLIST:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serverMessage.loginMessage ? serverMessage.loginMessage.rspGetExtensionList : null,
            )
          }

          break

        case WL.Login.LoginCommandId.LOGIN_COMMAND_SET_EXTENSION_CONFIG:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serverMessage.loginMessage ? serverMessage.loginMessage.rspSetExtensionConfig : null,
            )
          }

          break

        case WL.Login.LoginCommandId.LOGIN_COMMAND_BIND_EXTENSION:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serverMessage.loginMessage ? serverMessage.loginMessage.rspBindExtension : null,
            )
          }

          break

        case WL.Login.LoginCommandId.LOGIN_COMMAND_UNBIND_EXTENSION:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serverMessage.loginMessage ? serverMessage.loginMessage.rspUnbindExtension : null,
            )
          }

          break
      }
    } else if (serviceHead.commandType === WL.Service.CommandType.COMMAND_NOTIFY) {
      switch (serviceHead.commandId) {
        case WL.Login.LoginCommandId.LOGIN_COMMAND_ANSWER_BIND_EXTENSION:
          {
            void (async () => {
              const ntf = serverMessage.loginMessage?.ntfAnswerBindExtension

              if (!ntf) return

              const rawUserInfo: WL.Common.IUserInfo | undefined = ntf.userInfo ?? undefined

              if (!rawUserInfo) return

              const userInfo = WeilaDB.getInstance().convertFromUserRaw([rawUserInfo])[0]

              const rawExtensionInfo: WL.Login.IExtensionInfo | undefined =
                ntf.extensionInfo ?? undefined

              if (!rawExtensionInfo) return

              const deviceInfo = WeilaDB.getInstance().convertFromExtensionInfoRaw(rawExtensionInfo)

              const bindAnswerInfo: WL_bindAnswerInfo = {
                status: dbEnum<WL_AnswerStatus>(ntf.status),
                userInfo,
                deviceInfo,
                verifyCode: ntf.verificationCode ?? '',
              }

              this.coreInterface.sendExtEvent(
                WL_ExtEventID.WL_EXT_DEVICE_BINDING_ANSWER_IND,
                bindAnswerInfo,
              )
            })()
          }

          break

        case WL.Login.LoginCommandId.LOGIN_COMMAND_KICKOUT:
          {
            const ntf = serverMessage.loginMessage?.ntfKickout

            if (!ntf) break

            const reason = ntf.reason ?? 0

            const kickoutInfo: WL_KickoutInfo = {
              reason,
              reasonText: this.getKickoutReasonText(reason),
            }

            this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_KICKOUT_IND, kickoutInfo)
            // 踢出后主动登出，停止 SDK 工作
            void this.coreInterface.executeCoreFunc('weila_logout')
          }

          break
      }
    }
  }

  private getKickoutReasonText(reason: number): string {
    switch (dbEnum<WL.Login.KickoutReason>(reason)) {
      case WL.Login.KickoutReason.KICKOUT_REASON_LOCK:
        return 'Account has been locked'
      case WL.Login.KickoutReason.KICKOUT_REASON_DUPLICATE_CLIENT:
        return 'Same client type logged in elsewhere'
      case WL.Login.KickoutReason.KICKOUT_REASON_MOBILE_KICK:
        return 'Kicked by mobile device'
      default:
        return 'Unknown reason'
    }
  }

  public async loginReq(
    account: string,
    password: string,
    countryCode: string,
    md5: boolean = true,
  ): Promise<WL_IDbUserInfo> {
    wllog('登录请求:', account, countryCode, md5)
    const appKeyAndId = WeilaDB.getAppAuthInfo() ? WeilaDB.getAppAuthInfo() : getAppKeyAndId()

    const wlBuildMsgRet = WeilaPBLoginWrapper.buildLoginAppReq(
      account,
      password,
      countryCode,
      appKeyAndId.appId,
      appKeyAndId.appKey,
      md5,
    )

    if (wlBuildMsgRet.resultCode === 0) {
      const loginAppRsp: WL.Login.IRspLoginApp = await this.coreInterface.sendPbMsg(
        wlBuildMsgRet,
        10000,
      )

      const rawUserInfo: WL.Common.IUserInfo | undefined = loginAppRsp.userInfo ?? undefined

      if (!rawUserInfo) {
        return Promise.reject('登录响应缺少用户信息')
      }

      const dbUserInfos = await WeilaDB.getInstance().convertFromUserRaw([rawUserInfo])

      const tokenInfo: WL_IDbSetting = {
        id: WL_IDbSettingID.SETTING_LOGIN_TOKEN,
        data: loginAppRsp.token,
      }

      await WeilaDB.getInstance().putSettingItem(tokenInfo)
      await WeilaDB.getInstance().putUserInfo(dbUserInfos[0])

      return dbUserInfos[0]
    }

    return Promise.reject('创建登录消息失败:' + wlBuildMsgRet.resultCode)
  }

  public async logoutReq(): Promise<boolean> {
    const wlBuildMsgRet = WeilaPBLoginWrapper.buildLogoutReq()

    if (wlBuildMsgRet.resultCode === 0) {
      await this.coreInterface.sendPbMsg(wlBuildMsgRet)

      return true
    }

    return Promise.reject('创建登出消息失败:' + wlBuildMsgRet.resultCode)
  }

  public async sendHeartbeat(): Promise<boolean> {
    const buildRet = WeilaPBLoginWrapper.buildHeartbeatReq()

    if (buildRet.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildRet)

      return true
    }

    return Promise.reject('发送心跳失败')
  }

  public async refreshToken(): Promise<boolean> {
    const buildRet = WeilaPBLoginWrapper.buildRefreshTokenReq()

    if (buildRet.resultCode === 0) {
      const refreshRsp: WL.Login.IRspRefreshAccessToken =
        await this.coreInterface.sendPbMsg(buildRet)

      const tokenInfo: WL_IDbSetting = {
        id: WL_IDbSettingID.SETTING_LOGIN_TOKEN,
        data: refreshRsp.accessToken,
      }

      await WeilaDB.getInstance().putSettingItem(tokenInfo)

      return true
    }

    return Promise.reject('刷新token失败')
  }

  public async bindDevice(verifyCode: string): Promise<number> {
    const buildMsgRet = WeilaPBLoginWrapper.buildBindExtensionReq(verifyCode)

    if (buildMsgRet.resultCode === 0) {
      const rspBindMsg: WL.Login.RspBindExtension = await this.coreInterface.sendPbMsg(
        buildMsgRet,
        30000,
      )

      return rspBindMsg.extensionState
    }

    return Promise.reject('绑定设备消息创建失败:' + buildMsgRet.resultCode)
  }

  public async unbindDevice(deviceUserId: number): Promise<number> {
    const buildMsgRet = WeilaPBLoginWrapper.buildUnbindExtensionReq(deviceUserId)

    if (buildMsgRet.resultCode === 0) {
      const rspUnbindMsg: WL.Login.RspUnbindExtension =
        await this.coreInterface.sendPbMsg(buildMsgRet)

      if (
        dbEnum<WL_IDbExtensionState>(rspUnbindMsg.extensionState) ===
        WL_IDbExtensionState.EXTENSION_UNBIND
      ) {
        await WeilaDB.getInstance().delExtension(deviceUserId)
      }

      return rspUnbindMsg.extensionState
    }

    return Promise.reject('解除绑定消息创建失败:' + buildMsgRet.resultCode)
  }

  public async initExtension(): Promise<boolean> {
    let subUserVerItem: WL_IDbSetting | undefined = await WeilaDB.getInstance().getSettingItem(
      WL_IDbSettingID.SETTING_SUB_USERINFO_VER_UPDATE,
    )

    let version: number = 0

    if (subUserVerItem) {
      version = subUserVerItem.data
    }

    wllog('initExtension', version)
    const buildMsgRet = WeilaPBLoginWrapper.buildGetExtensionListReq()

    if (buildMsgRet.resultCode === 0) {
      const rsp: WL.Login.IRspGetExtensionList = await this.coreInterface.sendPbMsg(
        buildMsgRet,
        30000,
      )

      if (rsp.infos && rsp.infos.length > 0) {
        const extensionInfos: WL_IDbExtensionInfo[] = []
        rsp.infos.forEach((value) => {
          const extensionInfo: WL_IDbExtensionInfo = {
            imei: value.imei ?? '',
            extensionType: dbEnum<WL_IDbExtensionType>(value.type),
            userId: value.userId ?? 0,
            supervisorId: value.managerId ?? 0,
            status: value.status ?? 0,
            config: value.config ?? '',
            activeTime: Long.fromValue(value.actived ?? 0).toNumber(),
            groupCount: value.groupCount ?? 0,
            groupLimit: value.groupLimit ?? 0,
            productName: value.product ?? '',
            createdTime: Long.fromValue(value.created ?? 0).toNumber(),
            state: dbEnum<WL_IDbExtensionState>(value.state),
            version: value.version ?? '',
            warrant: Long.fromValue(value.warranted ?? 0).toNumber(),
          }

          extensionInfos.push(extensionInfo)
        })

        await WeilaDB.getInstance().putExtensions(extensionInfos)
      }

      return true
    }

    return Promise.reject('初始化设备消息失败:' + buildMsgRet.resultCode)
  }

  public async getExtensionList(): Promise<WL_IDbExtension[]> {
    const extensionInfos = await WeilaDB.getInstance().getExtensions()
    const extensions: WL_IDbExtension[] = []

    let userIds = extensionInfos.map((value) => {
      return value.userId
    })

    let supervisorIds = extensionInfos.map((value) => {
      return value.supervisorId
    })

    const userInfos = await WeilaDB.getInstance().getUserInfos(userIds)
    userIds = userInfos.map((value) => {
      return value.userId
    })
    const supervisors = await WeilaDB.getInstance().getUserInfos(supervisorIds)
    supervisorIds = supervisors.map((value) => {
      return value.userId
    })

    for (const ext of extensionInfos) {
      const userIdIndex = userIds.indexOf(ext.userId)
      const supervisorIndex = supervisorIds.indexOf(ext.supervisorId)

      const extension: WL_IDbExtension = {
        userInfo: userInfos[userIdIndex],
        supervisor: supervisors[supervisorIndex],
        info: ext,
      }

      extensions.push(extension)
    }

    return extensions
  }

  public async setDeviceConfig(
    cfgKey: string,
    cfgValue: string,
    subUserId: number,
  ): Promise<string> {
    const buildMsgRet = WeilaPBLoginWrapper.buildSetExtensionConfig(subUserId, cfgKey, cfgValue)
    wllog('setDeviceConfig', cfgKey, cfgValue, subUserId)

    if (buildMsgRet.resultCode === 0) {
      const rspConfig: WL.Login.IRspSetExtensionConfig =
        await this.coreInterface.sendPbMsg(buildMsgRet)

      wllog('setDeviceConfig', rspConfig)

      return rspConfig.config ?? ''
    }

    return Promise.reject('创造消息失败:' + buildMsgRet.resultCode)
  }
}
