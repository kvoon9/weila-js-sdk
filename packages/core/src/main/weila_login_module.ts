import { WL_CoreInterface } from 'main/weila_internal_data'
import { WeilaPBLoginWrapper } from 'proto/weilapb_login_wrapper'
import { WL } from 'proto/weilapb'
import { WeilaDB } from 'db/weila_db'
import {
  WL_IDbExtension,
  WL_IDbExtensionInfo,
  WL_IDbExtensionState,
  WL_IDbSetting,
  WL_IDbSettingID,
  WL_IDbUserInfo,
} from 'db/weila_db_data'
import Long from 'long'
import { getLogger } from 'log/weila_log'
import { getAppKeyAndId } from 'main/weila_utils'
import { WL_ExtEventID, WL_KickoutInfo, WL_bindAnswerInfo } from 'main/weila_external_data'

const wllog = getLogger('MOD:login:info')
const _wlerr = getLogger('MOD:login:err')

export default class WLLoginModule {
  constructor(private coreInterface: WL_CoreInterface) {
    this.coreInterface.registerPbMsgHandler(
      WL.Service.ServiceID.SERVICE_LOGIN,
      this.onPbMsgHandler.bind(this),
    )
  }

  private onPbMsgHandler(data: any): void {
    const serverMessage = data as WL.Service.IServiceMessage
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
                  _wlerr('初始化数据库失败:', error)
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
            ;(async () => {
              const ntf = serverMessage.loginMessage?.ntfAnswerBindExtension

              if (!ntf) return

              // SAFETY: protobufjs 8 types the oneof member as $Properties; the wire format carries IUserInfo.
              const rawUserInfo = ntf.userInfo as WL.Common.IUserInfo | undefined

              if (!rawUserInfo) return

              const bindAnswerInfo = {} as WL_bindAnswerInfo
              bindAnswerInfo.status = ntf.status ?? 0
              bindAnswerInfo.userInfo = WeilaDB.getInstance().convertFromUserRaw([rawUserInfo])[0]
              // SAFETY: protobufjs 8 types the oneof member as $Properties; the wire format carries IExtensionInfo.
              const rawExtensionInfo = ntf.extensionInfo as WL.Login.IExtensionInfo | undefined

              if (!rawExtensionInfo) return

              bindAnswerInfo.deviceInfo =
                WeilaDB.getInstance().convertFromExtensionInfoRaw(rawExtensionInfo)
              bindAnswerInfo.verifyCode = ntf.verificationCode ?? ''

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
            this.coreInterface.executeCoreFunc('weila_logout')
          }
          break
      }
    }
  }

  private getKickoutReasonText(reason: number): string {
    switch (reason) {
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
      const loginAppRsp = (await this.coreInterface.sendPbMsg(
        wlBuildMsgRet,
        10000,
      )) as WL.Login.IRspLoginApp
      // SAFETY: protobufjs 8 types the oneof member as $Properties; the wire format carries IUserInfo.
      const rawUserInfo = loginAppRsp.userInfo as WL.Common.IUserInfo | undefined

      if (!rawUserInfo) {
        return Promise.reject('登录响应缺少用户信息')
      }

      const dbUserInfos = await WeilaDB.getInstance().convertFromUserRaw([rawUserInfo])

      const tokenInfo = {} as WL_IDbSetting
      tokenInfo.id = WL_IDbSettingID.SETTING_LOGIN_TOKEN
      tokenInfo.data = loginAppRsp.token
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
      const refreshRsp = (await this.coreInterface.sendPbMsg(
        buildRet,
      )) as WL.Login.IRspRefreshAccessToken
      const tokenInfo = {} as WL_IDbSetting
      tokenInfo.id = WL_IDbSettingID.SETTING_LOGIN_TOKEN
      tokenInfo.data = refreshRsp.accessToken
      await WeilaDB.getInstance().putSettingItem(tokenInfo)
      return true
    }

    return Promise.reject('刷新token失败')
  }

  public async bindDevice(verifyCode: string): Promise<number> {
    const buildMsgRet = WeilaPBLoginWrapper.buildBindExtensionReq(verifyCode)
    if (buildMsgRet.resultCode === 0) {
      const rspBindMsg = (await this.coreInterface.sendPbMsg(
        buildMsgRet,
        30000,
      )) as WL.Login.RspBindExtension
      return rspBindMsg.extensionState
    }

    return Promise.reject('绑定设备消息创建失败:' + buildMsgRet.resultCode)
  }

  public async unbindDevice(deviceUserId: number): Promise<number> {
    const buildMsgRet = WeilaPBLoginWrapper.buildUnbindExtensionReq(deviceUserId)
    if (buildMsgRet.resultCode === 0) {
      const rspUnbindMsg = (await this.coreInterface.sendPbMsg(
        buildMsgRet,
      )) as WL.Login.RspUnbindExtension
      if (rspUnbindMsg.extensionState === WL_IDbExtensionState.EXTENSION_UNBIND) {
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
          const extensionInfo: WL_IDbExtensionInfo = {} as WL_IDbExtensionInfo
          extensionInfo.imei = value.imei ?? ''
          extensionInfo.extensionType = value.type ?? 0
          extensionInfo.userId = value.userId ?? 0
          extensionInfo.supervisorId = value.managerId ?? 0
          extensionInfo.status = value.status ?? 0
          extensionInfo.config = value.config ?? ''
          extensionInfo.activeTime = Long.fromValue(value.actived ?? 0).toNumber()
          extensionInfo.groupCount = value.groupCount ?? 0
          extensionInfo.groupLimit = value.groupLimit ?? 0
          extensionInfo.productName = value.product ?? ''

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
      const extension = {} as WL_IDbExtension
      let index = userIds.indexOf(ext.userId)
      if (index !== -1) {
        extension.userInfo = userInfos[index]
      }

      index = supervisorIds.indexOf(ext.supervisorId)
      if (index !== -1) {
        extension.supervisor = supervisors[index]
      }

      extension.info = ext
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
      const rspConfig = (await this.coreInterface.sendPbMsg(
        buildMsgRet,
      )) as WL.Login.IRspSetExtensionConfig
      wllog('setDeviceConfig', rspConfig)
      return rspConfig.config ?? ''
    }

    return Promise.reject('创造消息失败:' + buildMsgRet.resultCode)
  }
}
