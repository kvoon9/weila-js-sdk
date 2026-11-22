import { WL } from './weilapb'
import {
  WLBuildMsgRet,
  WLLocationControl,
  WLLocationInfo,
  WLSessionInfo,
} from './weilapb_wrapper_data'
import Long from 'long'
import { BuildWeilaMsg } from './weilapb_wrapper'

const WeilaPbLocationWrapper = {
  buildReportLocationReq(
    locationInfo: WLLocationInfo,
    sessionInfoList: WLSessionInfo[],
    appId: string,
    extensionType: number,
    extensionBody?: string,
  ): WLBuildMsgRet {
    const locationMessage = WL.Location.LocationMessage.create({
      reqReportLocation: {
        appid: appId,
        extensionType,
        extensionBody,
        locationInfo: {
          clientType: locationInfo.clientType,
          locationType: locationInfo.locationType,
          userId: locationInfo.userId,
          locationParam: {
            latitude: locationInfo.latitude,
            altitude: locationInfo.altitude,
            direction: locationInfo.direction,
            longitude: locationInfo.longitude,
            radius: locationInfo.radius,
            speed: locationInfo.speed,
            timestamp: Long.fromValue(locationInfo.timestamp),
          },
        },
        sessionInfos: sessionInfoList.map((value) => ({
          sessionId: Long.fromValue(value.sessionId),
          sessionType: value.sessionType,
        })),
      },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOCATION,
      WL.Location.LocationCommandId.LOCATION_COMMAND_REPORT_LOCATION,
      WL.Service.CommandType.COMMAND_REQUEST,
      locationMessage,
    )
  },

  buildGetLocationReq(sessionInfo: WLSessionInfo, userIdList: number[]): WLBuildMsgRet {
    const reqGetLocation: WL.Location.ReqGetLocation.$Properties = {
      sessionInfo: {
        sessionId: Long.fromValue(sessionInfo.sessionId),
        sessionType: sessionInfo.sessionType,
      },
    }

    if (userIdList.length) {
      reqGetLocation.userIds = Array.from(userIdList)
    }

    const locationMessage = WL.Location.LocationMessage.create({ reqGetLocation })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOCATION,
      WL.Location.LocationCommandId.LOCATION_COMMAND_GET_LOCATION,
      WL.Service.CommandType.COMMAND_REQUEST,
      locationMessage,
    )
  },

  buildLocationControlReq(
    sessionInfo: WLSessionInfo,
    locationControl: WLLocationControl,
    userIdList: number[],
  ): WLBuildMsgRet {
    const locationMessage = WL.Location.LocationMessage.create({
      reqLocationControl: {
        locationControl: {
          duration: locationControl.duration,
          frequency: locationControl.frequency,
          status: locationControl.status,
        },
        sessionInfo: {
          sessionId: Long.fromValue(sessionInfo.sessionId),
          sessionType: sessionInfo.sessionType,
        },
        userIds: Array.from(userIdList),
      },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_LOCATION,
      WL.Location.LocationCommandId.LOCATION_COMMAND_LOCATION_CONTROL,
      WL.Service.CommandType.COMMAND_REQUEST,
      locationMessage,
    )
  },
}

export { WeilaPbLocationWrapper }
