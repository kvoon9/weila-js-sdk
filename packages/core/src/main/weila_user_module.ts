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
    const serverMessage: WL.Service.IServiceMessage = data
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
      const rspGetUserInfo: WL.User.IRspGetUserInfo = await this.coreInterface.sendPbMsg(buildRet)

      const dbUserList: WL_IDbUserInfo[] = []

      if (rspGetUserInfo.userInfoList) {
        rspGetUserInfo.userInfoList.forEach((value) => {
          const dbUserInfo: WL_IDbUserInfo = {
            nick: value.nick ?? '',
            avatar: value.avatar ? value.avatar : default_user_logo,
            countryCode: value.countryCode ?? '',
            created: Long.fromValue(value.created ?? 0).toNumber(),
            email: value.email ?? '',
            sex: value.sex ?? 0,
            phone: value.phone ?? '',
            userId: value.userId ?? 0,
            status: value.status ?? 0,
            userType: value.type ?? 0,
            weilaNum: value.number ?? '',
            signature: value.signature ?? '',
            pinyinName: TinyPinyin.convertToPinyin(value.nick ?? ''),
          }

          dbUserList.push(dbUserInfo)
        })
      }

      return dbUserList
    }

    return Promise.reject('创造消息失败:' + buildRet.resultCode)
  }
}
