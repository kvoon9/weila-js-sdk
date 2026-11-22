import { WL } from './weilapb'
import { BuildWeilaMsg } from './weilapb_wrapper'
import { WLBuildMsgRet, WLGroupAttributeInfo, WLGroupMemberInfo } from './weilapb_wrapper_data'
import Long from 'long'

const WeilaPBGroupWrapper = {
  buildGetGroupVersionReq(): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({ reqGetGroupVersion: {} })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPVERSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGetGroupAttributeReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqGetGroupAttribute: { groupId },
    })

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
    const groupMessage = WL.Group.GroupMessage.create({
      reqCreateGroup: {
        name: groupName,
        avatar,
        class: groupClass,
        publicType,
        type: groupType,
        memberIdList: memberIdList.slice(),
      },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_CREATE_GROUP,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildChangeGroupAttributeReq(groupAttribute: WLGroupAttributeInfo): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqChangeGroupAttribute: {
        groupId: Long.fromValue(groupAttribute.groupId),
        name: groupAttribute.groupName,
        audioQuality: groupAttribute.audioQuality,
        authPassword: groupAttribute.authPassword,
        authType: groupAttribute.authType,
        avatar: groupAttribute.avatar,
        burstType: groupAttribute.burstType,
        desc: groupAttribute.desc,
        class: groupAttribute.groupClass,
        home: groupAttribute.groupLocation,
        latitude: groupAttribute.latitude,
        longitude: groupAttribute.longitude,
        type: groupAttribute.groupType,
        ownerId: groupAttribute.ownerId,
        publicType: groupAttribute.publicType,
        shutupStatus: groupAttribute.speechAvailable ? 1 : 0,
      },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_GROUPATTRIBUTE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGetGroupInfoReq(groupId: Long, memberVer: number): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqGetGroupInfo: { groupId, memberVersion: memberVer },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGetGroupOnlineMemberReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqGetGroupOnlineMember: { groupId },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_ONLINE_MEMBER,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildChangeGroupMemberInfoReq(groupId: Long, memberInfo: WLGroupMemberInfo): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqChangeMemberInfo: {
        groupId,
        locationShare: memberInfo.locationShared ? 1 : 0,
        memberId: memberInfo.userId,
        prority: memberInfo.priority,
        remark: memberInfo.remark,
        shieldStatus: memberInfo.bannedStatus,
        shutupStatus: memberInfo.speechAvailable ? 0 : 1,
        shutupDuration: memberInfo.speechDisableTimeout,
        tts: memberInfo.tts ? 1 : 0,
        type: memberInfo.memberType,
      },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_MEMBERINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGetGroupMemberInfoReq(groupId: Long, userIdList: number[]): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqGetMemberUserInfo: { groupId, userIdList: Array.from(userIdList) },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_MEMBER_USERINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildDelGroupMemebrReq(groupId: Long, userIdList: number[], subUserId?: number): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqDeleteMember: { groupId, userIdList: Array.from(userIdList) },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_MEMBER,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
      subUserId,
    )
  },

  buildDelGroupReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqDeleteGroup: { groupId },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_GROUP,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGetGroupInvitationReq(lastUpdateTime: Long): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqGetGroupInviteInfo: { latestUpdated: lastUpdateTime },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUP_INVITEINFO,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGroupInviteReq(groupId: Long, userIdList: number[]): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqGroupInvite: { groupId, userIdList: Array.from(userIdList) },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGroupAnswerInviteReq(groupId: Long, invitorId: number, status: number): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqAnswerGroupInvite: { groupId, inviterId: invitorId, status },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGroupGetJoinInfoReq(lasteUpdate: Long, groupIdList: Long[]): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqGetGroupJoinInfo: {
        latestUpdated: lasteUpdate,
        groupIds: Array.from(groupIdList),
      },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUP_JOININFO,
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
    const groupMessage = WL.Group.GroupMessage.create({
      reqGroupJoin: { groupId, detail, password },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_JOIN,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
      subUserId,
    )
  },

  buildGroupAnswerJoinReq(groupId: Long, joinId: number, status: number): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqAnswerGroupJoin: { groupId, joinId, status },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_JOIN,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGroupBroadcastReq(groupId: Long, status: number): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqGroupBroadcast: { groupId, status },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_BROADCAST,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGroupGetBlacklistReq(groupId: Long, pageIndex: number, pageCount: number): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqGetGroupBlackList: { groupId, pageIndex, pageSize: pageCount },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_BLACKLIST,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGroupChangeBlacklistReq(
    groupId: Long,
    userIdList: number[],
    actionType: number,
  ): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqChangeGroupBlackList: {
        groupId,
        type: actionType,
        userIdList: Array.from(userIdList),
      },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_BLACKLIST,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGetGroupMemberChangeLogReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqGetGroupMemberChangeLog: { groupId },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_MEMBER_CHANGE_LOG,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGetGroupNoticeReq(groupId: Long, latestUpdated: Long): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqGetNotice: { groupId, latestUpdated },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_NOTICE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildAddGroupNoticeReq(groupId: Long, notice: string): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqAddNotice: { groupId, notice },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_ADD_NOTICE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildChangeGroupNoticeReq(groupId: Long, noticeId: Long, notice: string): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqChangeNotice: { groupId, noticeId, notice },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_NOTICE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildDeleteGroupNoticeReq(groupId: Long, noticeId: Long): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqDeleteNotice: { groupId, noticeId },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_NOTICE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGetGroupDetailReq(groupId: Long): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqGetGroupDetail: { groupId },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPDETAIL,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },

  buildGetSubDeviceGroupAttributes(subUserId: number): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({ reqGetSubGroupAttribute: {} })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_SUB_GROUPATTRIBUTE,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
      subUserId,
    )
  },

  buildAddSubMemberReq(groupId: Long, userIds: number[]): WLBuildMsgRet {
    const groupMessage = WL.Group.GroupMessage.create({
      reqAddSubMember: { groupId, userIdList: userIds },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_GROUP,
      WL.Group.GroupCommandId.GROUP_COMMAND_ADD_SUB_MEMBER,
      WL.Service.CommandType.COMMAND_REQUEST,
      groupMessage,
    )
  },
}

export { WeilaPBGroupWrapper }
