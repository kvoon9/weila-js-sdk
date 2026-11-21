import { Dexie } from 'dexie'
import { WL } from 'proto/weilapb'
import Long from 'long'
import {
  WL_IDbAudioData,
  WL_IDbExtensionInfo,
  WL_IDbExtensionState,
  WL_IDbExtensionType,
  WL_IDbFriend,
  WL_IDbFriendInfo,
  WL_IDbFriendStatus,
  WL_IDbGroup,
  WL_IDbGroupAuthType,
  WL_IDbGroupMember,
  WL_IDbGroupPublicType,
  WL_IDbGroupType,
  WL_IDbMemberInfo,
  WL_IDbMemberStatus,
  WL_IDbMemberType,
  WL_IDbMsgData,
  WL_IDbMsgDataStatus,
  WL_IDbMsgDataType,
  WL_IDbNotification,
  WL_IDbNotificationType,
  WL_IDbService,
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
  WL_ServiceStatus,
  applySessionExtraProfile,
  inheritSessionProfile,
  isGroupSessionType,
  isIndividualSessionType,
  isServiceSessionType,
} from './weila_db_data'
import { dbEnum } from './db_enum'
import { getLogger } from 'log/weila_log'
import TinyPinyin from 'tiny-pinyin'
import { default_group_logo } from 'main/weila_internal_data'
import { TextMsgDataParser } from 'proto/weilapb_textmsg_parser'
import { AsyncTime, calculateOpusDataFrame, getMsgDataIdByCombo, SyncTime } from 'main/weila_utils'

const wllog = getLogger('DB:core:info')
const _wlerr = getLogger('DB:core:err')

// Opening without a version never upgrades. `$meta` holds the logical version after Dexie
// patches a same-version schema, and the floored native version is the fallback for Dexie 3
// databases and for a patch that bumped the native version without writing `$meta`.
function readInstalledSchemaVersion(dbName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let creating = false
    let settled = false
    const request = indexedDB.open(dbName)

    request.addEventListener('upgradeneeded', () => {
      creating = true
      request.transaction?.abort()
    })

    request.addEventListener('blocked', () => {
      settled = true
      reject(new Error(`数据库 ${dbName} 被其他连接占用`))
    })

    request.addEventListener('error', () => {
      if (creating && request.error?.name === 'AbortError') {
        settled = true
        resolve(0)

        return
      }

      settled = true
      reject(request.error ?? new Error(`无法读取数据库 ${dbName} 的版本`))
    })

    request.addEventListener('success', () => {
      const db = request.result

      if (settled) {
        db.close()

        return
      }

      const nativeVersion = db.version

      if (!db.objectStoreNames.contains('$meta')) {
        db.close()
        resolve(Math.floor(nativeVersion / 10))

        return
      }

      const getRequest = db.transaction('$meta', 'readonly').objectStore('$meta').get('version')

      getRequest.addEventListener('success', () => {
        const logicalVersion = getRequest.result
        db.close()
        resolve(
          Number.isFinite(logicalVersion) ? Number(logicalVersion) : Math.floor(nativeVersion / 10),
        )
      })

      getRequest.addEventListener('error', () => {
        db.close()
        reject(getRequest.error ?? new Error(`无法读取数据库 ${dbName} 的逻辑版本`))
      })
    })
  })
}

class WeilaDB extends Dexie {
  sessions: Dexie.Table<WL_IDbSession, string>
  session_setting: Dexie.Table<WL_IDbSessionSetting, string>
  groups: Dexie.Table<WL_IDbGroup, string>
  friends: Dexie.Table<WL_IDbFriendInfo, number>
  users: Dexie.Table<WL_IDbUserInfo, number>
  group_members: Dexie.Table<WL_IDbMemberInfo, string>
  msgDatas: Dexie.Table<WL_IDbMsgData, string>
  settings: Dexie.Table<WL_IDbSetting, number>
  notifications: Dexie.Table<WL_IDbNotification, number, Omit<WL_IDbNotification, 'id'>>
  extensions: Dexie.Table<WL_IDbExtensionInfo, number>
  service: Dexie.Table<WL_IDbService, number>
  service_staffs: Dexie.Table<WL_IDbServiceStaff, number>
  loginUserId: number
  private cleanedWithdrawSessions: Set<string> = new Set()
  static appAuthInfo?: { appKey: string; appId: string }

  private static instance: WeilaDB | null = null
  private static initError: Error | null = null

  public static async init(userId: string, version: number): Promise<void> {
    if (this.instance !== null) return
    const dbName = 'WL_' + userId + '_DB'
    let installedVersion: number

    try {
      installedVersion = await readInstalledSchemaVersion(dbName)
    } catch (error) {
      const initError = error instanceof Error ? error : new Error(String(error))
      this.initError = initError
      _wlerr('读取数据库版本失败:', dbName, initError)
      throw initError
    }

    if (installedVersion > version) {
      const error = new Dexie.VersionError(
        `Refusing to downgrade ${dbName}: installed schema ${installedVersion}, SDK schema ${version} (Dexie VersionError)`,
      )

      this.initError = error
      _wlerr(
        '拒绝降级打开数据库 %s: 已安装版本 %d, 当前 SDK 声明版本 %d (Dexie VersionError)',
        dbName,
        installedVersion,
        version,
      )
      throw error
    }

    this.initError = null
    this.instance = new WeilaDB(userId, version)
  }

  public static setAppAuthInfo(appId: string, appKey: string) {
    this.appAuthInfo = {
      appId,
      appKey,
    }
  }

  public static getAppAuthInfo(): { appKey: string; appId: string } | undefined {
    return this.appAuthInfo
  }

  public static close(): void {
    if (this.instance) {
      this.instance.close()
      this.instance = null
    }

    this.initError = null
  }

  public static getInstance(): WeilaDB {
    if (this.instance === null && this.initError) {
      throw this.initError
    }

    // SAFETY: init() assigns the instance before callers reach here; a null return is the existing
    // pre-init contract that this public signature already advertises.
    return this.instance!
  }

  constructor(userId: string, version: number) {
    const dbName = 'WL_' + userId + '_DB'
    super(dbName)
    this.loginUserId = parseInt(userId)
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
    })

    this.sessions = this.table('sessions')
    this.groups = this.table('groups')
    this.group_members = this.table('group_members')
    this.users = this.table('users')
    this.friends = this.table('friends')
    this.msgDatas = this.table('msgDatas')
    this.settings = this.table('settings')
    this.notifications = this.table('notifications')
    this.session_setting = this.table('session_setting')
    this.extensions = this.table('extensions')
    this.service = this.table('service')
    this.service_staffs = this.table('service_staffs')
    wllog('create db name:%s version:%d', dbName, version, this)

    this.settings
      .get(WL_IDbSettingID.SETTING_MSG_SENDING_SEQ)
      .then((value) => {
        if (value === undefined || value.data === 0) {
          const setting: WL_IDbSetting = {
            id: WL_IDbSettingID.SETTING_MSG_SENDING_SEQ,
            data: 10,
          }

          return this.settings.put(setting)
        }

        return undefined
      })
      .catch((error) => {
        _wlerr('初始化数据库设置失败:', this.name, error)
      })
  }

  // 设置相关操作
  public async putSettingItem(item: WL_IDbSetting): Promise<number> {
    return this.settings.put(item)
  }

  public async getSettingItem(id: WL_IDbSettingID): Promise<WL_IDbSetting | undefined> {
    return this.settings.get(id)
  }

  // 会话相关操作
  @AsyncTime()
  public async fillSessionInfo(session: WL_IDbSession): Promise<WL_IDbSession> {
    session.sessionName = ''
    session.sessionAvatar = default_group_logo
    session.status = WL_IDbSessionStatus.SESSION_ACTIVATE

    if (isGroupSessionType(session.sessionType)) {
      const groupInfo = await WeilaDB.getInstance().getGroup(session.sessionId)

      if (groupInfo) {
        session.sessionName = groupInfo.name
        session.sessionAvatar = groupInfo.avatar || default_group_logo
      } else {
        session.status = WL_IDbSessionStatus.SESSION_INVALID
        applySessionExtraProfile(session)
      }
    } else if (isIndividualSessionType(session.sessionType)) {
      const userInfo = await WeilaDB.getInstance().getUser(parseInt(session.sessionId))

      if (userInfo) {
        session.sessionName = userInfo.nick
        session.sessionAvatar = userInfo.avatar
      } else {
        session.status = WL_IDbSessionStatus.SESSION_INVALID
        applySessionExtraProfile(session)
      }
    } else if (isServiceSessionType(session.sessionType)) {
      const serviceId = Long.fromValue(session.sessionId).high
      const service = await WeilaDB.getInstance().getService(serviceId)

      if (service) {
        session.sessionName = service.name
        session.sessionAvatar = service.avatar
      } else {
        session.status = WL_IDbSessionStatus.SESSION_INVALID
        applySessionExtraProfile(session)
      }
    }

    return session
  }

  @AsyncTime()
  public async convertFromSessionRaw(
    sessionRaws: WL.Session.ISessionInfo[],
  ): Promise<WL_IDbSession[]> {
    const sessionCount = sessionRaws.length
    const sessions: WL_IDbSession[] = []

    for (let i = 0; i < sessionCount; i++) {
      const raw = sessionRaws[i]
      const sessionId = Long.fromValue(raw.sessionId ?? 0).toString(10)
      const sessionType = dbEnum<WL_IDbSessionType>(raw.sessionType)
      const readMsgId = raw.readMsgId ?? 0
      let session: WL_IDbSession = {
        sessionId,
        sessionType,
        combo_id_type: sessionId + '_' + sessionType,
        readMsgId,
        latestUpdate: Long.fromValue(raw.latestUpdated ?? 0).toNumber(),
        sessionName: '',
        sessionAvatar: default_group_logo,
        status: WL_IDbSessionStatus.SESSION_ACTIVATE,
        lastMsgId: 0,
      }
      inheritSessionProfile(session, await this.getSession(session.sessionId, session.sessionType))
      wllog('sessionId:%s lastMsgDataRaw:', session.sessionId, raw.latestMsgData)
      const latestMsgData = raw.latestMsgData

      if (latestMsgData) {
        const msgDatas: WL_IDbMsgData[] = this.convertFromMsgDataRaws(
          [latestMsgData],
          this.loginUserId,
        )

        wllog('sessionId:%s lastMsgData:', session.sessionId, msgDatas)

        if (msgDatas.length) {
          session.lastMsgId = msgDatas[0].msgId
          msgDatas[0].combo_id = getMsgDataIdByCombo(msgDatas[0], 0)
          await WeilaDB.getInstance().putMsgData(msgDatas[0])
        }
      }

      session.unreadCount = session.lastMsgId > session.readMsgId ? 1 : 0

      session = await this.fillSessionInfo(session)
      sessions.push(session)
    }

    return sessions
  }

  @AsyncTime()
  public async putSessions(sessions: WL_IDbSession[]): Promise<boolean> {
    const ids = await this.sessions.bulkPut(sessions, { allKeys: true })
    wllog('存入%d个会话', ids.length)

    return true
  }

  @AsyncTime()
  public async putSession(session: WL_IDbSession): Promise<string> {
    const id = await this.sessions.put(session)
    wllog('存入单个会话，返回id', id)

    return id
  }

  @AsyncTime()
  public async getSessionSettings(): Promise<WL_IDbSessionSetting[]> {
    return this.session_setting.toCollection().toArray()
  }

  @AsyncTime()
  public async getSessionSetting(
    sessionId: string,
    sessionType: number,
  ): Promise<WL_IDbSessionSetting | undefined> {
    const comboId = sessionId + '_' + sessionType
    let sessionSetting = await this.session_setting.get(comboId)

    if (!sessionSetting) {
      sessionSetting = {
        sessionId,
        sessionType,
        combo_id_type: comboId,
        tts: false,
        mute: false,
        loactionShared: false,
      }

      if (isIndividualSessionType(sessionType)) {
        const friendInfo = await this.friends.get(parseInt(sessionId))

        if (friendInfo) {
          sessionSetting.tts = friendInfo.tts
          sessionSetting.loactionShared = friendInfo.locationShared
        }
      } else if (isGroupSessionType(sessionType)) {
        const comboId = sessionId + '_' + this.loginUserId
        const memberInfo = await this.group_members.get(comboId)

        if (memberInfo) {
          sessionSetting.tts = memberInfo.tts
          sessionSetting.loactionShared = memberInfo.locationShared
        }
      } else if (isServiceSessionType(sessionType)) {
        sessionSetting.tts = true
        sessionSetting.mute = false
        sessionSetting.loactionShared = true
      }

      await this.session_setting.put(sessionSetting)
    }

    return sessionSetting
  }

  @AsyncTime()
  public async updateSessionSetting(
    sessionId: string,
    sessionType: number,
    params: WL_IDbSessionSettingParams,
  ): Promise<boolean> {
    wllog('updateSessionSetting', params)
    const setting: WL_IDbSessionSettingParams = {}

    if (params.tts !== undefined) {
      setting.tts = params.tts
    }

    if (params.loactionShared !== undefined) {
      setting.loactionShared = params.loactionShared
    }

    if (params.mute !== undefined) {
      setting.mute = params.mute
    }

    if (params.tts !== undefined || params.loactionShared !== undefined) {
      if (isGroupSessionType(sessionType)) {
        const groupInfo = await this.groups.get(sessionId)

        if (groupInfo) {
          const id = groupInfo.groupId + '_' + groupInfo.ownerId
          this.group_members.where('combo_gid_uid').equals(id).modify(setting)
        }
      } else if (isIndividualSessionType(sessionType)) {
        this.friends.where('userId').equals(parseInt(sessionId)).modify(setting)
      } else if (isServiceSessionType(sessionType)) {
        //TODO: 服务类的会话暂时不支持设置到其他属性去

        setting.tts = true
        setting.mute = false
        setting.loactionShared = true
      }
    }

    const id = sessionId + '_' + sessionType
    let sessionSetting = await this.session_setting.get(id)

    if (sessionSetting !== undefined) {
      wllog('修改.......', setting)
      await this.session_setting.where('combo_id_type').equals(id).modify(setting)
    } else {
      sessionSetting = {
        sessionId,
        sessionType,
        combo_id_type: sessionId + '_' + sessionType,
        tts: setting.tts!,
        mute: setting.mute!,
        loactionShared: setting.loactionShared!,
      }

      await this.session_setting.put(sessionSetting)
    }

    return true
  }

  @AsyncTime()
  public async delSessions(comboIds: string[]): Promise<void> {
    const sessionCombos = comboIds.map((value) => {
      const [sessionId, sessionType, ...rest] = value.split('_')

      return [sessionId, parseInt(sessionType), ...rest]
    })

    return this.transaction<void>('rw', this.sessions, this.msgDatas, async () => {
      await this.sessions.bulkDelete(comboIds)
      await this.msgDatas.where('[sessionId+sessionType]').anyOf(sessionCombos).delete()
    })
  }

  @AsyncTime()
  public async getSessions(): Promise<WL_IDbSession[]> {
    const list = await this.sessions.toCollection().toArray()
    wllog(list)

    return list
  }

  @AsyncTime()
  public async getSession(
    sessionId: string,
    sessionType: number,
  ): Promise<WL_IDbSession | undefined> {
    const id = sessionId + '_' + sessionType
    const session = await this.sessions.get(id)

    return session
  }

  @SyncTime()
  public convertFromGroupRaw(groupRaws: WL.Group.IGroupAttribute[]): WL_IDbGroup[] {
    const count = groupRaws.length
    const groups: WL_IDbGroup[] = []

    for (let i = 0; i < count; i++) {
      const raw = groupRaws[i]
      const name = raw.name ?? ''
      const group: WL_IDbGroup = {
        groupId: Long.fromValue(raw.groupId ?? 0).toString(10),
        groupNum: raw.number ?? '',
        groupType: dbEnum<WL_IDbGroupType>(raw.type),
        groupClass: raw.class ?? 0,
        name,
        pinyinName: TinyPinyin.convertToPinyin(name),
        avatar: raw.avatar ?? '',
        memberCount: raw.memberCount ?? 0,
        memberLimit: raw.memberLimit ?? 0,
        memberVersion: raw.memberVersion ?? 0,
        version: raw.version ?? 0,
        ownerId: raw.ownerId ?? 0,
        desc: raw.desc ?? undefined,
        latitude: raw.latitude ?? undefined,
        longitude: raw.longitude ?? undefined,
        speechEnable: raw.shutupStatus === 0,
        audioQuality: raw.audioQuality ?? 0,
        authType: dbEnum<WL_IDbGroupAuthType>(raw.authType),
        publicType: dbEnum<WL_IDbGroupPublicType>(raw.publicType),
        burstType: raw.burstType ?? 0,
        home: raw.home ?? undefined,
        created: Long.fromValue(raw.created ?? 0).toNumber(),
      }

      groups.push(group)
    }

    return groups
  }

  @AsyncTime()
  public async putGroups(groups: WL_IDbGroup[]): Promise<boolean> {
    const ids = await this.groups.bulkPut(groups, { allKeys: true })
    wllog('存入%d个群:', ids.length)

    return true
  }

  @AsyncTime()
  public async putGroup(group: WL_IDbGroup): Promise<string> {
    const id = await this.groups.put(group)
    wllog('存入单个群:', id)

    return id
  }

  @AsyncTime()
  public async delGroups(groupIds: string[]): Promise<void> {
    return this.transaction<void>('rw', this.groups, this.group_members, async () => {
      await this.groups.bulkDelete(groupIds)
      await this.group_members.where('groupId').anyOf(groupIds).delete()
      wllog('批量删除群')
    })
  }

  @AsyncTime()
  public async getGroups(groupIds?: string[]): Promise<WL_IDbGroup[]> {
    if (groupIds) {
      const result = await this.groups.bulkGet(groupIds)

      return result.filter((value) => {
        return value !== undefined
      })
    }

    return this.groups.toArray()
  }

  @AsyncTime()
  public async getGroup(groupId: string): Promise<WL_IDbGroup | undefined> {
    return this.groups.get(groupId)
  }

  @AsyncTime()
  public async getGroupsSortByProperty(
    property: 'pinyinName' | 'groupType' | 'created',
  ): Promise<WL_IDbGroup[]> {
    return this.groups.toCollection().sortBy(property)
  }

  @AsyncTime()
  public async getGroupCount(): Promise<number> {
    return this.groups.count()
  }

  @SyncTime()
  public convertFromMemberRaw(
    groupId: string,
    memberRaws: WL.Group.IGroupMemberInfo[],
  ): WL_IDbMemberInfo[] {
    const count = memberRaws.length
    const memberInfos: WL_IDbMemberInfo[] = []

    for (let i = 0; i < count; i++) {
      const raw = memberRaws[i]
      const userId = raw.userId ?? 0
      const memberInfo: WL_IDbMemberInfo = {
        memberType: dbEnum<WL_IDbMemberType>(raw.type),
        speechEnable: raw.shutupStatus === 0,
        tts: raw.tts === 1,
        locationShared: raw.locationShare === 1,
        blockedStatus: raw.shieldStatus === 1,
        speechDisableTimeout: Long.fromValue(raw.shutupTimeout ?? 0).toNumber(),
        priority: raw.prority ?? 0,
        userId,
        groupId,
        remark: raw.remark ?? undefined,
        status: dbEnum<WL_IDbMemberStatus>(raw.status),
        created: Long.fromValue(raw.created ?? 0).toNumber(),
        combo_gid_uid: groupId + '_' + userId,
      }
      memberInfos.push(memberInfo)
    }

    return memberInfos
  }

  @AsyncTime()
  public async putMemberInfos(memberInfos: WL_IDbMemberInfo[]): Promise<boolean> {
    const ids = await this.group_members.bulkPut(memberInfos, { allKeys: true })
    wllog('批量存入%d个成员信息', ids.length)

    return true
  }

  @AsyncTime()
  public async putMemberInfo(memberInfo: WL_IDbMemberInfo): Promise<string> {
    const id = await this.group_members.put(memberInfo)
    wllog('存入成员信息', id)

    return id
  }

  @AsyncTime()
  public async delMemberInfos(groupId: string, userIds: number[]): Promise<void> {
    const count = this.group_members
      .where('userId')
      .anyOf(userIds)
      .and((x) => {
        return x.groupId === groupId
      })
      .delete()

    wllog('删除了%d个群成员', count)
  }

  @AsyncTime()
  public async getGroupMembers(groupId: string): Promise<WL_IDbGroupMember[]> {
    const memberInfos: WL_IDbMemberInfo[] = await this.group_members
      .where('groupId')
      .equals(groupId)
      .toArray()

    const groupMembers: WL_IDbGroupMember[] = []
    const count = memberInfos.length

    const ids: number[] = memberInfos.map((value) => {
      return value.userId
    })

    const userInfos = await this.getUserInfos(ids)

    const allIds = userInfos.map((value) => {
      return value.userId
    })

    for (let i = 0; i < count; i++) {
      // 这种速度比findIndex快很多
      const index = allIds.indexOf(memberInfos[i].userId)

      if (index !== -1) {
        const groupMember: WL_IDbGroupMember = {
          memberInfo: memberInfos[i],
          userInfo: userInfos[index],
        }
        groupMembers.push(groupMember)
      }
    }

    return groupMembers
  }

  @AsyncTime()
  public async getGroupMemberInfo(
    groupId: string,
    userId: number,
  ): Promise<WL_IDbMemberInfo | undefined> {
    const id = groupId + '_' + userId

    return this.group_members.get(id)
  }

  @AsyncTime()
  public async getGroupMember(
    groupId: string,
    userId: number,
  ): Promise<WL_IDbGroupMember | undefined> {
    const id = groupId + '_' + userId
    const memberInfo = await this.group_members.get(id)

    if (!memberInfo) {
      return undefined
    }

    const groupMember: WL_IDbGroupMember = {
      memberInfo,
      userInfo: await this.users.get(userId),
    }

    return groupMember
  }

  @AsyncTime()
  public async getGroupAdminMembers(groupId: string): Promise<WL_IDbGroupMember[]> {
    const groupMembers: WL_IDbGroupMember[] = []

    const memberInfos: WL_IDbMemberInfo[] = await this.group_members
      .where('[groupId+memberType]')
      .equals([groupId, WL_IDbMemberType.ADMIN_MEMBER_TYPE])
      .toArray()

    const ids = memberInfos.map((value) => {
      return value.userId
    })

    const userInfos = await this.getUserInfos(ids)

    const allUserIds = userInfos.map((value) => {
      return value.userId
    })

    const count = memberInfos.length

    for (let i = 0; i < count; i++) {
      const index = allUserIds.indexOf(memberInfos[i].userId)

      if (index !== -1) {
        const groupMember: WL_IDbGroupMember = {
          memberInfo: memberInfos[i],
          userInfo: userInfos[index],
        }
        groupMembers.push(groupMember)
      }
    }

    return groupMembers
  }

  @SyncTime()
  public convertFromFriendRaw(friendRaws: WL.Friend.IFriendInfo[]): WL_IDbFriendInfo[] {
    const count = friendRaws.length
    const friendInfos: WL_IDbFriendInfo[] = []

    for (let i = 0; i < count; i++) {
      const raw = friendRaws[i]
      const friendInfo: WL_IDbFriendInfo = {
        remark: raw.remark ?? undefined,
        tts: raw.tts === 1,
        userId: raw.userId ?? 0,
        desc: raw.desc ?? undefined,
        status: dbEnum<WL_IDbFriendStatus>(raw.status),
        blockedStatus: raw.shieldStatus === 1,
        label: raw.label ?? undefined,
        locationShared: raw.locationShare === 1,
        extension: raw.extension ?? undefined,
      }

      friendInfos.push(friendInfo)
    }

    return friendInfos
  }

  @AsyncTime()
  public async putFriendInfos(friendInfos: WL_IDbFriendInfo[]): Promise<boolean> {
    const ids = await this.friends.bulkPut(friendInfos, { allKeys: true })
    wllog('批量存入%d个好友:', ids.length)

    return true
  }

  @AsyncTime()
  public async putFriendInfo(friendInfo: WL_IDbFriendInfo): Promise<number> {
    const id = await this.friends.put(friendInfo)
    wllog('存入单个好友:', id)

    return id
  }

  @AsyncTime()
  public async delFriendInfos(userIds: number[]): Promise<void> {
    return this.friends.bulkDelete(userIds)
  }

  @AsyncTime()
  public async getFriends(userIds?: number[]): Promise<WL_IDbFriend[]> {
    const friends: WL_IDbFriend[] = []
    let friendInfos = await this.friends.orderBy('userId').toArray()

    if (userIds) {
      friendInfos = friendInfos.filter((value) => {
        return userIds.indexOf(value.userId) !== -1
      })
    }

    const ids = friendInfos.map((value) => {
      return value.userId
    })

    const userInfos = await this.getUserInfos(ids)

    const allIds = userInfos.map((value) => {
      return value.userId
    })

    const count = friendInfos.length

    for (let i = 0; i < count; i++) {
      const index = allIds.indexOf(friendInfos[i].userId)

      if (index !== -1) {
        const friend: WL_IDbFriend = {
          friendInfo: friendInfos[i],
          userInfo: userInfos[index],
        }
        friends.push(friend)
      }
    }

    return friends
  }

  @AsyncTime()
  public async getFriendInfo(userId: number): Promise<WL_IDbFriendInfo | undefined> {
    return this.friends.get(userId)
  }

  @AsyncTime()
  public async getFriendInfos(userIds?: number[]): Promise<WL_IDbFriendInfo[]> {
    if (userIds) {
      return this.friends.where('userId').anyOf(userIds).toArray()
    }

    return this.friends.toArray()
  }

  @AsyncTime()
  public async getFriend(userId: number): Promise<WL_IDbFriend | undefined> {
    const friendInfo = await this.friends.get(userId)

    if (!friendInfo) {
      return undefined
    }

    const friend: WL_IDbFriend = {
      friendInfo,
      userInfo: (await this.users.get(userId)) ?? null,
    }

    return friend
  }

  @AsyncTime()
  public async getFriendCount(): Promise<number> {
    return this.friends.count()
  }

  @SyncTime()
  public convertFromUserRaw(userRaws: WL.Common.IUserInfo[]): WL_IDbUserInfo[] {
    const count = userRaws.length
    const userInfos: WL_IDbUserInfo[] = []

    for (let i = 0; i < count; i++) {
      const raw = userRaws[i]
      const nick = raw.nick ?? ''
      const userInfo: WL_IDbUserInfo = {
        userId: raw.userId ?? 0,
        avatar: raw.avatar ?? '',
        countryCode: raw.countryCode ?? undefined,
        created: Long.fromValue(raw.created ?? 0).toNumber(),
        email: raw.email ?? undefined,
        nick,
        pinyinName: TinyPinyin.convertToPinyin(nick),
        phone: raw.phone ?? undefined,
        sex: raw.sex ?? 0,
        signature: raw.signature ?? undefined,
        status: raw.status ?? 0,
        userType: raw.type ?? 0,
        weilaNum: raw.number ?? '',
      }

      userInfos.push(userInfo)
    }

    return userInfos
  }

  @AsyncTime()
  public async putUserInfos(userInfos: WL_IDbUserInfo[]): Promise<boolean> {
    const ids = await this.users.bulkPut(userInfos, { allKeys: true })
    wllog('批量存入%d个用户信息:', ids.length)

    return true
  }

  @AsyncTime()
  public async putUserInfo(userInfo: WL_IDbUserInfo): Promise<number> {
    wllog('存入单个用户信息:', this, userInfo)
    const id = await this.users.put(userInfo)
    wllog('存入单个用户信息:', id)

    return id
  }

  @AsyncTime()
  public async delUserInfos(userIds: number[]): Promise<void> {
    return this.users.bulkDelete(userIds)
  }

  @AsyncTime()
  public async getUserInfos(userIds?: number[]): Promise<WL_IDbUserInfo[]> {
    if (userIds) {
      const allUsers = await this.users.orderBy('userId').toArray()

      return allUsers.filter((value) => {
        return userIds.indexOf(value.userId) !== -1
      })
    }

    return this.users.toArray()
  }

  @AsyncTime()
  public async getUser(userId: number): Promise<WL_IDbUserInfo | undefined> {
    return this.users.get(userId)
  }

  @AsyncTime()
  public async getMsgDataByComboIds(comboIds: string[]): Promise<WL_IDbMsgData[]> {
    const result = await this.msgDatas.bulkGet(comboIds)

    return result.filter((value) => {
      return value !== undefined
    })
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
        return x.sessionId === sessionId && x.sessionType === sessionType
      })
      .sortBy('created')
  }

  @SyncTime()
  public convertFromMsgDataRaws(
    msgDataRaws: WL.Session.IMsgData[],
    myUserId: number,
  ): WL_IDbMsgData[] {
    const count = msgDataRaws.length
    const msgDatas: WL_IDbMsgData[] = []
    wllog('msgCount:', count)

    for (let i = 0; i < count; i++) {
      const raw = msgDataRaws[i]
      const senderId = raw.senderId ?? 0
      const isIndividualMsg =
        isIndividualSessionType(raw.sessionType ?? 0) && raw.senderId !== myUserId
      const msgData: WL_IDbMsgData = {
        combo_id: '',
        senderId,
        sessionId: isIndividualMsg
          ? senderId.toString(10)
          : Long.fromValue(raw.sessionId ?? 0).toString(10),
        sessionType: raw.sessionType ?? 0,
        msgId: raw.msgId ?? 0,
        msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_UNKNOWN_TYPE,
        created: Long.fromValue(raw.created ?? 0).toNumber(),
        autoReply: raw.autoReply ?? 0,
        status: WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ,
      }
      msgData.tag = raw.tag ?? undefined

      switch (raw.msgType) {
        case WL.Session.MessageType.MSG_TYPE_TEXT:
          {
            const textMsgData = TextMsgDataParser.decodeSessionTextMsg(raw.textData!)

            if (textMsgData !== undefined) {
              msgData.msgType = textMsgData.msgType
              msgData.textData = textMsgData.textData
              msgData.location = textMsgData.location
              msgData.fileInfo = textMsgData.fileInfo
              msgData.command = textMsgData.command
            } else {
              msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR
            }
          }

          break

        case WL.Session.MessageType.MSG_TYPE_PTT:
          {
            msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE

            if (raw.pttData) {
              msgData.pttData = {
                data: raw.pttData.opusData?.payload ?? new Uint8Array(),
                frameCount: raw.pttData.opusData?.frameCount ?? 0,
                seq: raw.pttData.seq ?? 0,
                seqInPackage: raw.pttData.packageSeq ?? 0,
                mark: raw.pttData.marker ?? 0,
                sourceType: raw.pttData.source ?? 0,
              }
            } else {
              msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR
            }
          }

          break

        case WL.Session.MessageType.MSG_TYPE_AUDIO:
          {
            msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
            msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW

            const audioData: WL_IDbAudioData = { frameCount: 0 }
            msgData.audioData = audioData
            const audioRaw = raw.audioData

            if (audioRaw?.payload && audioRaw.payload.length > 0) {
              audioData.data = audioRaw.payload.slice(0)
              audioData.audioUrl = undefined
              audioData.frameCount = calculateOpusDataFrame(audioData.data)
            } else if (audioRaw?.url && audioRaw.url !== '') {
              audioData.data = undefined
              audioData.audioUrl = audioRaw.url
              audioData.frameCount = 0
            } else {
              msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR
            }
          }

          break

        case WL.Session.MessageType.MSG_TYPE_SERVICE:
          {
            msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_SERVICE_TYPE
            msgData.serviceData = raw.serviceData ?? undefined
          }

          break

        case WL.Session.MessageType.MSG_TYPE_SWITCH:
          {
            msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_SWITCH_TYPE
            msgData.switchData = raw.switchData?.serviceData ?? undefined
          }

          break

        case WL.Session.MessageType.MSG_TYPE_REVOCATION:
          {
            msgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE
            msgData.withdrawMsgId = raw.revocationMsgId ?? undefined
          }

          break

        default:
          {
            msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR
          }

          break
      }

      if (msgData.status !== WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR) {
        msgDatas.push(msgData)
      }
    }

    return msgDatas
  }

  @AsyncTime()
  public async putMsgDatas(msgDatas: WL_IDbMsgData[]): Promise<string[]> {
    if (!msgDatas.length) {
      return []
    }

    const ids = await this.msgDatas.bulkPut(msgDatas, { allKeys: true })
    wllog('批量存入%d条消息:', ids.length)

    return ids
  }

  @AsyncTime()
  public async putMsgData(msgData: WL_IDbMsgData): Promise<string> {
    return this.msgDatas.put(msgData)
  }

  @AsyncTime()
  public async delMsgDataByComboId(combo_id: string): Promise<void> {
    wllog('删除单个消息:', combo_id)

    return this.msgDatas.delete(combo_id)
  }

  @AsyncTime()
  public async updateMsgDataStatus(combo_id: string, status: WL_IDbMsgDataStatus): Promise<string> {
    return this.transaction<string>('rw', this.msgDatas, async () => {
      const msgData = await this.msgDatas.get(combo_id)

      if (!msgData) {
        throw new Error(`消息不存在: ${combo_id}`)
      }

      msgData.status = status

      return this.msgDatas.put(msgData)
    })
  }

  /**
   * 处理并清理本地数据库中遗留的撤回控制消息。
   * 将控制消息指向的原消息标记为已撤回，并删除控制消息本身。
   */
  @AsyncTime()
  private async applyWithdrawControlMessages(
    sessionId: string,
    sessionType: number,
  ): Promise<void> {
    const key = `${sessionId}_${sessionType}`

    if (this.cleanedWithdrawSessions.has(key)) {
      return
    }

    this.cleanedWithdrawSessions.add(key)

    const controls = await this.msgDatas
      .where('msgType')
      .equals(WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE)
      .and((x) => x.sessionId === sessionId && x.sessionType === sessionType)
      .toArray()

    if (!controls.length) {
      return
    }

    await this.transaction('rw', this.msgDatas, async () => {
      for (const control of controls) {
        if (control.withdrawMsgId) {
          const target = await this.getMsgDataByMsgId(sessionId, sessionType, control.withdrawMsgId)

          if (target) {
            target.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_WITHDRAW
            await this.msgDatas.put(target)
          }
        }

        await this.msgDatas.delete(control.combo_id)
      }
    })
  }

  @AsyncTime()
  public async getLastMsgDatas(
    sessionId: string,
    sessionType: number,
    count: number,
  ): Promise<WL_IDbMsgData[]> {
    await this.applyWithdrawControlMessages(sessionId, sessionType)
    wllog('获取最后%d条消息:', count)

    const result = await this.msgDatas
      .orderBy('created')
      .and((x) => {
        return (
          x.sessionId === sessionId &&
          x.sessionType === sessionType &&
          x.msgType !== WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE
        )
      })
      .reverse()
      .limit(count)
      .toArray()

    return result
  }

  @AsyncTime()
  public async getMsgDatasWithRange(
    sessionId: string,
    sessionType: number,
    fromMsgId: number,
    count: number,
  ): Promise<WL_IDbMsgData[]> {
    await this.applyWithdrawControlMessages(sessionId, sessionType)

    if (fromMsgId < count) {
      count = fromMsgId
    }

    wllog('获取从%d获取%d条消息:', fromMsgId, count)

    const result = await this.msgDatas
      .orderBy('created')
      .and((x) => {
        return (
          x.sessionId === sessionId &&
          x.sessionType === sessionType &&
          x.msgId <= fromMsgId &&
          x.msgType !== WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE
        )
      })
      .reverse()
      .limit(count)
      .toArray()

    return result
  }

  @AsyncTime()
  public async getMsgData(combo_id: string): Promise<WL_IDbMsgData | undefined> {
    return this.msgDatas.get(combo_id)
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
        )
      })
      .sortBy('created')
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
        return x.msgId === msgId
      })
      .first()
  }

  @AsyncTime()
  public async delMsgDatas(sessionId: string, sessionType: number): Promise<void> {
    const deletedNum = await this.msgDatas
      .where('[sessionId+sessionType]')
      .equals([sessionId, sessionType])
      .delete()

    wllog('批量删除消息%d个', deletedNum)
  }

  @AsyncTime()
  public async getLastMsgData(
    sessionId: string,
    sessionType: number,
  ): Promise<WL_IDbMsgData | undefined> {
    const msg = await this.msgDatas
      .orderBy('created')
      .and((x) => {
        return x.sessionId === sessionId && x.sessionType === sessionType
      })
      .last()

    return msg
  }

  @AsyncTime()
  public async putNotification(notification: Omit<WL_IDbNotification, 'id'>): Promise<number> {
    const id = await this.notifications.put(notification)
    wllog('存入通知消息:', id)

    return id
  }

  @AsyncTime()
  public async putNotifications(notifications: WL_IDbNotification[]): Promise<number[]> {
    const ids = await this.notifications.bulkPut(notifications, { allKeys: true })
    wllog('批量存入%d条通知消息:', ids.length)

    return ids
  }

  @AsyncTime()
  public async getNotifications(
    notificationTypes: WL_IDbNotificationType[],
  ): Promise<WL_IDbNotification[]> {
    const notifications = await this.notifications
      .where('notificationType')
      .anyOf(notificationTypes)
      .sortBy('createTime')

    notifications.reverse()

    return notifications
  }

  @AsyncTime()
  public async getAllNotifications(): Promise<WL_IDbNotification[]> {
    return this.notifications.orderBy('createTime').reverse().toArray()
  }

  @SyncTime()
  public convertFromExtensionInfoRaw(
    extensionInfoRaw: WL.Login.IExtensionInfo,
  ): WL_IDbExtensionInfo {
    const extensionInfo: WL_IDbExtensionInfo = {
      config: extensionInfoRaw.config ?? '',
      extensionType: WL_IDbExtensionType.EXTENSION_SLAVE,
      userId: extensionInfoRaw.userId ?? 0,
      imei: extensionInfoRaw.imei ?? '',
      status: extensionInfoRaw.status ?? 0,
      productName: extensionInfoRaw.product ?? '',
      activeTime: Long.fromValue(extensionInfoRaw.actived ?? 0).toNumber(),
      groupLimit: extensionInfoRaw.groupLimit ?? 0,
      groupCount: extensionInfoRaw.groupCount ?? 0,
      supervisorId: extensionInfoRaw.managerId ?? 0,
      createdTime: Long.fromValue(extensionInfoRaw.created ?? 0).toNumber(),
      state: dbEnum<WL_IDbExtensionState>(extensionInfoRaw.state),
      version: extensionInfoRaw.version ?? '',
      warrant: Long.fromValue(extensionInfoRaw.warranted ?? 0).toNumber(),
    }

    return extensionInfo
  }

  @AsyncTime()
  public async putExtension(extension: WL_IDbExtensionInfo): Promise<number> {
    return this.extensions.put(extension)
  }

  @AsyncTime()
  public async putExtensions(extensions: WL_IDbExtensionInfo[]): Promise<number[]> {
    return this.extensions.bulkPut(extensions, { allKeys: true })
  }

  @AsyncTime()
  public async delExtension(userId: number): Promise<void> {
    return this.extensions.delete(userId)
  }

  @AsyncTime()
  public async getExtensions(userIds?: number[]): Promise<WL_IDbExtensionInfo[]> {
    if (userIds) {
      return this.extensions.where('userId').anyOf(userIds).toArray()
    }

    return this.extensions.toArray()
  }

  @AsyncTime()
  public async getExtension(userId: number): Promise<WL_IDbExtensionInfo | undefined> {
    return this.extensions.get(userId)
  }

  @SyncTime()
  public convertFromServiceSessionRaw(
    serviceSession: WL.Business.IServiceSession,
  ): WL_IDbServiceSessionInfo {
    const serviceAttribute = serviceSession.serviceAttribute ?? {}
    const customerAttribute = serviceSession.customerAttribute
    const customerUserInfo = customerAttribute?.userInfo ?? {}
    const staffAttributes = serviceSession.staffAttributes ?? []
    const staffs = this.convertFromStaffRaws(staffAttributes)

    const userInfos = this.convertFromUserRaw(
      staffAttributes.map((value) => {
        return value.userInfo ?? {}
      }),
    )

    const serviceSessionInfo: WL_IDbServiceSessionInfo = {
      service: this.convertFromServiceRaw(serviceAttribute),
      staffs: staffs.map((value, index) => {
        return {
          userData: userInfos[index],
          staff: value,
        }
      }),
      customer: this.convertFromUserRaw([customerUserInfo])[0],
      serviceSession: {
        serviceId: serviceAttribute.id ?? 0,
        serviceStatus: dbEnum<WL_ServiceStatus>(serviceSession.status),
        staffIds: staffAttributes.map((value) => {
          return value.userInfo?.userId ?? 0
        }),
        customerId: customerUserInfo.userId ?? 0,
        createdTime: Long.fromValue(serviceSession.created ?? 0).toNumber(),
        updatedTime: Long.fromValue(serviceSession.updated ?? 0).toNumber(),
      },
    }

    return serviceSessionInfo
  }

  @SyncTime()
  public convertFromServiceRaw(serviceRaw: WL.Business.IServiceAttribute): WL_IDbService {
    const service: WL_IDbService = {
      serviceId: serviceRaw.id ?? 0,
      serviceNum: serviceRaw.number ?? '',
      serviceClass: serviceRaw.class ?? 0,
      serviceType: serviceRaw.type ?? 0,
      avatar: serviceRaw.avatar ?? '',
      intro: serviceRaw.intro ?? '',
      name: serviceRaw.name ?? '',
      url: serviceRaw.url ?? '',
      createdTime: Long.fromValue(serviceRaw.created ?? 0).toNumber(),
    }

    return service
  }

  @AsyncTime()
  public async putService(service: WL_IDbService): Promise<number> {
    return this.service.put(service)
  }

  @AsyncTime()
  public async putServices(services: WL_IDbService[]): Promise<number[]> {
    return this.service.bulkPut(services, { allKeys: true })
  }

  @AsyncTime()
  public async getService(serviceId: number): Promise<WL_IDbService | undefined> {
    return this.service.get(serviceId)
  }

  @AsyncTime()
  public async getServices(serviceIds: number[]): Promise<WL_IDbService[]> {
    const result = await this.service.bulkGet(serviceIds)

    return result.filter((value) => {
      return value !== undefined
    })
  }

  @AsyncTime()
  public async removeService(serviceId: number): Promise<void> {
    return this.service.delete(serviceId)
  }

  @SyncTime()
  public convertFromStaffRaws(staffRaws: WL.Business.IStaffAttribute[]): WL_IDbServiceStaff[] {
    return staffRaws.map((value) => {
      const dbStaff: WL_IDbServiceStaff = {
        userId: value.userInfo?.userId ?? 0,
        staffClass: value.class ?? 0,
        staffType: value.type ?? 0,
        admin: value.admin ?? 0,
        isOperator: value.operator === 1,
        createdTime: Long.fromValue(value.created ?? 0).toNumber(),
      }

      return dbStaff
    })
  }

  @AsyncTime()
  public async putServiceStaff(staff: WL_IDbServiceStaff): Promise<number> {
    return this.service_staffs.put(staff)
  }

  @AsyncTime()
  public async putServiceStaffs(staffs: WL_IDbServiceStaff[]): Promise<number[]> {
    return this.service_staffs.bulkPut(staffs, { allKeys: true })
  }

  @AsyncTime()
  public async getServiceStaff(userId: number): Promise<WL_IDbServiceStaffInfo | undefined> {
    const staff = await this.service_staffs.get(userId)

    if (!staff) {
      return undefined
    }

    const userData = await this.users.get(staff.userId)
    const staffInfo: WL_IDbServiceStaffInfo = {
      staff,
      userData: userData!,
    }

    return staffInfo
  }

  @AsyncTime()
  public async getServiceStaffs(userIds: number[]): Promise<WL_IDbServiceStaffInfo[]> {
    const staffInfos: WL_IDbServiceStaffInfo[] = []
    const staffs = await this.service_staffs.bulkGet(userIds)

    for (let staff of staffs) {
      if (staff) {
        const userData = await this.users.get(staff.userId)
        const staffInfo: WL_IDbServiceStaffInfo = {
          staff,
          userData: userData!,
        }

        staffInfos.push(staffInfo)
      }
    }

    return staffInfos
  }

  @AsyncTime()
  public async delServiceStaff(userId: number): Promise<void> {
    return this.service_staffs.delete(userId)
  }
}

export { WeilaDB }
