import { default_user_logo, WL_CoreInterface } from 'main/weila_internal_data'
import { WL } from 'proto/weilapb'
import { WeilaPbUserWrapper } from 'proto/weilapb_user_wrapper'
import Long from 'long'
import { getLogger } from 'log/weila_log'
import TinyPinyin from 'tiny-pinyin'
import { WL_IDbUserInfo } from 'db/weila_db_data'

const wllog = getLogger('MOD:user:info')

/** Routes one user response to the waiting sendPbMsg caller. */
type UserResponseRoute = (
  serviceHead: WL.Service.ServiceHead.$Properties,
  userMessage: WL.User.IUserMessage | null | undefined,
) => void

export default class WLUserModule {
  /**
   * Response routing per user command. Every command the module awaits
   * via sendPbMsg must have a route here; a missing route leaves the caller
   * to die on the watchdog timeout. `weila_user_module.spec.ts` guards
   * the wrapper's builders against this table.
   */
  private readonly responseRoutes = new Map<number, UserResponseRoute>([
    [
      WL.User.UserCommandId.USER_COMMAND_GET_USERINFO,
      (serviceHead, userMessage) => {
        wllog('搜索用户信息结果')
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          userMessage ? userMessage.rspGetUserInfo : null,
        )
      },
    ],
    [
      WL.User.UserCommandId.USER_COMMAND_SET_CONFIG,
      (serviceHead, userMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          userMessage ? userMessage.rspSetConfig : null,
        )
      },
    ],
  ])

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
      const commandId = serviceHead.commandId

      if (commandId !== undefined && commandId !== null) {
        const route = this.responseRoutes.get(commandId)

        if (route) route(serviceHead, serverMessage.userMessage)
      }
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
