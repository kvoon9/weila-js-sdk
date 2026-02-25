import { default_group_logo, WL_CoreInterface } from 'main/weila_internal_data';
import { WeilaPBGroupWrapper } from 'proto/weilapb_group_wrapper';
import { WL } from 'proto/weilapb';
import { WeilaDB } from 'db/weila_db';
import Long from 'long';
import {
  WL_IDbGroup,
  WL_IDbMemberInfo,
  WL_IDbNotification,
  WL_IDbNotificationType,
  WL_IDbUserInfo,
} from 'db/weila_db_data';

import { getLogger } from 'log/weila_log';
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
} from 'main/weila_external_data';
import { AsyncTime } from 'main/weila_utils';
import { WLGroupAttributeInfo } from 'proto/weilapb_wrapper_data';
import { BuildWeilaMsg } from 'proto/weilapb_wrapper';

const wllog = getLogger('MOD:group:info');
const wlerr = getLogger('MOD:group:err');

export default class WLGroupModule {
  constructor(private coreInterface: WL_CoreInterface) {
    this.coreInterface.registerPbMsgHandler(
      WL.Service.ServiceID.SERVICE_GROUP,
      this.onPbMsgHandler.bind(this),
    );
  }

  private onPbMsgHandler(data: any): void {
    const serverMessage = data as WL.Service.IServiceMessage;
    const serviceHead = serverMessage.serviceHead;
    if (serviceHead.commandType === WL.Service.CommandType.COMMAND_RESPONSE) {
      switch (serviceHead.commandId) {
        case WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPVERSION:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.groupMessage.rspGetGroupVersion,
            );
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPATTRIBUTE:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.groupMessage.rspGetGroupAttribute,
            );
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_GET_GROUPINFO:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.groupMessage.rspGetGroupInfo,
            );
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_GET_MEMBER_USERINFO:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.groupMessage.rspGetMemberUserInfo,
            );
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_BROADCAST:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.groupMessage.rspGroupBroadcast,
            );
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_GROUP:
          {
            this.coreInterface.rspPbMsg(serviceHead.seq, serviceHead.resultCode, true);
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_INVITE:
          {
            this.coreInterface.rspPbMsg(serviceHead.seq, serviceHead.resultCode, true);
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_MEMBER:
          {
            this.coreInterface.rspPbMsg(serviceHead.seq, serviceHead.resultCode, true);
          }
          break;
        case WL.Group.GroupCommandId.GROUP_COMMAND_GET_ONLINE_MEMBER:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.groupMessage.rspGetGroupOnlineMember,
            );
          }
          break;
        case WL.Group.GroupCommandId.GROUP_COMMAND_CREATE_GROUP:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.groupMessage.rspCreateGroup,
            );
          }
          break;
        case WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_JOIN:
          {
            this.coreInterface.rspPbMsg(serviceHead.seq, serviceHead.resultCode, true);
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_GROUPATTRIBUTE:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.groupMessage.rspChangeGroupAttribute,
            );
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_GET_SUB_GROUPATTRIBUTE:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.groupMessage.rspGetSubGroupAttribute,
            );
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_INVITE:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.groupMessage ? serverMessage.groupMessage.rspGroupInvite : null,
            );
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_ADD_SUB_MEMBER:
          {
            this.coreInterface.rspPbMsg(
              serviceHead.seq,
              serviceHead.resultCode,
              serverMessage.groupMessage ? serverMessage.groupMessage.rspAddSubMember : null,
            );
          }
          break;
      }
    } else if (serviceHead.commandType === WL.Service.CommandType.COMMAND_NOTIFY) {
      wllog('WLGroupModule', serverMessage);
      switch (serviceHead.commandId) {
        case WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_INVITE:
          {
            const ntfGroupInvite = serverMessage.groupMessage.ntfGroupInvite;
            const groupInviteInfo = {} as WL_GroupInviteInfo;
            (async () => {
              const groupId = Long.fromValue(ntfGroupInvite.groupId).toString(10);
              groupInviteInfo.groupInfo = await this.getGroupAttribute(groupId);
              const userInfos = WeilaDB.getInstance().convertFromUserRaw([ntfGroupInvite.userInfo]);
              await WeilaDB.getInstance().putUserInfo(userInfos[0]);
              groupInviteInfo.invitorUserInfo = userInfos[0];
              groupInviteInfo.status = WL_AnswerStatus.ANSWER_NORMAL;

              const notification: WL_IDbNotification = {} as WL_IDbNotification;
              notification.notificationType = WL_IDbNotificationType.GROUP_INVITE_NOTIFICATION;
              notification.data = groupInviteInfo;
              notification.createTime = new Date().getTime() / 1000;
              notification.id = await WeilaDB.getInstance().putNotification(notification);

              this.coreInterface.sendExtEvent(
                WL_ExtEventID.WL_EXT_NEW_NOTIFICATION_IND,
                notification,
              );
            })();
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_GROUP_JOIN:
          {
            const ntfGroupJoin = serverMessage.groupMessage.ntfGroupJoin;
            (async () => {
              const groupJoinInfo = {} as WL_GroupJoinInfo;
              groupJoinInfo.detail = ntfGroupJoin.detail;
              groupJoinInfo.status = WL_AnswerStatus.ANSWER_NORMAL;
              const userInfos = WeilaDB.getInstance().convertFromUserRaw([ntfGroupJoin.userInfo]);
              await WeilaDB.getInstance().putUserInfo(userInfos[0]);
              groupJoinInfo.joinUserInfo = userInfos[0];
              groupJoinInfo.groupInfo = await WeilaDB.getInstance().getGroup(
                ntfGroupJoin.groupId.toString(10),
              );

              const notification: WL_IDbNotification = {} as WL_IDbNotification;
              notification.notificationType = WL_IDbNotificationType.GROUP_JOIN_NOTIFICATION;
              notification.data = groupJoinInfo;
              notification.createTime = new Date().getTime() / 1000;
              notification.id = await WeilaDB.getInstance().putNotification(notification);
              this.coreInterface.sendExtEvent(
                WL_ExtEventID.WL_EXT_NEW_NOTIFICATION_IND,
                notification,
              );
            })();
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_GROUPATTRIBUTE:
          {
            const ntfChangeGroupAttr =
              serverMessage.groupMessage.ntfChangeGroupAttribute.groupAttribute;
            const groupId = Long.fromValue(ntfChangeGroupAttr.groupId).toString(10);
            WeilaDB.getInstance()
              .getGroup(groupId)
              .then(async (value) => {
                const groupInfo = value as WL_IDbGroup;
                if (ntfChangeGroupAttr.version !== undefined) {
                  groupInfo.version = ntfChangeGroupAttr.version;
                }
                if (ntfChangeGroupAttr.memberVersion !== undefined) {
                  groupInfo.memberVersion = ntfChangeGroupAttr.memberVersion;
                }
                if (ntfChangeGroupAttr.name !== undefined) {
                  groupInfo.name = ntfChangeGroupAttr.name;
                }
                if (ntfChangeGroupAttr.avatar !== undefined) {
                  groupInfo.avatar = ntfChangeGroupAttr.avatar;
                }
                if (ntfChangeGroupAttr.ownerId !== undefined) {
                  groupInfo.ownerId = ntfChangeGroupAttr.ownerId;
                }
                if (ntfChangeGroupAttr.type !== undefined) {
                  groupInfo.groupType = ntfChangeGroupAttr.type;
                }
                if (ntfChangeGroupAttr.desc !== undefined) {
                  groupInfo.desc = ntfChangeGroupAttr.desc;
                }
                if (ntfChangeGroupAttr.home !== undefined) {
                  groupInfo.home = ntfChangeGroupAttr.home;
                }
                if (ntfChangeGroupAttr.latitude !== undefined) {
                  groupInfo.latitude = ntfChangeGroupAttr.latitude;
                }
                if (ntfChangeGroupAttr.longitude !== undefined) {
                  groupInfo.longitude = ntfChangeGroupAttr.longitude;
                }
                if (ntfChangeGroupAttr.publicType !== undefined) {
                  groupInfo.publicType = ntfChangeGroupAttr.publicType;
                }
                if (ntfChangeGroupAttr.authType !== undefined) {
                  groupInfo.authType = ntfChangeGroupAttr.authType;
                }
                if (ntfChangeGroupAttr.class !== undefined) {
                  groupInfo.groupClass = ntfChangeGroupAttr.class;
                }
                if (ntfChangeGroupAttr.memberLimit !== undefined) {
                  groupInfo.memberLimit = ntfChangeGroupAttr.memberLimit;
                }
                if (ntfChangeGroupAttr.memberCount !== undefined) {
                  groupInfo.memberCount = ntfChangeGroupAttr.memberCount;
                }
                if (ntfChangeGroupAttr.audioQuality !== undefined) {
                  groupInfo.audioQuality = ntfChangeGroupAttr.audioQuality;
                }
                if (ntfChangeGroupAttr.burstType !== undefined) {
                  groupInfo.burstType = ntfChangeGroupAttr.burstType;
                }
                if (ntfChangeGroupAttr.shutupStatus !== undefined) {
                  groupInfo.speechEnable = ntfChangeGroupAttr.shutupStatus === 0;
                }

                await WeilaDB.getInstance().putGroup(groupInfo);
                wllog('群属性变更了:', groupId);
                // 通知群变更
                this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_GROUP_MODIFIED_IND, groupInfo);
              })
              .catch((reason) => {
                wlerr('保存群属性异常:' + reason);
              });
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_CHANGE_MEMBERINFO:
          {
            const ntfChangeMemberInfo = serverMessage.groupMessage
              .ntfChangeMemberInfo as WL.Group.INtfChangeMemberInfo;
            const groupId = ntfChangeMemberInfo.groupId.toString(10);
            ntfChangeMemberInfo.memberInfo;

            WeilaDB.getInstance()
              .getGroupMemberInfo(groupId, ntfChangeMemberInfo.memberInfo.userId)
              .then(async (value) => {
                const memberInfo = value as WL_IDbMemberInfo;
                if (memberInfo) {
                  if (ntfChangeMemberInfo.memberInfo.status !== undefined) {
                    memberInfo.status = ntfChangeMemberInfo.memberInfo.status;
                  }
                  if (ntfChangeMemberInfo.memberInfo.type !== undefined) {
                    memberInfo.memberType = ntfChangeMemberInfo.memberInfo.type;
                  }
                  if (ntfChangeMemberInfo.memberInfo.remark !== undefined) {
                    memberInfo.remark = ntfChangeMemberInfo.memberInfo.remark;
                  }
                  if (ntfChangeMemberInfo.memberInfo.prority !== undefined) {
                    memberInfo.priority = ntfChangeMemberInfo.memberInfo.prority;
                  }
                  if (ntfChangeMemberInfo.memberInfo.shutupStatus !== undefined) {
                    memberInfo.speechEnable = ntfChangeMemberInfo.memberInfo.shutupStatus === 0;
                  }
                  if (ntfChangeMemberInfo.memberInfo.shutupTimeout !== undefined) {
                    memberInfo.speechDisableTimeout = Long.fromValue(
                      ntfChangeMemberInfo.memberInfo.shutupTimeout,
                    ).toNumber();
                  }
                  if (ntfChangeMemberInfo.memberInfo.shieldStatus !== undefined) {
                    memberInfo.blockedStatus = ntfChangeMemberInfo.memberInfo.shieldStatus === 1;
                  }
                  if (ntfChangeMemberInfo.memberInfo.tts !== undefined) {
                    memberInfo.tts = ntfChangeMemberInfo.memberInfo.tts === 1;
                  }
                  if (ntfChangeMemberInfo.memberInfo.locationShare !== undefined) {
                    memberInfo.locationShared = ntfChangeMemberInfo.memberInfo.locationShare === 1;
                  }

                  await WeilaDB.getInstance().putMemberInfo(memberInfo);
                  wllog('群成员变更了');
                  this.coreInterface.sendExtEvent(
                    WL_ExtEventID.WL_EXT_GROUP_MEMBERS_MODIFIED_IND,
                    memberInfo,
                  );
                }
              })
              .catch((reason) => {
                wlerr('保存群成员异常:' + reason);
              });
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_GROUP:
          {
            const ntfDeleteGroup = serverMessage.groupMessage.ntfDeleteGroup;
            const groupId = Long.fromValue(ntfDeleteGroup.groupId).toString(10);

            wllog('群被删除的通知，群ID:', groupId);

            //删除群并且通知
            WeilaDB.getInstance()
              .delGroups([groupId])
              .then(() => {
                this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_GROUP_DELETED_IND, groupId);
              })
              .catch((reason) => {
                wlerr('删除群失败', reason);
              });
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_DELETE_MEMBER:
          {
            const ntfDeleteMember = serverMessage.groupMessage.ntfDeleteMember;
            WeilaDB.getInstance()
              .delMemberInfos(ntfDeleteMember.groupId.toString(10), ntfDeleteMember.userIdList)
              .then((value) => {
                wllog('删除了群成员成功');
                // 通知外部
                const info = {} as WL_GroupMemberDeleteInfo;
                info.groupId = ntfDeleteMember.groupId.toString(10);
                info.initiatorId = ntfDeleteMember.initiatorId;
                info.userIdList = ntfDeleteMember.userIdList;
                this.coreInterface.sendExtEvent(
                  WL_ExtEventID.WL_EXT_GROUP_MEMBER_DELETED_IND,
                  info,
                );
              })
              .catch((reason) => {
                wlerr('删除群成员异常:' + reason);
              });
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_NEW_MEMBER:
          {
            const ntfNewMember = serverMessage.groupMessage.ntfNewMember;
            wllog('有新成员消息:', ntfNewMember);
            (async () => {
              const groupId = ntfNewMember.groupId.toString(10);
              const groupInfo = await WeilaDB.getInstance().getGroup(groupId);
              if (groupInfo) {
                const memberInfos = WeilaDB.getInstance().convertFromMemberRaw(
                  groupId,
                  ntfNewMember.memberInfoList,
                );
                const userInfos = WeilaDB.getInstance().convertFromUserRaw(
                  ntfNewMember.userInfoList,
                );
                if (memberInfos.length) {
                  await WeilaDB.getInstance().putMemberInfos(memberInfos);
                }

                if (userInfos.length) {
                  await WeilaDB.getInstance().putUserInfos(userInfos);
                }
              }
              wllog('保存群成员信息');

              this.coreInterface.sendExtEvent(
                WL_ExtEventID.WL_EXT_GROUP_NEW_MEMBER_JOINED_IND,
                ntfNewMember.memberInfoList,
              );
            })().catch((reason) => {
              wlerr('保存信息出错!', reason);
            });
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_JOIN:
          {
            const ntfAnswerJoin = serverMessage.groupMessage.ntfAnswerGroupJoin;
            (async () => {
              const answerGroupJoin = {} as WL_GroupAnswerJoinInfo;
              answerGroupJoin.status = ntfAnswerJoin.status;
              answerGroupJoin.groupInfo = await WeilaDB.getInstance().getGroup(
                ntfAnswerJoin.groupId.toString(10),
              );
              answerGroupJoin.joinUserInfo = await WeilaDB.getInstance().getUser(
                ntfAnswerJoin.joinId,
              );
              answerGroupJoin.answerUserInfo = await WeilaDB.getInstance().getUser(
                ntfAnswerJoin.answerId,
              );
              answerGroupJoin.updated = Long.fromValue(ntfAnswerJoin.updated).toNumber();

              const notification: WL_IDbNotification = {} as WL_IDbNotification;
              notification.notificationType = WL_IDbNotificationType.GROUP_ANSWER_JOIN_NOTIFICATION;
              notification.data = answerGroupJoin;
              notification.createTime = new Date().getTime() / 1000;
              notification.id = await WeilaDB.getInstance().putNotification(notification);

              this.coreInterface.sendExtEvent(
                WL_ExtEventID.WL_EXT_NEW_NOTIFICATION_IND,
                notification,
              );
            })();
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_ANSWER_GROUP_INVITE:
          {
            const ntfAnswerInvite = serverMessage.groupMessage.ntfAnswerGroupInvite;
            (async () => {
              const answerGroupInvite = {} as WL_GroupAnswerInviteInfo;
              answerGroupInvite.groupInfo = await WeilaDB.getInstance().getGroup(
                ntfAnswerInvite.groupId.toString(10),
              );
              answerGroupInvite.invitorUserInfo = await WeilaDB.getInstance().getUser(
                ntfAnswerInvite.inviterId,
              );
              answerGroupInvite.inviteeUserInfo = await WeilaDB.getInstance().getUser(
                ntfAnswerInvite.inviteeId,
              );
              answerGroupInvite.status = ntfAnswerInvite.status;
              answerGroupInvite.updated = Long.fromValue(ntfAnswerInvite.updated).toNumber();

              const notification: WL_IDbNotification = {} as WL_IDbNotification;
              notification.notificationType =
                WL_IDbNotificationType.GROUP_ANSWER_INVITE_NOTIFICATION;
              notification.data = answerGroupInvite;
              notification.createTime = new Date().getTime() / 1000;
              notification.id = await WeilaDB.getInstance().putNotification(notification);
              this.coreInterface.sendExtEvent(
                WL_ExtEventID.WL_EXT_NEW_NOTIFICATION_IND,
                notification,
              );
            })();
          }
          break;

        case WL.Group.GroupCommandId.GROUP_COMMAND_BROADCAST:
          {
            const ntfBroadcast = serverMessage.groupMessage.ntfGroupBroadcast;
            //TODO: 群通知
          }
          break;
      }
    }
  }

  public async getGroupFromServer(groupId: string): Promise<WL_IDbGroup | undefined> {
    const buildMsgRet = WeilaPBGroupWrapper.buildGetGroupInfoReq(Long.fromValue(groupId), 0);
    if (buildMsgRet.resultCode === 0) {
      const rsp = (await this.coreInterface.sendPbMsg(buildMsgRet)) as WL.Group.IRspGetGroupInfo;
      const groupInfos = WeilaDB.getInstance().convertFromGroupRaw([rsp.groupAttribute]);
      const memberInfos = WeilaDB.getInstance().convertFromMemberRaw(groupId, rsp.memberInfoList);
      await WeilaDB.getInstance().putGroup(groupInfos[0]);
      await WeilaDB.getInstance().putMemberInfos(memberInfos);
      return WeilaDB.getInstance().getGroup(groupId);
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode);
  }

  @AsyncTime()
  public async initGroups(): Promise<boolean> {
    const getGroupVersionBuild = WeilaPBGroupWrapper.buildGetGroupVersionReq();
    const dbInstance: WeilaDB = WeilaDB.getInstance();

    if (getGroupVersionBuild.resultCode === 0) {
      let groupVerMsgData = undefined as any;
      const groupAttributes: WL.Group.IGroupAttribute[] = [];
      const allMemberInfos: WL_IDbMemberInfo[] = [];
      const allUserIds: number[] = [];
      const allUserInfos: WL_IDbUserInfo[] = [];

      groupVerMsgData = (await this.coreInterface.sendPbMsg(
        getGroupVersionBuild,
        30000,
      )) as WL.Group.IRspGetGroupVersion;

      // 删除无效的群  START
      const groupIds = groupVerMsgData.versionInfoList.map((value: WL.Group.GroupVersionInfo) => {
        return value.groupId.toString(10);
      });
      wllog('获取的群ids', groupIds);
      const oldGroups = await WeilaDB.getInstance().getGroups();
      const invalidGroups = oldGroups
        .filter((value) => {
          return groupIds.indexOf(value.groupId) === -1;
        })
        .map((value) => {
          return value.groupId;
        });
      wllog('无效群ids', invalidGroups);
      if (invalidGroups.length) {
        await WeilaDB.getInstance().delGroups(invalidGroups);
      }
      // END

      for (let i = 0; i < groupVerMsgData.versionInfoList.length; i++) {
        const ver = groupVerMsgData.versionInfoList[i];
        wllog('群版本信息:', ver);
        const dbGroup = await WeilaDB.getInstance().getGroup(ver.groupId.toString());
        wllog('获取群信息:', dbGroup);
        if (
          !dbGroup ||
          dbGroup.memberVersion !== ver.memberVersion ||
          dbGroup.version !== ver.groupVersion
        ) {
          const buildGroupInfo = WeilaPBGroupWrapper.buildGetGroupInfoReq(
            Long.fromValue(ver.groupId),
            0,
          );
          if (buildGroupInfo.resultCode === 0) {
            const rspGroupInfo = (await this.coreInterface.sendPbMsg(
              buildGroupInfo,
              30000,
            )) as WL.Group.IRspGetGroupInfo;
            wllog('获取得到群：', rspGroupInfo);
            if (!dbGroup || dbGroup.memberVersion !== ver.memberVersion) {
              const groupId = rspGroupInfo.groupAttribute.groupId.toString(10);
              groupAttributes.push(rspGroupInfo.groupAttribute);
              const memberInfos: WL_IDbMemberInfo[] = await dbInstance.convertFromMemberRaw(
                groupId,
                rspGroupInfo.memberInfoList,
              );
              allMemberInfos.push(...memberInfos);

              let userIds: number[] = [];

              userIds = rspGroupInfo.memberInfoList
                .filter((value) => {
                  return value.status === 0 && allUserIds.indexOf(value.userId) === -1;
                })
                .map((value) => {
                  return value.userId;
                });
              allUserIds.push(...userIds);

              if (userIds.length) {
                const buildGetUser = WeilaPBGroupWrapper.buildGetGroupMemberInfoReq(
                  Long.fromValue(groupId),
                  userIds,
                );
                if (buildGetUser.resultCode === 0) {
                  const userRawInfos = (await this.coreInterface.sendPbMsg(
                    buildGetUser,
                    30000,
                  )) as WL.Group.IRspGetMemberUserInfo;
                  const userInfos = dbInstance.convertFromUserRaw(userRawInfos.userInfoList);
                  allUserInfos.push(...userInfos);
                } else {
                  wlerr('获取群成员失败', buildGetUser.resultCode);
                }
              }
            }
          } else {
            wlerr('创建获取群信息失败:' + buildGroupInfo.resultCode);
          }
        }
      }

      const groupInfos: WL_IDbGroup[] = dbInstance.convertFromGroupRaw(groupAttributes);
      await dbInstance.putGroups(groupInfos);
      const ind = {} as WL_DataPrepareInd;
      ind.state = WL_DataPrepareState.PREPARE_PROGRESS_IND;
      ind.msg = 'SDK.SavingMembers';
      this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind);
      await dbInstance.putMemberInfos(allMemberInfos);
      ind.msg = 'SDK.SavingUsers';
      this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind);
      await dbInstance.putUserInfos(allUserInfos);

      return true;
    }

    return Promise.reject('创建消息失败:' + getGroupVersionBuild.resultCode);
  }

  public async getGroupUserInfosFromServer(groupId: string, userIds: number[]): Promise<boolean> {
    const buildResult = WeilaPBGroupWrapper.buildGetGroupMemberInfoReq(
      Long.fromValue(groupId),
      userIds,
    );
    if (buildResult.resultCode === 0) {
      const rspMemberInfo = (await this.coreInterface.sendPbMsg(
        buildResult,
      )) as WL.Group.IRspGetMemberUserInfo;
      const userInfos = WeilaDB.getInstance().convertFromUserRaw(rspMemberInfo.userInfoList);
      await WeilaDB.getInstance().putUserInfos(userInfos);
      return true;
    }

    return Promise.reject('创建消息失败:' + buildResult.resultCode);
  }

  public async createGroup(
    name: string,
    groupType: number,
    avatar: string,
    publicType: number,
    memberUserIdList: number[],
  ): Promise<WL_IDbGroup | null> {
    if (avatar === '') {
      avatar = default_group_logo;
    }

    wllog('创建群组，头像:', avatar);

    const buildResult = WeilaPBGroupWrapper.buildCreateGroupReq(
      name,
      groupType,
      avatar,
      0,
      publicType,
      memberUserIdList,
    );
    if (buildResult.resultCode === 0) {
      const rspCreateGroup = (await this.coreInterface.sendPbMsg(
        buildResult,
      )) as WL.Group.IRspCreateGroup;
      const groupId = rspCreateGroup.groupAttribute.groupId.toString(10);
      const groupInfos = WeilaDB.getInstance().convertFromGroupRaw([rspCreateGroup.groupAttribute]);
      const memberInfos = WeilaDB.getInstance().convertFromMemberRaw(
        groupId,
        rspCreateGroup.memberInfoList,
      );

      wllog('创建群成功消息:', rspCreateGroup);

      await WeilaDB.getInstance().putGroup(groupInfos[0]);
      await WeilaDB.getInstance().putMemberInfos(memberInfos);
      return WeilaDB.getInstance().getGroup(groupId);
    }

    return Promise.reject('创建消息失败:' + buildResult.resultCode);
  }

  public async inviteUser(groupId: string, userIdList: number[]): Promise<boolean> {
    const buildResult = WeilaPBGroupWrapper.buildGroupInviteReq(
      Long.fromValue(groupId),
      userIdList,
    );
    if (buildResult.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildResult);
      return true;
    }

    return Promise.reject('创建消息失败:' + buildResult.resultCode);
  }

  public async getGroupOnlineMembers(groupId: string): Promise<number[]> {
    const buildResult = WeilaPBGroupWrapper.buildGetGroupOnlineMemberReq(Long.fromValue(groupId));
    if (buildResult.resultCode === 0) {
      const rspOnlineMember = (await this.coreInterface.sendPbMsg(
        buildResult,
      )) as WL.Group.IRspGetGroupOnlineMember;
      return rspOnlineMember.userIdList;
    }

    return Promise.reject('创建消息失败:' + buildResult.resultCode);
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
    );
    if (buildMsgRet.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildMsgRet);
      return true;
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode);
  }

  public async answerGroupJoin(groupId: string, joinId: number, status: number): Promise<boolean> {
    const buildMsgRet = WeilaPBGroupWrapper.buildGroupAnswerJoinReq(
      Long.fromValue(groupId),
      joinId,
      status,
    );
    if (buildMsgRet.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildMsgRet);
      return true;
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode);
  }

  public async getGroupAttribute(groupId: string): Promise<WL_IDbGroup> {
    const buildMsgRet = WeilaPBGroupWrapper.buildGetGroupAttributeReq(Long.fromValue(groupId));
    if (buildMsgRet.resultCode === 0) {
      const rsp = (await this.coreInterface.sendPbMsg(
        buildMsgRet,
      )) as WL.Group.IRspGetGroupAttribute;
      const groupInfos = WeilaDB.getInstance().convertFromGroupRaw(rsp.groupAttrList);
      return groupInfos[0];
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode);
  }

  public async deleteGroupMembers(groupId: string, userIds: number[]): Promise<boolean> {
    const buildMsgRet = WeilaPBGroupWrapper.buildDelGroupMemebrReq(
      Long.fromValue(groupId),
      userIds,
    );
    if (buildMsgRet.resultCode === 0) {
      const loginUserInfo = this.coreInterface.getLoginUserInfo();
      await this.coreInterface.sendPbMsg(buildMsgRet);
      const index = userIds.indexOf(loginUserInfo.userId);

      if (index !== -1) {
        await WeilaDB.getInstance().delGroups([groupId]);
      } else {
        await WeilaDB.getInstance().delMemberInfos(groupId, userIds);
      }
      return true;
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode);
  }

  public async dismissGroup(groupId: string): Promise<boolean> {
    wllog('删除群ID:', groupId);
    const buildMsgRet = WeilaPBGroupWrapper.buildDelGroupReq(Long.fromValue(groupId));
    if (buildMsgRet.resultCode === 0) {
      try {
        await this.coreInterface.sendPbMsg(buildMsgRet);
      } finally {
        await WeilaDB.getInstance().delGroups([groupId]);
      }

      return true;
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode);
  }

  public async changeGroupOwner(groupId: string, ownerUserId: number): Promise<boolean> {
    wllog('更换群主', groupId, ownerUserId);

    const attributes: WLGroupAttributeInfo = {} as WLGroupAttributeInfo;
    attributes.groupId = Long.fromValue(groupId);
    attributes.ownerId = ownerUserId;
    const buildMsgRet = WeilaPBGroupWrapper.buildChangeGroupAttributeReq(attributes);

    if (buildMsgRet.resultCode === 0) {
      const rsp = (await this.coreInterface.sendPbMsg(
        buildMsgRet,
      )) as WL.Group.IRspChangeGroupAttribute;
      if (rsp.groupAttribute.ownerId && rsp.groupAttribute.ownerId === ownerUserId) {
        const groupInfo = await WeilaDB.getInstance().getGroup(groupId);
        groupInfo.ownerId = ownerUserId;
        await WeilaDB.getInstance().putGroup(groupInfo);
        return true;
      } else {
        return Promise.reject(new Error('修改失败'));
      }
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode);
  }

  public async joinGroup(
    groupId: string,
    detail?: string,
    password?: string,
    subUserId?: number,
  ): Promise<boolean> {
    if (subUserId) {
      const groupInfo = await WeilaDB.getInstance().getGroup(groupId);
      if (groupInfo === undefined) {
        return Promise.reject(new Error('GroupNotExist'));
      }
    }

    const buildMsgRet = WeilaPBGroupWrapper.buildGroupJoinReq(
      Long.fromValue(groupId),
      detail,
      password,
      subUserId,
    );
    if (buildMsgRet.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildMsgRet);
    }
  }

  public async quitGroup(groupId: string, subUserId?: number): Promise<boolean> {
    wllog('退出群ID', groupId);

    const groupInfo = await WeilaDB.getInstance().getGroup(groupId);
    if (
      groupInfo.ownerId === this.coreInterface.getLoginUserInfo().userId &&
      groupInfo.memberCount > 1
    ) {
      return Promise.reject(new Error('Not Allow'));
    }

    let buildMsgRet: any;
    if (subUserId) {
      buildMsgRet = WeilaPBGroupWrapper.buildDelGroupMemebrReq(
        Long.fromValue(groupId),
        [subUserId],
        subUserId,
      );
    } else {
      buildMsgRet = WeilaPBGroupWrapper.buildDelGroupMemebrReq(Long.fromValue(groupId), [
        this.coreInterface.getLoginUserInfo().userId,
      ]);
    }

    if (buildMsgRet.resultCode === 0) {
      await this.coreInterface.sendPbMsg(buildMsgRet);
      await WeilaDB.getInstance().delGroups([groupId]);
      return true;
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode);
  }

  public async changeMemberType(
    groupId: string,
    memberUserId: number,
    memberType: number,
  ): Promise<boolean> {
    const memberInfo = await WeilaDB.getInstance().getGroupMemberInfo(groupId, memberUserId);
    if (memberInfo) {
      memberInfo.memberType = memberType;
      const id = WeilaDB.getInstance().putMemberInfo(memberInfo);
      wllog('更新好友[%s]信息', id);
    }

    return true;
  }

  public async getDeviceSubGroups(subUserId: number): Promise<WL_IDbGroup[]> {
    const buildMsgRet = WeilaPBGroupWrapper.buildGetSubDeviceGroupAttributes(subUserId);

    if (buildMsgRet.resultCode === 0) {
      const rspGetSubGroupAttribute: WL.Group.IRspGetSubGroupAttribute =
        await this.coreInterface.sendPbMsg(buildMsgRet);
      let groupList: WL_IDbGroup[] = [];
      if (rspGetSubGroupAttribute.groupAttrList && rspGetSubGroupAttribute.groupAttrList.length) {
        groupList = await WeilaDB.getInstance().convertFromGroupRaw(
          rspGetSubGroupAttribute.groupAttrList,
        );
      }

      return groupList;
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode);
  }

  public async addSubDeviceMember(groupId: string, userIds: number[]): Promise<number[]> {
    const buildMsgRet = WeilaPBGroupWrapper.buildAddSubMemberReq(Long.fromValue(groupId), userIds);
    if (buildMsgRet.resultCode === 0) {
      const rsp = (await this.coreInterface.sendPbMsg(buildMsgRet)) as WL.Group.IRspAddSubMember;
      return rsp.failUserIdList;
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode);
  }
}
