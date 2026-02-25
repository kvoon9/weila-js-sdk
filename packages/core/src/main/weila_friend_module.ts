import { WL_CoreInterface } from 'main/weila_internal_data';
import { WL } from 'proto/weilapb';
import { WeilaPbFriendWrapper } from 'proto/weilapb_friend_wrapper';
import Long from 'long';
import { WeilaDB } from 'db/weila_db';
import {
  WL_IDbFriend,
  WL_IDbFriendInfo,
  WL_IDbFriendStatus,
  WL_IDbNotification,
  WL_IDbNotificationType,
  WL_IDbSetting,
  WL_IDbSettingID,
  WL_IDbUserInfo,
} from 'db/weila_db_data';
import { getLogger } from 'log/weila_log';
import { AsyncTime } from 'main/weila_utils';
import {
  WL_AnswerStatus,
  WL_ExtEventID,
  WL_FriendAnswerInviteInfo,
  WL_FriendInviteInfo,
} from 'main/weila_external_data';

const wllog = getLogger('MOD:friend:info');
const wlerr = getLogger('MOD:friend:err');

export default class WLFriendModule {
  constructor(private coreInterface: WL_CoreInterface) {
    this.coreInterface.registerPbMsgHandler(
      WL.Service.ServiceID.SERVICE_FRIEND,
      this.onPbMsgHandler.bind(this),
    );
  }

  private onPbMsgHandler(data: any): void {
    const serverMessage = data as WL.Service.IServiceMessage;
    const serviceHead = serverMessage.serviceHead;
    if (serviceHead.commandType === WL.Service.CommandType.COMMAND_RESPONSE) {
      switch (serviceHead.commandId) {
        case WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIENDINFO:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.friendMessage ? serverMessage.friendMessage.rspGetFriendInfo : null,
            );
          }
          break;

        case WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_FRIEND_USERINFO:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.friendMessage ? serverMessage.friendMessage.rspGetFriendUserInfo : null,
            );
          }
          break;

        case WL.Friend.FriendCommandId.FRIEND_COMMAND_ANSWER_FRIEND_INVITE:
          {
            this.coreInterface.rspPbMsg(serviceHead.seq, serviceHead.resultCode, true);
          }
          break;

        case WL.Friend.FriendCommandId.FRIEND_COMMAND_DELETE_FRIEND:
          {
            this.coreInterface.rspPbMsg(serviceHead.seq, serviceHead.resultCode, true);
          }
          break;

        case WL.Friend.FriendCommandId.FRIEND_COMMAND_FRIEND_INVITE:
          {
            this.coreInterface.rspPbMsg(serviceHead.seq, serviceHead.resultCode, true);
          }
          break;

        case WL.Friend.FriendCommandId.FRIEND_COMMAND_GET_ONLINE_FRIEND:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.friendMessage ? serverMessage.friendMessage.rspGetOnlineFriend : null,
            );
          }
          break;
      }
    } else if (serviceHead.commandType === WL.Service.CommandType.COMMAND_NOTIFY) {
      wllog('好友的通知信息', serverMessage);
      if (serviceHead.commandId === WL.Friend.FriendCommandId.FRIEND_COMMAND_DELETE_FRIEND) {
        const ntfDeleteFriend = serverMessage.friendMessage.ntfDeleteFriend;
        // 数据库删除好友后，发送通知告知客户端
        WeilaDB.getInstance()
          .delFriendInfos([ntfDeleteFriend.userId])
          .then((value) => {
            this.coreInterface.sendExtEvent(
              WL_ExtEventID.WL_EXT_FRIEND_DELETED_IND,
              ntfDeleteFriend.userId,
            );
          })
          .catch((reason) => {
            wlerr('删除好友:%d失败', ntfDeleteFriend.userId, reason);
          });
      } else if (
        serviceHead.commandId === WL.Friend.FriendCommandId.FRIEND_COMMAND_CHANGE_FRIENDINFO
      ) {
        const rspFriendInfo = serverMessage.friendMessage.ntfChangeFriendInfo
          .friendInfo as WL.Friend.IFriendInfo;
        WeilaDB.getInstance()
          .getFriendInfo(serverMessage.friendMessage.ntfChangeFriendInfo.friendInfo.userId)
          .then(async (value) => {
            const friendInfo: WL_IDbFriendInfo = value as WL_IDbFriendInfo;
            if (rspFriendInfo.tts !== undefined) {
              friendInfo.tts = rspFriendInfo.tts === 1;
            }

            if (rspFriendInfo.desc !== undefined) {
              friendInfo.desc = rspFriendInfo.desc;
            }

            if (rspFriendInfo.status !== undefined) {
              friendInfo.status = rspFriendInfo.status;
            }

            if (rspFriendInfo.label !== undefined) {
              friendInfo.label = rspFriendInfo.label;
            }

            if (rspFriendInfo.locationShare !== undefined) {
              friendInfo.locationShared = rspFriendInfo.locationShare === 1;
            }

            if (rspFriendInfo.shieldStatus !== undefined) {
              friendInfo.blockedStatus = rspFriendInfo.shieldStatus === 1;
            }

            if (rspFriendInfo.extension !== undefined) {
              friendInfo.extension = rspFriendInfo.extension;
            }

            if (rspFriendInfo.remark !== undefined) {
              friendInfo.remark = rspFriendInfo.remark;
            }

            await WeilaDB.getInstance().putFriendInfo(friendInfo);
            wllog('变更好友成功');

            // 通知客户端更新了好友信息
            this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_FRIEND_MODIFIED_IND, friendInfo);
          })
          .catch((reason) => {
            wlerr('好友信息变更失败', reason);
          });
      } else if (serviceHead.commandId === WL.Friend.FriendCommandId.FRIEND_COMMAND_FRIEND_INVITE) {
        (async () => {
          const inviteInfo = serverMessage.friendMessage.ntfFriendInvite
            .inviteInfo as WL.Friend.FriendInviteInfo;
          const userInfos = await WeilaDB.getInstance().convertFromUserRaw([
            serverMessage.friendMessage.ntfFriendInvite.userInfo,
          ]);
          const inviteNotifyData = {} as WL_FriendInviteInfo;
          await WeilaDB.getInstance().putUserInfo(userInfos[0]);
          inviteNotifyData.inviterUserInfo = await WeilaDB.getInstance().getUser(
            userInfos[0].userId,
          );
          inviteNotifyData.inviteDetail = inviteInfo.detail;
          inviteNotifyData.status = WL_AnswerStatus.ANSWER_NORMAL;
          inviteNotifyData.createdTime = Long.fromValue(inviteInfo.created).toNumber();

          const notification: WL_IDbNotification = {} as WL_IDbNotification;
          notification.notificationType = WL_IDbNotificationType.FRIEND_INVITE_NOTIFICATION;
          notification.data = inviteNotifyData;
          notification.createTime = new Date().getTime();
          notification.id = await WeilaDB.getInstance().putNotification(notification);
          this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_NOTIFICATION_IND, notification);
        })();
      } else if (
        serviceHead.commandId === WL.Friend.FriendCommandId.FRIEND_COMMAND_ANSWER_FRIEND_INVITE
      ) {
        (async () => {
          const ntfFriendAnswerInvite = serverMessage.friendMessage.ntfAnswerFriendInvite;
          const friendAnswerInfo = {} as WL_FriendAnswerInviteInfo;
          friendAnswerInfo.status = ntfFriendAnswerInvite.status;
          friendAnswerInfo.inviteeUserInfo = await WeilaDB.getInstance().getUser(
            ntfFriendAnswerInvite.inviteeId,
          );

          const notification: WL_IDbNotification = {} as WL_IDbNotification;
          notification.notificationType = WL_IDbNotificationType.FRIEND_ANSWER_NOTIFICATION;
          notification.data = friendAnswerInfo;
          notification.createTime = new Date().getTime();
          notification.id = await WeilaDB.getInstance().putNotification(notification);
          this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_NOTIFICATION_IND, notification);
        })();
      } else if (serviceHead.commandId === WL.Friend.FriendCommandId.FRIEND_COMMAND_NEW_FRIEND) {
        const friendInfo = {} as WL_IDbFriendInfo;
        const ntfNewFriend = serverMessage.friendMessage.ntfNewFriend;
        friendInfo.userId = ntfNewFriend.friendInfo.userId;
        friendInfo.tts = ntfNewFriend.friendInfo.tts === 1;
        friendInfo.status = ntfNewFriend.friendInfo.status;
        friendInfo.desc = ntfNewFriend.friendInfo.desc;
        friendInfo.label = ntfNewFriend.friendInfo.label;
        friendInfo.blockedStatus = ntfNewFriend.friendInfo.shieldStatus === 1;
        friendInfo.locationShared = ntfNewFriend.friendInfo.locationShare === 1;
        friendInfo.remark = ntfNewFriend.friendInfo.remark;

        (async () => {
          await WeilaDB.getInstance().putFriendInfo(friendInfo);
          const userInfos = WeilaDB.getInstance().convertFromUserRaw([ntfNewFriend.userInfo]);
          if (userInfos.length) {
            await WeilaDB.getInstance().putUserInfo(userInfos[0]);
          }

          const friend = await WeilaDB.getInstance().getFriend(friendInfo.userId);
          this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_FRIEND_NEW_IND, friend);
        })().catch((reason) => {
          wlerr('保存好友信息出错:', reason);
        });
      }
    }
  }

  @AsyncTime()
  public async initFriends(): Promise<boolean> {
    const dbInstance: WeilaDB = WeilaDB.getInstance();
    let result = false;
    let friendSetting: WL_IDbSetting | undefined = await dbInstance.getSettingItem(
      WL_IDbSettingID.SETTING_FRIEND_LATEST_UPDATE,
    );
    let lastUpdateTime = 0;
    if (friendSetting) {
      lastUpdateTime = friendSetting.data as number;
    } else {
      friendSetting = {} as WL_IDbSetting;
      friendSetting.id = WL_IDbSettingID.SETTING_FRIEND_LATEST_UPDATE;
    }

    const buildResult = WeilaPbFriendWrapper.buildGetFriendInfoReq(Long.fromValue(lastUpdateTime));
    wllog('最近更新时间:', lastUpdateTime);
    if (buildResult.resultCode === 0) {
      const rspGetFriendInfo = (await this.coreInterface.sendPbMsg(
        buildResult,
        30000,
      )) as WL.Friend.IRspGetFriendInfo;

      const deleteFriendIdList = rspGetFriendInfo.friendInfos
        .filter((value) => {
          return value.status === WL_IDbFriendStatus.FRIEND_DELETED_STATUS;
        })
        .map((value) => {
          return value.userId;
        });

      const normalFriendList = rspGetFriendInfo.friendInfos.filter((value) => {
        return value.status === WL_IDbFriendStatus.FRIEND_NORMAL_STATUS;
      });

      const friendUserIdList = normalFriendList.map((value) => {
        return value.userId;
      });

      wllog('获取的好友用户id', friendUserIdList);
      // 删除无效的好友 START
      if (deleteFriendIdList.length) {
        await WeilaDB.getInstance().delFriendInfos(deleteFriendIdList);
      }
      // END

      if (normalFriendList.length) {
        const friendInfos: WL_IDbFriendInfo[] = dbInstance.convertFromFriendRaw(normalFriendList);
        wllog('转换后的好友信息:', friendInfos);
        result = await dbInstance.putFriendInfos(friendInfos);
        wllog('保存好友结果:', result);
        const userInfos = dbInstance.convertFromUserRaw(rspGetFriendInfo.userInfos);
        await dbInstance.putUserInfos(userInfos);
      }

      friendSetting.data = new Date().getUTCSeconds() / 1000;
      wllog('下一次更新时间:', friendSetting.data);
      await dbInstance.putSettingItem(friendSetting);

      return true;
    }

    return Promise.reject('获取好友信息出错:' + buildResult.resultCode);
  }

  public async getFriendUserInfos(userIds: number[]): Promise<boolean> {
    const buildResult = WeilaPbFriendWrapper.buildGetFriendUserInfoReq(userIds);
    if (buildResult.resultCode === 0) {
      const rspGetFriendUser = (await this.coreInterface.sendPbMsg(
        buildResult,
      )) as WL.Friend.IRspGetFriendUserInfo;
      const userInfoRaws = WeilaDB.getInstance().convertFromUserRaw(rspGetFriendUser.userInfos);
      return WeilaDB.getInstance().putUserInfos(userInfoRaws);
    }

    return Promise.reject('创建信息出错:' + buildResult.resultCode);
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
    );
    if (buildMsgRet.resultCode === 0) {
      return this.coreInterface.sendPbMsg(buildMsgRet);
    }

    return Promise.reject('创建信息出错:' + buildMsgRet.resultCode);
  }

  public async deleteFriends(userIds: number[], subUserId?: number): Promise<boolean> {
    const deleteUserIds = [] as number[];
    for (const userId of userIds) {
      const buildMsgRet = WeilaPbFriendWrapper.buildDeleteFriendReq(userId, subUserId);
      if (buildMsgRet.resultCode === 0) {
        await this.coreInterface.sendPbMsg(buildMsgRet);
        deleteUserIds.push(userId);
      }
    }

    if (subUserId === undefined) {
      await WeilaDB.getInstance().delFriendInfos(deleteUserIds);
    }
    return true;
  }

  public async getOnlineFriends(): Promise<WL_IDbFriend[]> {
    const buildMsgRet = WeilaPbFriendWrapper.buildGetOnlineFriendsReq();
    if (buildMsgRet.resultCode === 0) {
      const rspGetOnlineFriend = (await this.coreInterface.sendPbMsg(
        buildMsgRet,
      )) as WL.Friend.RspGetOnlineFriend;
      return WeilaDB.getInstance().getFriends(rspGetOnlineFriend.userIds);
    }

    return Promise.reject('创建获取在线好友信息出错:' + buildMsgRet.resultCode);
  }

  public async inviteFriend(inviteeId: number, detail: string, remark: string): Promise<boolean> {
    const buildMsgRet = WeilaPbFriendWrapper.buildFriendInviteReq(inviteeId, detail, remark);
    if (buildMsgRet.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildMsgRet);
      return true;
    }

    return Promise.reject('创建邀请好友信息出错:' + buildMsgRet.resultCode);
  }

  public async inviteFriendsForDevice(
    inviteeIds: number[],
    subUserId: number,
    detail: string,
  ): Promise<boolean> {
    for (let inviteeId of inviteeIds) {
      const buildMsgRet = WeilaPbFriendWrapper.buildFriendInviteReq(
        inviteeId,
        detail,
        undefined,
        subUserId,
      );
      if (buildMsgRet.resultCode === 0) {
        await this.coreInterface.sendPbMsg(buildMsgRet);
      }
    }

    return true;
  }

  public async getDeviceSubFriends(subUserId: number): Promise<WL_IDbFriend[]> {
    const buildMsgRet = WeilaPbFriendWrapper.buildGetSubFriendInfoReq(subUserId);

    if (buildMsgRet.resultCode === 0) {
      const friends: WL_IDbFriend[] = [];
      const rsp: WL.Friend.IRspGetFriendInfo = await this.coreInterface.sendPbMsg(buildMsgRet);
      wllog('getDeviceSubFriends', rsp);
      if (rsp.friendInfos) {
        const friendInfos: WL_IDbFriendInfo[] = await WeilaDB.getInstance().convertFromFriendRaw(
          rsp.friendInfos,
        );
        const userInfos: WL_IDbUserInfo[] = await WeilaDB.getInstance().convertFromUserRaw(
          rsp.userInfos,
        );

        const userIds = userInfos.map((value) => {
          return value.userId;
        });

        for (let friendInfo of friendInfos) {
          const friend: WL_IDbFriend = {} as WL_IDbFriend;
          friend.friendInfo = friendInfo;
          const index = userIds.indexOf(friendInfo.userId);
          if (index !== -1) {
            friend.userInfo = userInfos[index];
          } else {
            friend.userInfo = null;
          }

          friends.push(friend);
        }

        return friends.filter((value) => {
          return value.friendInfo.status === WL_IDbFriendStatus.FRIEND_NORMAL_STATUS;
        });
      }
    }

    return Promise.reject('创建获取设备好友信息出错:' + buildMsgRet.resultCode);
  }
}
