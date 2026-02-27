import { WLBuildMsgRet, WLMsgHeader } from 'proto/weilapb_wrapper_data';
import { WL_IDbUserInfo, WL_IDbMsgData } from 'db/weila_db_data';
import { WLPlayerType } from 'audio/weila_audio_data';
import { WL_ExtEventID, WL_PttPlayIndData } from 'main/weila_external_data';

interface WL_PromiseCallback {
  resolve(data: any): any;
  reject(reason: any): any;
}


const default_user_logo =
  'https://weilaavatar.oss-cn-shenzhen.aliyuncs.com/default/user_avatar_default.png';
const default_group_logo = 'https://weilaavatar.oss-cn-shenzhen.aliyuncs.com/default/session.png';

enum WL_NetworkState {
  NET_CONNECTING_STATE,
  NET_CONNECTED_STATE,
  NET_DISCONNECTING_STATE,
  NET_DISCONNECTED_STATE,
}

enum WL_NetworkEventID {
  NET_WEBSOCK_ADDR_SET_EVT,
  NET_EXCEPTION_IND_EVT,
  NET_CONNECT_EVT,
  NET_DISCONNECT_EVT,
  NET_SEND_DATA_EVT,
  NET_STATE_IND_EVT,
  NET_MSG_RECV_IND_EVT,
}

interface WL_NetworkEvent {
  eventId: WL_NetworkEventID;
  eventData: any;
}

interface WL_PbMsgData {
  header: WLMsgHeader;
  pbMsgData?: any;
}

interface WL_PbMsgHandler {
  (data: any): void;
}

interface WL_LoginParam {
  retryCount: number;
  account: string;
  password: string;
  countryCode: string;
  callback: WL_PromiseCallback;
}

interface WL_LoginResult {
  callback: WL_PromiseCallback;
  loginUserInfo?: WL_IDbUserInfo;
  error?: any;
}

interface WL_CoreInterface {
  sendExtEvent(event: WL_ExtEventID, data: any): void;
  sendPbMsg(buildPbMsg: WLBuildMsgRet, timeout?: number): Promise<any>;
  rspPbMsg(seq: number, resultCode: number, data: any): void;
  registerPbMsgHandler(serviceId: number, handler: WL_PbMsgHandler): void;
  executeCoreFunc(funcName: string, ...argvs: any[]): Promise<any>;
  getLoginUserInfo(): WL_IDbUserInfo;
}

interface WL_PttPayload {
  frameCount: number;
  data: Uint8Array;
}

interface WL_PttAudioItem {
  id: string;
  msgData: WL_IDbMsgData;
  payloadList: WL_PttPayload[];
  priority: number;
  isCompleted: boolean;
  recvWaitTimerId: any;
  playIndex: number;
  playerType: WLPlayerType;
  shouldSave: boolean;
}

enum WL_PttPackType {
  PTT_FIRST_PACK = 0x00,
  PTT_INTER_PACK = 0x01,
  PTT_END_PACK = 0x02,
  PTT_WHOLE_PACK = 0x03,
}

interface WL_PttPacket {
  seq: number;
  seqInPackage: number;
  sourceType: number;
  frameCount: number;
  mark: WL_PttPackType;
  data: Uint8Array;
}

interface WL_PttFsmListener {
  onPlayInd(audioItem: WL_PttAudioItem | null, playIndData: WL_PttPlayIndData): void;
  onRecordPttPacketInd(pttPacket: WL_PttPacket): void;
}

export {
  WL_PromiseCallback,
  default_user_logo,
  default_group_logo,
  WL_PbMsgHandler,
  WL_CoreInterface,
  WL_NetworkEvent,
  WL_NetworkEventID,
  WL_NetworkState,
  WL_PbMsgData,
  WL_LoginParam,
  WL_LoginResult,
  WL_PttAudioItem,
  WL_PttPayload,
  WL_PttPacket,
  WL_PttFsmListener,
  WL_PttPackType,
};
