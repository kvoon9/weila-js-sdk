import { WL_CoreInterface } from 'main/weila_internal_data'
import { WL } from 'proto/weilapb'
import { WeilaPbFriendWrapper } from 'proto/weilapb_friend_wrapper'
import Long from 'long'
import { WeilaDB } from 'db/weila_db'
import {
  WL_IDbFriend,
  WL_IDbFriendInfo,
  WL_IDbFriendStatus,
  WL_IDbNotification,
  WL_IDbNotificationType,
  WL_IDbSetting,
  WL_IDbSettingID,
  WL_IDbUserInfo,
} from 'db/weila_db_data'
import { dbEnum } from 'db/db_enum'
import { getLogger } from 'log/weila_log'
import { AsyncTime } from 'main/weila_utils'
import {
  WL_AnswerStatus,
  WL_ExtEventID,
  WL_FriendAnswerInviteInfo,
  WL_FriendInviteInfo,
} from 'main/weila_external_data'

const wllog = getLogger('MOD:friend:info')
const wlerr = getLogger('MOD:friend:err')

export default class WLFriendModule {
  constructor(private coreInterface: WL_CoreInterface) {
    this.coreInterface.registerPbMsgHandler(
      WL.Service.ServiceID.SERVICE_FRIEND,
      this.onPbMsgHandler.bind(this),
    )
  }

  private onPbMsgHandler(data: any): void {
    const serverMessage: WL.Service.IServiceMessage = data
    const serviceHead = serverMessage.serviceHead

    if (!serviceHead) return

    if (serviceHead.commandType === WL.Service.CommandType.COMMAND_RESPONSE) {
      switch (serviceHead.commandId) {
        case WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIENDINFO:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serverMessage.friendMessage ? serverMessage.friendMessage.rspGetFriendInfo : null,
            )
          }

          break

        case WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIEND_USERINFO:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serverMessage.friendMessage ? serverMessage.friendMessage.rspGetFriendUserInfo : null,
            )
          }

          break

        case WL.Friend.FriendCommandId.FRIEND_COMMAND_ANSWER_FRIEND_INVITE:
          {
            this.coreInterface.rspPbMsg(serviceHead.seq ?? 0, serviceHead.resultCode ?? 0, true)
          }

          break

        case WL.Friend.FriendCommandId.FRIEND_COMMAND_DELETE_FRIEND:
          {
            this.coreInterface.rspPbMsg(serviceHead.seq ?? 0, serviceHead.resultCode ?? 0, true)
          }

          break

        case WL.Friend.FriendCommandId.FRIEND_COMMAND_FRIEND_INVITE:
          {
            this.coreInterface.rspPbMsg(serviceHead.seq ?? 0, serviceHead.resultCode ?? 0, true)
          }

          break

        case WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_ONLINE_FRIEND:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq ?? 0,
              serviceHead.resultCode ?? 0,
              serverMessage.friendMessage ? serverMessage.friendMessage.rspGetOnlineFriend : null,
            )
          }

          break
      }
    } else if (serviceHead.commandType === WL.Service.CommandType.COMMAND_NOTIFY) {
      wllog('好友的通知信息', serverMessage)
      const friendMessage = serverMessage.friendMessage

      if (!friendMessage) return

      if (serviceHead.commandId === WL.Friend.FriendCommandId.FRIEND_COMMAND_DELETE_FRIEND) {
        const ntfDeleteFriend = friendMessage.ntfDeleteFriend

        if (!ntfDeleteFriend) return

        const userId = ntfDeleteFriend.userId ?? 0
        // 数据库删除好友后，发送通知告知客户端
        WeilaDB.getInstance()
          .delFriendInfos([userId])
          .then(() => {
            this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_FRIEND_DELETED_IND, userId)
          })
          .catch((reason) => {
            wlerr('删除好友:%d失败', userId, reason)
          })
      } else if (
        serviceHead.commandId === WL.Friend.FriendCommandId.FRIEND_COMMAND_CHANGE_FRIENDINFO
      ) {
        const ntfChangeFriendInfo = friendMessage.ntfChangeFriendInfo

        if (!ntfChangeFriendInfo) return

        const changeFriendInfo = ntfChangeFriendInfo.friendInfo

        if (!changeFriendInfo) return

        const rspFriendInfo = changeFriendInfo
        WeilaDB.getInstance()
          .getFriendInfo(changeFriendInfo.userId ?? 0)
          .then(async (value) => {
            const friendInfo: WL_IDbFriendInfo = value!

            if (rspFriendInfo.tts !== undefined) {
              friendInfo.tts = rspFriendInfo.tts === 1
            }

            if (rspFriendInfo.desc !== undefined) {
              friendInfo.desc = rspFriendInfo.desc ?? ''
            }

            if (rspFriendInfo.status !== undefined) {
              friendInfo.status = dbEnum<WL_IDbFriendStatus>(rspFriendInfo.status)
            }

            if (rspFriendInfo.label !== undefined) {
              friendInfo.label = rspFriendInfo.label ?? ''
            }

            if (rspFriendInfo.locationShare !== undefined) {
              friendInfo.locationShared = rspFriendInfo.locationShare === 1
            }

            if (rspFriendInfo.shieldStatus !== undefined) {
              friendInfo.blockedStatus = rspFriendInfo.shieldStatus === 1
            }

            if (rspFriendInfo.extension !== undefined) {
              friendInfo.extension = rspFriendInfo.extension ?? ''
            }

            if (rspFriendInfo.remark !== undefined) {
              friendInfo.remark = rspFriendInfo.remark ?? ''
            }

            await WeilaDB.getInstance().putFriendInfo(friendInfo)
            wllog('变更好友成功')

            // 通知客户端更新了好友信息
            this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_FRIEND_MODIFIED_IND, friendInfo)
          })
          .catch((reason) => {
            wlerr('好友信息变更失败', reason)
          })
      } else if (serviceHead.commandId === WL.Friend.FriendCommandId.FRIEND_COMMAND_FRIEND_INVITE) {
        void (async () => {
          const ntfFriendInvite = friendMessage.ntfFriendInvite

          if (!ntfFriendInvite) return

          const inviteeUserInfo = ntfFriendInvite.userInfo

          if (!inviteeUserInfo) return

          const inviteInfo = ntfFriendInvite.inviteInfo!
          const userInfos = await WeilaDB.getInstance().convertFromUserRaw([inviteeUserInfo])
          await WeilaDB.getInstance().putUserInfo(userInfos[0])

          const inviteNotifyData: WL_FriendInviteInfo = {
            inviterUserInfo: await WeilaDB.getInstance().getUser(userInfos[0].userId),
            inviteDetail: inviteInfo.detail ?? '',
            status: WL_AnswerStatus.ANSWER_NORMAL,
            createdTime: Long.fromValue(inviteInfo.created!).toNumber(),
          }

          const notificationData: Omit<WL_IDbNotification, 'id'> = {
            notificationType: WL_IDbNotificationType.FRIEND_INVITE_NOTIFICATION,
            data: inviteNotifyData,
            createTime: new Date().getTime(),
          }

          const notification: WL_IDbNotification = {
            ...notificationData,
            id: await WeilaDB.getInstance().putNotification(notificationData),
          }

          this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_NOTIFICATION_IND, notification)
        })()
      } else if (
        serviceHead.commandId === WL.Friend.FriendCommandId.FRIEND_COMMAND_ANSWER_FRIEND_INVITE
      ) {
        void (async () => {
          const ntfFriendAnswerInvite = friendMessage.ntfAnswerFriendInvite

          if (!ntfFriendAnswerInvite) return

          const friendAnswerInfo: WL_FriendAnswerInviteInfo = {
            status: dbEnum<WL_AnswerStatus>(ntfFriendAnswerInvite.status),
            inviteeUserInfo: await WeilaDB.getInstance().getUser(
              ntfFriendAnswerInvite.inviteeId ?? 0,
            ),
          }

          const notificationData: Omit<WL_IDbNotification, 'id'> = {
            notificationType: WL_IDbNotificationType.FRIEND_ANSWER_NOTIFICATION,
            data: friendAnswerInfo,
            createTime: new Date().getTime(),
          }

          const notification: WL_IDbNotification = {
            ...notificationData,
            id: await WeilaDB.getInstance().putNotification(notificationData),
          }

          this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_NOTIFICATION_IND, notification)
        })()
      } else if (serviceHead.commandId === WL.Friend.FriendCommandId.FRIEND_COMMAND_NEW_FRIEND) {
        const ntfNewFriend = friendMessage.ntfNewFriend

        if (!ntfNewFriend) return

        const newFriendInfo = ntfNewFriend.friendInfo

        if (!newFriendInfo) return

        const friendInfo: WL_IDbFriendInfo = {
          userId: newFriendInfo.userId ?? 0,
          tts: newFriendInfo.tts === 1,
          status: dbEnum<WL_IDbFriendStatus>(newFriendInfo.status),
          desc: newFriendInfo.desc ?? '',
          label: newFriendInfo.label ?? '',
          blockedStatus: newFriendInfo.shieldStatus === 1,
          locationShared: newFriendInfo.locationShare === 1,
          remark: newFriendInfo.remark ?? '',
        }

        ;(async () => {
          await WeilaDB.getInstance().putFriendInfo(friendInfo)
          const newFriendUserInfo = ntfNewFriend.userInfo

          if (!newFriendUserInfo) return

          const userInfos = WeilaDB.getInstance().convertFromUserRaw([newFriendUserInfo])

          if (userInfos.length) {
            await WeilaDB.getInstance().putUserInfo(userInfos[0])
          }

          const friend = await WeilaDB.getInstance().getFriend(friendInfo.userId)
          this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_FRIEND_NEW_IND, friend)
        })().catch((reason) => {
          wlerr('保存好友信息出错:', reason)
        })
      }
    }
  }

  @AsyncTime()
  public async initFriends(): Promise<boolean> {
    const dbInstance: WeilaDB = WeilaDB.getInstance()
    let result = false

    let friendSetting: WL_IDbSetting | undefined = await dbInstance.getSettingItem(
      WL_IDbSettingID.SETTING_FRIEND_LATEST_UPDATE,
    )

    let lastUpdateTime = 0

    if (friendSetting) {
      lastUpdateTime = friendSetting.data
    } else {
      friendSetting = { id: WL_IDbSettingID.SETTING_FRIEND_LATEST_UPDATE, data: undefined }
    }

    const buildResult = WeilaPbFriendWrapper.buildGetFriendInfoReq(Long.fromValue(lastUpdateTime))
    wllog('最近更新时间:', lastUpdateTime)

    if (buildResult.resultCode === 0) {
      const rspGetFriendInfo: WL.Friend.IRspGetFriendInfo = await this.coreInterface.sendPbMsg(
        buildResult,
        30000,
      )

      const friendRaws = rspGetFriendInfo.friendInfos ?? []

      const deleteFriendIdList = friendRaws
        .filter((value) => {
          return value.status === WL_IDbFriendStatus.FRIEND_DELETED_STATUS
        })
        .map((value) => {
          return value.userId ?? 0
        })

      const normalFriendList = friendRaws.filter((value) => {
        return value.status === WL_IDbFriendStatus.FRIEND_NORMAL_STATUS
      })

      const friendUserIdList = normalFriendList.map((value) => {
        return value.userId
      })

      wllog('获取的好友用户id', friendUserIdList)

      // 删除无效的好友 START
      if (deleteFriendIdList.length) {
        await WeilaDB.getInstance().delFriendInfos(deleteFriendIdList)
      }
      // END

      if (normalFriendList.length) {
        const friendInfos: WL_IDbFriendInfo[] = dbInstance.convertFromFriendRaw(normalFriendList)
        wllog('转换后的好友信息:', friendInfos)
        result = await dbInstance.putFriendInfos(friendInfos)
        wllog('保存好友结果:', result)
        const userInfos = dbInstance.convertFromUserRaw(rspGetFriendInfo.userInfos ?? [])
        await dbInstance.putUserInfos(userInfos)
      }

      friendSetting.data = new Date().getUTCSeconds() / 1000
      wllog('下一次更新时间:', friendSetting.data)
      await dbInstance.putSettingItem(friendSetting)

      return true
    }

    return Promise.reject('获取好友信息出错:' + buildResult.resultCode)
  }

  public async getFriendUserInfos(userIds: number[]): Promise<boolean> {
    const buildResult = WeilaPbFriendWrapper.buildGetFriendUserInfoReq(userIds)

    if (buildResult.resultCode === 0) {
      const rspGetFriendUser: WL.Friend.IRspGetFriendUserInfo =
        await this.coreInterface.sendPbMsg(buildResult)

      const userInfoRaws = WeilaDB.getInstance().convertFromUserRaw(
        rspGetFriendUser.userInfos ?? [],
      )

      return WeilaDB.getInstance().putUserInfos(userInfoRaws)
    }

    return Promise.reject('创建信息出错:' + buildResult.resultCode)
  }

  public async answerFriendInvite(
    inviterUserId: number,
    answerStatus: number,
    info: string,
  ): Promise<boolean> {
    const buildMsgRet = WeilaPbFriendWrapper.buildAnswerFriendInviteReq(
      inviterUserId,
      answerStatus,
      info,
    )

    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet)
    }

    return Promise.reject('创建信息出错:' + buildMsgRet.resultCode)
  }

  public async deleteFriends(userIds: number[], subUserId?: number): Promise<boolean> {
    const deleteUserIds: number[] = []
    const sendPromises: Promise<any>[] = []

    for (const userId of userIds) {
      const buildMsgRet = WeilaPbFriendWrapper.buildDeleteFriendReq(userId, subUserId)

      if (buildMsgRet.resultCode === 0) {
        deleteUserIds.push(userId)
        sendPromises.push(this.coreInterface.sendPbMsg(buildMsgRet))
      }
    }

    await Promise.all(sendPromises)

    if (subUserId === undefined) {
      await WeilaDB.getInstance().delFriendInfos(deleteUserIds)
    }

    return true
  }

  public async getOnlineFriends(): Promise<WL_IDbFriend[]> {
    const buildMsgRet = WeilaPbFriendWrapper.buildGetOnlineFriendsReq()

    if (buildMsgRet.resultCode === 0) {
      const rspGetOnlineFriend: WL.Friend.RspGetOnlineFriend =
        await this.coreInterface.sendPbMsg(buildMsgRet)

      return WeilaDB.getInstance().getFriends(rspGetOnlineFriend.userIds)
    }

    return Promise.reject('创建获取在线好友信息出错:' + buildMsgRet.resultCode)
  }

  public async inviteFriend(inviteeId: number, detail: string, remark: string): Promise<boolean> {
    const buildMsgRet = WeilaPbFriendWrapper.buildFriendInviteReq(inviteeId, detail, remark)

    if (buildMsgRet.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildMsgRet)

      return true
    }

    return Promise.reject('创建邀请好友信息出错:' + buildMsgRet.resultCode)
  }

  public async inviteFriendsForDevice(
    inviteeIds: number[],
    subUserId: number,
    detail: string,
  ): Promise<boolean> {
    const sendPromises: Promise<any>[] = []

    for (let inviteeId of inviteeIds) {
      const buildMsgRet = WeilaPbFriendWrapper.buildFriendInviteReq(
        inviteeId,
        detail,
        undefined,
        subUserId,
      )

      if (buildMsgRet.resultCode === 0) {
        sendPromises.push(this.coreInterface.sendPbMsg(buildMsgRet))
      }
    }

    await Promise.all(sendPromises)

    return true
  }

  public async getDeviceSubFriends(subUserId: number): Promise<WL_IDbFriend[]> {
    const buildMsgRet = WeilaPbFriendWrapper.buildGetSubFriendInfoReq(subUserId)

    if (buildMsgRet.resultCode === 0) {
      const friends: WL_IDbFriend[] = []
      const rsp: WL.Friend.IRspGetFriendInfo = await this.coreInterface.sendPbMsg(buildMsgRet)
      wllog('getDeviceSubFriends', rsp)

      if (rsp.friendInfos) {
        const friendInfos: WL_IDbFriendInfo[] = await WeilaDB.getInstance().convertFromFriendRaw(
          rsp.friendInfos,
        )

        const userInfos: WL_IDbUserInfo[] = await WeilaDB.getInstance().convertFromUserRaw(
          rsp.userInfos ?? [],
        )

        const userIds = userInfos.map((value) => {
          return value.userId
        })

        for (let friendInfo of friendInfos) {
          const friend: WL_IDbFriend = { friendInfo, userInfo: null }
          const index = userIds.indexOf(friendInfo.userId)

          if (index !== -1) {
            friend.userInfo = userInfos[index]
          }

          friends.push(friend)
        }

        return friends.filter((value) => {
          return value.friendInfo.status === WL_IDbFriendStatus.FRIEND_NORMAL_STATUS
        })
      }
    }

    return Promise.reject('创建获取设备好友信息出错:' + buildMsgRet.resultCode)
  }
}
