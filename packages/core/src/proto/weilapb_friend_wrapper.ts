import { WLBuildMsgRet, WLChangeFriendInfo } from './weilapb_wrapper_data'
import { WL } from './weilapb'
import Long from 'long'
import { BuildWeilaMsg } from './weilapb_wrapper'

const WeilaPbFriendWrapper = {
  buildGetFriendInfoReq(latestUpdated: Long): WLBuildMsgRet {
    const friendMessage = WL.Friend.FriendMessage.create({
      reqGetFriendInfo: { latestUpdated },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIENDINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    )
  },

  buildGetFriendUserInfoReq(userIdList: number[]): WLBuildMsgRet {
    const friendMessage = WL.Friend.FriendMessage.create({
      reqGetFriendUserInfo: { userIds: Array.from(userIdList) },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIEND_USERINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    )
  },

  buildGetFriendInvitationInfoReq(latestUpdated: Long): WLBuildMsgRet {
    const friendMessage = WL.Friend.FriendMessage.create({
      reqGetFriendInviteInfo: { latestUpdated },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIEND_INVITEINFO,
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
    const reqFriendInvite: WL.Friend.ReqFriendInvite.$Properties = {
      inviteeId,
      detail,
    }

    if (remark !== undefined) {
      reqFriendInvite.remark = remark
    }

    const friendMessage = WL.Friend.FriendMessage.create({ reqFriendInvite })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_FRIEND_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
      subUserId,
    )
  },

  buildAnswerFriendInviteReq(inviterId: number, status: number, remark: string): WLBuildMsgRet {
    const friendMessage = WL.Friend.FriendMessage.create({
      reqAnswerFriendInvite: { inviterId, status, remark },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_ANSWER_FRIEND_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    )
  },

  buildDeleteFriendReq(userId: number, subUserId?: number): WLBuildMsgRet {
    const friendMessage = WL.Friend.FriendMessage.create({
      reqDeleteFriend: { userId },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_DELETE_FRIEND,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
      subUserId,
    )
  },

  buildChangeFriendInfoReq(userId: number, changeFriendInfo: WLChangeFriendInfo): WLBuildMsgRet {
    const friendMessage = WL.Friend.FriendMessage.create({
      reqChangeFriendInfo: {
        userId,
        desc: changeFriendInfo.desc,
        label: changeFriendInfo.label,
        locationShare: changeFriendInfo.locationShared ? 1 : 0,
        remark: changeFriendInfo.remark,
        shieldStatus: changeFriendInfo.bannedStatus ? 1 : 0,
        tts: changeFriendInfo.tts ? 1 : 0,
      },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_CHANGE_FRIENDINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    )
  },

  buildGetFriendBlacklistReq(pageIndex: number, pageCount: number): WLBuildMsgRet {
    const friendMessage = WL.Friend.FriendMessage.create({
      reqGetFriendBlackList: { pageIndex, pageSize: pageCount },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_BLACKLIST,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    )
  },

  buildChangeFriendBlacklistReq(userIdList: number[], actionType: number): WLBuildMsgRet {
    const friendMessage = WL.Friend.FriendMessage.create({
      reqChangeFriendBlackList: {
        type: actionType,
        userIds: Array.from(userIdList),
      },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_CHANGE_BLACKLIST,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    )
  },

  buildGetOnlineFriendsReq(): WLBuildMsgRet {
    const friendMessage = WL.Friend.FriendMessage.create({ reqGetOnlineFriend: {} })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_FRIEND,
      WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_ONLINE_FRIEND,
      WL.Service.CommandType.COMMAND_REQUEST,
      friendMessage,
    )
  },

  buildGetSubFriendInfoReq(subUserId: number): WLBuildMsgRet {
    const friendMessage = WL.Friend.FriendMessage.create({
      reqGetFriendInfo: { latestUpdated: Long.fromValue(0) },
    })

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
