import { WLBuildMsgRet, WLChangeUserInfoData } from './weilapb_wrapper_data'
import { WL } from './weilapb'
import { BuildWeilaMsg } from './weilapb_wrapper'

const WeilaPbUserWrapper = {
  buildGetUserInfoReq(key: string): WLBuildMsgRet {
    const userMessage = WL.User.UserMessage.create({
      reqGetUserInfo: { key },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_USER,
      WL.User.UserCommandId.USER_COMMAND_GET_USERINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      userMessage,
    )
  },

  buildChangeUserInfoReq(changeUserInfo: WLChangeUserInfoData): WLBuildMsgRet {
    const userMessage = WL.User.UserMessage.create({
      reqChangeUserInfo: {
        avatar: changeUserInfo.avatar,
        nick: changeUserInfo.nick,
        sex: changeUserInfo.sex,
        signature: changeUserInfo.signature,
      },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_USER,
      WL.User.UserCommandId.USER_COMMAND_CHANGE_USERINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      userMessage,
    )
  },

  buildGetConfigReq(): WLBuildMsgRet {
    const userMessage = WL.User.UserMessage.create({ reqGetConfig: {} })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_USER,
      WL.User.UserCommandId.USER_COMMAND_GET_CONFIG,
      WL.Service.CommandType.COMMAND_REQUEST,
      userMessage,
    )
  },

  buildSetConfigReq(userId: number, key: string, value: string, subUserId: number): WLBuildMsgRet {
    const userMessage = WL.User.UserMessage.create({
      reqSetConfig: { name: key, userId, content: value },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_USER,
      WL.User.UserCommandId.USER_COMMAND_SET_CONFIG,
      WL.Service.CommandType.COMMAND_REQUEST,
      userMessage,
      subUserId,
    )
  },
}

export { WeilaPbUserWrapper }
