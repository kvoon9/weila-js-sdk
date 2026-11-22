import { WL } from './weilapb'
import { BuildWeilaMsg } from './weilapb_wrapper'
import { WLBuildMsgRet, WLGroupAttributeInfo } from './weilapb_wrapper_data'
import Long from 'long'

const WeilaPBGroupWrapper = {
  buildGetGroupVersionReq(): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetGroupVersion = new WL.Group.ReqGetGroupVersion()

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPVERSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGetGroupAttributeReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetGroupAttribute = new WL.Group.ReqGetGroupAttribute()
    groupMessage.reqGetGroupAttribute.groupId = groupId

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPATTRIBUTE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildCreateGroupReq(
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
  },

  buildChangeGroupAttributeReq(groupAttribute: WLGroupAttributeInfo): WLBuildMsgRet {
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
  },

  buildGetGroupInfoReq(groupId: Long, memberVer: number): WLBuildMsgRet {
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
  },

  buildGetGroupOnlineMemberReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetGroupOnlineMember = new WL.Group.ReqGetGroupOnlineMember()
    groupMessage.reqGetGroupOnlineMember.groupId = groupId

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_ONLINE_MEMBER,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGetGroupMemberInfoReq(groupId: Long, userIdList: number[]): WLBuildMsgRet {
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
  },

  buildDelGroupMemebrReq(groupId: Long, userIdList: number[], subUserId?: number): WLBuildMsgRet {
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
  },

  buildDelGroupReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqDeleteGroup = new WL.Group.ReqDeleteGroup()
    groupMessage.reqDeleteGroup.groupId = groupId

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_GROUP,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGroupInviteReq(groupId: Long, userIdList: number[]): WLBuildMsgRet {
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
  },

  buildGroupAnswerInviteReq(groupId: Long, invitorId: number, status: number): WLBuildMsgRet {
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
  },

  buildGroupJoinReq(
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
  },

  buildGroupAnswerJoinReq(groupId: Long, joinId: number, status: number): WLBuildMsgRet {
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
  },

  buildGetSubDeviceGroupAttributes(subUserId: number): WLBuildMsgRet {
    const groupMessage = new WL.Group.GroupMessage()
    groupMessage.reqGetSubGroupAttribute = new WL.Group.ReqGetSubGroupAttribute()

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_SUB_GROUPATTRIBUTE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
      subUserId,
    )
  },

  buildAddSubMemberReq(groupId: Long, userIds: number[]): WLBuildMsgRet {
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
  },
}

export { WeilaPBGroupWrapper }
