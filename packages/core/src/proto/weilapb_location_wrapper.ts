import { WL } from './weilapb'
import { WLBuildMsgRet, WLSessionInfo } from './weilapb_wrapper_data'
import Long from 'long'
import { BuildWeilaMsg } from './weilapb_wrapper'

const WeilaPbLocationWrapper = {
  buildGetLocationReq(sessionInfo: WLSessionInfo, userIdList: number[]): WLBuildMsgRet {
    const locationMessage = new WL.Location.LocationMessage()
    locationMessage.reqGetLocation = new WL.Location.ReqGetLocation()
    locationMessage.reqGetLocation.sessionInfo = new WL.Location.LocationSessionInfo()
    locationMessage.reqGetLocation.sessionInfo.sessionId = Long.fromValue(sessionInfo.sessionId)
    locationMessage.reqGetLocation.sessionInfo.sessionType = sessionInfo.sessionType

    if (userIdList.length) {
      locationMessage.reqGetLocation.userIds = Array.from(userIdList)
    }

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOCATION,
      WL.Location.LocationCommandId.LOCATION_COMMAND_GET_LOCATION,
      WL.Service.CommandType.COMMAND_REQUEST,
      locationMessage,
    )
  },
}

export { WeilaPbLocationWrapper }
