import { WL } from './weilapb';
import { WLBuildMsgRet } from './weilapb_wrapper_data';
import WeilaMsgHeader from './weilapb_msg_header';

class BuildWeilaMsg {
  public static buildWeilaMsgReq(
    serviceId: number,
    commandId: number,
    commandType: number,
    msgInstance: any,
    subUserId?: number,
  ): WLBuildMsgRet {
    const weilaMsgHeader = WeilaMsgHeader.buildWeilaMsgHeader(serviceId, commandId, 0);
    const buildRet: WLBuildMsgRet = { resultCode: 0 };
    const serviceMsg = new WL.Service.ServiceMessage({
      serviceHead: {
        commandId: commandId,
        commandType: commandType,
        serviceId: serviceId,
        seq: weilaMsgHeader.value.seqNum,
      },
    });

    if (subUserId) {
      serviceMsg.serviceHead!.subUserId = subUserId;
    }

    switch (serviceId) {
      case WL.Service.ServiceID.SERVICE_USER:
        {
          serviceMsg.userMessage = msgInstance;
        }
        break;

      case WL.Service.ServiceID.SERVICE_BUSINESS:
        {
          serviceMsg.businessMessage = msgInstance;
        }
        break;

      case WL.Service.ServiceID.SERVICE_FRIEND:
        {
          serviceMsg.friendMessage = msgInstance;
        }
        break;

      case WL.Service.ServiceID.SERVICE_GROUP:
        {
          serviceMsg.groupMessage = msgInstance;
        }
        break;

      case WL.Service.ServiceID.SERVICE_LOCATION:
        {
          serviceMsg.locationMessage = msgInstance;
        }
        break;

      case WL.Service.ServiceID.SERVICE_SESSION:
        {
          serviceMsg.sessionMessage = msgInstance;
        }
        break;

      case WL.Service.ServiceID.SERVICE_LOGIN:
        {
          serviceMsg.loginMessage = msgInstance;
        }
        break;

      case WL.Service.ServiceID.SERVICE_SYSTEM:
        {
          serviceMsg.systemMessage = msgInstance;
        }
        break;

      default: {
        buildRet.resultCode = -1;
        return buildRet;
      }
    }

    const serviceMsgBuffer = WL.Service.ServiceMessage.encode(serviceMsg).finish().slice();
    let offset = 0;
    weilaMsgHeader.value.length = WeilaMsgHeader.msgHeaderLen + serviceMsgBuffer.length;
    buildRet.reqData = new Uint8Array(weilaMsgHeader.value.length);
    buildRet.weilaMsgHeader = weilaMsgHeader.getValue();

    const weilaMsgHeaderBuf = weilaMsgHeader.serializeToBuffer();
    for (offset = 0; offset < weilaMsgHeader.value.length; offset++) {
      if (offset < WeilaMsgHeader.msgHeaderLen) {
        buildRet.reqData[offset] = weilaMsgHeaderBuf[offset];
      } else {
        buildRet.reqData[offset] = serviceMsgBuffer[offset - WeilaMsgHeader.msgHeaderLen];
      }
    }

    return buildRet;
  }
}

export { BuildWeilaMsg };
