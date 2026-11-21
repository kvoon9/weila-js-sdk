import { getLogger } from 'log/weila_log'
import { WL_CoreInterface } from 'main/weila_internal_data'
import { WL } from 'proto/weilapb'
import { WL_IDbLocationInfo } from 'db/weila_db_data'
import { WeilaPbLocationWrapper } from 'proto/weilapb_location_wrapper'
import { WLBuildMsgRet, WLSessionInfo } from 'proto/weilapb_wrapper_data'
import Long from 'long'

const wllog = getLogger('MOD:location:info')

export default class WLLocationModule {
  constructor(private coreInterface: WL_CoreInterface) {
    this.coreInterface.registerPbMsgHandler(
      WL.Service.ServiceID.SERVICE_LOCATION,
      this.onPbMsgHandler.bind(this),
    )
  }

  private onPbMsgHandler(data: any): void {
    const serverMessage: WL.Service.IServiceMessage = data
    const serviceHead = serverMessage.serviceHead

    if (!serviceHead) return

    if (serviceHead.commandType === WL.Service.CommandType.COMMAND_RESPONSE) {
      if (serviceHead.commandId === WL.Location.LocationCommandId.LOCATION_COMMAND_GET_LOCATION) {
        wllog('获取的消息结果', serverMessage)
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          serverMessage.locationMessage?.rspGetLocation,
        )
      }
    }
  }

  public async getLocation(sessionId: string, sessionType: number): Promise<WL_IDbLocationInfo[]> {
    const sessionInfo: WLSessionInfo = {
      sessionId: Long.fromValue(sessionId),
      sessionType,
    }

    const getLocationReq: WLBuildMsgRet = WeilaPbLocationWrapper.buildGetLocationReq(
      sessionInfo,
      [],
    )

    if (getLocationReq.resultCode === 0) {
      const rspLocation: WL.Location.IRspGetLocation =
        await this.coreInterface.sendPbMsg(getLocationReq)

      const locationInfos: WL_IDbLocationInfo[] = []

      for (const info of rspLocation.locationInfos ?? []) {
        const locationParam = info.locationParam

        const locationInfo: WL_IDbLocationInfo = {
          userId: info.userId ?? 0,
          clientType: info.clientType ?? 0,
          locationType: info.locationType ?? 0,
          altitude: locationParam?.altitude ?? 0,
          longitude: locationParam?.longitude ?? 0,
          latitude: locationParam?.latitude ?? 0,
          radius: locationParam?.radius ?? 0,
          speed: locationParam?.speed ?? 0,
          direction: locationParam?.direction ?? 0,
          timestamp: Long.fromValue(locationParam?.timestamp ?? 0).toNumber(),
        }

        locationInfos.push(locationInfo)
      }

      return locationInfos
    }

    return Promise.reject('创建消息失败:' + getLocationReq.resultCode)
  }
}
