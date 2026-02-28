import { WL } from './weilapb'
import { BuildWeilaMsg } from './weilapb_wrapper'
import { WLBuildMsgRet, WLGroupAttributeInfo, WLGroupMemberInfo } from './weilapb_wrapper_data'
import Long from 'long'

class WeilaPBGroupWrapper {
  public static buildGetGroupVersionReq(): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetGroupVersion = new WL.Group.ReqGetGroupVersion()
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPVERSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGetGroupAttributeReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetGroupAttribute = new WL.Group.ReqGetGroupAttribute()
    groupMessage.reqGetGroupAttribute.groupId = groupId
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPATTRIBUTE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildCreateGroupReq(
    groupName: string,
    groupType: number,
    avatar: string,
    groupClass: number,
    publicType: number,
    memberIdList: number[],
  ): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqCreateGroup = new WL.Group.ReqCreateGroup()
    groupMessage.reqCreateGroup.name = groupName
    groupMessage.reqCreateGroup.avatar = avatar
    groupMessage.reqCreateGroup.class = groupClass
    groupMessage.reqCreateGroup.publicType = publicType
    groupMessage.reqCreateGroup.type = groupType
    groupMessage.reqCreateGroup.memberIdList = memberIdList.slice()
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_CREATE_GROUP,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildChangeGroupAttributeReq(groupAttribute: WLGroupAttributeInfo): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqChangeGroupAttribute = new WL.Group.ReqChangeGroupAttribute()
    groupMessage.reqChangeGroupAttribute.groupId = Long.fromValue(groupAttribute.groupId)
    groupMessage.reqChangeGroupAttribute.name = groupAttribute.groupName
    groupMessage.reqChangeGroupAttribute.audioQuality = groupAttribute.audioQuality
    groupMessage.reqChangeGroupAttribute.authPassword = groupAttribute.authPassword
    groupMessage.reqChangeGroupAttribute.authType = groupAttribute.authType
    groupMessage.reqChangeGroupAttribute.avatar = groupAttribute.avatar
    groupMessage.reqChangeGroupAttribute.burstType = groupAttribute.burstType
    groupMessage.reqChangeGroupAttribute.desc = groupAttribute.desc
    groupMessage.reqChangeGroupAttribute.class = groupAttribute.groupClass
    groupMessage.reqChangeGroupAttribute.home = groupAttribute.groupLocation
    groupMessage.reqChangeGroupAttribute.latitude = groupAttribute.latitude
    groupMessage.reqChangeGroupAttribute.longitude = groupAttribute.longitude
    groupMessage.reqChangeGroupAttribute.type = groupAttribute.groupType
    groupMessage.reqChangeGroupAttribute.ownerId = groupAttribute.ownerId
    groupMessage.reqChangeGroupAttribute.publicType = groupAttribute.publicType
    groupMessage.reqChangeGroupAttribute.shutupStatus = groupAttribute.speechAvailable ? 1 : 0

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_GROUPATTRIBUTE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGetGroupInfoReq(groupId: Long, memberVer: number): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetGroupInfo = new WL.Group.ReqGetGroupInfo()
    groupMessage.reqGetGroupInfo.groupId = groupId
    groupMessage.reqGetGroupInfo.memberVersion = memberVer

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGetGroupOnlineMemberReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetGroupOnlineMember = new WL.Group.ReqGetGroupOnlineMember()
    groupMessage.reqGetGroupOnlineMember.groupId = groupId

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_ONLINE_MEMBER,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildChangeGroupMemberInfoReq(
    groupId: Long,
    memberInfo: WLGroupMemberInfo,
  ): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqChangeMemberInfo = new WL.Group.ReqChangeMemberInfo()
    groupMessage.reqChangeMemberInfo.groupId = groupId
    groupMessage.reqChangeMemberInfo.locationShare = memberInfo.locationShared ? 1 : 0
    groupMessage.reqChangeMemberInfo.memberId = memberInfo.userId
    groupMessage.reqChangeMemberInfo.prority = memberInfo.priority
    groupMessage.reqChangeMemberInfo.remark = memberInfo.remark
    groupMessage.reqChangeMemberInfo.shieldStatus = memberInfo.bannedStatus
    groupMessage.reqChangeMemberInfo.shutupStatus = memberInfo.speechAvailable ? 0 : 1
    groupMessage.reqChangeMemberInfo.shutupDuration = memberInfo.speechDisableTimeout
    groupMessage.reqChangeMemberInfo.tts = memberInfo.tts ? 1 : 0
    groupMessage.reqChangeMemberInfo.type = memberInfo.memberType
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_MEMBERINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGetGroupMemberInfoReq(groupId: Long, userIdList: number[]): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetMemberUserInfo = new WL.Group.ReqGetMemberUserInfo()
    groupMessage.reqGetMemberUserInfo.groupId = groupId
    groupMessage.reqGetMemberUserInfo.userIdList = Array.from(userIdList)
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_MEMBER_USERINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildDelGroupMemebrReq(
    groupId: Long,
    userIdList: number[],
    subUserId?: number,
  ): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqDeleteMember = new WL.Group.ReqDeleteMember()
    groupMessage.reqDeleteMember.groupId = groupId
    groupMessage.reqDeleteMember.userIdList = Array.from(userIdList)
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_MEMBER,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
      subUserId,
    )
  }

  public static buildDelGroupReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqDeleteGroup = new WL.Group.ReqDeleteGroup()
    groupMessage.reqDeleteGroup.groupId = groupId
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_GROUP,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGetGroupInvitationReq(lastUpdateTime: Long): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetGroupInviteInfo = new WL.Group.ReqGetGroupInviteInfo()
    groupMessage.reqGetGroupInviteInfo.latestUpdated = lastUpdateTime
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUP_INVITEINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGroupInviteReq(groupId: Long, userIdList: number[]): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGroupInvite = new WL.Group.ReqGroupInvite()
    groupMessage.reqGroupInvite.groupId = groupId
    groupMessage.reqGroupInvite.userIdList = Array.from(userIdList)
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGroupAnswerInviteReq(
    groupId: Long,
    invitorId: number,
    status: number,
  ): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqAnswerGroupInvite = new WL.Group.ReqAnswerGroupInvite()
    groupMessage.reqAnswerGroupInvite.groupId = groupId
    groupMessage.reqAnswerGroupInvite.inviterId = invitorId
    groupMessage.reqAnswerGroupInvite.status = status
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGroupGetJoinInfoReq(lasteUpdate: Long, groupIdList: Long[]): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetGroupJoinInfo = new WL.Group.ReqGetGroupJoinInfo()
    groupMessage.reqGetGroupJoinInfo.latestUpdated = lasteUpdate
    groupMessage.reqGetGroupJoinInfo.groupIds = Array.from(groupIdList)
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUP_JOININFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGroupJoinReq(
    groupId: Long,
    detail?: string,
    password?: string,
    subUserId?: number,
  ): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGroupJoin = new WL.Group.ReqGroupJoin()
    groupMessage.reqGroupJoin.groupId = groupId
    groupMessage.reqGroupJoin.detail = detail
    groupMessage.reqGroupJoin.password = password
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_JOIN,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
      subUserId,
    )
  }

  public static buildGroupAnswerJoinReq(
    groupId: Long,
    joinId: number,
    status: number,
  ): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqAnswerGroupJoin = new WL.Group.ReqAnswerGroupJoin()
    groupMessage.reqAnswerGroupJoin.groupId = groupId
    groupMessage.reqAnswerGroupJoin.joinId = joinId
    groupMessage.reqAnswerGroupJoin.status = status
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_JOIN,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGroupBroadcastReq(groupId: Long, status: number): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGroupBroadcast = new WL.Group.ReqGroupBroadcast()
    groupMessage.reqGroupBroadcast.groupId = groupId
    groupMessage.reqGroupBroadcast.status = status
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_BROADCAST,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGroupGetBlacklistReq(
    groupId: Long,
    pageIndex: number,
    pageCount: number,
  ): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetGroupBlackList = new WL.Group.ReqGetGroupBlackList()
    groupMessage.reqGetGroupBlackList.groupId = groupId
    groupMessage.reqGetGroupBlackList.pageIndex = pageIndex
    groupMessage.reqGetGroupBlackList.pageSize = pageCount
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_BLACKLIST,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGroupChangeBlacklistReq(
    groupId: Long,
    userIdList: number[],
    actionType: number,
  ): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqChangeGroupBlackList = new WL.Group.ReqChangeGroupBlackList()
    groupMessage.reqChangeGroupBlackList.groupId = groupId
    groupMessage.reqChangeGroupBlackList.type = actionType
    groupMessage.reqChangeGroupBlackList.userIdList = Array.from(userIdList)
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_BLACKLIST,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGetGroupMemberChangeLogReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetGroupMemberChangeLog = new WL.Group.ReqGetGroupMemberChangeLog()
    groupMessage.reqGetGroupMemberChangeLog.groupId = groupId
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_MEMBER_CHANGE_LOG,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGetGroupNoticeReq(groupId: Long, latestUpdated: Long): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetNotice = new WL.Group.ReqGetNotice()
    groupMessage.reqGetNotice.groupId = groupId
    groupMessage.reqGetNotice.latestUpdated = latestUpdated
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_NOTICE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildAddGroupNoticeReq(groupId: Long, notice: string): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqAddNotice = new WL.Group.ReqAddNotice()
    groupMessage.reqAddNotice.groupId = groupId
    groupMessage.reqAddNotice.notice = notice
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_ADD_NOTICE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildChangeGroupNoticeReq(
    groupId: Long,
    noticeId: Long,
    notice: string,
  ): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqChangeNotice = new WL.Group.ReqChangeNotice()
    groupMessage.reqChangeNotice.groupId = groupId
    groupMessage.reqChangeNotice.noticeId = noticeId
    groupMessage.reqChangeNotice.notice = notice
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_NOTICE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildDeleteGroupNoticeReq(groupId: Long, noticeId: Long): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqDeleteNotice = new WL.Group.ReqDeleteNotice()
    groupMessage.reqDeleteNotice.groupId = groupId
    groupMessage.reqDeleteNotice.noticeId = noticeId
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_NOTICE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGetGroupDetailReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetGroupDetail = new WL.Group.ReqGetGroupDetail()
    groupMessage.reqGetGroupDetail.groupId = groupId
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPDETAIL,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }

  public static buildGetSubDeviceGroupAttributes(subUserId: number): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetSubGroupAttribute = new WL.Group.ReqGetSubGroupAttribute()
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_SUB_GROUPATTRIBUTE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
      subUserId,
    )
  }

  public static buildAddSubMemberReq(groupId: Long, userIds: number[]): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqAddSubMember = new WL.Group.ReqAddSubMember()
    groupMessage.reqAddSubMember.groupId = groupId
    groupMessage.reqAddSubMember.userIdList = userIds
    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_ADD_SUB_MEMBER,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  }
}

export { WeilaPBGroupWrapper }
