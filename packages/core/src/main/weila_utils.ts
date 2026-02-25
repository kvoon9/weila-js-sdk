import { WL_PbMsgErrorInfo } from 'main/weila_external_data';
import { WL } from 'proto/weilapb';
import { getLogger } from 'log/weila_log';
import { WL_PttPayload } from 'main/weila_internal_data';
import { WL_IDbMsgData } from 'db/weila_db_data';

const wllog = getLogger('UTIL:info');
const wlerr = getLogger('UTIL:err');

async function fetchWithTimeout(
  input: RequestInfo,
  init?: RequestInit,
  timeout?: number,
): Promise<Response> {
  const controller = new AbortController();
  const signal = controller.signal;
  let timerId = null as any;
  const localInit = init ? init : ({} as RequestInit);
  localInit.signal = signal;

  wllog('fetch url:', input);

  const timeoutPromise = (localTimeout) => {
    return new Promise<Response>((resolve, reject) => {
      timerId = setTimeout(() => {
        wlerr('获取URL:%s超时', input);
        resolve(new Response('timeout', { status: 504, statusText: 'timeout' }));
        controller.abort();
      }, localTimeout);
    });
  };

  const fetchPromise = () => {
    return new Promise<Response>((resolve, reject) => {
      wllog('输入URL', input);
      fetch(input, localInit)
        .then((value) => {
          clearTimeout(timerId);
          resolve(value);
        })
        .catch((reason) => {
          wlerr('获取失败', reason);
          reject(reason);
        });
    });
  };

  return Promise.race<Response>([timeoutPromise(timeout ? timeout : 30000), fetchPromise()]);
}

function parsePbErrResult(msg: string): WL_PbMsgErrorInfo | null {
  if (msg.search('RET_CODE:') !== -1 && msg.search('-MESSAGE:') !== -1) {
    const pattern = /RET_CODE:([a-zA-Z0-9].*)-MESSAGE:(.*):END/i;
    const match = msg.match(pattern);
    if (match && match.length === 3) {
      const errorInfo = {} as WL_PbMsgErrorInfo;
      errorInfo.resultCode = parseInt(match[1]);
      errorInfo.errorMsg = match[2];
      return errorInfo;
    }
  }

  return null;
}

function getPbResultCodeMassage(resultCode: number): string {
  let msg = '';
  switch (resultCode) {
    case WL.Service.ResultCode.RESULT_SUCCESS:
      {
        msg = '成功';
      }
      break;

    case WL.Service.ResultCode.RESULT_FAILURE:
      {
        msg = '失败';
      }
      break;

    case WL.Service.ResultCode.RESULT_DISCONNECT:
      {
        msg = '连接中断';
      }
      break;

    case WL.Service.ResultCode.RESULT_NO_MSG_SERVER:
      {
        msg = '未连接消息服务器';
      }
      break;

    case WL.Service.ResultCode.RESULT_NO_DB_SERVER:
      {
        msg = '未连接数据服务器';
      }
      break;

    case WL.Service.ResultCode.RESULT_NO_CACHE_SERVER:
      {
        msg = '未连接缓存服务器';
      }
      break;

    case WL.Service.ResultCode.RESULT_NO_LOGIN_SERVER:
      {
        msg = '未连接登录服务器';
      }
      break;

    case WL.Service.ResultCode.RESULT_NO_ROUTE_SERVER:
      {
        msg = '未连接路由服务器';
      }
      break;

    case WL.Service.ResultCode.RESULT_DB_EXCEPTION:
      {
        msg = '数据库异常';
      }
      break;

    case WL.Service.ResultCode.RESULT_CACHE_EXCEPTION:
      {
        msg = '缓存异常';
      }
      break;

    case WL.Service.ResultCode.RESULT_SERVER_MAINTENANCE:
      {
        msg = '服务器维护中';
      }
      break;

    case WL.Service.ResultCode.RESULT_SERVER_EXCEPTION:
      {
        msg = '服务器异常';
      }
      break;

    case WL.Service.ResultCode.RESULT_PARAM_INVALID:
      {
        msg = '参数错误';
      }
      break;

    case WL.Service.ResultCode.RESULT_REQUEST_NOT_SUPPORT:
      {
        msg = '请求不支持';
      }
      break;

    case WL.Service.ResultCode.RESULT_REQUEST_LIMITED:
      {
        msg = '请求受限';
      }
      break;

    case WL.Service.ResultCode.RESULT_REQUEST_INVALID:
      {
        msg = '请求已过期';
      }
      break;

    case WL.Service.ResultCode.RESULT_VERSION_TOO_OLD:
      {
        msg = 'APP版本太旧,需要更新';
      }
      break;

    case WL.Service.ResultCode.RESULT_BLACKLIST_LIMITED:
      {
        msg = '您已被拉黑';
      }
      break;

    case WL.Service.ResultCode.RESULT_AUTH_INVALID:
      {
        msg = '认证无效';
      }
      break;

    case WL.Service.ResultCode.RESULT_PERMIT_LIMITED:
      {
        msg = '权限受限';
      }
      break;

    case WL.Service.ResultCode.RESULT_DATA_NOT_EXIST:
      {
        msg = '数据不存在';
      }
      break;

    case WL.Service.ResultCode.RESULT_DATA_INVALID:
      {
        msg = '数据无效';
      }
      break;

    case WL.Service.ResultCode.RESULT_VERIFICATION_CODE_ERROR:
      {
        msg = '验证码错误';
      }
      break;

    case WL.Service.ResultCode.RESULT_TOKEN_INVALID:
      {
        msg = '授权失效';
      }
      break;

    case WL.Service.ResultCode.RESULT_REQUEST_FREQUENTLY:
      {
        msg = '请求太频繁';
      }
      break;

    case WL.Service.ResultCode.RESULT_NUMBER_RESOURCE_USE_UP:
      {
        msg = '号码资源耗尽';
      }
      break;

    case WL.Service.ResultCode.RESULT_REQUEST_TIMEOUT:
      {
        msg = '请求超时';
      }
      break;

    case WL.Service.ResultCode.RESULT_TRANSMIT_TIMEOUT:
      {
        msg = '网络传输超时';
      }
      break;

    case WL.Service.ResultCode.RESULT_APP_ILLEGAL:
      {
        msg = '应用未授权,请从官方渠道获取';
      }
      break;

    case WL.Service.ResultCode.RESULT_PHONE_DUPLICATE:
      {
        msg = '手机号已被使用';
      }
      break;

    case WL.Service.ResultCode.RESULT_PHONE_INVALID:
      {
        msg = '手机号无效';
      }
      break;

    case WL.Service.ResultCode.RESULT_PHONE_HAS_BEEN_BANNED:
      {
        msg = '手机号被封禁';
      }
      break;

    case WL.Service.ResultCode.RESULT_PASSWORD_ERROR:
      {
        msg = '密码错误';
      }
      break;

    case WL.Service.ResultCode.RESULT_SEND_VERIFICATION_CODE_FAIL:
      {
        msg = '发送验证码失败';
      }
      break;

    //Login Error
    case WL.Service.ResultCode.RESULT_LOGIN_FORBID_IP:
      {
        msg = '用户IP被封 从forbidDuration获取剩余时长(设备不再自动登录)';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_FORBID_USER:
      {
        msg = '用户被封号 从forbidDuration获取剩余时长(设备不再自动登录)';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_PASSWORD_ERROR_TOO_TIMES:
      {
        msg =
          '密码输入错误次数太多,请待系统解封后再试(默认30分钟后才可登录) 从forbidDuration获取剩余时长(设备不再自动登录)';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_SYSTEM_FULL:
      {
        msg = '在线用户达到系统容量';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_VERIFYCODE_INVALID:
      {
        msg = '验证码无效';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_ACCOUNT_OR_PASSWD_ERROR:
      {
        msg = '账号或密码错误(设备不再自动登录)';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_EXTENSION_HAS_BIND:
      {
        msg = '用户已绑定设备';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_EXTENSION_BINDING:
      {
        msg = '设备绑定中';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_EXTENSION_NOT_BIND:
      {
        msg = '未绑定分机';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_EXTENSION_LAWLESSNESS:
      {
        msg = '非法设备(设备不再自动登录)';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_EXTENSION_LICENSE_LIMITED:
      {
        msg = '许可证用完(设备不再自动登录)';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_EXTENSION_ACCOUNT_ERROR:
      {
        msg = '设备账号错误(设备不再自动登录)';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_EXTENSION_PASSWORD_ERROR:
      {
        msg = '设备密码错误(设备不再自动登录)';
      }
      break;

    case WL.Service.ResultCode.RESULT_LOGIN_EXTENSION_OFFLINE:
      {
        msg = '设备不在线';
      }
      break;

    //User Error
    case WL.Service.ResultCode.RESULT_USER_NOT_EXIST:
      {
        msg = '用户不存在';
      }
      break;

    case WL.Service.ResultCode.RESULT_USER_PERIPHERAL_UNAUTHORIZED:
      {
        msg = '外设未授权';
      }
      break;

    case WL.Service.ResultCode.RESULT_USER_PERIPHERAL_REPLICATED:
      {
        msg = '外设被复制';
      }
      break;

    case WL.Service.ResultCode.RESULT_USER_PERIPHERAL_MULTIDEVICE:
      {
        msg = '外设在多设备上使用';
      }
      break;

    case WL.Service.ResultCode.RESULT_USER_OFFLINE:
      {
        msg = '用户不在线';
      }
      break;

    //Friend Error
    case WL.Service.ResultCode.RESULT_FRIEND_NOT_FRIEND:
      {
        msg = '不是好友';
      }
      break;

    case WL.Service.ResultCode.RESULT_FRIEND_INVITE_NOT_EXIST:
      {
        msg = '好友邀请已过期';
      }
      break;

    case WL.Service.ResultCode.RESULT_FRIEND_IS_BLACKLIST:
      {
        msg = '您已被对方加入黑名单  ';
      }
      break;

    case WL.Service.ResultCode.RESULT_FRIEND_SHIELD_OPEN:
      {
        msg = '好友已开启消息屏蔽   ';
      }
      break;

    //Group Error
    case WL.Service.ResultCode.RESULT_GROUP_NOT_EXIST:
      {
        msg = '群组不存在';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_ACCESS_LIMITED:
      {
        msg = '访问受限,请明天再试(被踢或被封)';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_YOU_ARE_NOT_OWNER:
      {
        msg = '您不是群主';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_YOU_ARE_NOT_ADMIN:
      {
        msg = '您不是群管理员';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_MEMBERS_FULL:
      {
        msg = '成员数达到上限';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_NUMBER_USEUP:
      {
        msg = '群组号耗尽';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_BROADCAST_EXIST:
      {
        msg = '群组广播已存在';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_BROADCAST_NOEXIST:
      {
        msg = '群组广播不存在';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_PASSWORD_ERROR:
      {
        msg = '群密码错误';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_OWNER_FULL:
      {
        msg = '您创建的群组数达到上限';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_BURST_OCCUPY:
      {
        msg = '话权被占用';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_USER_NOT_MEMBER:
      {
        msg = '用户不是群成员';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_MEMBER_LIMIT_MAX:
      {
        msg = '群成员上限达到最大值';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_MEMBER_IS_ADMIN:
      {
        msg = '不能对管理员进行操作';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_USER_IN_BLACKLIST:
      {
        msg = '用户被加入群黑名单';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_OWNER_CANNOT_EXIT:
      {
        msg = '群主不能退群,请先转让群主或直接删除群';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_YOU_ARE_SHUTUP:
      {
        msg = '你已被禁言';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_MEMBER_SHUTUP:
      {
        msg = '群成员被禁言';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_MEMBER_IS_OWNER:
      {
        msg = '不能对群主进行操作';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_BURST_REVOKE:
      {
        msg = '话权被回收';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_MEMBER_IS_EXTENSION:
      {
        msg = '不能对设备用户进行操作';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_COUNT_LIMIT:
      {
        msg = '加群数量达到上限';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_MEMBER_HAS_EXTENSION:
      {
        msg = '成员中存在设备用户';
      }
      break;

    case WL.Service.ResultCode.RESULT_GROUP_OWNER_CANNOT_EXTENSION:
      {
        msg = '群主不能是设备用户';
      }
      break;

    //Session Error
    case WL.Service.ResultCode.RESULT_SESSION_BURST_MONITOR:
      {
        msg = '设备正在被其他人监听,请稍后再试';
      }
      break;

    //Room Error
    case WL.Service.ResultCode.RESULT_ROOM_HAS_EXIST:
      {
        msg = '房间已存在';
      }
      break;

    case WL.Service.ResultCode.RESULT_ROOM_NOT_EXIST:
      {
        msg = '房间不存在';
      }
      break;

    case WL.Service.ResultCode.RESULT_ROOM_LOCK:
      {
        msg = '房间处于锁定状态';
      }
      break;

    case WL.Service.ResultCode.RESULT_ROOM_SPEAKING:
      {
        msg = '有人在讲话';
      }
      break;

    case WL.Service.ResultCode.RESULT_ROOM_CHANGE_CHARGE_LIMITED:
      {
        msg = '房间未锁定或有访客不允许修改计费';
      }
      break;

    case WL.Service.ResultCode.RESULT_ROOM_HONORED_GUEST_PERMIT:
      {
        msg = '只有嘉宾才允许当前操作';
      }
      break;

    case WL.Service.ResultCode.RESULT_ROOM_NOT_ENTRY:
      {
        msg = '用户未进入房间';
      }
      break;

    case WL.Service.ResultCode.RESULT_ROOM_YOU_ARE_HONORED_GUEST:
      {
        msg = '您已经是嘉宾';
      }
      break;

    case WL.Service.ResultCode.RESULT_ROOM_HONORED_GUEST_FULL:
      {
        msg = '嘉宾数量达到上限';
      }
      break;

    //Business Error
    case WL.Service.ResultCode.RESULT_BUSINESS_SERVICE_CLOSED:
      {
        msg = '服务已关闭';
      }
      break;

    case WL.Service.ResultCode.RESULT_BUSINESS_STAFF_INVALID:
      {
        msg = '不是客服号';
      }
      break;

    case WL.Service.ResultCode.RESULT_BUSINESS_STAFF_NOT_ONLINE:
      {
        msg = '客服不在线';
      }
      break;

    case WL.Service.ResultCode.RESULT_BUSINESS_STAFF_BUSY:
      {
        msg = '客服忙';
      }
      break;

    default: {
      msg = '';
    }
  }

  wllog('resultCode:', resultCode, 'msg:', msg);
  return msg;
}

function getResultCodeFromError(errorMsg: string): number {
  const pattern = /RET_CODE:(.*)-MESSAGE:/i;
  const result = errorMsg.match(pattern);
  if (result) {
    if (result.length > 1) {
      return parseInt(result[1]);
    }
  }

  return -1;
}

/**
 * 可以获取执行pb消息后错误返回的信息解析
 * @param errorMsg
 */
function getErrorMsg(errorMsg: string): string {
  const retCode = getResultCodeFromError(errorMsg);
  if (retCode !== -1) {
    return getPbResultCodeMassage(retCode);
  }

  return errorMsg;
}

function AsyncTime(notShow?: boolean) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;
    if (!notShow) {
      descriptor.value = async function (...args: any[]) {
        console.time(propertyKey);
        try {
          const ret = await method.apply(this, args);
          console.timeEnd(propertyKey);
          return ret;
        } catch (e) {
          wlerr(propertyKey, e);
          console.timeEnd(propertyKey);
          return Promise.reject(e);
        }
      };
    }
  };
}

function SyncTime(notShow?: boolean) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;
    if (!notShow) {
      descriptor.value = function (...args: any[]) {
        console.time(propertyKey);
        const ret = method.apply(this, args);
        console.timeEnd(propertyKey);
        return ret;
      };
    }
  };
}

function getAppKeyAndId(): any {
  return {
    appId: process.env.APPID,
    appKey: process.env.APPKEY,
  };
}

function getWebsocketAddr(): string {
  return process.env.WSS;
}

function decompositionAudioData(pttData: Uint8Array): WL_PttPayload[] {
  let offset = 0;
  let sizeOfOpusData = 0;
  let codedDataList = [] as WL_PttPayload[];
  let frames = 0,
    prevFrames = 0;
  let prevOffset = 0;

  while (offset < pttData.length) {
    const flag = pttData[offset];
    offset += 1;

    if (flag & 0x80) {
      const dataView = new DataView(pttData.buffer);
      sizeOfOpusData = dataView.getUint16(1, false) + 1;
      offset += 2;
    } else {
      sizeOfOpusData = pttData[offset] + 1;
      offset += 1;
    }

    offset += sizeOfOpusData - 1;
    frames++;
    if ((frames + 1) % 25 === 0) {
      const payload = {} as WL_PttPayload;
      payload.frameCount = frames - prevFrames;
      payload.data = new Uint8Array(pttData.slice(prevOffset, offset));
      codedDataList.push(payload);
      prevOffset = offset;
      prevFrames = frames;
    }
  }

  if (prevOffset < offset) {
    const payload = {} as WL_PttPayload;
    payload.frameCount = frames - prevFrames;
    payload.data = new Uint8Array(pttData.slice(prevOffset, offset));
    codedDataList.push(payload);
  }

  return codedDataList;
}

function getOpusDataFrameCount(pttData: Uint8Array): number {
  let frameCount = 0;
  let offset = 0;
  let sizeOfOpusData = 0;
  let codedDataList = null;

  while (offset < pttData.length) {
    const flag = pttData[offset];
    offset += 1;

    if (flag & 0x80) {
      const dataView = new DataView(pttData.buffer);
      sizeOfOpusData = dataView.getUint16(1, false) + 1;
      offset += 2;
    } else {
      sizeOfOpusData = pttData[offset] + 1;
      offset += 1;
    }

    offset += sizeOfOpusData - 1;
    frameCount++;
  }

  return frameCount;
}

function getOpusDataListFromPttData(pttData: Uint8Array): Uint8Array[] {
  let offset = 0;
  let sizeOfOpusData = 0;
  let codedDataList = null;

  while (offset < pttData.length) {
    if (codedDataList === null) {
      codedDataList = [];
    }
    const flag = pttData[offset];
    offset += 1;

    if (flag & 0x80) {
      const dataView = new DataView(pttData.buffer);
      sizeOfOpusData = dataView.getUint16(1, false) + 1;
      offset += 2;
    } else {
      sizeOfOpusData = pttData[offset] + 1;
      offset += 1;
    }

    const codedData = new Uint8Array(sizeOfOpusData);
    codedData[0] = flag;
    codedData.set(pttData.subarray(offset, offset + sizeOfOpusData - 1), 1);
    codedDataList.push(codedData);
    offset += sizeOfOpusData - 1;
  }

  return codedDataList;
}

function calculateOpusDataFrame(opusData: Uint8Array): number {
  let offset = 0;
  let sizeOfOpusData = 0;
  let frameCount = 0;

  while (offset < opusData.length) {
    const flag = opusData[offset];
    offset += 1;

    if (flag & 0x80) {
      const dataView = new DataView(opusData.buffer);
      sizeOfOpusData = dataView.getUint16(1, false) + 1;
      offset += 2;
    } else {
      sizeOfOpusData = opusData[offset] + 1;
      offset += 1;
    }
    offset += sizeOfOpusData - 1;
    frameCount++;
  }

  return frameCount;
}

function getMsgDataIdByCombo(msgData: WL_IDbMsgData, seq: number): string {
  if (msgData) {
    return msgData.sessionId + '_' + msgData.sessionType + '_' + msgData.msgId + '_' + seq;
  }

  return '';
}

export {
  fetchWithTimeout,
  getPbResultCodeMassage,
  parsePbErrResult,
  getResultCodeFromError,
  getErrorMsg,
  AsyncTime,
  SyncTime,
  getAppKeyAndId,
  getOpusDataFrameCount,
  decompositionAudioData,
  getOpusDataListFromPttData,
  calculateOpusDataFrame,
  getWebsocketAddr,
  getMsgDataIdByCombo,
};
