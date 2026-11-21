import { default_user_logo, WL_CoreInterface } from 'main/weila_internal_data'
import { WL } from 'proto/weilapb'
import { WeilaPbUserWrapper } from 'proto/weilapb_user_wrapper'
import Long from 'long'
import { getLogger } from 'log/weila_log'
import TinyPinyin from 'tiny-pinyin'
import { WL_IDbUserInfo } from 'db/weila_db_data'

const wllog = getLogger('MOD:user:info')

export default class WLUserModule {
  constructor(private coreInterface: WL_CoreInterface) {
    this.coreInterface.registerPbMsgHandler(
      WL.Service.ServiceID.SERVICE_USER,
      this.onPbMsgHandler.bind(this),
    )
  }

  private onPbMsgHandler(data: any): void {
    const serverMessage = data as WL.Service.IServiceMessage
    const serviceHead = serverMessage.serviceHead

    if (!serviceHead) return

    if (serviceHead.commandType === WL.Service.CommandType.COMMAND_RESPONSE) {
      switch (serviceHead.commandId) {
        case WL.User.UserCommandId.USER_COMMAND_GET_USERINFO:
          {
            wllog('搜索用户信息结果:', serverMessage)
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serverMessage.userMessage?.rspGetUserInfo,
            )
          }

          break

        case WL.User.UserCommandId.USER_COMMAND_SET_CONFIG:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serverMessage.userMessage?.rspSetConfig,
            )
          }

          break
      }
    } else if (serviceHead.commandType === WL.Service.CommandType.COMMAND_NOTIFY) {
    }
  }

  public async searchUserByNumber(key: string): Promise<WL_IDbUserInfo[]> {
    const buildRet = WeilaPbUserWrapper.buildGetUserInfoReq(key)

    if (buildRet.resultCode === 0) {
      const rspGetUserInfo = (await this.coreInterface.sendPbMsg(
        buildRet,
      )) as WL.User.IRspGetUserInfo

      const dbUserList: WL_IDbUserInfo[] = []

      if (rspGetUserInfo.userInfoList) {
        rspGetUserInfo.userInfoList.forEach((value) => {
          const dbUserInfo = {} as WL_IDbUserInfo
          dbUserInfo.nick = value.nick ?? ''
          dbUserInfo.avatar = value.avatar ? value.avatar : default_user_logo
          dbUserInfo.countryCode = value.countryCode ?? ''
          dbUserInfo.created = Long.fromValue(value.created ?? 0).toNumber()
          dbUserInfo.email = value.email ?? ''
          dbUserInfo.sex = value.sex ?? 0
          dbUserInfo.phone = value.phone ?? ''
          dbUserInfo.userId = value.userId ?? 0
          dbUserInfo.status = value.status ?? 0
          dbUserInfo.userType = value.type ?? 0
          dbUserInfo.weilaNum = value.number ?? ''
          dbUserInfo.signature = value.signature ?? ''
          dbUserInfo.pinyinName = TinyPinyin.convertToPinyin(dbUserInfo.nick)

          dbUserList.push(dbUserInfo)
        })
      }

      return dbUserList
    }

    return Promise.reject('创造消息失败:' + buildRet.resultCode)
  }
}
