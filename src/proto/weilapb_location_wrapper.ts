import {WL} from "./weilapb";
import {WLBuildMsgRet, WLLocationControl, WLLocationInfo, WLSessionInfo} from "./weilapb_wrapper_data";
import Long from "long";
import {BuildWeilaMsg} from "./weilapb_wrapper";

class WeilaPbLocationWrapper {
    public static buildReportLocationReq(locationInfo: WLLocationInfo,
                                         sessionInfoList: WLSessionInfo[],
                                         appId: string,
                                         extensionType: number,
                                         extensionBody?: string): WLBuildMsgRet {
        const locationMessage = new WL.Location.LocationMessage();
        locationMessage.reqReportLocation = new WL.Location.ReqReportLocation();
        locationMessage.reqReportLocation.appid = appId;
        locationMessage.reqReportLocation.extensionType = extensionType;
        locationMessage.reqReportLocation.extensionBody = extensionBody;
        locationMessage.reqReportLocation.locationInfo = new WL.Location.LocationInfo();
        locationMessage.reqReportLocation.locationInfo.clientType = locationInfo.clientType;
        locationMessage.reqReportLocation.locationInfo.locationType = locationInfo.locationType;
        locationMessage.reqReportLocation.locationInfo.userId = locationInfo.userId;
        locationMessage.reqReportLocation.locationInfo.locationParam = new WL.Location.LocationParam();
        locationMessage.reqReportLocation.locationInfo.locationParam.latitude = locationInfo.latitude;
        locationMessage.reqReportLocation.locationInfo.locationParam.altitude = locationInfo.altitude;
        locationMessage.reqReportLocation.locationInfo.locationParam.direction = locationInfo.direction;
        locationMessage.reqReportLocation.locationInfo.locationParam.longitude = locationInfo.longitude;
        locationMessage.reqReportLocation.locationInfo.locationParam.radius = locationInfo.radius;
        locationMessage.reqReportLocation.locationInfo.locationParam.speed = locationInfo.speed;
        locationMessage.reqReportLocation.locationInfo.locationParam.timestamp = Long.fromValue(locationInfo.timestamp);

        locationMessage.reqReportLocation.sessionInfos = [];
        sessionInfoList.forEach(value => {
            locationMessage.reqReportLocation!.sessionInfos!.push({sessionId: Long.fromValue(value.sessionId), sessionType: value.sessionType});
        });

        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOCATION, WL.Location.LocationCommandId.LOCATION_COMMAND_REPORT_LOCATION,
            WL.Service.CommandType.COMMAND_REQUEST, locationMessage);
    }

    public static buildGetLocationReq(sessionInfo: WLSessionInfo, userIdList: number[]): WLBuildMsgRet {
        const locationMessage = new WL.Location.LocationMessage();
        locationMessage.reqGetLocation = new WL.Location.ReqGetLocation();
        locationMessage.reqGetLocation.sessionInfo = new WL.Location.LocationSessionInfo();
        locationMessage.reqGetLocation.sessionInfo.sessionId = Long.fromValue(sessionInfo.sessionId);
        locationMessage.reqGetLocation.sessionInfo.sessionType = sessionInfo.sessionType;
        if (userIdList.length) {
            locationMessage.reqGetLocation.userIds = Array.from(userIdList);
        }

        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOCATION, WL.Location.LocationCommandId.LOCATION_COMMAND_GET_LOCATION,
            WL.Service.CommandType.COMMAND_REQUEST, locationMessage);
    }

    public static buildLocationControlReq(sessionInfo: WLSessionInfo, locationControl: WLLocationControl, userIdList: number[]): WLBuildMsgRet {
        const locationMessage = new WL.Location.LocationMessage();
        locationMessage.reqLocationControl = new WL.Location.ReqLocationControl();
        locationMessage.reqLocationControl.locationControl = new WL.Location.LocationControl();
        locationMessage.reqLocationControl.locationControl.duration = locationControl.duration;
        locationMessage.reqLocationControl.locationControl.frequency = locationControl.frequency;
        locationMessage.reqLocationControl.locationControl.status = locationControl.status;

        locationMessage.reqLocationControl.sessionInfo = new WL.Location.LocationSessionInfo();
        locationMessage.reqLocationControl.sessionInfo.sessionId = Long.fromValue(sessionInfo.sessionId);
        locationMessage.reqLocationControl.sessionInfo.sessionType = sessionInfo.sessionType;

        locationMessage.reqLocationControl.userIds = Array.from(userIdList);

        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_LOCATION, WL.Location.LocationCommandId.LOCATION_COMMAND_LOCATION_CONTROL,
            WL.Service.CommandType.COMMAND_REQUEST, locationMessage);
    }
}

export {WeilaPbLocationWrapper}
