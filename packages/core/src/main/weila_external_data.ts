import {
  WL_IDbExtensionInfo,
  WL_IDbGroup,
  WL_IDbMsgData,
  WL_IDbService,
  WL_IDbServiceSession,
  WL_IDbServiceSessionInfo,
  WL_IDbServiceStaff,
  WL_IDbServiceStaffInfo,
  WL_IDbSession,
  WL_IDbUserInfo,
} from '../database/weila_db_data';
import { WL } from 'proto/weilapb';
import ServiceSession = WL.Business.ServiceSession;

interface WL_ExtEventCallback {
  (eventId: WL_ExtEventID, eventData: any): void;
}

interface WL_PbMsgErrorInfo {
  resultCode: number;
  errorMsg: string;
}

interface WL_DataPrepareInd {
  state: WL_DataPrepareState;
  msg: string;
}

enum WL_DataPrepareState {
  START_PREPARING,
  PREPARE_PROGRESS_IND,
  PREPARE_SUCC_END,
  PREPARE_FAIL_END,
}

enum WL_PttAudioPlayState {
  PTT_AUDIO_PLAYING_START,
  PTT_AUDIO_PLAYING,
  PTT_AUDIO_PLAYING_END,
}

enum WL_PttAudioPlaySource {
  PTT_AUDIO_SRC_STREAM,
  PTT_AUDIO_SRC_HISTORY,
  PTT_AUDIO_SRC_SINGLE,
}

interface WL_PttPlayIndData {
  source: WL_PttAudioPlaySource;
  state: WL_PttAudioPlayState;
}

interface WL_PttPlayInd {
  msgData: WL_IDbMsgData;
  indData: WL_PttPlayIndData;
}

enum WL_PttRecordState {
  PTT_AUDIO_RECORDING_START,
  PTT_AUDIO_RECORDING,
  PTT_AUDIO_RECORDING_END,
}

interface WL_PttRecordInd {
  msgData: WL_IDbMsgData;
  state: WL_PttRecordState;
}

enum WL_ExtEventID {
  /*! 告知客户端，登陆后用户的数据的准备状态，data数据为 WL_DataPrepareState 类型 */
  WL_EXT_DATA_PREPARE_IND,
  /*! 告知客户端，系统遇到不可恢复异常，data数据为异常原因 */
  WL_EXT_SYSTEM_EXCEPTION_IND,
  /*! 告知客户端，播放语音的通知，数据类型为WL_PttPlayInfo */
  WL_EXT_PTT_PLAY_IND,
  /*! 告知客户段，对讲录音的通知, 数据为WL_PttRecordInd */
  WL_EXT_PTT_RECORD_IND,
  /*! 告知客户端，发送了新消息，带上结果WL_IDbMsgData */
  WL_EXT_MSG_SEND_IND,
  /*! 告知客户端，有新消息到来, 数据是WL_IDbMsgData */
  WL_EXT_NEW_MSG_RECV_IND,
  /*! 告知客户端，新会话自动创建, 数据是WL_IDbSession */
  WL_EXT_NEW_SESSION_OPEN_IND,
  /*! 告知客户端，有新的好友或群通知信息 */
  WL_EXT_NEW_NOTIFICATION_IND,
  /*! 告知客户端，群属性有变更 */
  WL_EXT_GROUP_MODIFIED_IND,
  /*! 告知客户端，群成员有更新 */
  WL_EXT_GROUP_MEMBERS_MODIFIED_IND,
  /*! 告知客户端，群被删除 */
  WL_EXT_GROUP_DELETED_IND,
  /*! 告知客户端，群成员被删除 */
  WL_EXT_GROUP_MEMBER_DELETED_IND,
  /*! 告知客户端，有新成员加入 */
  WL_EXT_GROUP_NEW_MEMBER_JOINED_IND,
  /*! 告知客户端，好友被删除，参数是userId */
  WL_EXT_FRIEND_DELETED_IND,
  /*! 告知客户端，好友信息更新, 参数是friendInfo */
  WL_EXT_FRIEND_MODIFIED_IND,
  /*! 告知客户端，有新好友 */
  WL_EXT_FRIEND_NEW_IND,

  /*! 服务会话变更通知, WL_IDbServiceSessionInfo 数据 */
  WL_EXT_COMMON_SESSION_CHANGE_IND,
  /*! 通用的客服邀请通知 WL_StaffInvite */
  WL_EXT_COMMON_STAFF_INVITE_IND,
  /*! 通用的客服应答通知 WL_CommonAnswerStaffInvite */
  WL_EXT_COMMON_ANSWER_INVITE_IND,
  /*! 客服接受服务会话通知 WL_StaffSessionInfo */
  WL_EXT_STAFF_ACCEPT_SESSION_IND,
  /*! 客服退出服务会话通知 WL_StaffSessionInfo */
  WL_EXT_STAFF_EXIT_SESSION_IND,
  /*! 客服关闭服务会话通知 WL_StaffSessionInfo */
  WL_EXT_STAFF_CLOSE_SESSION_IND,
  /*! 客服会话邀请通知 WL_ServiceSessionInvite */
  WL_EXT_STAFF_SESSION_INVITE_IND,
  /*! 客服应答服务会话通知 WL_StaffAnswerSessionInvite */
  WL_EXT_STAFF_ANSWER_INVITE_IND,
  /*! 服务会话被移除通知 sessionId */
  WL_EXT_STAFF_REMOVED_SESSION_IND,
  /*! 设备绑定应答通知 WL_UnbindAnswerInfo */
  WL_EXT_DEVICE_BINDING_ANSWER_IND,
}

enum WL_AnswerStatus {
  ANSWER_NORMAL = 0x00,
  ANSWER_ACCEPT = 0x01,
  ANSWER_REJECT = 0x02,
  ANSWER_IGNORE = 0x03,
}

interface WL_FriendInviteInfo {
  inviterUserInfo: WL_IDbUserInfo | undefined;
  inviteDetail: string;
  createdTime: number;
  status: WL_AnswerStatus;
}

interface WL_FriendAnswerInviteInfo {
  inviteeUserInfo: WL_IDbUserInfo | undefined;
  status: WL_AnswerStatus;
}

interface WL_GroupInviteInfo {
  groupInfo: WL_IDbGroup | undefined;
  invitorUserInfo: WL_IDbUserInfo | undefined;
  status: WL_AnswerStatus;
}

interface WL_GroupAnswerInviteInfo {
  groupInfo: WL_IDbGroup | undefined;
  invitorUserInfo: WL_IDbUserInfo | undefined;
  inviteeUserInfo: WL_IDbUserInfo | undefined;
  status: WL_AnswerStatus; // 应答结果, 0 未处理 1 接受 2 拒绝 3 忽略
  updated: number;
}

interface WL_GroupJoinInfo {
  groupInfo: WL_IDbGroup | undefined;
  joinUserInfo: WL_IDbUserInfo | undefined;
  status: WL_AnswerStatus;
  detail: string;
}

interface WL_GroupAnswerJoinInfo {
  groupInfo: WL_IDbGroup | undefined;
  joinUserInfo: WL_IDbUserInfo | undefined;
  answerUserInfo: WL_IDbUserInfo | undefined;
  status: WL_AnswerStatus;
  updated: number;
}

interface WL_GroupMemberDeleteInfo {
  groupId: string;
  initiatorId: number;
  userIdList: number[];
}

interface WL_StaffInvite {
  service: WL_IDbService;
  invitorInfo: WL_IDbServiceStaffInfo;
  content?: string;
}

interface WL_CommonAnswerStaffInvite {
  serviceId: number;
  userId: number;
  status: WL_AnswerStatus;
}

interface WL_StaffSessionInfo {
  sessionId: string;
  staffId: number;
}

interface WL_ServiceSessionInvite {
  session: WL_IDbServiceSessionInfo;
  content?: string;
}

interface WL_StaffAnswerSessionInvite {
  sessionId: string;
  invitee: WL_IDbServiceStaffInfo;
  status: WL_AnswerStatus;
}

interface WL_bindAnswerInfo {
  status: WL_AnswerStatus;
  deviceInfo: WL_IDbExtensionInfo;
  verifyCode: string;
  userInfo: WL_IDbUserInfo;
}

export {
  WL_PbMsgErrorInfo,
  WL_ExtEventID,
  WL_DataPrepareState,
  WL_ExtEventCallback,
  WL_PttAudioPlayState,
  WL_PttPlayInd,
  WL_PttRecordState,
  WL_PttRecordInd,
  WL_AnswerStatus,
  WL_DataPrepareInd,
  WL_FriendInviteInfo,
  WL_FriendAnswerInviteInfo,
  WL_GroupInviteInfo,
  WL_GroupAnswerInviteInfo,
  WL_GroupJoinInfo,
  WL_GroupAnswerJoinInfo,
  WL_PttPlayIndData,
  WL_PttAudioPlaySource,
  WL_CommonAnswerStaffInvite,
  WL_StaffInvite,
  WL_StaffSessionInfo,
  WL_ServiceSessionInvite,
  WL_StaffAnswerSessionInvite,
  WL_bindAnswerInfo,
  WL_GroupMemberDeleteInfo,
};
