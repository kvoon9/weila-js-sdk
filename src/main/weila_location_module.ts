import {getLogger} from "log/weila_log";
import {WL_CoreInterface} from "main/weila_internal_data";
import {WL} from "proto/weilapb";
import {WL_IDbLocationInfo} from "db/weila_db_data";
import {WeilaPbLocationWrapper} from "proto/weilapb_location_wrapper";
import {WLBuildMsgRet, WLSessionInfo} from "proto/weilapb_wrapper_data";
import Long from 'long';
import {parsePbErrResult} from "main/weila_utils";

const wllog = getLogger('MOD:location:info');
const wlerr = getLogger('MOD:location:err')

export default class WLLocationModule {
	constructor(private coreInterface: WL_CoreInterface) {
		this.coreInterface.registerPbMsgHandler(WL.Service.ServiceID.SERVICE_LOCATION, this.onPbMsgHandler.bind(this));
	}

	private onPbMsgHandler(data: any): void {
		const serverMessage = data as WL.Service.IServiceMessage;
		const serviceHead = serverMessage.serviceHead;
		if (serviceHead.commandType == WL.Service.CommandType.COMMAND_RESPONSE) {
			if (serviceHead.commandId == WL.Location.LocationCommandId.LOCATION_COMMAND_GET_LOCATION) {
				wllog('获取的消息结果', serverMessage);
				this.coreInterface.rspPbMsg(serviceHead.seq, serviceHead.resultCode, serverMessage.locationMessage.rspGetLocation);
			}
		}
	}

	public async getLocation(sessionId: string, sessionType: number): Promise<WL_IDbLocationInfo[]> {
		const sessionInfo = {} as WLSessionInfo;
		sessionInfo.sessionId = Long.fromValue(sessionId);
		sessionInfo.sessionType = sessionType;
		const getLocationReq: WLBuildMsgRet = WeilaPbLocationWrapper.buildGetLocationReq(sessionInfo, []);

		if (getLocationReq.resultCode == 0) {
			const rspLocation: WL.Location.IRspGetLocation = await this.coreInterface.sendPbMsg(getLocationReq);
			const locationInfos: WL_IDbLocationInfo[] = [];

			for (const info of rspLocation.locationInfos) {
				const locationInfo: WL_IDbLocationInfo = {} as WL_IDbLocationInfo;
				locationInfo.userId = info.userId;
				locationInfo.clientType = info.clientType;
				locationInfo.locationType = info.locationType;
				locationInfo.altitude = info.locationParam.altitude;
				locationInfo.longitude = info.locationParam.longitude;
				locationInfo.latitude = info.locationParam.latitude;
				locationInfo.radius = info.locationParam.radius;
				locationInfo.speed = info.locationParam.speed;
				locationInfo.direction = info.locationParam.direction;
				locationInfo.timestamp = Long.fromValue(info.locationParam.timestamp).toNumber();

				locationInfos.push(locationInfo);
			}

			return locationInfos;
		}

		return Promise.reject('创建消息失败:' + getLocationReq.resultCode);
	}
}
