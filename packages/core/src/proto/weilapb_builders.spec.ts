import { describe, expect, it } from 'vitest'
import Long from 'long'
import { WL } from 'proto/weilapb'
import {
  WLBuildMsgRet,
  WLChangeFriendInfo,
  WLChangeUserInfoData,
  WLGroupAttributeInfo,
  WLGroupMemberInfo,
  WLLocationControl,
  WLLocationInfo,
  WLSessionInfo,
} from 'proto/weilapb_wrapper_data'
import {
  WL_IDbFileData,
  WL_IDbLocationShared,
  WL_IDbMsgDataType,
  WL_IDbPttData,
} from 'db/weila_db_data'
import WeilaMsgHeader from 'proto/weilapb_msg_header'
import { WeilaPbFriendWrapper } from 'proto/weilapb_friend_wrapper'
import { WeilaPbBusinessWrapper } from 'proto/weilapb_business_wrapper'
import { WeilaPBGroupWrapper } from 'proto/weilapb_group_wrapper'
import { WeilaPbLocationWrapper } from 'proto/weilapb_location_wrapper'
import { WeilaPBLoginWrapper } from 'proto/weilapb_login_wrapper'
import { WeilaPBSessionWrapper } from 'proto/weilapb_session_wrapper'
import { WeilaPbUserWrapper } from 'proto/weilapb_user_wrapper'

const L = (n: number) => Long.fromNumber(n)

const SESSION_ID = L(1001)
const GROUP_ID = L(2002)
const USER_ID = 42

const sessionInfo: WLSessionInfo = { sessionId: SESSION_ID, sessionType: 17 }

const groupAttribute: WLGroupAttributeInfo = { groupId: GROUP_ID, groupName: 'sdk-int' }

const groupMemberInfo: WLGroupMemberInfo = {
  userId: USER_ID,
  memberType: 1,
  createdTime: L(1),
}

const friendInfo: WLChangeFriendInfo = { remark: 'r', label: 'l', desc: 'd' }

const userInfo: WLChangeUserInfoData = { nick: 'sdk-int' }

const locationInfo: WLLocationInfo = {
  userId: USER_ID,
  clientType: 1,
  locationType: 1,
  latitude: 22.5,
  longitude: 114.05,
  speed: 0,
  altitude: 0,
  radius: 0,
  timestamp: L(Date.now()),
  direction: 0,
}

const locationControl: WLLocationControl = { status: true, frequency: 10, duration: 60 }

const fileInfo: WL_IDbFileData = { fileSize: 128, fileName: 'a.txt', fileUrl: 'https://x/y' }

const locationShared: WL_IDbLocationShared = {
  locationType: '1',
  latitude: 22.5,
  longitude: 114.05,
  name: 'n',
  address: 'a',
}

const pttData: WL_IDbPttData = {
  seq: 1,
  seqInPackage: 1,
  sourceType: 1,
  frameCount: 25,
  mark: 1,
  data: new Uint8Array(160),
}

/** The raw service id the 16-byte frame header always carries. */
const WL_HEADER_SERVICE_ID = 15

/** Any domain's command id enum, as used in the per-builder expectations. */
type WLCommandId =
  | WL.Friend.FriendCommandId
  | WL.Business.BusinessCommandId
  | WL.Group.GroupCommandId
  | WL.Location.LocationCommandId
  | WL.Login.LoginCommandId
  | WL.Session.SessionCommandId
  | WL.User.UserCommandId

/** Whether the service's oneof container is set on the decoded message. */
function hasContainer(serviceId: WL.Service.ServiceID, msg: WL.Service.IServiceMessage): boolean {
  switch (serviceId) {
    case WL.Service.ServiceID.SERVICE_USER:
      return msg.userMessage != null
    case WL.Service.ServiceID.SERVICE_BUSINESS:
      return msg.businessMessage != null
    case WL.Service.ServiceID.SERVICE_FRIEND:
      return msg.friendMessage != null
    case WL.Service.ServiceID.SERVICE_GROUP:
      return msg.groupMessage != null
    case WL.Service.ServiceID.SERVICE_LOCATION:
      return msg.locationMessage != null
    case WL.Service.ServiceID.SERVICE_SESSION:
      return msg.sessionMessage != null
    case WL.Service.ServiceID.SERVICE_LOGIN:
      return msg.loginMessage != null
    default:
      return msg.systemMessage != null
  }
}

/** The spec case id for a builder method name, e.g. buildGetConfigReq -> getConfig. */
function caseNameOf(method: string): string {
  const stripped = method.replace(/^build/, '').replace(/Req$/, '')

  return stripped.charAt(0).toLowerCase() + stripped.slice(1)
}

/**
 * Asserts a builder produced a complete, routable frame: the 16-byte header
 * carries the right service/command and length, and the protobuf payload
 * decodes back with a matching serviceHead and the service's container set.
 */
function expectValidFrame(
  ret: WLBuildMsgRet,
  serviceId: WL.Service.ServiceID,
  commandId: WLCommandId,
) {
  expect(ret.resultCode, 'resultCode').toBe(0)

  const frame = ret.reqData

  expect(frame, 'reqData').toBeDefined()
  expect(frame!.length).toBeGreaterThan(WeilaMsgHeader.msgHeaderLen)

  const header = WeilaMsgHeader.parseFromBuffer(frame!)

  expect(header, 'header parses').toBeDefined()
  expect(header!.getValue().serviceID).toBe(WL_HEADER_SERVICE_ID)
  expect(header!.getValue().commandID).toBe((serviceId << 8) | commandId)
  expect(header!.getValue().length).toBe(frame!.length)

  const msg = WL.Service.ServiceMessage.decode(frame!.subarray(WeilaMsgHeader.msgHeaderLen))

  expect(msg.serviceHead?.serviceId).toBe(serviceId)
  expect(msg.serviceHead?.commandId).toBe(commandId)
  expect(msg.serviceHead?.commandType).toBe(WL.Service.CommandType.COMMAND_REQUEST)
  expect(String(msg.serviceHead?.seq ?? '')).toBe(String(header!.getValue().seqNum))
  expect(hasContainer(serviceId, msg), 'service container set').toBe(true)
}

const F = WL.Friend.FriendCommandId
const B = WL.Business.BusinessCommandId
const G = WL.Group.GroupCommandId
const LC = WL.Location.LocationCommandId
const LG = WL.Login.LoginCommandId
const S = WL.Session.SessionCommandId
const U = WL.User.UserCommandId
const SID = WL.Service.ServiceID

const CASES: Array<[string, () => WLBuildMsgRet, WL.Service.ServiceID, WLCommandId]> = [
  // friend
  [
    'friend.getFriendInfo',
    () => WeilaPbFriendWrapper.buildGetFriendInfoReq(L(1)),
    SID.SERVICE_FRIEND,
    F.FRIEND_COMMAND_GET_FRIENDINFO,
  ],
  [
    'friend.getFriendUserInfo',
    () => WeilaPbFriendWrapper.buildGetFriendUserInfoReq([USER_ID]),
    SID.SERVICE_FRIEND,
    F.FRIEND_COMMAND_GET_FRIEND_USERINFO,
  ],
  [
    'friend.getFriendInvitationInfo',
    () => WeilaPbFriendWrapper.buildGetFriendInvitationInfoReq(L(1)),
    SID.SERVICE_FRIEND,
    F.FRIEND_COMMAND_GET_FRIEND_INVITEINFO,
  ],
  [
    'friend.friendInvite',
    () => WeilaPbFriendWrapper.buildFriendInviteReq(USER_ID, 'hi'),
    SID.SERVICE_FRIEND,
    F.FRIEND_COMMAND_FRIEND_INVITE,
  ],
  [
    'friend.answerFriendInvite',
    () => WeilaPbFriendWrapper.buildAnswerFriendInviteReq(USER_ID, 1, 'ok'),
    SID.SERVICE_FRIEND,
    F.FRIEND_COMMAND_ANSWER_FRIEND_INVITE,
  ],
  [
    'friend.deleteFriend',
    () => WeilaPbFriendWrapper.buildDeleteFriendReq(USER_ID),
    SID.SERVICE_FRIEND,
    F.FRIEND_COMMAND_DELETE_FRIEND,
  ],
  [
    'friend.changeFriendInfo',
    () => WeilaPbFriendWrapper.buildChangeFriendInfoReq(USER_ID, friendInfo),
    SID.SERVICE_FRIEND,
    F.FRIEND_COMMAND_CHANGE_FRIENDINFO,
  ],
  [
    'friend.getFriendBlacklist',
    () => WeilaPbFriendWrapper.buildGetFriendBlacklistReq(0, 20),
    SID.SERVICE_FRIEND,
    F.FRIEND_COMMAND_GET_BLACKLIST,
  ],
  [
    'friend.changeFriendBlacklist',
    () => WeilaPbFriendWrapper.buildChangeFriendBlacklistReq([USER_ID], 1),
    SID.SERVICE_FRIEND,
    F.FRIEND_COMMAND_CHANGE_BLACKLIST,
  ],
  [
    'friend.getOnlineFriends',
    () => WeilaPbFriendWrapper.buildGetOnlineFriendsReq(),
    SID.SERVICE_FRIEND,
    F.FRIEND_COMMAND_GET_ONLINE_FRIEND,
  ],
  [
    'friend.getSubFriendInfo',
    () => WeilaPbFriendWrapper.buildGetSubFriendInfoReq(USER_ID),
    SID.SERVICE_FRIEND,
    F.FRIEND_COMMAND_GET_FRIENDINFO,
  ],

  // business / customer service
  [
    'business.commonGetSessions',
    () => WeilaPbBusinessWrapper.buildCommonGetSessionsReq([SESSION_ID]),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_COMMON_GET_SESSION,
  ],
  [
    'business.commonStaffInvite',
    () => WeilaPbBusinessWrapper.buildCommonStaffInviteReq(1, [USER_ID]),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_COMMON_STAFF_INVITE,
  ],
  [
    'business.commonAnswerStaffInvite',
    () => WeilaPbBusinessWrapper.buildCommonAnswerStaffInviteReq(1, USER_ID, 1),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_COMMON_ANSWER_STAFF_INVITE,
  ],
  [
    'business.commonGetStaffInvite',
    () => WeilaPbBusinessWrapper.buildCommonGetStaffInviteReq(0),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_COMMON_GET_STAFF_INVITE,
  ],
  [
    'business.commonStaffExit',
    () => WeilaPbBusinessWrapper.buildCommonStaffExitReq(1),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_COMMON_STAFF_EXIT,
  ],
  [
    'business.commonStaffDelete',
    () => WeilaPbBusinessWrapper.buildCommonStaffDeleteReq(1, USER_ID),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_COMMON_STAFF_DELETE,
  ],
  [
    'business.staffAcceptSession',
    () => WeilaPbBusinessWrapper.buildStaffAcceptSessionReq(SESSION_ID),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_STAFF_ACCEPT_SESSION,
  ],
  [
    'business.staffExitSession',
    () => WeilaPbBusinessWrapper.buildStaffExitSessionReq(SESSION_ID),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_STAFF_EXIT_SESSION,
  ],
  [
    'business.staffCloseSession',
    () => WeilaPbBusinessWrapper.buildStaffCloseSessionReq(SESSION_ID),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_STAFF_CLOSE_SESSION,
  ],
  [
    'business.staffSessionInvite',
    () => WeilaPbBusinessWrapper.buildStaffSessionInviteReq(SESSION_ID, [USER_ID]),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_STAFF_SESSION_INVITE,
  ],
  [
    'business.staffAnswerSessionInvite',
    () => WeilaPbBusinessWrapper.buildStaffAnswerSessionInviteReq(SESSION_ID, 1),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_STAFF_ANSWER_SESSION_INVITE,
  ],
  [
    'business.staffRemoveSessionStaff',
    () => WeilaPbBusinessWrapper.buildStaffRemoveSessionStaffReq(SESSION_ID, [USER_ID]),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_STAFF_REMOVE_SESSION_STAFFS,
  ],
  [
    'business.staffSearchStaffs',
    () => WeilaPbBusinessWrapper.buildStaffSearchStaffsReq(1, 0, 20),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_STAFF_SEARCH_STAFFS,
  ],
  [
    'business.staffResetSession',
    () => WeilaPbBusinessWrapper.buildStaffResetSessionReq(SESSION_ID),
    SID.SERVICE_BUSINESS,
    B.BUSINESS_COMMAND_STAFF_RESET_SESSION,
  ],

  // group
  [
    'group.getGroupVersion',
    () => WeilaPBGroupWrapper.buildGetGroupVersionReq(),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GET_GROUPVERSION,
  ],
  [
    'group.getGroupAttribute',
    () => WeilaPBGroupWrapper.buildGetGroupAttributeReq(GROUP_ID),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GET_GROUPATTRIBUTE,
  ],
  [
    'group.createGroup',
    () => WeilaPBGroupWrapper.buildCreateGroupReq('sdk-int', 1, '', 1, 1, [USER_ID]),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_CREATE_GROUP,
  ],
  [
    'group.changeGroupAttribute',
    () => WeilaPBGroupWrapper.buildChangeGroupAttributeReq(groupAttribute),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_CHANGE_GROUPATTRIBUTE,
  ],
  [
    'group.getGroupInfo',
    () => WeilaPBGroupWrapper.buildGetGroupInfoReq(GROUP_ID, 0),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GET_GROUPINFO,
  ],
  [
    'group.getGroupOnlineMember',
    () => WeilaPBGroupWrapper.buildGetGroupOnlineMemberReq(GROUP_ID),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GET_ONLINE_MEMBER,
  ],
  [
    'group.changeGroupMemberInfo',
    () => WeilaPBGroupWrapper.buildChangeGroupMemberInfoReq(GROUP_ID, groupMemberInfo),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_CHANGE_MEMBERINFO,
  ],
  [
    'group.getGroupMemberInfo',
    () => WeilaPBGroupWrapper.buildGetGroupMemberInfoReq(GROUP_ID, [USER_ID]),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GET_MEMBER_USERINFO,
  ],
  [
    'group.delGroupMemebr',
    () => WeilaPBGroupWrapper.buildDelGroupMemebrReq(GROUP_ID, [USER_ID]),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_DELETE_MEMBER,
  ],
  [
    'group.delGroup',
    () => WeilaPBGroupWrapper.buildDelGroupReq(GROUP_ID),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_DELETE_GROUP,
  ],
  [
    'group.getGroupInvitation',
    () => WeilaPBGroupWrapper.buildGetGroupInvitationReq(L(0)),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GET_GROUP_INVITEINFO,
  ],
  [
    'group.groupInvite',
    () => WeilaPBGroupWrapper.buildGroupInviteReq(GROUP_ID, [USER_ID]),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GROUP_INVITE,
  ],
  [
    'group.groupAnswerInvite',
    () => WeilaPBGroupWrapper.buildGroupAnswerInviteReq(GROUP_ID, USER_ID, 1),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_ANSWER_GROUP_INVITE,
  ],
  [
    'group.groupGetJoinInfo',
    () => WeilaPBGroupWrapper.buildGroupGetJoinInfoReq(L(0), [GROUP_ID]),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GET_GROUP_JOININFO,
  ],
  [
    'group.groupJoin',
    () => WeilaPBGroupWrapper.buildGroupJoinReq(GROUP_ID),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GROUP_JOIN,
  ],
  [
    'group.groupAnswerJoin',
    () => WeilaPBGroupWrapper.buildGroupAnswerJoinReq(GROUP_ID, 1, 1),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_ANSWER_GROUP_JOIN,
  ],
  [
    'group.groupBroadcast',
    () => WeilaPBGroupWrapper.buildGroupBroadcastReq(GROUP_ID, 1),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_BROADCAST,
  ],
  [
    'group.groupGetBlacklist',
    () => WeilaPBGroupWrapper.buildGroupGetBlacklistReq(GROUP_ID, 0, 20),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GET_BLACKLIST,
  ],
  [
    'group.groupChangeBlacklist',
    () => WeilaPBGroupWrapper.buildGroupChangeBlacklistReq(GROUP_ID, [USER_ID], 1),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_CHANGE_BLACKLIST,
  ],
  [
    'group.getGroupMemberChangeLog',
    () => WeilaPBGroupWrapper.buildGetGroupMemberChangeLogReq(GROUP_ID),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GET_MEMBER_CHANGE_LOG,
  ],
  [
    'group.getGroupNotice',
    () => WeilaPBGroupWrapper.buildGetGroupNoticeReq(GROUP_ID, L(0)),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GET_NOTICE,
  ],
  [
    'group.addGroupNotice',
    () => WeilaPBGroupWrapper.buildAddGroupNoticeReq(GROUP_ID, 'notice'),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_ADD_NOTICE,
  ],
  [
    'group.changeGroupNotice',
    () => WeilaPBGroupWrapper.buildChangeGroupNoticeReq(GROUP_ID, L(1), 'notice'),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_CHANGE_NOTICE,
  ],
  [
    'group.deleteGroupNotice',
    () => WeilaPBGroupWrapper.buildDeleteGroupNoticeReq(GROUP_ID, L(1)),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_DELETE_NOTICE,
  ],
  [
    'group.getGroupDetail',
    () => WeilaPBGroupWrapper.buildGetGroupDetailReq(GROUP_ID),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GET_GROUPDETAIL,
  ],
  [
    'group.getSubDeviceGroupAttributes',
    () => WeilaPBGroupWrapper.buildGetSubDeviceGroupAttributes(USER_ID),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_GET_SUB_GROUPATTRIBUTE,
  ],
  [
    'group.addSubMember',
    () => WeilaPBGroupWrapper.buildAddSubMemberReq(GROUP_ID, [USER_ID]),
    SID.SERVICE_GROUP,
    G.GROUP_COMMAND_ADD_SUB_MEMBER,
  ],

  // location
  [
    'location.reportLocation',
    () => WeilaPbLocationWrapper.buildReportLocationReq(locationInfo, [sessionInfo], '102065', 1),
    SID.SERVICE_LOCATION,
    LC.LOCATION_COMMAND_REPORT_LOCATION,
  ],
  [
    'location.getLocation',
    () => WeilaPbLocationWrapper.buildGetLocationReq(sessionInfo, [USER_ID]),
    SID.SERVICE_LOCATION,
    LC.LOCATION_COMMAND_GET_LOCATION,
  ],
  [
    'location.locationControl',
    () => WeilaPbLocationWrapper.buildLocationControlReq(sessionInfo, locationControl, [USER_ID]),
    SID.SERVICE_LOCATION,
    LC.LOCATION_COMMAND_LOCATION_CONTROL,
  ],

  // login
  [
    'login.loginApp',
    () => WeilaPBLoginWrapper.buildLoginAppReq('70009790', 'pw', '0', '102065', 'key', false),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_LOGIN_APP,
  ],
  [
    'login.logout',
    () => WeilaPBLoginWrapper.buildLogoutReq(),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_LOGOUT,
  ],
  [
    'login.heartbeat',
    () => WeilaPBLoginWrapper.buildHeartbeatReq(),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_HEARTBEAT,
  ],
  [
    'login.bindExtension',
    () => WeilaPBLoginWrapper.buildBindExtensionReq('123456'),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_BIND_EXTENSION,
  ],
  [
    'login.unbindExtension',
    () => WeilaPBLoginWrapper.buildUnbindExtensionReq(USER_ID),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_UNBIND_EXTENSION,
  ],
  [
    'login.getExtensionInfo',
    () => WeilaPBLoginWrapper.buildGetExtensionInfoReq(USER_ID),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_GET_EXTENSIONINFO,
  ],
  [
    'login.getExtensionList',
    () => WeilaPBLoginWrapper.buildGetExtensionListReq(),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_GET_EXTENSIONLIST,
  ],
  [
    'login.setExtensionConfig',
    () => WeilaPBLoginWrapper.buildSetExtensionConfig(USER_ID, 'k', 'v'),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_SET_EXTENSION_CONFIG,
  ],
  [
    'login.shutdownExtension',
    () => WeilaPBLoginWrapper.buildShutdownExtensionReq(USER_ID),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_SHUTDOWN_EXTENSION,
  ],
  [
    'login.lockExtension',
    () => WeilaPBLoginWrapper.buildLockExtensionReq(USER_ID),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_LOCK_EXTENSION,
  ],
  [
    'login.unlockExtension',
    () => WeilaPBLoginWrapper.buildUnlockExtensionReq(USER_ID),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_UNLOCK_EXTENSION,
  ],
  [
    'login.getToken',
    () => WeilaPBLoginWrapper.buildGetTokenReq('token'),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_TOKEN,
  ],
  [
    'login.refreshToken',
    () => WeilaPBLoginWrapper.buildRefreshTokenReq(),
    SID.SERVICE_LOGIN,
    LG.LOGIN_COMMAND_REFRESH_ACCESS_TOKEN,
  ],

  // session
  [
    'session.getSession',
    () => WeilaPBSessionWrapper.buildGetSessionReq(L(0)),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_GET_SESSION,
  ],
  [
    'session.removeSession',
    () => WeilaPBSessionWrapper.buildRemoveSessionReq(SESSION_ID, 17),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_REMOVE_SESSION,
  ],
  [
    'session.msgRead',
    () => WeilaPBSessionWrapper.buildMsgReadReq(SESSION_ID, 17, 1),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_READ_MSG,
  ],
  [
    'session.msgGetUnRead',
    () => WeilaPBSessionWrapper.buildMsgGetUnReadReq(SESSION_ID, 17, 0, 100),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_GET_UNREAD_MSG,
  ],
  [
    'session.msgGetMsg',
    () => WeilaPBSessionWrapper.buildMsgGetMsgReq(SESSION_ID, 17, 1, 10),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_GET_MSG,
  ],
  [
    'session.burstControl',
    () => WeilaPBSessionWrapper.buildBurstControlReq(SESSION_ID, 17, 1),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_BURST_CONTROL,
  ],
  [
    'session.monitorControl',
    () => WeilaPBSessionWrapper.buildMonitorControlReq(1, 60, USER_ID),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_MONITOR_CONTROL,
  ],
  [
    'session.msgData',
    () =>
      WeilaPBSessionWrapper.buildMsgDataReq(
        SESSION_ID,
        17,
        USER_ID,
        false,
        { text: 'hi' },
        1,
        WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
      ),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_MSGDATA,
  ],
  [
    'session.textSessionMsg',
    () => WeilaPBSessionWrapper.buildTextSessionMsgReq(SESSION_ID, 17, USER_ID, false, 'hi'),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_MSGDATA,
  ],
  [
    'session.imageSessionMsg',
    () =>
      WeilaPBSessionWrapper.buildImageSessionMsgReq(
        SESSION_ID,
        17,
        USER_ID,
        false,
        'https://x/y.png',
      ),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_MSGDATA,
  ],
  [
    'session.mediaInfoSessionMsg',
    () =>
      WeilaPBSessionWrapper.buildMediaInfoSessionMsgReq(
        SESSION_ID,
        17,
        USER_ID,
        false,
        fileInfo,
        true,
      ),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_MSGDATA,
  ],
  [
    'session.locationInfoSessionMsg',
    () =>
      WeilaPBSessionWrapper.buildLocationInfoSessionMsgReq(
        SESSION_ID,
        17,
        USER_ID,
        false,
        locationShared,
      ),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_MSGDATA,
  ],
  [
    'session.audioSessionMsg',
    () =>
      WeilaPBSessionWrapper.buildAudioSessionMsgReq(
        SESSION_ID,
        17,
        USER_ID,
        false,
        new Uint8Array(160),
      ),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_MSGDATA,
  ],
  [
    'session.pttSessionMsg',
    () => WeilaPBSessionWrapper.buildPttSessionMsgReq(SESSION_ID, 17, USER_ID, false, pttData),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_MSGDATA,
  ],
  [
    'session.serviceSessionMsg',
    () => WeilaPBSessionWrapper.buildServiceSessionMsgReq(SESSION_ID, 17, USER_ID, false, 'hi'),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_MSGDATA,
  ],
  [
    'session.switchSessionMsg',
    () => WeilaPBSessionWrapper.buildSwitchSessionMsgReq(SESSION_ID, 17, USER_ID, false, 'hi'),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_MSGDATA,
  ],
  [
    'session.withDrawMsg',
    () => WeilaPBSessionWrapper.buildWithDrawMsgReq(SESSION_ID, 17, USER_ID, false, 1),
    SID.SERVICE_SESSION,
    S.SESSION_COMMAND_MSGDATA,
  ],

  // user
  [
    'user.getUserInfo',
    () => WeilaPbUserWrapper.buildGetUserInfoReq('42'),
    SID.SERVICE_USER,
    U.USER_COMMAND_GET_USERINFO,
  ],
  [
    'user.changeUserInfo',
    () => WeilaPbUserWrapper.buildChangeUserInfoReq(userInfo),
    SID.SERVICE_USER,
    U.USER_COMMAND_CHANGE_USERINFO,
  ],
  [
    'user.getConfig',
    () => WeilaPbUserWrapper.buildGetConfigReq(),
    SID.SERVICE_USER,
    U.USER_COMMAND_GET_CONFIG,
  ],
  [
    'user.setConfig',
    () => WeilaPbUserWrapper.buildSetConfigReq(USER_ID, 'k', 'v', 0),
    SID.SERVICE_USER,
    U.USER_COMMAND_SET_CONFIG,
  ],
]

describe('proto request builders produce valid routable frames', () => {
  for (const [name, build, serviceId, commandId] of CASES) {
    it(name, () => {
      expectValidFrame(build(), serviceId, commandId)
    })
  }

  it('covers every builder the wrappers expose', () => {
    const covered = new Set(CASES.map(([name]) => name.split('.')[1]))

    const known = new Set([
      ...Object.keys(WeilaPbFriendWrapper),
      ...Object.keys(WeilaPbBusinessWrapper),
      ...Object.keys(WeilaPBGroupWrapper),
      ...Object.keys(WeilaPbLocationWrapper),
      ...Object.keys(WeilaPBLoginWrapper),
      ...Object.keys(WeilaPBSessionWrapper),
      ...Object.keys(WeilaPbUserWrapper),
    ])

    const uncovered: string[] = []

    for (const method of known) {
      if (!covered.has(caseNameOf(method))) uncovered.push(method)
    }

    expect(uncovered).toEqual([])
  })
})
