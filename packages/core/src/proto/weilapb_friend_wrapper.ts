import { WLBuildMsgRet } from './weilapb_wrapper_data'
import { WL } from './weilapb'
import Long from 'long'
import { BuildWeilaMsg } from './weilapb_wrapper'

const WeilaPbFriendWrapper = {
  buildGetFriendInfoReq(latestUpdated: Long): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage()
    friendMessage.reqGetFriendInfo = new WL.Friend.ReqGetFriendInfo()
    friendMessage.reqGetFriendInfo.latestUpdated = latestUpdated

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIENDINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    )
  },

  buildGetFriendUserInfoReq(userIdList: number[]): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage()
    friendMessage.reqGetFriendUserInfo = new WL.Friend.ReqGetFriendUserInfo()
    friendMessage.reqGetFriendUserInfo.userIds = Array.from(userIdList)

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIEND_USERINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    )
  },

  buildFriendInviteReq(
    inviteeId: number,
    detail: string,
    remark?: string,
    subUserId?: number,
  ): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage()
    friendMessage.reqFriendInvite = new WL.Friend.ReqFriendInvite()
    friendMessage.reqFriendInvite.inviteeId = inviteeId
    friendMessage.reqFriendInvite.detail = detail

    if (remark !== undefined) {
      friendMessage.reqFriendInvite.remark = remark
    }

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_FRIEND_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
      subUserId,
    )
  },

  buildAnswerFriendInviteReq(inviterId: number, status: number, remark: string): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage()
    friendMessage.reqAnswerFriendInvite = new WL.Friend.ReqAnswerFriendInvite()
    friendMessage.reqAnswerFriendInvite.inviterId = inviterId
    friendMessage.reqAnswerFriendInvite.status = status
    friendMessage.reqAnswerFriendInvite.remark = remark

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_ANSWER_FRIEND_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    )
  },

  buildDeleteFriendReq(userId: number, subUserId?: number): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage()
    friendMessage.reqDeleteFriend = new WL.Friend.ReqDeleteFriend()
    friendMessage.reqDeleteFriend.userId = userId

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_DELETE_FRIEND,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
      subUserId,
    )
  },

  buildGetOnlineFriendsReq(): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage()
    friendMessage.reqGetOnlineFriend = new WL.Friend.ReqGetOnlineFriend()

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_ONLINE_FRIEND,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    )
  },

  buildGetSubFriendInfoReq(subUserId: number): WLBuildMsgRet {
    const friendMessage = new WL.Friend.FriendMessage()
    friendMessage.reqGetFriendInfo = new WL.Friend.ReqGetFriendInfo()
    friendMessage.reqGetFriendInfo.latestUpdated = Long.fromValue(0)

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIENDINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
      subUserId,
    )
  },
}

export { WeilaPbFriendWrapper }
