import { default_group_logo, WL_CoreInterface } from 'main/weila_internal_data'
import { WeilaPBGroupWrapper } from 'proto/weilapb_group_wrapper'
import { WL } from 'proto/weilapb'
import { WeilaDB } from 'db/weila_db'
import Long from 'long'
import {
  WL_IDbGroup,
  WL_IDbGroupAuthType,
  WL_IDbGroupPublicType,
  WL_IDbGroupType,
  WL_IDbMemberInfo,
  WL_IDbMemberStatus,
  WL_IDbMemberType,
  WL_IDbNotification,
  WL_IDbNotificationType,
  WL_IDbUserInfo,
} from 'db/weila_db_data'
import { dbEnum } from 'db/db_enum'

import { getLogger } from 'log/weila_log'
import {
  WL_AnswerStatus,
  WL_DataPrepareInd,
  WL_DataPrepareState,
  WL_ExtEventID,
  WL_GroupAnswerInviteInfo,
  WL_GroupAnswerJoinInfo,
  WL_GroupInviteInfo,
  WL_GroupJoinInfo,
  WL_GroupMemberDeleteInfo,
} from 'main/weila_external_data'
import { AsyncTime } from 'main/weila_utils'
import { WLGroupAttributeInfo } from 'proto/weilapb_wrapper_data'

const wllog = getLogger('MOD:group:info')
const wlerr = getLogger('MOD:group:err')

/** Routes one group response to the waiting sendPbMsg caller. */
type GroupResponseRoute = (
  serviceHead: WL.Service.ServiceHead.$Properties,
  groupMessage: WL.Group.IGroupMessage | null | undefined,
) => void

export default class WLGroupModule {
  /**
   * Response routing per group command. Every command the module awaits via
   * sendPbMsg must have a route here; a missing route leaves the caller to
   * die on the watchdog timeout. `weila_group_module.spec.ts` guards the
   * wrapper's builders against this table.
   */
  private readonly responseRoutes = new Map<number, GroupResponseRoute>([
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPVERSION,
      (serviceHead, groupMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          groupMessage ? groupMessage.rspGetGroupVersion : null,
        )
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPATTRIBUTE,
      (serviceHead, groupMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          groupMessage ? groupMessage.rspGetGroupAttribute : null,
        )
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPINFO,
      (serviceHead, groupMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          groupMessage ? groupMessage.rspGetGroupInfo : null,
        )
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_MEMBER_USERINFO,
      (serviceHead, groupMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          groupMessage ? groupMessage.rspGetMemberUserInfo : null,
        )
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_BROADCAST,
      (serviceHead, groupMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          groupMessage ? groupMessage.rspGroupBroadcast : null,
        )
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_GROUP,
      (serviceHead) => {
        this.coreInterface.rspPbMsg(serviceHead.seq ?? 0, serviceHead.resultCode ?? 0, true)
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_INVITE,
      (serviceHead) => {
        this.coreInterface.rspPbMsg(serviceHead.seq ?? 0, serviceHead.resultCode ?? 0, true)
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_MEMBER,
      (serviceHead) => {
        this.coreInterface.rspPbMsg(serviceHead.seq ?? 0, serviceHead.resultCode ?? 0, true)
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_ONLINE_MEMBER,
      (serviceHead, groupMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          groupMessage ? groupMessage.rspGetGroupOnlineMember : null,
        )
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_CREATE_GROUP,
      (serviceHead, groupMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          groupMessage ? groupMessage.rspCreateGroup : null,
        )
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_JOIN,
      (serviceHead) => {
        this.coreInterface.rspPbMsg(serviceHead.seq ?? 0, serviceHead.resultCode ?? 0, true)
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_GROUPATTRIBUTE,
      (serviceHead, groupMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          groupMessage ? groupMessage.rspChangeGroupAttribute : null,
        )
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_GET_SUB_GROUPATTRIBUTE,
      (serviceHead, groupMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          groupMessage ? groupMessage.rspGetSubGroupAttribute : null,
        )
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_INVITE,
      (serviceHead, groupMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          groupMessage ? groupMessage.rspGroupInvite : null,
        )
      },
    ],
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_ADD_SUB_MEMBER,
      (serviceHead, groupMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          groupMessage ? groupMessage.rspAddSubMember : null,
        )
      },
    ],
    // joinGroup() has awaited this response since the module was written, but
    // the old switch had no case for it, so every join died on the watchdog.
    [
      WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_JOIN,
      (serviceHead, groupMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          groupMessage ? groupMessage.rspGroupJoin : null,
        )
      },
    ],
  ])

  constructor(private coreInterface: WL_CoreInterface) {
    this.coreInterface.registerPbMsgHandler(
      WL.Service.ServiceID.SERVICE_GROUP,
      this.onPbMsgHandler.bind(this),
    )
  }

  private onPbMsgHandler(data: WL.Service.IServiceMessage): void {
    const serverMessage = data
    const serviceHead = serverMessage.serviceHead

    if (!serviceHead) return

    if (serviceHead.commandType === WL.Service.CommandType.COMMAND_RESPONSE) {
      const commandId = serviceHead.commandId

      if (commandId !== undefined && commandId !== null) {
        const route = this.responseRoutes.get(commandId)

        if (route) route(serviceHead, serverMessage.groupMessage)
      }
    } else if (serviceHead.commandType === WL.Service.CommandType.COMMAND_NOTIFY) {
      wllog('WLGroupModule', serverMessage)

      switch (serviceHead.commandId) {
        case WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_INVITE:
          {
            const ntfGroupInvite = serverMessage.groupMessage?.ntfGroupInvite

            if (!ntfGroupInvite) break

            void (async () => {
              const groupId = Long.fromValue(ntfGroupInvite.groupId ?? 0).toString(10)
              const groupInfo = await this.getGroupAttribute(groupId)
              const invitorUserInfo = ntfGroupInvite.userInfo

              if (!invitorUserInfo) return

              const userInfos = WeilaDB.getInstance().convertFromUserRaw([invitorUserInfo])
              await WeilaDB.getInstance().putUserInfo(userInfos[0])

              const groupInviteInfo: WL_GroupInviteInfo = {
                groupInfo,
                invitorUserInfo: userInfos[0],
                status: WL_AnswerStatus.ANSWER_NORMAL,
              }

              const notification = {
                notificationType: WL_IDbNotificationType.GROUP_INVITE_NOTIFICATION,
                data: groupInviteInfo,
                createTime: new Date().getTime() / 1000,
              }

              const notificationId = await WeilaDB.getInstance().putNotification(notification)

              const savedNotification: WL_IDbNotification = {
                ...notification,
                id: notificationId,
              }

              this.coreInterface.sendExtEvent(
                WL_ExtEventID.WL_EXT_NEW_NOTIFICATION_IND,
                savedNotification,
              )
            })()
          }

          break

        case WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_JOIN:
          {
            const ntfGroupJoin = serverMessage.groupMessage?.ntfGroupJoin

            if (!ntfGroupJoin) break

            void (async () => {
              const joinUserInfo = ntfGroupJoin.userInfo

              if (!joinUserInfo) return

              const userInfos = WeilaDB.getInstance().convertFromUserRaw([joinUserInfo])
              await WeilaDB.getInstance().putUserInfo(userInfos[0])

              const groupInfo = await WeilaDB.getInstance().getGroup(
                Long.fromValue(ntfGroupJoin.groupId ?? 0).toString(10),
              )

              const groupJoinInfo: WL_GroupJoinInfo = {
                detail: ntfGroupJoin.detail ?? '',
                status: WL_AnswerStatus.ANSWER_NORMAL,
                joinUserInfo: userInfos[0],
                groupInfo,
              }

              const notification = {
                notificationType: WL_IDbNotificationType.GROUP_JOIN_NOTIFICATION,
                data: groupJoinInfo,
                createTime: new Date().getTime() / 1000,
              }

              const notificationId = await WeilaDB.getInstance().putNotification(notification)

              const savedNotification: WL_IDbNotification = {
                ...notification,
                id: notificationId,
              }

              this.coreInterface.sendExtEvent(
                WL_ExtEventID.WL_EXT_NEW_NOTIFICATION_IND,
                savedNotification,
              )
            })()
          }

          break

        case WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_GROUPATTRIBUTE:
          {
            const ntfChangeGroupAttribute = serverMessage.groupMessage?.ntfChangeGroupAttribute

            if (!ntfChangeGroupAttribute) break

            const ntfChangeGroupAttr = ntfChangeGroupAttribute.groupAttribute

            if (!ntfChangeGroupAttr) break

            const groupId = Long.fromValue(ntfChangeGroupAttr.groupId ?? 0).toString(10)
            WeilaDB.getInstance()
              .getGroup(groupId)
              .then(async (value) => {
                const groupInfo = value!

                if (ntfChangeGroupAttr.version !== undefined) {
                  groupInfo.version = ntfChangeGroupAttr.version ?? 0
                }

                if (ntfChangeGroupAttr.memberVersion !== undefined) {
                  groupInfo.memberVersion = ntfChangeGroupAttr.memberVersion ?? 0
                }

                if (ntfChangeGroupAttr.name !== undefined) {
                  groupInfo.name = ntfChangeGroupAttr.name ?? ''
                }

                if (ntfChangeGroupAttr.avatar !== undefined) {
                  groupInfo.avatar = ntfChangeGroupAttr.avatar ?? ''
                }

                if (ntfChangeGroupAttr.ownerId !== undefined) {
                  groupInfo.ownerId = ntfChangeGroupAttr.ownerId ?? 0
                }

                if (ntfChangeGroupAttr.type !== undefined) {
                  groupInfo.groupType = dbEnum<WL_IDbGroupType>(ntfChangeGroupAttr.type)
                }

                if (ntfChangeGroupAttr.desc !== undefined) {
                  groupInfo.desc = ntfChangeGroupAttr.desc ?? ''
                }

                if (ntfChangeGroupAttr.home !== undefined) {
                  groupInfo.home = ntfChangeGroupAttr.home ?? ''
                }

                if (ntfChangeGroupAttr.latitude !== undefined) {
                  groupInfo.latitude = ntfChangeGroupAttr.latitude ?? ''
                }

                if (ntfChangeGroupAttr.longitude !== undefined) {
                  groupInfo.longitude = ntfChangeGroupAttr.longitude ?? ''
                }

                if (ntfChangeGroupAttr.publicType !== undefined) {
                  groupInfo.publicType = dbEnum<WL_IDbGroupPublicType>(
                    ntfChangeGroupAttr.publicType,
                  )
                }

                if (ntfChangeGroupAttr.authType !== undefined) {
                  groupInfo.authType = dbEnum<WL_IDbGroupAuthType>(ntfChangeGroupAttr.authType)
                }

                if (ntfChangeGroupAttr.class !== undefined) {
                  groupInfo.groupClass = ntfChangeGroupAttr.class ?? 0
                }

                if (ntfChangeGroupAttr.memberLimit !== undefined) {
                  groupInfo.memberLimit = ntfChangeGroupAttr.memberLimit ?? 0
                }

                if (ntfChangeGroupAttr.memberCount !== undefined) {
                  groupInfo.memberCount = ntfChangeGroupAttr.memberCount ?? 0
                }

                if (ntfChangeGroupAttr.audioQuality !== undefined) {
                  groupInfo.audioQuality = ntfChangeGroupAttr.audioQuality ?? 0
                }

                if (ntfChangeGroupAttr.burstType !== undefined) {
                  groupInfo.burstType = ntfChangeGroupAttr.burstType ?? 0
                }

                if (ntfChangeGroupAttr.shutupStatus !== undefined) {
                  groupInfo.speechEnable = ntfChangeGroupAttr.shutupStatus === 0
                }

                await WeilaDB.getInstance().putGroup(groupInfo)
                wllog('群属性变更了:', groupId)
                // 通知群变更，UI 监听到后会重新拉取 session 列表，resolver 会覆盖名称/头像
                this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_GROUP_MODIFIED_IND, groupInfo)
              })
              .catch((reason) => {
                wlerr('保存群属性异常:' + reason)
              })
          }

          break

        case WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_MEMBERINFO:
          {
            const ntfChangeMemberInfo = serverMessage.groupMessage?.ntfChangeMemberInfo

            if (!ntfChangeMemberInfo) break

            const ntfMemberInfo = ntfChangeMemberInfo.memberInfo

            if (!ntfMemberInfo) break

            const groupId = Long.fromValue(ntfChangeMemberInfo.groupId ?? 0).toString(10)

            WeilaDB.getInstance()
              .getGroupMemberInfo(groupId, ntfMemberInfo.userId ?? 0)
              .then(async (value) => {
                const memberInfo = value

                if (memberInfo) {
                  if (ntfMemberInfo.status !== undefined) {
                    memberInfo.status = dbEnum<WL_IDbMemberStatus>(ntfMemberInfo.status)
                  }

                  if (ntfMemberInfo.type !== undefined) {
                    memberInfo.memberType = dbEnum<WL_IDbMemberType>(ntfMemberInfo.type)
                  }

                  if (ntfMemberInfo.remark !== undefined) {
                    memberInfo.remark = ntfMemberInfo.remark ?? ''
                  }

                  if (ntfMemberInfo.prority !== undefined) {
                    memberInfo.priority = ntfMemberInfo.prority ?? 0
                  }

                  if (ntfMemberInfo.shutupStatus !== undefined) {
                    memberInfo.speechEnable = ntfMemberInfo.shutupStatus === 0
                  }

                  if (ntfMemberInfo.shutupTimeout !== undefined) {
                    memberInfo.speechDisableTimeout = Long.fromValue(
                      ntfMemberInfo.shutupTimeout ?? 0,
                    ).toNumber()
                  }

                  if (ntfMemberInfo.shieldStatus !== undefined) {
                    memberInfo.blockedStatus = ntfMemberInfo.shieldStatus === 1
                  }

                  if (ntfMemberInfo.tts !== undefined) {
                    memberInfo.tts = ntfMemberInfo.tts === 1
                  }

                  if (ntfMemberInfo.locationShare !== undefined) {
                    memberInfo.locationShared = ntfMemberInfo.locationShare === 1
                  }

                  await WeilaDB.getInstance().putMemberInfo(memberInfo)
                  wllog('群成员变更了')
                  this.coreInterface.sendExtEvent(
                    WL_ExtEventID.WL_EXT_GROUP_MEMBERS_MODIFIED_IND,
                    memberInfo,
                  )
                }
              })
              .catch((reason) => {
                wlerr('保存群成员异常:' + reason)
              })
          }

          break

        case WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_GROUP:
          {
            const ntfDeleteGroup = serverMessage.groupMessage?.ntfDeleteGroup

            if (!ntfDeleteGroup) break

            const groupId = Long.fromValue(ntfDeleteGroup.groupId ?? 0).toString(10)

            wllog('群被删除的通知，群ID:', groupId)

            //删除群并且通知
            WeilaDB.getInstance()
              .delGroups([groupId])
              .then(() => {
                this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_GROUP_DELETED_IND, groupId)
              })
              .catch((reason) => {
                wlerr('删除群失败', reason)
              })
          }

          break

        case WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_MEMBER:
          {
            const ntfDeleteMember = serverMessage.groupMessage?.ntfDeleteMember

            if (!ntfDeleteMember) break

            const groupId = Long.fromValue(ntfDeleteMember.groupId ?? 0).toString(10)
            const userIdList = ntfDeleteMember.userIdList ?? []
            WeilaDB.getInstance()
              .delMemberInfos(groupId, userIdList)
              .then((_value) => {
                wllog('删除了群成员成功')

                // 通知外部
                const info: WL_GroupMemberDeleteInfo = {
                  groupId,
                  initiatorId: ntfDeleteMember.initiatorId ?? 0,
                  userIdList,
                }

                this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_GROUP_MEMBER_DELETED_IND, info)
              })
              .catch((reason) => {
                wlerr('删除群成员异常:' + reason)
              })
          }

          break

        case WL.Group.GroupCommandId.GROUP_COMMAND_NEW_MEMBER:
          {
            const ntfNewMember = serverMessage.groupMessage?.ntfNewMember

            if (!ntfNewMember) break

            wllog('有新成员消息:', ntfNewMember)
            ;(async () => {
              const groupId = Long.fromValue(ntfNewMember.groupId ?? 0).toString(10)
              const groupInfo = await WeilaDB.getInstance().getGroup(groupId)

              if (groupInfo) {
                const memberInfoList = ntfNewMember.memberInfoList ?? []
                const userInfoList = ntfNewMember.userInfoList ?? []

                const memberInfos = WeilaDB.getInstance().convertFromMemberRaw(
                  groupId,
                  memberInfoList,
                )

                const userInfos = WeilaDB.getInstance().convertFromUserRaw(userInfoList)

                if (memberInfos.length) {
                  await WeilaDB.getInstance().putMemberInfos(memberInfos)
                }

                if (userInfos.length) {
                  await WeilaDB.getInstance().putUserInfos(userInfos)
                }
              }

              wllog('保存群成员信息')

              this.coreInterface.sendExtEvent(
                WL_ExtEventID.WL_EXT_GROUP_NEW_MEMBER_JOINED_IND,
                ntfNewMember.memberInfoList,
              )
            })().catch((reason) => {
              wlerr('保存信息出错!', reason)
            })
          }

          break

        case WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_JOIN:
          {
            const ntfAnswerJoin = serverMessage.groupMessage?.ntfAnswerGroupJoin

            if (!ntfAnswerJoin) break

            void (async () => {
              const answerGroupJoin: WL_GroupAnswerJoinInfo = {
                status: dbEnum<WL_AnswerStatus>(ntfAnswerJoin.status),
                groupInfo: await WeilaDB.getInstance().getGroup(
                  Long.fromValue(ntfAnswerJoin.groupId ?? 0).toString(10),
                ),
                joinUserInfo: await WeilaDB.getInstance().getUser(ntfAnswerJoin.joinId ?? 0),
                answerUserInfo: await WeilaDB.getInstance().getUser(ntfAnswerJoin.answerId ?? 0),
                updated: Long.fromValue(ntfAnswerJoin.updated ?? 0).toNumber(),
              }

              const notification = {
                notificationType: WL_IDbNotificationType.GROUP_ANSWER_JOIN_NOTIFICATION,
                data: answerGroupJoin,
                createTime: new Date().getTime() / 1000,
              }

              const notificationId = await WeilaDB.getInstance().putNotification(notification)

              const savedNotification: WL_IDbNotification = {
                ...notification,
                id: notificationId,
              }

              this.coreInterface.sendExtEvent(
                WL_ExtEventID.WL_EXT_NEW_NOTIFICATION_IND,
                savedNotification,
              )
            })()
          }

          break

        case WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_INVITE:
          {
            const ntfAnswerInvite = serverMessage.groupMessage?.ntfAnswerGroupInvite

            if (!ntfAnswerInvite) break

            void (async () => {
              const answerGroupInvite: WL_GroupAnswerInviteInfo = {
                groupInfo: await WeilaDB.getInstance().getGroup(
                  Long.fromValue(ntfAnswerInvite.groupId ?? 0).toString(10),
                ),
                invitorUserInfo: await WeilaDB.getInstance().getUser(
                  ntfAnswerInvite.inviterId ?? 0,
                ),
                inviteeUserInfo: await WeilaDB.getInstance().getUser(
                  ntfAnswerInvite.inviteeId ?? 0,
                ),
                status: dbEnum<WL_AnswerStatus>(ntfAnswerInvite.status),
                updated: Long.fromValue(ntfAnswerInvite.updated ?? 0).toNumber(),
              }

              const notification = {
                notificationType: WL_IDbNotificationType.GROUP_ANSWER_INVITE_NOTIFICATION,
                data: answerGroupInvite,
                createTime: new Date().getTime() / 1000,
              }

              const notificationId = await WeilaDB.getInstance().putNotification(notification)

              const savedNotification: WL_IDbNotification = {
                ...notification,
                id: notificationId,
              }

              this.coreInterface.sendExtEvent(
                WL_ExtEventID.WL_EXT_NEW_NOTIFICATION_IND,
                savedNotification,
              )
            })()
          }

          break

        case WL.Group.GroupCommandId.GROUP_COMMAND_BROADCAST:
          {
            //TODO: 群通知
          }

          break
      }
    }
  }

  public async getGroupFromServer(groupId: string): Promise<WL_IDbGroup | undefined> {
    const buildMsgRet = WeilaPBGroupWrapper.buildGetGroupInfoReq(Long.fromValue(groupId), 0)

    if (buildMsgRet.resultCode === 0) {
      const rsp: WL.Group.IRspGetGroupInfo = await this.coreInterface.sendPbMsg(buildMsgRet)

      if (!rsp?.groupAttribute) {
        wlerr('获取群信息失败，服务端未返回群属性:', { groupId, rsp })

        return undefined
      }

      const groupInfos = WeilaDB.getInstance().convertFromGroupRaw([rsp.groupAttribute])

      const memberInfos = WeilaDB.getInstance().convertFromMemberRaw(
        groupId,
        rsp.memberInfoList ?? [],
      )

      await WeilaDB.getInstance().putGroup(groupInfos[0])
      await WeilaDB.getInstance().putMemberInfos(memberInfos)

      return WeilaDB.getInstance().getGroup(groupId)
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode)
  }

  @AsyncTime()
  public async initGroups(): Promise<boolean> {
    const getGroupVersionBuild = WeilaPBGroupWrapper.buildGetGroupVersionReq()
    const dbInstance: WeilaDB = WeilaDB.getInstance()

    if (getGroupVersionBuild.resultCode === 0) {
      const groupAttributes: WL.Group.IGroupAttribute[] = []
      const allMemberInfos: WL_IDbMemberInfo[] = []
      const allUserIds: number[] = []
      const allUserInfos: WL_IDbUserInfo[] = []

      const groupVerMsgData: WL.Group.IRspGetGroupVersion = await this.coreInterface.sendPbMsg(
        getGroupVersionBuild,
        30000,
      )

      // 删除无效的群  START
      const versionInfoList = groupVerMsgData.versionInfoList ?? []

      const groupIds = versionInfoList.map((value) => {
        return Long.fromValue(value.groupId ?? 0).toString(10)
      })

      wllog('获取的群ids', groupIds)
      const oldGroups = await WeilaDB.getInstance().getGroups()

      const invalidGroups = oldGroups
        .filter((value) => {
          return groupIds.indexOf(value.groupId) === -1
        })
        .map((value) => {
          return value.groupId
        })

      wllog('无效群ids', invalidGroups)

      if (invalidGroups.length) {
        await WeilaDB.getInstance().delGroups(invalidGroups)
      }
      // END

      for (let i = 0; i < versionInfoList.length; i++) {
        const ver = versionInfoList[i]
        wllog('群版本信息:', ver)

        const dbGroup = await WeilaDB.getInstance().getGroup(
          Long.fromValue(ver.groupId ?? 0).toString(10),
        )

        wllog('获取群信息:', dbGroup)

        if (
          !dbGroup ||
          dbGroup.memberVersion !== ver.memberVersion ||
          dbGroup.version !== ver.groupVersion
        ) {
          const buildGroupInfo = WeilaPBGroupWrapper.buildGetGroupInfoReq(
            Long.fromValue(ver.groupId ?? 0),
            0,
          )

          if (buildGroupInfo.resultCode === 0) {
            const rspGroupInfo: WL.Group.IRspGetGroupInfo = await this.coreInterface.sendPbMsg(
              buildGroupInfo,
              30000,
            )

            wllog('获取得到群：', rspGroupInfo)

            if (!dbGroup || dbGroup.memberVersion !== ver.memberVersion) {
              const groupAttribute = rspGroupInfo.groupAttribute

              if (!groupAttribute) continue

              const groupId = Long.fromValue(groupAttribute.groupId ?? 0).toString(10)
              groupAttributes.push(groupAttribute)
              const memberInfoList = rspGroupInfo.memberInfoList ?? []

              const memberInfos: WL_IDbMemberInfo[] = await dbInstance.convertFromMemberRaw(
                groupId,
                memberInfoList,
              )

              allMemberInfos.push(...memberInfos)

              let userIds: number[] = []

              userIds = memberInfoList
                .filter((value) => {
                  return value.status === 0 && allUserIds.indexOf(value.userId ?? 0) === -1
                })
                .map((value) => {
                  return value.userId ?? 0
                })
              allUserIds.push(...userIds)

              if (userIds.length) {
                const buildGetUser = WeilaPBGroupWrapper.buildGetGroupMemberInfoReq(
                  Long.fromValue(groupId),
                  userIds,
                )

                if (buildGetUser.resultCode === 0) {
                  const userRawInfos: WL.Group.IRspGetMemberUserInfo =
                    await this.coreInterface.sendPbMsg(buildGetUser, 30000)

                  const userInfos = dbInstance.convertFromUserRaw(userRawInfos.userInfoList ?? [])
                  allUserInfos.push(...userInfos)
                } else {
                  wlerr('获取群成员失败', buildGetUser.resultCode)
                }
              }
            }
          } else {
            wlerr('创建获取群信息失败:' + buildGroupInfo.resultCode)
          }
        }
      }

      const groupInfos: WL_IDbGroup[] = dbInstance.convertFromGroupRaw(groupAttributes)
      await dbInstance.putGroups(groupInfos)

      const ind: WL_DataPrepareInd = {
        state: WL_DataPrepareState.PREPARE_PROGRESS_IND,
        msg: 'SDK.SavingMembers',
      }

      this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
      await dbInstance.putMemberInfos(allMemberInfos)
      ind.msg = 'SDK.SavingUsers'
      this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
      await dbInstance.putUserInfos(allUserInfos)

      return true
    }

    return Promise.reject('创建消息失败:' + getGroupVersionBuild.resultCode)
  }

  public async getGroupUserInfosFromServer(groupId: string, userIds: number[]): Promise<boolean> {
    const buildResult = WeilaPBGroupWrapper.buildGetGroupMemberInfoReq(
      Long.fromValue(groupId),
      userIds,
    )

    if (buildResult.resultCode === 0) {
      const rspMemberInfo: WL.Group.IRspGetMemberUserInfo =
        await this.coreInterface.sendPbMsg(buildResult)

      const userInfos = WeilaDB.getInstance().convertFromUserRaw(rspMemberInfo.userInfoList ?? [])
      await WeilaDB.getInstance().putUserInfos(userInfos)

      return true
    }

    return Promise.reject('创建消息失败:' + buildResult.resultCode)
  }

  public async createGroup(
    name: string,
    groupType: number,
    avatar: string,
    publicType: number,
    memberUserIdList: number[],
  ): Promise<WL_IDbGroup | null> {
    if (avatar === '') {
      avatar = default_group_logo
    }

    wllog('创建群组，头像:', avatar)

    const buildResult = WeilaPBGroupWrapper.buildCreateGroupReq(
      name,
      groupType,
      avatar,
      0,
      publicType,
      memberUserIdList,
    )

    if (buildResult.resultCode === 0) {
      const rspCreateGroup: WL.Group.IRspCreateGroup =
        await this.coreInterface.sendPbMsg(buildResult)

      const groupAttribute = rspCreateGroup.groupAttribute

      if (!groupAttribute) {
        return Promise.reject(new Error('GroupAttributeNotExist'))
      }

      const groupId = Long.fromValue(groupAttribute.groupId ?? 0).toString(10)
      const groupInfos = WeilaDB.getInstance().convertFromGroupRaw([groupAttribute])

      const memberInfos = WeilaDB.getInstance().convertFromMemberRaw(
        groupId,
        rspCreateGroup.memberInfoList ?? [],
      )

      wllog('创建群成功消息:', rspCreateGroup)

      await WeilaDB.getInstance().putGroup(groupInfos[0])
      await WeilaDB.getInstance().putMemberInfos(memberInfos)

      return (await WeilaDB.getInstance().getGroup(groupId)) ?? null
    }

    return Promise.reject('创建消息失败:' + buildResult.resultCode)
  }

  public async inviteUser(groupId: string, userIdList: number[]): Promise<boolean> {
    const buildResult = WeilaPBGroupWrapper.buildGroupInviteReq(Long.fromValue(groupId), userIdList)

    if (buildResult.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildResult)

      return true
    }

    return Promise.reject('创建消息失败:' + buildResult.resultCode)
  }

  public async getGroupOnlineMembers(groupId: string): Promise<number[]> {
    const buildResult = WeilaPBGroupWrapper.buildGetGroupOnlineMemberReq(Long.fromValue(groupId))

    if (buildResult.resultCode === 0) {
      const rspOnlineMember: WL.Group.IRspGetGroupOnlineMember =
        await this.coreInterface.sendPbMsg(buildResult)

      return rspOnlineMember.userIdList ?? []
    }

    return Promise.reject('创建消息失败:' + buildResult.resultCode)
  }

  public async answerGroupInvitation(
    groupId: string,
    inviterId: number,
    status: number,
  ): Promise<boolean> {
    const buildMsgRet = WeilaPBGroupWrapper.buildGroupAnswerInviteReq(
      Long.fromValue(groupId),
      inviterId,
      status,
    )

    if (buildMsgRet.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildMsgRet)

      return true
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode)
  }

  public async answerGroupJoin(groupId: string, joinId: number, status: number): Promise<boolean> {
    const buildMsgRet = WeilaPBGroupWrapper.buildGroupAnswerJoinReq(
      Long.fromValue(groupId),
      joinId,
      status,
    )

    if (buildMsgRet.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildMsgRet)

      return true
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode)
  }

  public async getGroupAttribute(groupId: string): Promise<WL_IDbGroup> {
    const buildMsgRet = WeilaPBGroupWrapper.buildGetGroupAttributeReq(Long.fromValue(groupId))

    if (buildMsgRet.resultCode === 0) {
      const rsp: WL.Group.IRspGetGroupAttribute = await this.coreInterface.sendPbMsg(buildMsgRet)

      const groupInfos = WeilaDB.getInstance().convertFromGroupRaw(rsp.groupAttrList ?? [])

      return groupInfos[0]
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode)
  }

  public async deleteGroupMembers(groupId: string, userIds: number[]): Promise<boolean> {
    const buildMsgRet = WeilaPBGroupWrapper.buildDelGroupMemebrReq(Long.fromValue(groupId), userIds)

    if (buildMsgRet.resultCode === 0) {
      const loginUserInfo = this.coreInterface.getLoginUserInfo()
      await this.coreInterface.sendPbMsg(buildMsgRet)
      const index = userIds.indexOf(loginUserInfo.userId)

      if (index !== -1) {
        await WeilaDB.getInstance().delGroups([groupId])
      } else {
        await WeilaDB.getInstance().delMemberInfos(groupId, userIds)
      }

      return true
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode)
  }

  public async dismissGroup(groupId: string): Promise<boolean> {
    wllog('删除群ID:', groupId)
    const buildMsgRet = WeilaPBGroupWrapper.buildDelGroupReq(Long.fromValue(groupId))

    if (buildMsgRet.resultCode === 0) {
      try {
        await this.coreInterface.sendPbMsg(buildMsgRet)
      } finally {
        await WeilaDB.getInstance().delGroups([groupId])
      }

      return true
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode)
  }

  public async changeGroupOwner(groupId: string, ownerUserId: number): Promise<boolean> {
    wllog('更换群主', groupId, ownerUserId)

    const attributes: WLGroupAttributeInfo = {
      groupId: Long.fromValue(groupId),
      ownerId: ownerUserId,
    }

    const buildMsgRet = WeilaPBGroupWrapper.buildChangeGroupAttributeReq(attributes)

    if (buildMsgRet.resultCode === 0) {
      const rsp: WL.Group.IRspChangeGroupAttribute = await this.coreInterface.sendPbMsg(buildMsgRet)

      const groupAttribute = rsp.groupAttribute

      if (groupAttribute?.ownerId && groupAttribute.ownerId === ownerUserId) {
        const groupInfo = await WeilaDB.getInstance().getGroup(groupId)

        if (!groupInfo) {
          return Promise.reject(new Error('GroupNotExist'))
        }

        groupInfo.ownerId = ownerUserId
        await WeilaDB.getInstance().putGroup(groupInfo)

        return true
      } else {
        return Promise.reject(new Error('修改失败'))
      }
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode)
  }

  public async joinGroup(
    groupId: string,
    detail?: string,
    password?: string,
    subUserId?: number,
  ): Promise<boolean> {
    if (subUserId) {
      const groupInfo = await WeilaDB.getInstance().getGroup(groupId)

      if (groupInfo === undefined) {
        return Promise.reject(new Error('GroupNotExist'))
      }
    }

    const buildMsgRet = WeilaPBGroupWrapper.buildGroupJoinReq(
      Long.fromValue(groupId),
      detail,
      password,
      subUserId,
    )

    if (buildMsgRet.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildMsgRet)

      return true
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode)
  }

  public async quitGroup(groupId: string, subUserId?: number): Promise<boolean> {
    wllog('退出群ID', groupId)

    const groupInfo = await WeilaDB.getInstance().getGroup(groupId)

    if (!groupInfo) {
      return Promise.reject(new Error('GroupNotExist'))
    }

    if (
      groupInfo.ownerId === this.coreInterface.getLoginUserInfo().userId &&
      groupInfo.memberCount > 1
    ) {
      return Promise.reject(new Error('Not Allow'))
    }

    let buildMsgRet: any

    if (subUserId) {
      buildMsgRet = WeilaPBGroupWrapper.buildDelGroupMemebrReq(
        Long.fromValue(groupId),
        [subUserId],
        subUserId,
      )
    } else {
      buildMsgRet = WeilaPBGroupWrapper.buildDelGroupMemebrReq(Long.fromValue(groupId), [
        this.coreInterface.getLoginUserInfo().userId,
      ])
    }

    if (buildMsgRet.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildMsgRet)
      await WeilaDB.getInstance().delGroups([groupId])

      return true
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode)
  }

  public async changeMemberType(
    groupId: string,
    memberUserId: number,
    memberType: number,
  ): Promise<boolean> {
    const memberInfo = await WeilaDB.getInstance().getGroupMemberInfo(groupId, memberUserId)

    if (memberInfo) {
      memberInfo.memberType = dbEnum<WL_IDbMemberType>(memberType)
      const id = WeilaDB.getInstance().putMemberInfo(memberInfo)
      wllog('更新好友[%s]信息', id)
    }

    return true
  }

  public async getDeviceSubGroups(subUserId: number): Promise<WL_IDbGroup[]> {
    const buildMsgRet = WeilaPBGroupWrapper.buildGetSubDeviceGroupAttributes(subUserId)

    if (buildMsgRet.resultCode === 0) {
      const rspGetSubGroupAttribute: WL.Group.IRspGetSubGroupAttribute =
        await this.coreInterface.sendPbMsg(buildMsgRet)

      let groupList: WL_IDbGroup[] = []

      if (rspGetSubGroupAttribute.groupAttrList && rspGetSubGroupAttribute.groupAttrList.length) {
        groupList = await WeilaDB.getInstance().convertFromGroupRaw(
          rspGetSubGroupAttribute.groupAttrList,
        )
      }

      return groupList
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode)
  }

  public async addSubDeviceMember(groupId: string, userIds: number[]): Promise<number[]> {
    const buildMsgRet = WeilaPBGroupWrapper.buildAddSubMemberReq(Long.fromValue(groupId), userIds)

    if (buildMsgRet.resultCode === 0) {
      const rsp: WL.Group.IRspAddSubMember = await this.coreInterface.sendPbMsg(buildMsgRet)

      return rsp.failUserIdList ?? []
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode)
  }
}
