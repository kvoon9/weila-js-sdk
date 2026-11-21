import { WL_CoreInterface } from 'main/weila_internal_data'
import { WL } from 'proto/weilapb'
import { getLogger } from 'log/weila_log'
import {
  WL_IDbService,
  WL_IDbServiceSession,
  WL_IDbServiceSessionInfo,
  WL_IDbServiceStaff,
  WL_IDbServiceStaffInfo,
  WL_IDbSession,
  WL_IDbSessionStatus,
  WL_IDbUserInfo,
  WL_ServiceStatus,
  isServiceSessionType,
} from 'db/weila_db_data'
import { WeilaPbBusinessWrapper } from 'proto/weilapb_business_wrapper'
import Long from 'long'
import { WeilaDB } from 'db/weila_db'
import {
  WL_AnswerStatus,
  WL_CommonAnswerStaffInvite,
  WL_ExtEventID,
  WL_ServiceSessionInvite,
  WL_StaffAnswerSessionInvite,
  WL_StaffInvite,
  WL_StaffSessionInfo,
} from 'main/weila_external_data'

const wllog = getLogger('MOD:business:info')

export default class WLBusinessModule {
  constructor(private coreInterface: WL_CoreInterface) {
    this.coreInterface.registerPbMsgHandler(
      WL.Service.ServiceID.SERVICE_BUSINESS,
      this.onPbMsgHandler.bind(this),
    )
  }

  private onPbMsgHandler(data: any): void {
    const serverMessage = data as WL.Service.IServiceMessage
    const serviceHead = serverMessage.serviceHead

    if (!serviceHead) return

    const businessMessage = serverMessage.businessMessage

    if (serviceHead.commandType === WL.Service.CommandType.COMMAND_RESPONSE) {
      switch (serviceHead.commandId) {
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_GET_SESSION:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serviceHead.resultCode === 0 && businessMessage
                ? businessMessage.rspCommonGetSessions
                : null,
            )
          }

          break

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_GET_STAFF_INVITE:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serviceHead.resultCode === 0 && businessMessage
                ? businessMessage.rspCommonGetStaffInvite
                : null,
            )
          }

          break

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_SEARCH_STAFFS:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serviceHead.resultCode === 0 && businessMessage
                ? businessMessage.rspStaffSearchStaffs
                : null,
            )
          }

          break

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
            this.coreInterface.rspPbMsg(serviceHead.seq ?? 0, serviceHead.resultCode ?? 0, true)
          }

          break
      }
    } else if (serviceHead.commandType === WL.Service.CommandType.COMMAND_NOTIFY) {
      if (!businessMessage) return

      switch (serviceHead.commandId) {
        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_SESSION_CHANGE:
          {
            const ntf = businessMessage.ntfCommonSessionChange

            if (!ntf) return

            const session = ntf.session

            if (!session) return

            const serviceSessionInfo = WeilaDB.getInstance().convertFromServiceSessionRaw(session)
            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_COMMON_SESSION_CHANGE_IND,
              serviceSessionInfo,
            )

            if (
              serviceSessionInfo.serviceSession.serviceStatus ===
              WL_ServiceStatus.SERVICE_STATUS_INIT
            ) {
              ;(async () => {
                await WeilaDB.getInstance().putService(serviceSessionInfo.service)
                await WeilaDB.getInstance().putServiceStaffs(
                  WeilaDB.getInstance().convertFromStaffRaws(session.staffAttributes ?? []),
                )
                await WeilaDB.getInstance().putUserInfos(
                  serviceSessionInfo.staffs.map((value) => {
                    return value.userData
                  }),
                )
                const customer = serviceSessionInfo.customer

                if (customer) {
                  await WeilaDB.getInstance().putUserInfo(customer)
                }
              })()
            }
          }

          break

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_STAFF_INVITE:
          {
            const ntf = businessMessage.ntfCommonStaffInvite

            if (!ntf) return

            const inviteInfo = ntf.inviteInfo

            if (!inviteInfo) return

            const invitor = inviteInfo.invitor

            if (!invitor) return

            const invitorUserInfo = invitor.userInfo

            if (!invitorUserInfo) return

            const serviceAttribute = inviteInfo.serviceAttribute

            if (!serviceAttribute) return

            const staffInvite = {} as WL_StaffInvite
            staffInvite.invitorInfo = {} as WL_IDbServiceStaffInfo
            staffInvite.invitorInfo.staff = WeilaDB.getInstance().convertFromStaffRaws([invitor])[0]
            staffInvite.invitorInfo.userData = WeilaDB.getInstance().convertFromUserRaw([
              invitorUserInfo,
            ])[0]
            staffInvite.content = inviteInfo.content ?? undefined
            staffInvite.service = WeilaDB.getInstance().convertFromServiceRaw(serviceAttribute)

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_COMMON_STAFF_INVITE_IND,
              staffInvite,
            )
          }

          break

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_COMMON_ANSWER_STAFF_INVITE:
          {
            const ntf = businessMessage.ntfCommonAnswerStaffInvite

            if (!ntf) return

            const commonAnswerStaffInvite = {} as WL_CommonAnswerStaffInvite
            commonAnswerStaffInvite.serviceId = ntf.serviceId ?? 0
            commonAnswerStaffInvite.userId = ntf.userId ?? 0
            commonAnswerStaffInvite.status = ntf.status ?? 0

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_COMMON_ANSWER_INVITE_IND,
              commonAnswerStaffInvite,
            )
          }

          break

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_ACCEPT_SESSION:
          {
            const ntf = businessMessage.ntfStaffAcceptSession

            if (!ntf) return

            const staffSessionInfo = {} as WL_StaffSessionInfo
            staffSessionInfo.sessionId = Long.fromValue(ntf.sessionId ?? 0).toString(10)
            staffSessionInfo.staffId = ntf.staffId ?? 0

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_STAFF_ACCEPT_SESSION_IND,
              staffSessionInfo,
            )
          }

          break

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_EXIT_SESSION:
          {
            const ntf = businessMessage.ntfStaffExitSession

            if (!ntf) return

            const staffSessionInfo = {} as WL_StaffSessionInfo
            staffSessionInfo.sessionId = Long.fromValue(ntf.sessionId ?? 0).toString(10)
            staffSessionInfo.staffId = ntf.staffId ?? 0

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_STAFF_EXIT_SESSION_IND,
              staffSessionInfo,
            )
          }

          break

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_CLOSE_SESSION:
          {
            const ntf = businessMessage.ntfStaffCloseSession

            if (!ntf) return

            const staffSessionInfo = {} as WL_StaffSessionInfo
            staffSessionInfo.sessionId = Long.fromValue(ntf.sessionId ?? 0).toString(10)
            staffSessionInfo.staffId = ntf.staffId ?? 0

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_STAFF_CLOSE_SESSION_IND,
              staffSessionInfo,
            )
          }

          break

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_SESSION_INVITE:
          {
            const ntf = businessMessage.ntfStaffSessionInvite

            if (!ntf) return

            const session = ntf.session

            if (!session) return

            const staffSessionInvite = {} as WL_ServiceSessionInvite
            staffSessionInvite.session = WeilaDB.getInstance().convertFromServiceSessionRaw(session)
            staffSessionInvite.content = ntf.content ?? undefined
            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_STAFF_SESSION_INVITE_IND,
              staffSessionInvite,
            )
          }

          break

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_ANSWER_SESSION_INVITE:
          {
            const ntf = businessMessage.ntfStaffAnswerSessionInvite

            if (!ntf) return

            const invitee = ntf.invitee

            if (!invitee) return

            const inviteeUserInfo = invitee.userInfo

            if (!inviteeUserInfo) return

            const staffAnswerSessionInvite = {} as WL_StaffAnswerSessionInvite
            staffAnswerSessionInvite.sessionId = Long.fromValue(ntf.sessionId ?? 0).toString(10)
            staffAnswerSessionInvite.status = ntf.status ?? 0
            staffAnswerSessionInvite.invitee = {} as WL_IDbServiceStaffInfo
            staffAnswerSessionInvite.invitee.staff = WeilaDB.getInstance().convertFromStaffRaws([
              invitee,
            ])[0]
            staffAnswerSessionInvite.invitee.userData = WeilaDB.getInstance().convertFromUserRaw([
              inviteeUserInfo,
            ])[0]

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_STAFF_ANSWER_INVITE_IND,
              staffAnswerSessionInvite,
            )
          }

          break

        case WL.Business.BusinessCommandId.BUSINESS_COMMAND_STAFF_REMOVE_SESSION_STAFFS:
          {
            const ntf = businessMessage.ntfStaffRemoveSessionStaff

            if (!ntf) return

            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_STAFF_REMOVED_SESSION_IND,
              Long.fromValue(ntf.sessionId ?? 0).toString(10),
            )
          }

          break
      }
    }
  }

  public async getSessionServiceFromServer(
    sessionId: string,
  ): Promise<WL_IDbServiceSessionInfo | undefined> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildCommonGetSessionsReq([
      Long.fromValue(sessionId),
    ])

    if (buildMsgRet.resultCode === 0) {
      let dbUserInfos = [] as WL_IDbUserInfo[]

      const rsp = (await this.coreInterface.sendPbMsg(
        buildMsgRet,
      )) as WL.Business.IRspCommonGetSessions

      const sessions = rsp.sessions ?? []

      if (sessions.length) {
        const rawSession = sessions[0]
        const serviceSessionInfo = WeilaDB.getInstance().convertFromServiceSessionRaw(rawSession)
        dbUserInfos.push(
          ...serviceSessionInfo.staffs.map((value) => {
            return value.userData
          }),
        )
        const customer = serviceSessionInfo.customer

        if (customer) {
          dbUserInfos.push(customer)
        }

        await WeilaDB.getInstance().putUserInfos(dbUserInfos)
        await WeilaDB.getInstance().putServiceStaffs(
          WeilaDB.getInstance().convertFromStaffRaws(rawSession.staffAttributes ?? []),
        )
        await WeilaDB.getInstance().putService(serviceSessionInfo.service)

        return serviceSessionInfo
      }

      return undefined
    }

    return Promise.reject(new Error('build msg error'))
  }

  public async initService(dbSessionList: WL_IDbSession[]): Promise<boolean> {
    let serviceSessionInfos = [] as WL_IDbServiceSessionInfo[]

    if (dbSessionList.length === 0) {
      return true
    }

    dbSessionList = dbSessionList.filter((value) => {
      return isServiceSessionType(value.sessionType)
    })

    const sessionIds_long = dbSessionList.map((value) => {
      return Long.fromValue(value.sessionId)
    })

    const buildMsgRet = WeilaPbBusinessWrapper.buildCommonGetSessionsReq(sessionIds_long)

    if (buildMsgRet.resultCode === 0) {
      const rsp = (await this.coreInterface.sendPbMsg(
        buildMsgRet,
      )) as WL.Business.IRspCommonGetSessions

      const services = [] as WL_IDbService[]
      let dbUserInfos = [] as WL_IDbUserInfo[]
      let allStaffs = [] as WL_IDbServiceStaff[]

      wllog('buildCommonGetSessionsReq', rsp)

      const sessions = rsp.sessions ?? []

      const validServiceSessionIds = sessions.map((value) => {
        return new Long(
          value.customerAttribute?.userInfo?.userId ?? 0,
          value.serviceAttribute?.id ?? 0,
        ).toString(10)
      })

      for (let dbSession of dbSessionList) {
        const idx = validServiceSessionIds.indexOf(dbSession.sessionId)

        if (idx !== -1) {
          const serviceSessionRaw = sessions[idx]

          const serviceSessionInfo =
            WeilaDB.getInstance().convertFromServiceSessionRaw(serviceSessionRaw)

          services.push(serviceSessionInfo.service)
          allStaffs.push(
            ...serviceSessionInfo.staffs.map((value) => {
              return value.staff
            }),
          )
          dbUserInfos.push(
            ...serviceSessionInfo.staffs.map((value) => {
              return value.userData
            }),
          )
          const customer = serviceSessionInfo.customer

          if (customer) {
            dbUserInfos.push(customer)
          }

          serviceSessionInfos.push(serviceSessionInfo)

          dbSession.latestUpdate = serviceSessionInfo.serviceSession.updatedTime
          dbSession.sessionName = serviceSessionInfo.service.name
          dbSession.sessionAvatar = serviceSessionInfo.service.avatar
          dbSession.extra = serviceSessionInfo.serviceSession
        } else {
          dbSession.status = WL_IDbSessionStatus.SESSION_INVALID
          ;(dbSession.extra as WL_IDbServiceSession).serviceStatus =
            WL_ServiceStatus.SERVICE_STATUS_FINISH
        }
      }

      dbUserInfos = dbUserInfos.filter((value, index, array) => {
        return (
          array.findIndex((value1) => {
            return value1.userId === value.userId
          }) === index
        )
      })
      await WeilaDB.getInstance().putUserInfos(dbUserInfos)

      allStaffs = allStaffs.filter((value, index, array) => {
        return (
          array.findIndex((value1) => {
            return value1.userId === value.userId
          }) === index
        )
      })
      await WeilaDB.getInstance().putServiceStaffs(allStaffs)
      await WeilaDB.getInstance().putServices(services)
      await WeilaDB.getInstance().putSessions(dbSessionList)

      return true
    }

    return Promise.reject(new Error('创建消息出错'))
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
    )

    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet)
    }

    return Promise.reject(new Error('创建消息出错'))
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
    )

    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet)
    }

    return Promise.reject(new Error('创建消息出错'))
  }

  public async commonGetStaffInvite(latestUpdate: number): Promise<WL_StaffInvite[]> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildCommonGetStaffInviteReq(latestUpdate)

    if (buildMsgRet.resultCode === 0) {
      const staffInvites = [] as WL_StaffInvite[]

      const rsp = (await this.coreInterface.sendPbMsg(
        buildMsgRet,
      )) as WL.Business.IRspCommonGetStaffInvite

      if (rsp.invites) {
        for (let invite of rsp.invites) {
          const serviceAttribute = invite.serviceAttribute

          if (!serviceAttribute) continue

          const invitor = invite.invitor

          if (!invitor) continue

          const invitorUserInfo = invitor.userInfo

          if (!invitorUserInfo) continue

          const staffInvite = {} as WL_StaffInvite
          staffInvite.service = WeilaDB.getInstance().convertFromServiceRaw(serviceAttribute)
          staffInvite.invitorInfo = {} as WL_IDbServiceStaffInfo
          staffInvite.invitorInfo.staff = WeilaDB.getInstance().convertFromStaffRaws([invitor])[0]
          staffInvite.invitorInfo.userData = WeilaDB.getInstance().convertFromUserRaw([
            invitorUserInfo,
          ])[0]
          staffInvite.content = invite.content ?? undefined

          staffInvites.push(staffInvite)
        }
      }

      return staffInvites
    }

    return Promise.reject(new Error('创建消息出错'))
  }

  public async commonStaffDelete(serviceId: number, userId: number): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildCommonStaffDeleteReq(serviceId, userId)

    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet)
    }

    return Promise.reject(new Error('创建消息出错'))
  }

  public async staffAcceptSession(sessionId: string): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffAcceptSessionReq(Long.fromValue(sessionId))

    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet)
    }

    return Promise.reject(new Error('创建消息出错'))
  }

  public async staffExitSession(sessionId: string): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffExitSessionReq(Long.fromValue(sessionId))

    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet)
    }

    return Promise.reject(new Error('创建消息出错'))
  }

  public async staffCloseSession(sessionId: string): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffCloseSessionReq(Long.fromValue(sessionId))

    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet)
    }

    return Promise.reject(new Error('创建消息出错'))
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
    )

    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet)
    }

    return Promise.reject(new Error('创建消息出错'))
  }

  public async staffAnswerSessionInvite(
    sessionId: string,
    status: WL_AnswerStatus,
  ): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffAnswerSessionInviteReq(
      Long.fromValue(sessionId),
      status,
    )

    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet)
    }

    return Promise.reject(new Error('创建消息出错'))
  }

  public async staffRemoveSessionStaff(sessionId: string, staffIds: number[]): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffRemoveSessionStaffReq(
      Long.fromValue(sessionId),
      staffIds,
    )

    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet)
    }

    return Promise.reject(new Error('创建消息出错'))
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
    )

    if (buildMsgRet.resultCode === 0) {
      const rsp: WL.Business.IRspStaffSearchStaffs = await this.coreInterface.sendPbMsg(buildMsgRet)

      if (rsp.staffs) {
        const staffRaws = rsp.staffs.filter(
          (
            value,
          ): value is WL.Business.StaffAttribute.$Properties & {
            userInfo: WL.Common.UserInfo.$Properties
          } => value.userInfo !== null && value.userInfo !== undefined,
        )

        const staffs = WeilaDB.getInstance().convertFromStaffRaws(staffRaws)

        const userInfos = WeilaDB.getInstance().convertFromUserRaw(
          staffRaws.map((value) => {
            return value.userInfo
          }),
        )

        await WeilaDB.getInstance().putServiceStaffs(staffs)
        await WeilaDB.getInstance().putUserInfos(userInfos)

        return staffs.map((value, index) => {
          const staffInfo = {} as WL_IDbServiceStaffInfo
          staffInfo.userData = userInfos[index]
          staffInfo.staff = value

          return staffInfo
        })
      }

      return []
    }

    return Promise.reject(new Error('创建消息出错'))
  }

  public async staffResetSession(sessionId: string): Promise<boolean> {
    const buildMsgRet = WeilaPbBusinessWrapper.buildStaffResetSessionReq(Long.fromValue(sessionId))

    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet)
    }

    return Promise.reject(new Error('创建消息出错'))
  }
}
