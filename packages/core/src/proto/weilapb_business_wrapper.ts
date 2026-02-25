import {WL} from "./weilapb";
import {BuildWeilaMsg} from "./weilapb_wrapper";
import Long from "long";
import {WLBuildMsgRet} from "./weilapb_wrapper_data";

class WeilaPbBusinessWrapper {
    public static buildCommonGetSessionsReq(sessionIds: Long[]): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqCommonGetSessions = new WL.Business.ReqCommonGetSessions();
        businessMessage.reqCommonGetSessions.sessionIds = sessionIds;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_GET_SESSION,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    public static buildCommonStaffInviteReq(serviceId: number, userIds: number[], content?: string): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqCommonStaffInvite = new WL.Business.ReqCommonStaffInvite();
        businessMessage.reqCommonStaffInvite.userIds = userIds;
        businessMessage.reqCommonStaffInvite.serviceId = serviceId;
        businessMessage.reqCommonStaffInvite.content = content;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_INVITE,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    public static buildCommonAnswerStaffInviteReq(serviceId: number, invitorId: number, status: number): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqCommonAnswerStaffInvite = new WL.Business.ReqCommonAnswerStaffInvite();
        businessMessage.reqCommonAnswerStaffInvite.serviceId = serviceId;
        businessMessage.reqCommonAnswerStaffInvite.invitorId = invitorId;
        businessMessage.reqCommonAnswerStaffInvite.status = status;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_ANSWER_STAFF_INVITE,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    public static buildCommonGetStaffInviteReq(latestUpdated: number): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqCommonGetStaffInvite = new WL.Business.ReqCommonGetStaffInvite();
        businessMessage.reqCommonGetStaffInvite.latestUpdated = Long.fromValue(latestUpdated);
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_GET_STAFF_INVITE,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    public static buildCommonStaffExitReq(serviceId: number): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqCommonStaffExit = new WL.Business.ReqCommonStaffExit();
        businessMessage.reqCommonStaffExit.serviceId = serviceId;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_EXIT,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    public static buildCommonStaffDeleteReq(serviceId: number, userId: number): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqCommonStaffDelete = new WL.Business.ReqCommonStaffDelete();
        businessMessage.reqCommonStaffDelete.serviceId = serviceId;
        businessMessage.reqCommonStaffDelete.userId = userId;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_DELETE,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    // 客服接口
    public static buildStaffAcceptSessionReq(sessionId: Long): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqStaffAcceptSession = new WL.Business.ReqStaffAcceptSession();
        businessMessage.reqStaffAcceptSession.sessionId = sessionId;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_ACCEPT_SESSION,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    public static buildStaffExitSessionReq(sessionId: Long): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqStaffExitSession = new WL.Business.ReqStaffExitSession();
        businessMessage.reqStaffExitSession.sessionId = sessionId;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_EXIT_SESSION,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    public static buildStaffCloseSessionReq(sessionId: Long): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqStaffCloseSession = new WL.Business.ReqStaffCloseSession();
        businessMessage.reqStaffCloseSession.sessionId = sessionId;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_CLOSE_SESSION,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    public static buildStaffSessionInviteReq(sessionId: Long, staffIds: number[], content?: string): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqStaffSessionInvite = new WL.Business.ReqStaffSessionInvite();
        businessMessage.reqStaffSessionInvite.sessionId = sessionId;
        businessMessage.reqStaffSessionInvite.staffIds = staffIds;
        businessMessage.reqStaffSessionInvite.content = content;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_SESSION_INVITE,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    public static buildStaffAnswerSessionInviteReq(sessionId: Long, status: number): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqStaffAnswerSessionInvite = new WL.Business.ReqStaffAnswerSessionInvite();
        businessMessage.reqStaffAnswerSessionInvite.sessionId = sessionId;
        businessMessage.reqStaffAnswerSessionInvite.status = status;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_ANSWER_SESSION_INVITE,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    public static buildStaffRemoveSessionStaffReq(sessionId: Long, staffIds: number[]): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqStaffRemoveSessionStaff = new WL.Business.ReqStaffRemoveSessionStaff();
        businessMessage.reqStaffRemoveSessionStaff.sessionId = sessionId;
        businessMessage.reqStaffRemoveSessionStaff.staffIds = staffIds;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_REMOVE_SESSION_STAFFS,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    public static buildStaffSearchStaffsReq(serviceId: number, pageIndex: number, pageSize: number, staffClass?: number): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqStaffSearchStaffs = new WL.Business.ReqStaffSearchStaffs();
        businessMessage.reqStaffSearchStaffs.serviceId = serviceId;
        businessMessage.reqStaffSearchStaffs.class = staffClass;
        businessMessage.reqStaffSearchStaffs.pageIndex = pageIndex;
        businessMessage.reqStaffSearchStaffs.pageSize = pageSize;
        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_SEARCH_STAFFS,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }

    public static buildStaffResetSessionReq(sessionId: Long): WLBuildMsgRet {
        const businessMessage = new WL.Business.BusinessMessage();
        businessMessage.reqStaffResetSession = new WL.Business.ReqStaffResetSession();
        businessMessage.reqStaffResetSession.sessionId = sessionId;

        return BuildWeilaMsg.buildWeilaMsgReq(WL.Service.ServiceID.SERVICE_BUSINESS,
            WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_RESET_SESSION,
            WL.Service.CommandType.COMMAND_REQUEST, businessMessage);
    }


}


export {WeilaPbBusinessWrapper}
