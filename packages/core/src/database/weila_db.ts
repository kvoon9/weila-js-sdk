import Dexie from 'dexie';
import { WL } from 'proto/weilapb';
import Long from 'long';
import {
  WL_IDbAudioData,
  WL_IDbExtensionInfo,
  WL_IDbExtensionType,
  WL_IDbFriend,
  WL_IDbFriendInfo,
  WL_IDbGroup,
  WL_IDbGroupMember,
  WL_IDbMemberInfo,
  WL_IDbMemberType,
  WL_IDbMsgData,
  WL_IDbMsgDataStatus,
  WL_IDbMsgDataType,
  WL_IDbNotification,
  WL_IDbNotificationType,
  WL_IDbPttData,
  WL_IDbService,
  WL_IDbServiceSession,
  WL_IDbServiceSessionInfo,
  WL_IDbServiceStaff,
  WL_IDbServiceStaffInfo,
  WL_IDbSession,
  WL_IDbSessionSetting,
  WL_IDbSessionSettingParams,
  WL_IDbSessionStatus,
  WL_IDbSessionType,
  WL_IDbSetting,
  WL_IDbSettingID,
  WL_IDbUserInfo,
} from './weila_db_data';
import { getLogger } from 'log/weila_log';
import TinyPinyin from 'tiny-pinyin';
import { default_group_logo } from 'main/weila_internal_data';
import { TextMsgDataParser } from 'proto/weilapb_textmsg_parser';
import { AsyncTime, calculateOpusDataFrame, getMsgDataIdByCombo, SyncTime } from 'main/weila_utils';

const wllog = getLogger('DB:core:info');
const wlerr = getLogger('DB:core:err');

class WeilaDB extends Dexie {
  sessions: Dexie.Table<WL_IDbSession, string>;
  session_setting: Dexie.Table<WL_IDbSessionSetting, string>;
  groups: Dexie.Table<WL_IDbGroup, string>;
  friends: Dexie.Table<WL_IDbFriendInfo, number>;
  users: Dexie.Table<WL_IDbUserInfo, number>;
  group_members: Dexie.Table<WL_IDbMemberInfo, string>;
  msgDatas: Dexie.Table<WL_IDbMsgData, string>;
  settings: Dexie.Table<WL_IDbSetting, number>;
  notifications: Dexie.Table<WL_IDbNotification, number>;
  extensions: Dexie.Table<WL_IDbExtensionInfo, number>;
  service: Dexie.Table<WL_IDbService, number>;
  service_staffs: Dexie.Table<WL_IDbServiceStaff, number>;
  loginUserId: number;
  static appAuthInfo?: { appKey: string; appId: string };

  private static instance: WeilaDB = null;

  public static init(userId: string, version: number): void {
    if (this.instance === null) {
      this.instance = new WeilaDB(userId, version);
    }
  }

  public static setAppAuthInfo(appId: string, appKey: string) {
    this.appAuthInfo = {
      appId,
      appKey,
    };
  }

  public static getAppAuthInfo(): { appKey: string; appId: string } | undefined {
    return this.appAuthInfo;
  }

  public static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }

  public static getInstance(): WeilaDB {
    return this.instance;
  }

  constructor(userId: string, version: number) {
    const dbName = 'WL_' + userId + '_DB';
    super(dbName);
    this.loginUserId = parseInt(userId);
    this.version(version).stores({
      sessions: 'combo_id_type, [sessionId+sessionType], status',
      session_setting: 'combo_id_type, [sessionId+sessionType]',
      groups: 'groupId, groupNum, ownerId, pinyinName, groupType, created',
      friends: 'userId, status',
      users: 'userId, weilaNum, status, pinyinName, created, userType',
      group_members: 'combo_gid_uid, groupId, userId, [groupId+memberType], memberType, created',
      msgDatas:
        'combo_id, sessionId, sessionType, [sessionId+sessionType], msgType, created, msgId',
      settings: 'id',
      notifications: '++id, createTime, notificationType',
      extensions: 'userId, supervisorId, extensionType',
      service: 'serviceId, serviceNum, serviceType, serviceClass',
      service_staffs: 'userId, staffType, admin, staffClass',
    });

    this.sessions = this.table('sessions');
    this.groups = this.table('groups');
    this.group_members = this.table('group_members');
    this.users = this.table('users');
    this.friends = this.table('friends');
    this.msgDatas = this.table('msgDatas');
    this.settings = this.table('settings');
    this.notifications = this.table('notifications');
    this.session_setting = this.table('session_setting');
    wllog('create db name:%s version:%d', dbName, version, this);

    this.settings.get(WL_IDbSettingID.SETTING_MSG_SENDING_SEQ).then((value) => {
      if (value === undefined || value.data === 0) {
        const setting = {} as WL_IDbSetting;
        setting.id = WL_IDbSettingID.SETTING_MSG_SENDING_SEQ;
        setting.data = 10;
        this.settings.put(setting);
      }
    });
  }

  // 设置相关操作
  public async putSettingItem(item: WL_IDbSetting): Promise<number> {
    return this.settings.put(item);
  }

  public async getSettingItem(id: WL_IDbSettingID): Promise<WL_IDbSetting | undefined> {
    return this.settings.get(id);
  }

  // 会话相关操作
  @AsyncTime()
  public async fillSessionInfo(session: WL_IDbSession): Promise<WL_IDbSession> {
    session.sessionName = '';
    session.sessionAvatar = default_group_logo;
    session.status = WL_IDbSessionStatus.SESSION_ACTIVATE;

    if (session.sessionType === WL_IDbSessionType.SESSION_GROUP_TYPE) {
      const groupInfo = await WeilaDB.getInstance().getGroup(session.sessionId);
      if (groupInfo) {
        session.sessionName = groupInfo.name;
        session.sessionAvatar = groupInfo.avatar;
      } else {
        session.status = WL_IDbSessionStatus.SESSION_INVALID;
      }
    } else if (session.sessionType === WL_IDbSessionType.SESSION_INDIVIDUAL_TYPE) {
      const userInfo = await WeilaDB.getInstance().getUser(parseInt(session.sessionId));
      if (userInfo) {
        session.sessionName = userInfo.nick;
        session.sessionAvatar = userInfo.avatar;
      } else {
        session.status = WL_IDbSessionStatus.SESSION_INVALID;
      }
    } else if (session.sessionType === WL_IDbSessionType.SESSION_SERVICE_TYPE) {
      const serviceId = Long.fromValue(session.sessionId).high;
      const service = await WeilaDB.getInstance().getService(serviceId);
      if (service) {
        session.sessionName = service.name;
        session.sessionAvatar = service.avatar;
      } else {
        session.status = WL_IDbSessionStatus.SESSION_INVALID;
      }
    }

    return session;
  }

  @AsyncTime()
  public async convertFromSessionRaw(
    sessionRaws: WL.Session.ISessionInfo[],
  ): Promise<WL_IDbSession[]> {
    const sessionCount = sessionRaws.length;
    const sessions: WL_IDbSession[] = [];
    for (let i = 0; i < sessionCount; i++) {
      let session = {} as WL_IDbSession;
      session.combo_id_type =
        sessionRaws[i].sessionId.toString(10) + '_' + sessionRaws[i].sessionType;
      session.sessionId = sessionRaws[i].sessionId.toString(10);
      session.sessionType = sessionRaws[i].sessionType;
      session.readMsgId = sessionRaws[i].readMsgId;
      session.latestUpdate = Long.fromValue(sessionRaws[i].latestUpdated).toNumber();
      wllog('sessionId:%s lastMsgDataRaw:', session.sessionId, sessionRaws[i].latestMsgData);
      if (sessionRaws[i].latestMsgData) {
        const msgDatas: WL_IDbMsgData[] = this.convertFromMsgDataRaws(
          [sessionRaws[i].latestMsgData],
          this.loginUserId,
        );
        wllog('sessionId:%s lastMsgData:', session.sessionId, msgDatas);
        if (msgDatas.length) {
          session.lastMsgId = msgDatas[0].msgId;
          msgDatas[0].combo_id = getMsgDataIdByCombo(msgDatas[0], 0);
          await WeilaDB.getInstance().putMsgData(msgDatas[0]);
        }
      }

      session = await this.fillSessionInfo(session);
      sessions.push(session);
    }

    return sessions;
  }

  @AsyncTime()
  public async putSessions(sessions: WL_IDbSession[]): Promise<boolean> {
    const ids = await this.sessions.bulkPut(sessions, { allKeys: true });
    wllog('存入%d个会话', ids.length);
    return true;
  }

  @AsyncTime()
  public async putSession(session: WL_IDbSession): Promise<string> {
    const id = await this.sessions.put(session);
    wllog('存入单个会话，返回id', id);
    return id;
  }

  @AsyncTime()
  public async getSessionSettings(): Promise<WL_IDbSessionSetting[]> {
    return this.session_setting.toCollection().toArray();
  }

  @AsyncTime()
  public async getSessionSetting(
    sessionId: string,
    sessionType: number,
  ): Promise<WL_IDbSessionSetting | undefined> {
    const comboId = sessionId + '_' + sessionType;
    let sessionSetting = await this.session_setting.get(comboId);
    if (!sessionSetting) {
      sessionSetting = {} as WL_IDbSessionSetting;
      sessionSetting.sessionType = sessionType;
      sessionSetting.sessionId = sessionId;
      sessionSetting.combo_id_type = sessionId + '_' + sessionType;
      sessionSetting.tts = false;
      sessionSetting.mute = false;
      sessionSetting.loactionShared = false;
      if (sessionType === WL_IDbSessionType.SESSION_INDIVIDUAL_TYPE) {
        const friendInfo = await this.friends.get(parseInt(sessionId));
        if (friendInfo) {
          sessionSetting.tts = friendInfo.tts;
          sessionSetting.loactionShared = friendInfo.locationShared;
        }
      } else if (sessionType === WL_IDbSessionType.SESSION_GROUP_TYPE) {
        const comboId = sessionId + '_' + this.loginUserId;
        const memberInfo = await this.group_members.get(comboId);
        if (memberInfo) {
          sessionSetting.tts = memberInfo.tts;
          sessionSetting.loactionShared = memberInfo.locationShared;
        }
      } else if (sessionType === WL_IDbSessionType.SESSION_SERVICE_TYPE) {
        sessionSetting.tts = true;
        sessionSetting.mute = false;
        sessionSetting.loactionShared = true;
      }

      await this.session_setting.put(sessionSetting);
    }

    return sessionSetting;
  }

  @AsyncTime()
  public async updateSessionSetting(
    sessionId: string,
    sessionType: number,
    params: WL_IDbSessionSettingParams,
  ): Promise<boolean> {
    wllog('updateSessionSetting', params);
    const setting = {} as any;
    if (params.tts !== undefined) {
      setting.tts = params.tts;
    }

    if (params.loactionShared !== undefined) {
      setting.loactionShared = params.loactionShared;
    }

    if (params.mute !== undefined) {
      setting.mute = params.mute;
    }

    if (params.tts !== undefined || params.loactionShared !== undefined) {
      if (sessionType === WL_IDbSessionType.SESSION_GROUP_TYPE) {
        const groupInfo = await this.groups.get(sessionId);
        if (groupInfo) {
          const id = groupInfo.groupId + '_' + groupInfo.ownerId;
          this.group_members.where('combo_gid_uid').equals(id).modify(setting);
        }
      } else if (sessionType === WL_IDbSessionType.SESSION_INDIVIDUAL_TYPE) {
        this.friends.where('userId').equals(parseInt(sessionId)).modify(setting);
      } else if (sessionType === WL_IDbSessionType.SESSION_SERVICE_TYPE) {
        //TODO: 服务类的会话暂时不支持设置到其他属性去

        setting.tts = true;
        setting.mute = false;
        setting.loactionShared = true;
      }
    }

    const id = sessionId + '_' + sessionType;
    let sessionSetting = await this.session_setting.get(id);
    if (sessionSetting !== undefined) {
      wllog('修改.......', setting);
      await this.session_setting.where('combo_id_type').equals(id).modify(setting);
    } else {
      sessionSetting = {} as WL_IDbSessionSetting;
      sessionSetting.sessionId = sessionId;
      sessionSetting.sessionType = sessionType;
      sessionSetting.combo_id_type = sessionId + '_' + sessionType;
      sessionSetting.tts = setting.tts;
      sessionSetting.mute = setting.mute;
      sessionSetting.loactionShared = setting.loactionShared;

      await this.session_setting.put(sessionSetting);
    }

    return true;
  }

  @AsyncTime()
  public async delSessions(comboIds: string[]): Promise<void> {
    const sessionCombos = comboIds.map((value) => {
      const combo = value.split('_') as any;
      combo[1] = parseInt(combo[1]);
      return combo;
    });

    this.transaction<boolean>('rw', this.sessions, this.msgDatas, async () => {
      await this.sessions.bulkDelete(comboIds);
      await this.msgDatas.where('[sessionId+sessionType]').anyOf(sessionCombos).delete();
      return true;
    });
  }

  @AsyncTime()
  public async getSessions(): Promise<WL_IDbSession[]> {
    const list = await this.sessions.toCollection().toArray();
    wllog(list);
    return list;
  }

  @AsyncTime()
  public async getSession(
    sessionId: string,
    sessionType: number,
  ): Promise<WL_IDbSession | undefined> {
    const id = sessionId + '_' + sessionType;
    return this.sessions.get(id);
  }

  @SyncTime()
  public convertFromGroupRaw(groupRaws: WL.Group.IGroupAttribute[]): WL_IDbGroup[] {
    const count = groupRaws.length;
    const groups: WL_IDbGroup[] = [];
    for (let i = 0; i < count; i++) {
      const group = {} as WL_IDbGroup;
      group.groupId = groupRaws[i].groupId.toString(10);
      group.groupNum = groupRaws[i].number;
      group.groupType = groupRaws[i].type;
      group.groupClass = groupRaws[i].class;
      group.name = groupRaws[i].name;
      group.pinyinName = TinyPinyin.convertToPinyin(groupRaws[i].name);
      group.avatar = groupRaws[i].avatar;
      group.memberCount = groupRaws[i].memberCount;
      group.memberLimit = groupRaws[i].memberLimit;
      group.memberVersion = groupRaws[i].memberVersion;
      group.version = groupRaws[i].version;
      group.ownerId = groupRaws[i].ownerId;
      group.desc = groupRaws[i].desc;
      group.latitude = groupRaws[i].latitude;
      group.longitude = groupRaws[i].longitude;
      group.speechEnable = groupRaws[i].shutupStatus === 0;
      group.audioQuality = groupRaws[i].audioQuality;
      group.authType = groupRaws[i].authType;
      group.publicType = groupRaws[i].publicType;
      group.burstType = groupRaws[i].burstType;
      group.home = groupRaws[i].home;
      group.created = Long.fromValue(groupRaws[i].created).toNumber();

      groups.push(group);
    }

    return groups;
  }

  @AsyncTime()
  public async putGroups(groups: WL_IDbGroup[]): Promise<boolean> {
    const ids = await this.groups.bulkPut(groups, { allKeys: true });
    wllog('存入%d个群:', ids.length);
    return true;
  }

  @AsyncTime()
  public async putGroup(group: WL_IDbGroup): Promise<string> {
    const id = await this.groups.put(group);
    wllog('存入单个群:', id);
    return id;
  }

  @AsyncTime()
  public async delGroups(groupIds: string[]): Promise<void> {
    return this.transaction<void>('rw', this.groups, this.group_members, async () => {
      await this.groups.bulkDelete(groupIds);
      await this.group_members.where('groupId').anyOf(groupIds).delete();
      wllog('批量删除群');
    });
  }

  @AsyncTime()
  public async getGroups(groupIds?: string[]): Promise<WL_IDbGroup[]> {
    if (groupIds) {
      const result = await this.groups.bulkGet(groupIds);
      return result.filter((value) => {
        return value !== undefined;
      });
    }

    return this.groups.toArray();
  }

  @AsyncTime()
  public async getGroup(groupId: string): Promise<WL_IDbGroup> {
    return this.groups.get(groupId);
  }

  @AsyncTime()
  public async getGroupsSortByProperty(
    property: 'pinyinName' | 'groupType' | 'created',
  ): Promise<WL_IDbGroup[]> {
    return this.groups.toCollection().sortBy(property);
  }

  @AsyncTime()
  public async getGroupCount(): Promise<number> {
    return this.groups.count();
  }

  @SyncTime()
  public convertFromMemberRaw(
    groupId: string,
    memberRaws: WL.Group.IGroupMemberInfo[],
  ): WL_IDbMemberInfo[] {
    const count = memberRaws.length;
    const memberInfos: WL_IDbMemberInfo[] = [];
    for (let i = 0; i < count; i++) {
      const memberInfo: WL_IDbMemberInfo = {} as WL_IDbMemberInfo;
      memberInfo.memberType = memberRaws[i].type;
      memberInfo.speechEnable = memberRaws[i].shutupStatus === 0;
      memberInfo.tts = memberRaws[i].tts === 1;
      memberInfo.locationShared = memberRaws[i].locationShare === 1;
      memberInfo.blockedStatus = memberRaws[i].shieldStatus === 1;
      memberInfo.speechDisableTimeout = Long.fromValue(memberRaws[i].shutupTimeout).toNumber();
      memberInfo.priority = memberRaws[i].prority;
      memberInfo.userId = memberRaws[i].userId;
      memberInfo.groupId = groupId;
      memberInfo.remark = memberRaws[i].remark;
      memberInfo.status = memberRaws[i].status;
      memberInfo.created = Long.fromValue(memberRaws[i].created).toNumber();
      memberInfo.combo_gid_uid = groupId + '_' + memberInfo.userId;
      memberInfos.push(memberInfo);
    }

    return memberInfos;
  }

  @AsyncTime()
  public async putMemberInfos(memberInfos: WL_IDbMemberInfo[]): Promise<boolean> {
    const ids = await this.group_members.bulkPut(memberInfos, { allKeys: true });
    wllog('批量存入%d个成员信息', ids.length);
    return true;
  }

  @AsyncTime()
  public async putMemberInfo(memberInfo: WL_IDbMemberInfo): Promise<string> {
    const id = await this.group_members.put(memberInfo);
    wllog('存入成员信息', id);
    return id;
  }

  @AsyncTime()
  public async delMemberInfos(groupId: string, userIds: number[]): Promise<void> {
    const count = this.group_members
      .where('userId')
      .anyOf(userIds)
      .and((x) => {
        return x.groupId === groupId;
      })
      .delete();

    wllog('删除了%d个群成员', count);
  }

  @AsyncTime()
  public async getGroupMembers(groupId: string): Promise<WL_IDbGroupMember[]> {
    const memberInfos: WL_IDbMemberInfo[] = await this.group_members
      .where('groupId')
      .equals(groupId)
      .toArray();
    const groupMembers: WL_IDbGroupMember[] = [];
    const count = memberInfos.length;

    const ids: number[] = memberInfos.map((value) => {
      return value.userId;
    });

    const userInfos = await this.getUserInfos(ids);
    const allIds = userInfos.map((value) => {
      return value.userId;
    });

    for (let i = 0; i < count; i++) {
      const groupMember = {} as WL_IDbGroupMember;
      // 这种速度比findIndex快很多
      const index = allIds.indexOf(memberInfos[i].userId);

      if (index !== -1) {
        groupMember.memberInfo = memberInfos[i];
        groupMember.userInfo = userInfos[index];
        groupMembers.push(groupMember);
      }
    }

    return groupMembers;
  }

  @AsyncTime()
  public async getGroupMemberInfo(
    groupId: string,
    userId: number,
  ): Promise<WL_IDbMemberInfo | undefined> {
    const id = groupId + '_' + userId;
    return this.group_members.get(id);
  }

  @AsyncTime()
  public async getGroupMember(
    groupId: string,
    userId: number,
  ): Promise<WL_IDbGroupMember | undefined> {
    const groupMember = {} as WL_IDbGroupMember;
    const id = groupId + '_' + userId;
    groupMember.memberInfo = await this.group_members.get(id);
    if (groupMember.memberInfo) {
      groupMember.userInfo = await this.users.get(userId);
      return groupMember;
    }

    return undefined;
  }

  @AsyncTime()
  public async getGroupAdminMembers(groupId: string): Promise<WL_IDbGroupMember[]> {
    const groupMembers: WL_IDbGroupMember[] = [];
    const memberInfos: WL_IDbMemberInfo[] = await this.group_members
      .where('[groupId+memberType]')
      .equals([groupId, WL_IDbMemberType.ADMIN_MEMBER_TYPE])
      .toArray();
    const ids = memberInfos.map((value) => {
      return value.userId;
    });
    const userInfos = await this.getUserInfos(ids);
    const allUserIds = userInfos.map((value) => {
      return value.userId;
    });

    const count = memberInfos.length;
    for (let i = 0; i < count; i++) {
      const groupMember = {} as WL_IDbGroupMember;
      const index = allUserIds.indexOf(memberInfos[i].userId);

      if (index !== -1) {
        groupMember.memberInfo = memberInfos[i];
        groupMember.userInfo = userInfos[index];
        groupMembers.push(groupMember);
      }
    }

    return groupMembers;
  }

  @SyncTime()
  public convertFromFriendRaw(friendRaws: WL.Friend.IFriendInfo[]): WL_IDbFriendInfo[] {
    const count = friendRaws.length;
    const friendInfos: WL_IDbFriendInfo[] = [];
    for (let i = 0; i < count; i++) {
      const friendInfo = {} as WL_IDbFriendInfo;
      friendInfo.remark = friendRaws[i].remark;
      friendInfo.tts = friendRaws[i].tts === 1;
      friendInfo.userId = friendRaws[i].userId;
      friendInfo.desc = friendRaws[i].desc;
      friendInfo.status = friendRaws[i].status;
      friendInfo.blockedStatus = friendRaws[i].shieldStatus === 1;
      friendInfo.label = friendRaws[i].label;
      friendInfo.locationShared = friendRaws[i].locationShare === 1;
      friendInfo.extension = friendRaws[i].extension;

      friendInfos.push(friendInfo);
    }

    return friendInfos;
  }

  @AsyncTime()
  public async putFriendInfos(friendInfos: WL_IDbFriendInfo[]): Promise<boolean> {
    const ids = await this.friends.bulkPut(friendInfos, { allKeys: true });
    wllog('批量存入%d个好友:', ids.length);
    return true;
  }

  @AsyncTime()
  public async putFriendInfo(friendInfo: WL_IDbFriendInfo): Promise<number> {
    const id = await this.friends.put(friendInfo);
    wllog('存入单个好友:', id);
    return id;
  }

  @AsyncTime()
  public async delFriendInfos(userIds: number[]): Promise<void> {
    return this.friends.bulkDelete(userIds);
  }

  @AsyncTime()
  public async getFriends(userIds?: number[]): Promise<WL_IDbFriend[]> {
    const friends: WL_IDbFriend[] = [];
    let friendInfos = await this.friends.orderBy('userId').toArray();

    if (userIds) {
      friendInfos = friendInfos.filter((value) => {
        return userIds.indexOf(value.userId) !== -1;
      });
    }

    const ids = friendInfos.map((value) => {
      return value.userId;
    });
    const userInfos = await this.getUserInfos(ids);
    const allIds = userInfos.map((value) => {
      return value.userId;
    });

    const count = friendInfos.length;
    for (let i = 0; i < count; i++) {
      const friend: WL_IDbFriend = {} as WL_IDbFriend;
      const index = allIds.indexOf(friendInfos[i].userId);

      if (index !== -1) {
        friend.friendInfo = friendInfos[i];
        friend.userInfo = userInfos[index];
        friends.push(friend);
      }
    }

    return friends;
  }

  @AsyncTime()
  public async getFriendInfo(userId: number): Promise<WL_IDbFriendInfo | undefined> {
    return this.friends.get(userId);
  }

  @AsyncTime()
  public async getFriendInfos(userIds?: number[]): Promise<WL_IDbFriendInfo[]> {
    if (userIds) {
      return this.friends.where('userId').anyOf(userIds).toArray();
    }

    return this.friends.toArray();
  }

  @AsyncTime()
  public async getFriend(userId: number): Promise<WL_IDbFriend | undefined> {
    const friend: WL_IDbFriend = {} as WL_IDbFriend;
    friend.friendInfo = await this.friends.get(userId);
    if (friend.friendInfo) {
      friend.userInfo = await this.users.get(userId);
      return friend;
    }

    return undefined;
  }

  @AsyncTime()
  public async getFriendCount(): Promise<number> {
    return this.friends.count();
  }

  @SyncTime()
  public convertFromUserRaw(userRaws: WL.Common.IUserInfo[]): WL_IDbUserInfo[] {
    const count = userRaws.length;
    const userInfos: WL_IDbUserInfo[] = [];
    for (let i = 0; i < count; i++) {
      const userInfo = {} as WL_IDbUserInfo;
      userInfo.userId = userRaws[i].userId;
      userInfo.avatar = userRaws[i].avatar;
      userInfo.countryCode = userRaws[i].countryCode;
      userInfo.created = Long.fromValue(userRaws[i].created).toNumber();
      userInfo.email = userRaws[i].email;
      userInfo.nick = userRaws[i].nick;
      userInfo.pinyinName = TinyPinyin.convertToPinyin(userInfo.nick);
      userInfo.phone = userRaws[i].phone;
      userInfo.sex = userRaws[i].sex;
      userInfo.signature = userRaws[i].signature;
      userInfo.status = userRaws[i].status;
      userInfo.userType = userRaws[i].type;
      userInfo.weilaNum = userRaws[i].number;

      userInfos.push(userInfo);
    }

    return userInfos;
  }

  @AsyncTime()
  public async putUserInfos(userInfos: WL_IDbUserInfo[]): Promise<boolean> {
    const ids = await this.users.bulkPut(userInfos, { allKeys: true });
    wllog('批量存入%d个用户信息:', ids.length);
    return true;
  }

  @AsyncTime()
  public async putUserInfo(userInfo: WL_IDbUserInfo): Promise<number> {
    wllog('存入单个用户信息:', this, userInfo);
    const id = await this.users.put(userInfo);
    wllog('存入单个用户信息:', id);
    return id;
  }

  @AsyncTime()
  public async delUserInfos(userIds: number[]): Promise<void> {
    return this.users.bulkDelete(userIds);
  }

  @AsyncTime()
  public async getUserInfos(userIds?: number[]): Promise<WL_IDbUserInfo[]> {
    if (userIds) {
      const allUsers = await this.users.orderBy('userId').toArray();
      return allUsers.filter((value) => {
        return userIds.indexOf(value.userId) !== -1;
      });
    }

    return this.users.toArray();
  }

  @AsyncTime()
  public async getUser(userId: number): Promise<WL_IDbUserInfo | undefined> {
    return this.users.get(userId);
  }

  @AsyncTime()
  public async getMsgDataByComboIds(comboIds: string[]): Promise<WL_IDbMsgData[]> {
    const result = await this.msgDatas.bulkGet(comboIds);
    return result.filter((value) => {
      return value !== undefined;
    });
  }

  @AsyncTime()
  public async getMsgDataByMsgIds(
    sessionId: string,
    sessionType: number,
    msgIds: number[],
  ): Promise<WL_IDbMsgData[]> {
    return this.msgDatas
      .where('msgId')
      .anyOf(msgIds)
      .and((x) => {
        return x.sessionId === sessionId && x.sessionType === sessionType;
      })
      .sortBy('created');
  }

  @SyncTime()
  public convertFromMsgDataRaws(
    msgDataRaws: WL.Session.IMsgData[],
    myUserId: number,
  ): WL_IDbMsgData[] {
    const count = msgDataRaws.length;
    const msgDatas: WL_IDbMsgData[] = [];
    wllog('msgCount:', count);
    for (let i = 0; i < count; i++) {
      const msgData: WL_IDbMsgData = {} as WL_IDbMsgData;
      msgData.created = Long.fromValue(msgDataRaws[i].created).toNumber();
      msgData.msgId = msgDataRaws[i].msgId;
      if (
        msgDataRaws[i].sessionType === WL.Common.SessionType.SESSION_TYPE_SINGLE &&
        msgDataRaws[i].senderId !== myUserId
      ) {
        msgData.senderId = msgDataRaws[i].senderId;
        msgData.sessionId = msgDataRaws[i].senderId.toString(10);
      } else {
        msgData.senderId = msgDataRaws[i].senderId;
        msgData.sessionId = msgDataRaws[i].sessionId.toString(10);
      }
      msgData.sessionType = msgDataRaws[i].sessionType;
      msgData.autoReply = msgDataRaws[i].autoReply;
      msgData.tag = msgDataRaws[i].tag;
      msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ;

      switch (msgDataRaws[i].msgType) {
        case WL.Session.MessageType.MSG_TYPE_TEXT:
          {
            const textMsgData = TextMsgDataParser.decodeSessionTextMsg(msgDataRaws[i].textData!);
            if (textMsgData !== undefined) {
              msgData.msgType = textMsgData.msgType;
              msgData.textData = textMsgData.textData;
              msgData.location = textMsgData.location;
              msgData.fileInfo = textMsgData.fileInfo;
              msgData.command = textMsgData.command;
            } else {
              msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR;
            }
          }
          break;

        case WL.Session.MessageType.MSG_TYPE_PTT:
          {
            msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE;
            msgData.pttData = {} as WL_IDbPttData;
            msgData.pttData.data = msgDataRaws[i].pttData.opusData.payload;
            msgData.pttData.frameCount = msgDataRaws[i].pttData.opusData.frameCount;
            msgData.pttData.seq = msgDataRaws[i].pttData.seq;
            msgData.pttData.seqInPackage = msgDataRaws[i].pttData.packageSeq;
            msgData.pttData.mark = msgDataRaws[i].pttData.marker;
            msgData.pttData.sourceType = msgDataRaws[i].pttData.source;
          }
          break;

        case WL.Session.MessageType.MSG_TYPE_AUDIO:
          {

            msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE;
            msgData.audioData = {} as WL_IDbAudioData;
            msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW;


            if (msgDataRaws[i].audioData) {

            }

            if (msgDataRaws[i].audioData.payload && msgDataRaws[i].audioData.payload.length > 0) {
              msgData.audioData.data = msgDataRaws[i].audioData.payload.slice(0);
              msgData.audioData.audioUrl = undefined;
              msgData.audioData.frameCount = calculateOpusDataFrame(msgData.audioData.data);
            } else if (msgDataRaws[i].audioData.url && msgDataRaws[i].audioData.url !== '') {
              msgData.audioData.data = undefined;
              msgData.audioData.audioUrl = msgDataRaws[i].audioData.url;
              msgData.audioData.frameCount = 0;
            } else {
              msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR;
            }


          }
          break;

        case WL.Session.MessageType.MSG_TYPE_SERVICE:
          {
            msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_SERVICE_TYPE;
            msgData.serviceData = msgDataRaws[i].serviceData;
          }
          break;

        case WL.Session.MessageType.MSG_TYPE_SWITCH:
          {
            msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_SWITCH_TYPE;
            msgData.switchData = msgDataRaws[i].switchData.serviceData;
          }
          break;

        case WL.Session.MessageType.MSG_TYPE_REVOCATION:
          {
            msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE;
            msgData.withdrawMsgId = msgDataRaws[i].revocationMsgId;
          }
          break;

        default:
          {
            msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR;
          }
          break;
      }

      if (msgData.status !== WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR) {
        msgDatas.push(msgData);
      }
    }

    return msgDatas;
  }

  @AsyncTime()
  public async putMsgDatas(msgDatas: WL_IDbMsgData[]): Promise<string[]> {
    if (!msgDatas.length) {
      return [];
    }
    const ids = await this.msgDatas.bulkPut(msgDatas, { allKeys: true });
    wllog('批量存入%d条消息:', ids.length);
    return ids;
  }

  @AsyncTime()
  public async putMsgData(msgData: WL_IDbMsgData): Promise<string> {
    return this.msgDatas.put(msgData);
  }

  @AsyncTime()
  public async delMsgDataByComboId(combo_id: string): Promise<void> {
    wllog('删除单个消息:', combo_id);
    return this.msgDatas.delete(combo_id);
  }

  @AsyncTime()
  public async updateMsgDataStatus(combo_id: string, status: WL_IDbMsgDataStatus): Promise<string> {
    return this.transaction<string>('rw', this.msgDatas, async () => {
      const msgData = await this.msgDatas.get(combo_id);
      msgData.status = status;
      return this.msgDatas.put(msgData);
    });
  }

  @AsyncTime()
  public async getLastMsgDatas(
    sessionId: string,
    sessionType: number,
    count: number,
  ): Promise<WL_IDbMsgData[]> {
    wllog('获取最后%d条消息:', count);
    return this.msgDatas
      .orderBy('created')
      .and((x) => {
        return x.sessionId === sessionId && x.sessionType === sessionType;
      })
      .reverse()
      .limit(count)
      .toArray();
  }

  @AsyncTime()
  public async getMsgDatasWithRange(
    sessionId: string,
    sessionType: number,
    fromMsgId: number,
    count: number,
  ): Promise<WL_IDbMsgData[]> {
    if (fromMsgId < count) {
      count = fromMsgId;
    }
    wllog('获取从%d获取%d条消息:', fromMsgId, count);
    return this.msgDatas
      .orderBy('created')
      .and((x) => {
        return x.sessionId === sessionId && x.sessionType === sessionType && x.msgId <= fromMsgId;
      })
      .reverse()
      .limit(count)
      .toArray();
  }

  @AsyncTime()
  public async getMsgData(combo_id: string): Promise<WL_IDbMsgData | undefined> {
    return this.msgDatas.get(combo_id);
  }

  @AsyncTime()
  public async getUnReadAudioMsg(
    sessionId: string,
    sessionType: number,
    sinceMsgId: number,
  ): Promise<WL_IDbMsgData[]> {
    return this.msgDatas
      .where('[sessionId+sessionType]')
      .equals([sessionId, sessionType])
      .and((x) => {
        return (
          x.msgId >= sinceMsgId &&
          x.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE &&
          x.status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW
        );
      })
      .sortBy('created');
  }

  @AsyncTime()
  public async getMsgDataByMsgId(
    sessionId: string,
    sessionType: number,
    msgId: number,
  ): Promise<WL_IDbMsgData | undefined> {
    return this.msgDatas
      .where('[sessionId+sessionType]')
      .equals([sessionId, sessionType])
      .and((x) => {
        return x.msgId === msgId;
      })
      .first();
  }

  @AsyncTime()
  public async delMsgDatas(sessionId: string, sessionType: number): Promise<void> {
    const deletedNum = await this.msgDatas
      .where('[sessionId+sessionType]')
      .equals([sessionId, sessionType])
      .delete();
    wllog('批量删除消息%d个', deletedNum);
  }

  @AsyncTime()
  public async getLastMsgData(
    sessionId: string,
    sessionType: number,
  ): Promise<WL_IDbMsgData | undefined> {
    return this.msgDatas
      .orderBy('created')
      .and((x) => {
        return x.sessionId === sessionId && x.sessionType === sessionType;
      })
      .last();
  }

  @AsyncTime()
  public async putNotification(notification: WL_IDbNotification): Promise<number> {
    const id = await this.notifications.put(notification);
    wllog('存入通知消息:', id);
    return id;
  }

  @AsyncTime()
  public async putNotifications(notifications: WL_IDbNotification[]): Promise<number[]> {
    const ids = await this.notifications.bulkPut(notifications, { allKeys: true });
    wllog('批量存入%d条通知消息:', ids.length);
    return ids;
  }

  @AsyncTime()
  public async getNotifications(
    notificationTypes: WL_IDbNotificationType[],
  ): Promise<WL_IDbNotification[]> {
    const notifications = await this.notifications
      .where('notificationType')
      .anyOf(notificationTypes)
      .sortBy('createTime');
    notifications.reverse();
    return notifications;
  }

  @AsyncTime()
  public async getAllNotifications(): Promise<WL_IDbNotification[]> {
    return this.notifications.orderBy('createTime').reverse().toArray();
  }

  @SyncTime()
  public convertFromExtensionInfoRaw(
    extensionInfoRaw: WL.Login.IExtensionInfo,
  ): WL_IDbExtensionInfo {
    const extensionInfo = {} as WL_IDbExtensionInfo;
    extensionInfo.config = extensionInfoRaw.config;
    extensionInfo.extensionType = WL_IDbExtensionType.EXTENSION_SLAVE;
    extensionInfo.userId = extensionInfoRaw.userId;
    extensionInfo.imei = extensionInfoRaw.imei;
    extensionInfo.status = extensionInfoRaw.status;
    extensionInfo.productName = extensionInfoRaw.product;
    extensionInfo.activeTime = Long.fromValue(extensionInfoRaw.actived).toNumber();
    extensionInfo.groupLimit = extensionInfoRaw.groupLimit;
    extensionInfo.groupCount = extensionInfoRaw.groupCount;
    extensionInfo.supervisorId = extensionInfoRaw.managerId;
    extensionInfo.createdTime = Long.fromValue(extensionInfoRaw.created).toNumber();
    extensionInfo.state = extensionInfoRaw.state;
    extensionInfo.version = extensionInfoRaw.version;
    extensionInfo.warrant = Long.fromValue(extensionInfoRaw.warranted).toNumber();

    return extensionInfo;
  }

  @AsyncTime()
  public async putExtension(extension: WL_IDbExtensionInfo): Promise<number> {
    return this.extensions.put(extension);
  }

  @AsyncTime()
  public async putExtensions(extensions: WL_IDbExtensionInfo[]): Promise<number[]> {
    return this.extensions.bulkPut(extensions, { allKeys: true });
  }

  @AsyncTime()
  public async delExtension(userId: number): Promise<void> {
    return this.extensions.delete(userId);
  }

  @AsyncTime()
  public async getExtensions(userIds?: number[]): Promise<WL_IDbExtensionInfo[]> {
    if (userIds) {
      return this.extensions.where('userId').anyOf(userIds).toArray();
    }

    return this.extensions.toArray();
  }

  @AsyncTime()
  public async getExtension(userId: number): Promise<WL_IDbExtensionInfo> {
    return this.extensions.get(userId);
  }

  @SyncTime()
  public convertFromServiceSessionRaw(
    serviceSession: WL.Business.IServiceSession,
  ): WL_IDbServiceSessionInfo {
    const serviceSessionInfo = {} as WL_IDbServiceSessionInfo;
    serviceSessionInfo.serviceSession = {} as WL_IDbServiceSession;
    serviceSessionInfo.service = this.convertFromServiceRaw(serviceSession.serviceAttribute);
    serviceSessionInfo.staffs = [];
    const staffs = this.convertFromStaffRaws(serviceSession.staffAttributes);
    const userInfos = this.convertFromUserRaw(
      serviceSession.staffAttributes.map((value) => {
        return value.userInfo;
      }),
    );
    serviceSessionInfo.staffs = staffs.map((value, index) => {
      const staffInfo = {} as WL_IDbServiceStaffInfo;
      staffInfo.userData = userInfos[index];
      staffInfo.staff = value;
      return staffInfo;
    });
    serviceSessionInfo.customer = this.convertFromUserRaw([
      serviceSession.customerAttribute.userInfo,
    ])[0];
    serviceSessionInfo.serviceSession.serviceId = serviceSession.serviceAttribute.id;
    serviceSessionInfo.serviceSession.serviceStatus = serviceSession.status;
    serviceSessionInfo.serviceSession.staffIds = serviceSession.staffAttributes.map((value) => {
      return value.userInfo.userId;
    });
    serviceSessionInfo.serviceSession.customerId = serviceSession.customerAttribute.userInfo.userId;
    serviceSessionInfo.serviceSession.createdTime = Long.fromValue(
      serviceSession.created,
    ).toNumber();
    serviceSessionInfo.serviceSession.updatedTime = Long.fromValue(
      serviceSession.updated,
    ).toNumber();

    return serviceSessionInfo;
  }

  @SyncTime()
  public convertFromServiceRaw(serviceRaw: WL.Business.IServiceAttribute): WL_IDbService {
    const service = {} as WL_IDbService;
    service.serviceId = serviceRaw.id;
    service.serviceNum = serviceRaw.number;
    service.serviceClass = serviceRaw.class;
    service.serviceType = serviceRaw.type;
    service.avatar = serviceRaw.avatar;
    service.intro = serviceRaw.intro;
    service.name = serviceRaw.name;
    service.url = serviceRaw.url;
    service.createdTime = Long.fromValue(serviceRaw.created).toNumber();
    return service;
  }

  @AsyncTime()
  public async putService(service: WL_IDbService): Promise<number> {
    return this.service.put(service);
  }

  @AsyncTime()
  public async putServices(services: WL_IDbService[]): Promise<number[]> {
    return this.service.bulkPut(services, { allKeys: true });
  }

  @AsyncTime()
  public async getService(serviceId: number): Promise<WL_IDbService | undefined> {
    return this.service.get(serviceId);
  }

  @AsyncTime()
  public async getServices(serviceIds: number[]): Promise<WL_IDbService[]> {
    const result = await this.service.bulkGet(serviceIds);
    return result.filter((value) => {
      return value !== undefined;
    });
  }

  @AsyncTime()
  public async removeService(serviceId: number): Promise<void> {
    return this.service.delete(serviceId);
  }

  @SyncTime()
  public convertFromStaffRaws(staffRaws: WL.Business.IStaffAttribute[]): WL_IDbServiceStaff[] {
    return staffRaws.map((value) => {
      const dbStaff = {} as WL_IDbServiceStaff;
      dbStaff.userId = value.userInfo.userId;
      dbStaff.staffClass = value.class;
      dbStaff.staffType = value.type;
      dbStaff.admin = value.admin;
      dbStaff.isOperator = value.operator === 1;
      dbStaff.createdTime = Long.fromValue(value.created).toNumber();
      return dbStaff;
    });
  }

  @AsyncTime()
  public async putServiceStaff(staff: WL_IDbServiceStaff): Promise<number> {
    return this.service_staffs.put(staff);
  }

  @AsyncTime()
  public async putServiceStaffs(staffs: WL_IDbServiceStaff[]): Promise<number[]> {
    return this.service_staffs.bulkPut(staffs, { allKeys: true });
  }

  @AsyncTime()
  public async getServiceStaff(userId: number): Promise<WL_IDbServiceStaffInfo | undefined> {
    const staffInfo = {} as WL_IDbServiceStaffInfo;
    const staff = await this.service_staffs.get(userId);
    if (staff) {
      staffInfo.staff = staff;
      staffInfo.userData = await this.users.get(staff.userId);
      return staffInfo;
    }

    return undefined;
  }

  @AsyncTime()
  public async getServiceStaffs(userIds: number[]): Promise<WL_IDbServiceStaffInfo[]> {
    const staffInfos = [] as WL_IDbServiceStaffInfo[];
    const staffs = await this.service_staffs.bulkGet(userIds);

    for (let staff of staffs) {
      if (staff) {
        const staffInfo = {} as WL_IDbServiceStaffInfo;
        staffInfo.staff = staff;
        staffInfo.userData = await this.users.get(staff.userId);
        staffInfos.push(staffInfo);
      }
    }

    return staffInfos;
  }

  @AsyncTime()
  public async delServiceStaff(userId: number): Promise<void> {
    return this.service_staffs.delete(userId);
  }
}

export { WeilaDB };
