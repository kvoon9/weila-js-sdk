import { WLBuildMsgRet, WLChangeFriendInfo } from './weilapb_wrapper_data';
import { WL } from './weilapb';
import Long from 'long';
import { BuildWeilaMsg } from './weilapb_wrapper';

class WeilaPbFriendWrapper {
  public static buildGetFriendInfoReq(latestUpdated: Long): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage();
    friendMessage.reqGetFriendInfo = new WL.Friend.ReqGetFriendInfo();
    friendMessage.reqGetFriendInfo.latestUpdated = latestUpdated;
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIENDINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    );
  }

  public static buildGetFriendUserInfoReq(userIdList: number[]): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage();
    friendMessage.reqGetFriendUserInfo = new WL.Friend.ReqGetFriendUserInfo();
    friendMessage.reqGetFriendUserInfo.userIds = Array.from(userIdList);
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIEND_USERINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    );
  }

  public static buildGetFriendInvitationInfoReq(latestUpdated: Long): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage();
    friendMessage.reqGetFriendInviteInfo = new WL.Friend.ReqGetFriendInviteInfo();
    friendMessage.reqGetFriendInviteInfo.latestUpdated = latestUpdated;
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIEND_INVITEINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    );
  }

  public static buildFriendInviteReq(
    inviteeId: number,
    detail: string,
    remark: string,
    subUserId?: number,
  ): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage();
    friendMessage.reqFriendInvite = new WL.Friend.ReqFriendInvite();
    friendMessage.reqFriendInvite.inviteeId = inviteeId;
    friendMessage.reqFriendInvite.detail = detail;
    friendMessage.reqFriendInvite.remark = remark;
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_FRIEND_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
      subUserId,
    );
  }

  public static buildAnswerFriendInviteReq(
    inviterId: number,
    status: number,
    remark: string,
  ): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage();
    friendMessage.reqAnswerFriendInvite = new WL.Friend.ReqAnswerFriendInvite();
    friendMessage.reqAnswerFriendInvite.inviterId = inviterId;
    friendMessage.reqAnswerFriendInvite.status = status;
    friendMessage.reqAnswerFriendInvite.remark = remark;
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_ANSWER_FRIEND_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    );
  }

  public static buildDeleteFriendReq(userId: number, subUserId?: number): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage();
    friendMessage.reqDeleteFriend = new WL.Friend.ReqDeleteFriend();
    friendMessage.reqDeleteFriend.userId = userId;
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_DELETE_FRIEND,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
      subUserId,
    );
  }

  public static buildChangeFriendInfoReq(
    userId: number,
    changeFriendInfo: WLChangeFriendInfo,
  ): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage();
    friendMessage.reqChangeFriendInfo = new WL.Friend.ReqChangeFriendInfo();
    friendMessage.reqChangeFriendInfo.userId = userId;
    friendMessage.reqChangeFriendInfo.desc = changeFriendInfo.desc;
    friendMessage.reqChangeFriendInfo.label = changeFriendInfo.label;
    friendMessage.reqChangeFriendInfo.locationShare = changeFriendInfo.locationShared ? 1 : 0;
    friendMessage.reqChangeFriendInfo.remark = changeFriendInfo.remark;
    friendMessage.reqChangeFriendInfo.shieldStatus = changeFriendInfo.bannedStatus ? 1 : 0;
    friendMessage.reqChangeFriendInfo.tts = changeFriendInfo.tts ? 1 : 0;
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_CHANGE_FRIENDINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    );
  }

  public static buildGetFriendBlacklistReq(pageIndex: number, pageCount: number): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage();
    friendMessage.reqGetFriendBlackList = new WL.Friend.ReqGetFriendBlackList();
    friendMessage.reqGetFriendBlackList.pageIndex = pageIndex;
    friendMessage.reqGetFriendBlackList.pageSize = pageCount;
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_BLACKLIST,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    );
  }

  public static buildChangeFriendBlacklistReq(
    userIdList: number[],
    actionType: number,
  ): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage();
    friendMessage.reqChangeFriendBlackList = new WL.Friend.ReqChangeFriendBlackList();
    friendMessage.reqChangeFriendBlackList.type = actionType;
    friendMessage.reqChangeFriendBlackList.userIds = Array.from(userIdList);
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_CHANGE_BLACKLIST,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    );
  }

  public static buildGetOnlineFriendsReq(): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage();
    friendMessage.reqGetOnlineFriend = new WL.Friend.ReqGetOnlineFriend();
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_ONLINE_FRIEND,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    );
  }

  public static buildGetSubFriendInfoReq(subUserId: number): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage();
    friendMessage.reqGetFriendInfo = new WL.Friend.ReqGetFriendInfo();
    friendMessage.reqGetFriendInfo.latestUpdated = Long.fromValue(0);
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIENDINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
      subUserId,
    );
  }
}

export { WeilaPbFriendWrapper };
