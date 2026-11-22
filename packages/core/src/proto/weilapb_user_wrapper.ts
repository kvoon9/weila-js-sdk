import { WLBuildMsgRet } from './weilapb_wrapper_data'
import { WL } from './weilapb'
import { BuildWeilaMsg } from './weilapb_wrapper'

const WeilaPbUserWrapper = {
  buildGetUserInfoReq(key: string): WLBuildMsgRet {
    const userMessage = new WL.User.UserMessage()
    userMessage.reqGetUserInfo = new WL.User.ReqGetUserInfo()
    userMessage.reqGetUserInfo.key = key

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_USER,
      WL.User.UserCommandId.USER_COMMAND_GET_USERINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      userMessage,
    )
  },
}

export { WeilaPbUserWrapper }
