// 存入数据库的设置项
enum WL_IDbSettingID {
  SETTING_LOGIN_TOKEN, // token 一些上传需要用到的token数据
  SETTING_SESSION_LATEST_UPDATE, // 会话信息最后一次更新的时间
  SETTING_FRIEND_LATEST_UPDATE, // 好友最后一次更新时间
  SETTING_GROUP_LATEST_UPDATE, // 群组最后一次更新时间
  SETTING_SUB_USERINFO_VER_UPDATE,
  SETTING_MSG_SENDING_SEQ, // 发送消息的序号，不断地累加
}

interface WL_IDbSetting {
  id: WL_IDbSettingID;
  data: any;
}

// 会话相关，后续所有的好友，群都需要创建一个deactivate的会话。
enum WL_IDbSessionStatus {
  SESSION_ACTIVATE,
  SESSION_DEACTIVATE,
  SESSION_INVALID,
}

enum WL_IDbSessionType {
  // 个人会话
  SESSION_INDIVIDUAL_TYPE = 0x01,
  // 群会话
  SESSION_GROUP_TYPE = 0x02,
  // 服务号
  SESSION_SERVICE_TYPE = 0x08,
}

interface WL_IDbSession {
  combo_id_type: string;
  sessionId: string;
  sessionType: WL_IDbSessionType;
  sessionName: string;
  sessionAvatar: string;
  readMsgId: number;
  lastMsgId: number;
  latestUpdate: number;
  status: WL_IDbSessionStatus;
  extra?: any;
}

interface WL_IDbSessionSettingParams {
  tts?: boolean;
  mute?: boolean;
  loactionShared?: boolean;
}

interface WL_IDbSessionSetting {
  combo_id_type: string;
  sessionId: string;
  sessionType: number;
  tts: boolean;
  mute: boolean;
  loactionShared: boolean;
}

// 用户信息
interface WL_IDbUserInfo {
  userId: number;
  weilaNum: string;
  sex: number;
  nick: string;
  pinyinName: string;
  avatar: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  status: number;
  signature?: string;
  userType: number;
  created: number;
}

// 群信息
enum WL_IDbGroupType {
  GROUP_NORMAL = 0x1,
  GROUP_TEMP = 0x2,
  GROUP_COMPANY_NORMAL = 0x21,
  GROUP_COMPANY_DEPT = 0x22,
}

enum WL_IDbGroupPublicType {
  GROUP_PUBLIC_CLOSE = 0x01,
  GROUP_PUBLIC_OPEN = 0x02,
}

enum WL_IDbGroupAuthType {
  GROUP_AUTH_NONE = 1, //不鉴权
  GROUP_AUTH_CONFIRM = 2, //管理员确认
  GROUP_AUTH_CONFIRM_OR_PASSWORD = 3, //管理员确认或密码认证
  GROUP_AUTH_CONFIRM_AND_PASSWORD = 4, //管理员确认与密码认证
}

enum WL_IDbMemberType {
  NORMAL_MEMBER_TYPE = 0x01,
  ADMIN_MEMBER_TYPE = 0x02,
}

interface WL_IDbGroup {
  groupId: string;
  name: string;
  pinyinName: string;
  avatar: string;
  groupNum: string;
  ownerId: number;
  groupType: WL_IDbGroupType;
  desc?: string;
  publicType: WL_IDbGroupPublicType;
  authType: WL_IDbGroupAuthType;
  groupClass: number;
  audioQuality: number;
  speechEnable: boolean;
  home?: string;
  latitude?: string;
  longitude?: string;
  burstType: number;
  memberLimit: number;
  memberCount: number;
  memberVersion: number;
  version: number;
  created: number;
}

enum WL_IDbMemberStatus {
  MEMBER_NORMAL_STATUS,
  MEMBER_QUIT_STATUS,
}

interface WL_IDbMemberInfo {
  combo_gid_uid: string;
  groupId: string;
  userId: number;
  status: WL_IDbMemberStatus;
  memberType: WL_IDbMemberType;
  remark?: string;
  priority: number;
  speechEnable: boolean;
  speechDisableTimeout: number;
  blockedStatus: boolean;
  tts: boolean;
  locationShared: boolean;
  created: number;
}

interface WL_IDbGroupMember {
  memberInfo: WL_IDbMemberInfo;
  userInfo?: WL_IDbUserInfo;
}

// 好友信息
enum WL_IDbFriendStatus {
  FRIEND_NORMAL_STATUS,
  FRIEND_DELETED_STATUS,
}

interface WL_IDbFriendInfo {
  userId: number;
  status: WL_IDbFriendStatus;
  remark?: string;
  label?: string;
  desc?: string;
  blockedStatus: boolean;
  tts: boolean;
  locationShared: boolean;
  extension?: string;
}

interface WL_IDbFriend {
  friendInfo: WL_IDbFriendInfo;
  userInfo: WL_IDbUserInfo | null;
}

// 会话消息
enum WL_IDbMsgDataType {
  WL_DB_MSG_DATA_TEXT_TYPE,
  WL_DB_MSG_DATA_AUDIO_TYPE,
  WL_DB_MSG_DATA_IMAGE_TYPE,
  WL_DB_MSG_DATA_VIDEO_TYPE,
  WL_DB_MSG_DATA_FILE_TYPE,
  WL_DB_MSG_DATA_LOCATION_TYPE,
  WL_DB_MSG_DATA_COMMAND_TYPE,
  WL_DB_MSG_DATA_PTT_TYPE,
  WL_DB_MSG_DATA_SERVICE_TYPE,
  WL_DB_MSG_DATA_SWITCH_TYPE,
  WL_DB_MSG_DATA_WITHDRAW_TYPE,
  WL_DB_MSG_DATA_UNKNOWN_TYPE,
}

enum WL_IDbMsgDataStatus {
  WL_DB_MSG_DATA_STATUS_NEW,
  WL_DB_MSG_DATA_STATUS_SENT,
  WL_DB_MSG_DATA_STATUS_UNSENT,
  WL_DB_MSG_DATA_STATUS_READ,
  WL_DB_MSG_DATA_STATUS_SENDING,
  WL_DB_MSG_DATA_STATUS_WITHDRAW,
  WL_DB_MSG_DATA_STATUS_ERR,
}

interface WL_IDbAudioData {
  frameCount: number;
  data?: Uint8Array;
  audioUrl?: string;
}

interface WL_IDbFileData {
  fileSize: number;
  fileName?: string;
  fileUrl?: string;
  fileThumbnail?: string;
}

interface WL_IDbLocationShared {
  locationType: string;
  latitude: number;
  longitude: number;
  title?: string;
  name?: string;
  address?: string;
  mapUrl?: string;
}

interface WL_IDbPttData {
  seq: number;
  seqInPackage: number;
  sourceType: number;
  frameCount: number;
  mark: number;
  data: Uint8Array;
}

interface WL_IDbMsgData {
  combo_id: string;
  senderId: number;
  sessionId: string;
  sessionType: number;
  msgId: number;
  msgType: WL_IDbMsgDataType;
  created: number;
  autoReply: number;
  status: WL_IDbMsgDataStatus;
  tag?: string;
  textData?: string;
  audioData?: WL_IDbAudioData;
  fileInfo?: WL_IDbFileData;
  command?: string;
  location?: WL_IDbLocationShared;
  switchData?: string;
  serviceData?: string;
  withdrawMsgId?: number;
  pttData?: WL_IDbPttData;
}

// 位置相关
interface WL_IDbLocationInfo {
  userId: number;
  clientType: number;
  locationType: number;
  latitude: number;
  longitude: number;
  speed: number;
  altitude: number;
  radius: number;
  timestamp: number;
  direction: number;
}

// 通知相关的信息
enum WL_IDbNotificationType {
  FRIEND_INVITE_NOTIFICATION,
  FRIEND_ANSWER_NOTIFICATION,
  GROUP_INVITE_NOTIFICATION,
  GROUP_JOIN_NOTIFICATION,
  GROUP_ANSWER_INVITE_NOTIFICATION,
  GROUP_ANSWER_JOIN_NOTIFICATION,
}

interface WL_IDbNotification {
  id: number;
  notificationType: WL_IDbNotificationType;
  data: any;
  createTime: number;
}

enum WL_IDbExtensionState {
  EXTENSION_UNBIND,
  EXTENSION_BINDING,
  EXTENSION_BOUND,
  EXTENSION_LOCKED,
}

enum WL_IDbExtensionType {
  EXTENSION_SLAVE,
  EXTENSION_SUB,
}

interface WL_IDbExtension {
  info: WL_IDbExtensionInfo;
  userInfo: WL_IDbUserInfo;
  supervisor: WL_IDbUserInfo;
}

interface WL_IDbExtensionInfo {
  imei: string;
  state: WL_IDbExtensionState;
  productName: string;
  extensionType: WL_IDbExtensionType;
  userId: number;
  supervisorId: number;
  status: number;
  version: string;
  config: string;
  groupLimit: number;
  groupCount: number;
  activeTime: number;
  warrant: number;
  createdTime: number;
}

// business
interface WL_IDbService {
  serviceId: number;
  serviceNum: string;
  serviceType: number;
  serviceClass: number;
  name: string;
  avatar: string;
  intro: string;
  url: string;
  createdTime: number;
}

interface WL_IDbServiceStaff {
  userId: number;
  staffType: number;
  admin: number;
  staffClass: number;
  isOperator: boolean;
  createdTime: number;
}

interface WL_IDbServiceStaffInfo {
  staff: WL_IDbServiceStaff;
  userData: WL_IDbUserInfo;
}

enum WL_ServiceStatus {
  SERVICE_STATUS_INIT,
  SERVICE_STATUS_PROCESSING,
  SERVICE_STATUS_TERMINATE,
  SERVICE_STATUS_FINISH,
  SERVICE_STATUS_DISPATCH_TIMEOUT,
  SERVICE_STATUS_MSG_TIMEOUT,
  SERVICE_STATUS_STAFF_MISSING,
}

interface WL_IDbServiceSession {
  serviceId: number;
  customerId: number;
  staffIds: number[];
  serviceStatus: WL_ServiceStatus;
  createdTime: number;
  updatedTime: number;
}

interface WL_IDbServiceSessionInfo {
  service: WL_IDbService;
  customer: WL_IDbUserInfo | undefined;
  staffs: WL_IDbServiceStaffInfo[];
  serviceSession: WL_IDbServiceSession;
}

export {
  WL_IDbSettingID,
  WL_IDbSetting,
  WL_IDbSessionStatus,
  WL_IDbSession,
  WL_IDbSessionType,
  WL_IDbSessionSetting,
  WL_IDbUserInfo,
  WL_IDbSessionSettingParams,
  WL_IDbGroupType,
  WL_IDbGroupPublicType,
  WL_IDbGroupAuthType,
  WL_IDbMemberType,
  WL_IDbGroup,
  WL_IDbMemberStatus,
  WL_IDbMemberInfo,
  WL_IDbGroupMember,
  WL_IDbFriendStatus,
  WL_IDbFriendInfo,
  WL_IDbFriend,
  WL_IDbMsgDataType,
  WL_IDbMsgDataStatus,
  WL_IDbAudioData,
  WL_IDbFileData,
  WL_IDbLocationShared,
  WL_IDbPttData,
  WL_IDbMsgData,
  WL_IDbLocationInfo,
  WL_IDbNotificationType,
  WL_IDbNotification,
  WL_IDbExtension,
  WL_IDbExtensionInfo,
  WL_IDbExtensionState,
  WL_IDbService,
  WL_IDbServiceStaff,
  WL_IDbServiceSession,
  WL_ServiceStatus,
  WL_IDbServiceStaffInfo,
  WL_IDbServiceSessionInfo,
  WL_IDbExtensionType,
};
