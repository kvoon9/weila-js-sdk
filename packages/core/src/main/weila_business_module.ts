import { WL_CoreInterface } from 'main/weila_internal_data';
import { WL } from 'proto/weilapb';
import { getLogger } from 'log/weila_log';
import {
  WL_IDbService,
  WL_IDbServiceSession,
  WL_IDbServiceSessionInfo,
  WL_IDbServiceStaff,
  WL_IDbServiceStaffInfo,
  WL_IDbSession,
  WL_IDbSessionStatus,
  WL_IDbSessionType,
  WL_IDbUserInfo,
  WL_ServiceStatus,
} from 'db/weila_db_data';
import { WeilaPbBusinessWrapper } from 'proto/weilapb_business_wrapper';
import Long from 'long';
import { WeilaDB } from 'db/weila_db';
import {
  WL_AnswerStatus,
  WL_CommonAnswerStaffInvite,
  WL_ExtEventID,
  WL_ServiceSessionInvite,
  WL_StaffAnswerSessionInvite,
  WL_StaffInvite,
  WL_StaffSessionInfo,
} from 'main/weila_external_data';

const wllog = getLogger('MOD:business:info');
const wlerr = getLogger('MOD:business:err');

export default class WLBusinessModule {
  constructor(private coreInterface: WL_CoreInterface) {
    this.coreInterface.registerPbMsgHandler(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      this.onPbMsgHandler.bind(this),
    );
  }

  private onPbMsgHandler(data: any): void {
    const serverMessage = data as WL.Service.IServiceMessage;
    const serviceHead = serverMessage.serviceHead;
    if (serviceHead.commandType === WL.Service.CommandType.COMMAND_RESPONSE) {
      switch (serviceHead.commandId) {
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_GET_SESSION:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serviceHead.resultCode === 0
                ? serverMessage.businessMessage.rspCommonGetSessions
                : null,
            );
          }
          break;

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_GET_STAFF_INVITE:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serviceHead.resultCode === 0
                ? serverMessage.businessMessage.rspCommonGetStaffInvite
                : null,
            );
          }
          break;

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_SEARCH_STAFFS:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serviceHead.resultCode === 0
                ? serverMessage.businessMessage.rspStaffSearchStaffs
                : null,
            );
          }
          break;

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_RESET_SESSION:
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_REMOVE_SESSION_STAFFS:
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_ANSWER_SESSION_INVITE:
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_SESSION_INVITE:
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_CLOSE_SESSION:
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_EXIT_SESSION:
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_ACCEPT_SESSION:
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_DELETE:
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_INVITE:
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_ANSWER_STAFF_INVITE:
          {
            this.coreInterface.rspPbMsg(serviceHead.seq, serviceHead.resultCode, true);
          }
          break;
      }
    } else if (serviceHead.commandType === WL.Service.CommandType.COMMAND_NOTIFY) {
      switch (serviceHead.commandId) {
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_SESSION_CHANGE:
          {
            const ntf = serverMessage.businessMessage.ntfCommonSessionChange;
            const serviceSessionInfo = WeilaDB.getInstance().convertFromServiceSessionRaw(
              ntf.session,
            );
            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_COMMON_SESSION_CHANGE_IND,
              serviceSessionInfo,
            );

            if (
              serviceSessionInfo.serviceSession.serviceStatus ===
              WL_ServiceStatus.SERVICE_STATUS_INIT
            ) {
              (async () => {
                await WeilaDB.getInstance().putService(serviceSessionInfo.service);
                await WeilaDB.getInstance().putServiceStaffs(
                  WeilaDB.getInstance().convertFromStaffRaws(ntf.session.staffAttributes),
                );
                await WeilaDB.getInstance().putUserInfos(
                  serviceSessionInfo.staffs.map((value) => {
                    return value.userData;
                  }),
                );
                await WeilaDB.getInstance().putUserInfo(serviceSessionInfo.customer);
              })();
            }
          }
          break;

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_INVITE:
          {
            const ntf = serverMessage.businessMessage.ntfCommonStaffInvite;
            const staffInvite = {} as WL_StaffInvite;
            staffInvite.invitorInfo = {} as WL_IDbServiceStaffInfo;
            staffInvite.invitorInfo.staff = WeilaDB.getInstance().convertFromStaffRaws([
              ntf.inviteInfo.invitor,
            ])[0];
            staffInvite.invitorInfo.userData = WeilaDB.getInstance().convertFromUserRaw([
              ntf.inviteInfo.invitor.userInfo,
            ])[0];
            staffInvite.content = ntf.inviteInfo.content;
            staffInvite.service = WeilaDB.getInstance().convertFromServiceRaw(
              ntf.inviteInfo.serviceAttribute,
            );

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_COMMON_STAFF_INVITE_IND,
              staffInvite,
            );
          }
          break;

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_ANSWER_STAFF_INVITE:
          {
            const ntf = serverMessage.businessMessage.ntfCommonAnswerStaffInvite;
            const commonAnswerStaffInvite = {} as WL_CommonAnswerStaffInvite;
            commonAnswerStaffInvite.serviceId = ntf.serviceId;
            commonAnswerStaffInvite.userId = ntf.userId;
            commonAnswerStaffInvite.status = ntf.status;

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_COMMON_ANSWER_INVITE_IND,
              commonAnswerStaffInvite,
            );
          }
          break;

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_ACCEPT_SESSION:
          {
            const ntf = serverMessage.businessMessage.ntfStaffAcceptSession;
            const staffSessionInfo = {} as WL_StaffSessionInfo;
            staffSessionInfo.sessionId = Long.fromValue(ntf.sessionId).toString(10);
            staffSessionInfo.staffId = ntf.staffId;

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_STAFF_ACCEPT_SESSION_IND,
              staffSessionInfo,
            );
          }
          break;

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_EXIT_SESSION:
          {
            const ntf = serverMessage.businessMessage.ntfStaffExitSession;
            const staffSessionInfo = {} as WL_StaffSessionInfo;
            staffSessionInfo.sessionId = Long.fromValue(ntf.sessionId).toString(10);
            staffSessionInfo.staffId = ntf.staffId;

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_STAFF_EXIT_SESSION_IND,
              staffSessionInfo,
            );
          }
          break;

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_CLOSE_SESSION:
          {
            const ntf = serverMessage.businessMessage.ntfStaffCloseSession;
            const staffSessionInfo = {} as WL_StaffSessionInfo;
            staffSessionInfo.sessionId = Long.fromValue(ntf.sessionId).toString(10);
            staffSessionInfo.staffId = ntf.staffId;

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_STAFF_CLOSE_SESSION_IND,
              staffSessionInfo,
            );
          }
          break;

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_SESSION_INVITE:
          {
            const ntf = serverMessage.businessMessage.ntfStaffSessionInvite;
            const staffSessionInvite = {} as WL_ServiceSessionInvite;
            staffSessionInvite.session = WeilaDB.getInstance().convertFromServiceSessionRaw(
              ntf.session,
            );
            staffSessionInvite.content = ntf.content;
            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_STAFF_SESSION_INVITE_IND,
              staffSessionInvite,
            );
          }
          break;

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_ANSWER_SESSION_INVITE:
          {
            const ntf = serverMessage.businessMessage.ntfStaffAnswerSessionInvite;
            const staffAnswerSessionInvite = {} as WL_StaffAnswerSessionInvite;
            staffAnswerSessionInvite.sessionId = Long.fromValue(ntf.sessionId).toString(10);
            staffAnswerSessionInvite.status = ntf.status;
            staffAnswerSessionInvite.invitee = {} as WL_IDbServiceStaffInfo;
            staffAnswerSessionInvite.invitee.staff = WeilaDB.getInstance().convertFromStaffRaws([
              ntf.invitee,
            ])[0];
            staffAnswerSessionInvite.invitee.userData = WeilaDB.getInstance().convertFromUserRaw([
              ntf.invitee.userInfo,
            ])[0];

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_STAFF_ANSWER_INVITE_IND,
              staffAnswerSessionInvite,
            );
          }
          break;

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_REMOVE_SESSION_STAFFS:
          {
            const ntf = serverMessage.businessMessage.ntfStaffRemoveSessionStaff;
            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_STAFF_REMOVED_SESSION_IND,
              Long.fromValue(ntf.sessionId).toString(10),
            );
          }
          break;
      }
    }
  }

  public async getSessionServiceFromServer(
    sessionId: string,
  ): Promise<WL_IDbServiceSessionInfo | undefined> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildCommonGetSessionsReq([
      Long.fromValue(sessionId),
    ]);
    if (buildMsgRet.resultCode === 0) {
      let dbUserInfos = [] as WL_IDbUserInfo[];
      const rsp = (await this.coreInterface.sendPbMsg(
        buildMsgRet,
      )) as WL.Business.IRspCommonGetSessions;
      if (rsp.sessions.length) {
        const serviceSessionInfo = WeilaDB.getInstance().convertFromServiceSessionRaw(
          rsp.sessions[0],
        );
        dbUserInfos.push(
          ...serviceSessionInfo.staffs.map((value) => {
            return value.userData;
          }),
        );
        dbUserInfos.push(serviceSessionInfo.customer);
        await WeilaDB.getInstance().putUserInfos(dbUserInfos);
        await WeilaDB.getInstance().putServiceStaffs(
          WeilaDB.getInstance().convertFromStaffRaws(rsp.sessions[0].staffAttributes),
        );
        await WeilaDB.getInstance().putService(serviceSessionInfo.service);

        return serviceSessionInfo;
      }

      return undefined;
    }

    return Promise.reject(new Error('build msg error'));
  }

  public async initService(dbSessionList: WL_IDbSession[]): Promise<boolean> {
    let serviceSessionInfos = [] as WL_IDbServiceSessionInfo[];
    if (dbSessionList.length === 0) {
      return true;
    }

    dbSessionList = dbSessionList.filter((value) => {
      return value.sessionType === WL_IDbSessionType.SESSION_SERVICE_TYPE;
    });

    const sessionIds_long = dbSessionList.map((value) => {
      return Long.fromValue(value.sessionId);
    });

    const buildMsgRet = WeilaPbBusinessWrapper.buildCommonGetSessionsReq(sessionIds_long);
    if (buildMsgRet.resultCode === 0) {
      const rsp = (await this.coreInterface.sendPbMsg(
        buildMsgRet,
      )) as WL.Business.IRspCommonGetSessions;
      const services = [] as WL_IDbService[];
      let dbUserInfos = [] as WL_IDbUserInfo[];
      let allStaffs = [] as WL_IDbServiceStaff[];

      wllog('buildCommonGetSessionsReq', rsp);
      const validServiceSessionIds = rsp.sessions.map((value) => {
        return new Long(
          value.customerAttribute.userInfo.userId,
          value.serviceAttribute.id,
        ).toString(10);
      });

      for (let dbSession of dbSessionList) {
        const idx = validServiceSessionIds.indexOf(dbSession.sessionId);
        if (idx !== -1) {
          const serviceSessionRaw = rsp.sessions[idx];
          const serviceSessionInfo =
            WeilaDB.getInstance().convertFromServiceSessionRaw(serviceSessionRaw);
          services.push(serviceSessionInfo.service);
          allStaffs.push(
            ...serviceSessionInfo.staffs.map((value) => {
              return value.staff;
            }),
          );
          dbUserInfos.push(
            ...serviceSessionInfo.staffs.map((value) => {
              return value.userData;
            }),
          );
          dbUserInfos.push(serviceSessionInfo.customer);
          serviceSessionInfos.push(serviceSessionInfo);

          dbSession.latestUpdate = serviceSessionInfo.serviceSession.updatedTime;
          dbSession.sessionName = serviceSessionInfo.service.name;
          dbSession.sessionAvatar = serviceSessionInfo.service.avatar;
          dbSession.extra = serviceSessionInfo.serviceSession;
        } else {
          dbSession.status = WL_IDbSessionStatus.SESSION_INVALID;
          (dbSession.extra as WL_IDbServiceSession).serviceStatus =
            WL_ServiceStatus.SERVICE_STATUS_FINISH;
        }
      }

      dbUserInfos = dbUserInfos.filter((value, index, array) => {
        return (
          array.findIndex((value1) => {
            return value1.userId === value.userId;
          }) === index
        );
      });
      await WeilaDB.getInstance().putUserInfos(dbUserInfos);

      allStaffs = allStaffs.filter((value, index, array) => {
        return (
          array.findIndex((value1) => {
            return value1.userId === value.userId;
          }) === index
        );
      });
      await WeilaDB.getInstance().putServiceStaffs(allStaffs);
      await WeilaDB.getInstance().putServices(services);
      await WeilaDB.getInstance().putSessions(dbSessionList);
      return true;
    }

    return Promise.reject(new Error('创建消息出错'));
  }

  public async commonStaffInvite(
    serviceId: number,
    userIds: number[],
    content?: string,
  ): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildCommonStaffInviteReq(
      serviceId,
      userIds,
      content,
    );
    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet);
    }
    return Promise.reject(new Error('创建消息出错'));
  }

  public async commonAnswerStaffInvite(
    serviceId: number,
    invitorId: number,
    status: WL_AnswerStatus,
  ): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildCommonAnswerStaffInviteReq(
      serviceId,
      invitorId,
      status,
    );
    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet);
    }
    return Promise.reject(new Error('创建消息出错'));
  }

  public async commonGetStaffInvite(latestUpdate: number): Promise<WL_StaffInvite[]> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildCommonGetStaffInviteReq(latestUpdate);
    if (buildMsgRet.resultCode === 0) {
      const staffInvites = [] as WL_StaffInvite[];
      const rsp = (await this.coreInterface.sendPbMsg(
        buildMsgRet,
      )) as WL.Business.IRspCommonGetStaffInvite;
      if (rsp.invites) {
        for (let invite of rsp.invites) {
          const staffInvite = {} as WL_StaffInvite;
          staffInvite.service = WeilaDB.getInstance().convertFromServiceRaw(
            invite.serviceAttribute,
          );
          staffInvite.invitorInfo = {} as WL_IDbServiceStaffInfo;
          staffInvite.invitorInfo.staff = WeilaDB.getInstance().convertFromStaffRaws([
            invite.invitor,
          ])[0];
          staffInvite.invitorInfo.userData = WeilaDB.getInstance().convertFromUserRaw([
            invite.invitor.userInfo,
          ])[0];
          staffInvite.content = invite.content;

          staffInvites.push(staffInvite);
        }
      }

      return staffInvites;
    }
    return Promise.reject(new Error('创建消息出错'));
  }

  public async commonStaffDelete(serviceId: number, userId: number): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildCommonStaffDeleteReq(serviceId, userId);
    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet);
    }

    return Promise.reject(new Error('创建消息出错'));
  }

  public async staffAcceptSession(sessionId: string): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffAcceptSessionReq(
      Long.fromValue(sessionId),
    );
    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet);
    }

    return Promise.reject(new Error('创建消息出错'));
  }

  public async staffExitSession(sessionId: string): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffExitSessionReq(Long.fromValue(sessionId));
    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet);
    }

    return Promise.reject(new Error('创建消息出错'));
  }

  public async staffCloseSession(sessionId: string): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffCloseSessionReq(Long.fromValue(sessionId));
    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet);
    }

    return Promise.reject(new Error('创建消息出错'));
  }

  public async staffSessionInvite(
    sessionId: string,
    userIds: number[],
    content?: string,
  ): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffSessionInviteReq(
      Long.fromValue(sessionId),
      userIds,
      content,
    );
    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet);
    }

    return Promise.reject(new Error('创建消息出错'));
  }

  public async staffAnswerSessionInvite(
    sessionId: string,
    status: WL_AnswerStatus,
  ): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffAnswerSessionInviteReq(
      Long.fromValue(sessionId),
      status,
    );
    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet);
    }

    return Promise.reject(new Error('创建消息出错'));
  }

  public async staffRemoveSessionStaff(sessionId: string, staffIds: number[]): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffRemoveSessionStaffReq(
      Long.fromValue(sessionId),
      staffIds,
    );
    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet);
    }

    return Promise.reject(new Error('创建消息出错'));
  }

  public async staffSearchStaffs(
    serviceId: number,
    pageIndex: number,
    pageSize: number,
    staffClass?: number,
  ): Promise<WL_IDbServiceStaffInfo[]> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffSearchStaffsReq(
      serviceId,
      pageIndex,
      pageSize,
      staffClass,
    );
    if (buildMsgRet.resultCode === 0) {
      const rsp: WL.Business.IRspStaffSearchStaffs =
        await this.coreInterface.sendPbMsg(buildMsgRet);
      if (rsp.staffs) {
        const staffs = WeilaDB.getInstance().convertFromStaffRaws(rsp.staffs);
        const userInfos = WeilaDB.getInstance().convertFromUserRaw(
          rsp.staffs.map((value) => {
            return value.userInfo;
          }),
        );

        await WeilaDB.getInstance().putServiceStaffs(staffs);
        await WeilaDB.getInstance().putUserInfos(userInfos);

        return staffs.map((value, index) => {
          const staffInfo = {} as WL_IDbServiceStaffInfo;
          staffInfo.userData = userInfos[index];
          staffInfo.staff = value;
          return staffInfo;
        });
      }

      return [];
    }

    return Promise.reject(new Error('创建消息出错'));
  }

  public async staffResetSession(sessionId: string): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffResetSessionReq(Long.fromValue(sessionId));
    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet);
    }

    return Promise.reject(new Error('创建消息出错'));
  }
}
