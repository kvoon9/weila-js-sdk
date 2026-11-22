import { WL } from './weilapb'
import { BuildWeilaMsg } from './weilapb_wrapper'
import Long from 'long'
import { WLBuildMsgRet } from './weilapb_wrapper_data'

const WeilaPbBusinessWrapper = {
  buildCommonGetSessionsReq(sessionIds: Long[]): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqCommonGetSessions: { sessionIds },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_GET_SESSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  buildCommonStaffInviteReq(serviceId: number, userIds: number[], content?: string): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqCommonStaffInvite: { userIds, serviceId, content },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  buildCommonAnswerStaffInviteReq(
    serviceId: number,
    invitorId: number,
    status: number,
  ): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqCommonAnswerStaffInvite: { serviceId, invitorId, status },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_ANSWER_STAFF_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  buildCommonGetStaffInviteReq(latestUpdated: number): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqCommonGetStaffInvite: { latestUpdated: Long.fromValue(latestUpdated) },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_GET_STAFF_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  buildCommonStaffExitReq(serviceId: number): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqCommonStaffExit: { serviceId },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_EXIT,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  buildCommonStaffDeleteReq(serviceId: number, userId: number): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqCommonStaffDelete: { serviceId, userId },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_DELETE,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  // 客服接口
  buildStaffAcceptSessionReq(sessionId: Long): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqStaffAcceptSession: { sessionId },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_ACCEPT_SESSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  buildStaffExitSessionReq(sessionId: Long): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqStaffExitSession: { sessionId },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_EXIT_SESSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  buildStaffCloseSessionReq(sessionId: Long): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqStaffCloseSession: { sessionId },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_CLOSE_SESSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  buildStaffSessionInviteReq(sessionId: Long, staffIds: number[], content?: string): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqStaffSessionInvite: { sessionId, staffIds, content },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_SESSION_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  buildStaffAnswerSessionInviteReq(sessionId: Long, status: number): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqStaffAnswerSessionInvite: { sessionId, status },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_ANSWER_SESSION_INVITE,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  buildStaffRemoveSessionStaffReq(sessionId: Long, staffIds: number[]): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqStaffRemoveSessionStaff: { sessionId, staffIds },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_REMOVE_SESSION_STAFFS,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  buildStaffSearchStaffsReq(
    serviceId: number,
    pageIndex: number,
    pageSize: number,
    staffClass?: number,
  ): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqStaffSearchStaffs: {
        serviceId,
        class: staffClass,
        pageIndex,
        pageSize,
      },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_SEARCH_STAFFS,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },

  buildStaffResetSessionReq(sessionId: Long): WLBuildMsgRet {
    const businessMessage = WL.Business.BusinessMessage.create({
      reqStaffResetSession: { sessionId },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_RESET_SESSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      businessMessage,
    )
  },
}

export { WeilaPbBusinessWrapper }
