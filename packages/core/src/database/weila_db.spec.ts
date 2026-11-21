// eslint-disable-next-line import/no-unassigned-import
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { Dexie } from 'dexie'
import { WL } from 'proto/weilapb'
import { WeilaDB } from './weila_db'
import {
  WL_IDbMsgDataStatus,
  WL_IDbMsgDataType,
  WL_IDbSessionStatus,
  type WL_IDbMsgData,
  type WL_IDbSession,
} from './weila_db_data'

const CURRENT_DB_VERSION = 3

const TABLE_NAMES = [
  'sessions',
  'session_setting',
  'groups',
  'friends',
  'users',
  'group_members',
  'msgDatas',
  'settings',
  'notifications',
  'extensions',
  'service',
  'service_staffs',
]

let userSeq = 0

function nextUserId(): string {
  userSeq += 1

  return String(900000 + userSeq)
}

function openDb(userId: string, version: number): WeilaDB {
  WeilaDB.init(userId, version)

  return WeilaDB.getInstance()
}

function makeSession(sessionId: string): WL_IDbSession {
  return {
    combo_id_type: `${sessionId}_${WL.Common.SessionType.SESSION_TYPE_SINGLE}`,
    sessionId,
    sessionType: WL.Common.SessionType.SESSION_TYPE_SINGLE,
    sessionName: 'tester',
    sessionAvatar: '',
    readMsgId: 0,
    lastMsgId: 0,
    latestUpdate: 1000,
    status: WL_IDbSessionStatus.SESSION_ACTIVATE,
  }
}

function makeMessage(sessionId: string, msgId: number): WL_IDbMsgData {
  return {
    combo_id: `${sessionId}_${WL.Common.SessionType.SESSION_TYPE_SINGLE}_${msgId}`,
    senderId: 7,
    sessionId,
    sessionType: WL.Common.SessionType.SESSION_TYPE_SINGLE,
    msgId,
    msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
    created: 2000 + msgId,
    autoReply: 0,
    status: WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ,
    textData: `message ${msgId}`,
  }
}

afterEach(() => {
  WeilaDB.close()
})

describe('WeilaDB schema', () => {
  it('opens every stored table at the declared schema version', async () => {
    const db = openDb(nextUserId(), CURRENT_DB_VERSION)
    await db.open()

    expect(db.verno).toBe(CURRENT_DB_VERSION)
    expect(db.backendDB().version).toBe(CURRENT_DB_VERSION * 10)
    expect(db.tables.map((table) => table.name).toSorted()).toEqual(TABLE_NAMES.toSorted())
    expect(Array.from(db.backendDB().objectStoreNames).toSorted()).toEqual(TABLE_NAMES.toSorted())
  })
})

describe('WeilaDB messages', () => {
  it('round-trips a message through the public database methods', async () => {
    const db = openDb(nextUserId(), CURRENT_DB_VERSION)
    const message = makeMessage('4100', 11)

    await db.putMsgData(message)

    await expect(db.getMsgData(message.combo_id)).resolves.toEqual(message)
    const latest = await db.getLastMsgDatas(message.sessionId, message.sessionType, 10)
    expect(latest.map((item) => item.msgId)).toEqual([message.msgId])
  })

  it('deletes a session and its messages through one transaction', async () => {
    const db = openDb(nextUserId(), CURRENT_DB_VERSION)
    const session = makeSession('4200')
    const message = makeMessage(session.sessionId, 12)

    await db.putSession(session)
    await db.putMsgData(message)
    await db.delSessions([session.combo_id_type])

    await expect(db.getSession(session.sessionId, session.sessionType)).resolves.toBeUndefined()
    await expect(db.getMsgData(message.combo_id)).resolves.toBeUndefined()
  })
})

describe('WeilaDB transactions', () => {
  it('rolls back a failed transaction without leaving a row', async () => {
    const db = openDb(nextUserId(), CURRENT_DB_VERSION)
    const session = makeSession('4300')

    await expect(
      db.transaction('rw', db.sessions, async () => {
        await db.putSession(session)
        throw new Error('rollback')
      }),
    ).rejects.toThrow('rollback')

    await expect(db.getSession(session.sessionId, session.sessionType)).resolves.toBeUndefined()
  })
})

describe('WeilaDB migration guard', () => {
  it('allows Dexie to patch a same-version schema extension', async () => {
    const userId = nextUserId()
    const partial = new Dexie(`WL_${userId}_DB`)
    partial.version(CURRENT_DB_VERSION).stores({ sessions: 'combo_id_type, status' })
    await partial.open()
    partial.close()

    const db = openDb(userId, CURRENT_DB_VERSION)
    await db.open()

    expect(db.backendDB().version).toBe(CURRENT_DB_VERSION * 10 + 1)
    const session = makeSession('4500')
    await db.putSession(session)

    await expect(db.getSession(session.sessionId, session.sessionType)).resolves.toEqual(session)
  })

  it('refuses to reopen a newer database at an older schema version', async () => {
    const userId = nextUserId()
    const session = makeSession('4400')
    const newer = openDb(userId, CURRENT_DB_VERSION + 1)
    await newer.putSession(session)
    WeilaDB.close()

    const older = openDb(userId, CURRENT_DB_VERSION)
    await expect(older.open()).rejects.toMatchObject({ name: 'VersionError' })
    expect(older.isOpen()).toBe(false)
    WeilaDB.close()

    const reopened = openDb(userId, CURRENT_DB_VERSION + 1)
    await expect(reopened.getSession(session.sessionId, session.sessionType)).resolves.toEqual(
      session,
    )
  })
})
