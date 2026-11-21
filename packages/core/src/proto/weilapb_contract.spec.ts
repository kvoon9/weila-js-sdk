import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Long from 'long'
import { WL_IDbMsgDataType } from 'db/weila_db_data'
import { WL } from './weilapb'
import { WeilaPBGroupWrapper } from './weilapb_group_wrapper'
import { WeilaPBLoginWrapper } from './weilapb_login_wrapper'
import WeilaMsgHeader from './weilapb_msg_header'
import { WeilaPBSessionWrapper } from './weilapb_session_wrapper'
import { TextMsgDataParser } from './weilapb_textmsg_parser'
import { WLBuildMsgRet, WLMsgHeader } from './weilapb_wrapper_data'
import { uint8Array2HexStr } from './weilapb_utils'

const FROZEN_NOW = 1700000000000
const FROZEN_SECONDS = FROZEN_NOW / 1000

// Captured from the protobufjs 6.11 build before the protobufjs 8 upgrade.
const GOLDEN = {
  login:
    '000000b000000000000f0105000000000a0808011005180020001a93016290010a567b226574223a2231373030303030303230222c226170705f6964223a22676f6c64656e2d6170702d6964222c227369676e223a226137656435383461373831633235353363353062663366653937353731376237227d120b31333830303133383030301a023836222030646662616130653164636337346537643265333130303534663162626561322881014804',
  group:
    '0000004400000000000f0402000000000a08080410021800200032282a260a0c476f6c64656e2047726f757010031a0a6176617461722e706e672002280178e90778ea07',
  text: '0000006800000000000f0503000000000a0808051003180020003a4c424a0a4808d10f1081808080808080101801200028013080e2cfaa064000522c2f7062396c75727a317662437174357041417437664e2f6763786a395577794c62486377665730332f58633d',
}

function md5(text: string): string {
  return createHash('md5').update(text).digest('hex')
}

function requireValue<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) {
    throw new Error(`missing ${name}`)
  }

  return value
}

function requireReqData(ret: WLBuildMsgRet): Uint8Array {
  return requireValue(ret.reqData, 'reqData')
}

function readHeader(reqData: Uint8Array): WLMsgHeader {
  const header = requireValue(WeilaMsgHeader.parseFromBuffer(reqData), 'header')

  return header.value
}

function decodeService(reqData: Uint8Array): WL.Service.ServiceMessage {
  return WL.Service.ServiceMessage.decode(reqData.subarray(WeilaMsgHeader.msgHeaderLen))
}

describe('protobuf wire contract', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN_NOW)
    WeilaMsgHeader.globalSeqNum = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('encodes the login app request to the captured bytes', () => {
    const ret = WeilaPBLoginWrapper.buildLoginAppReq(
      '13800138000',
      'golden-password',
      '86',
      'golden-app-id',
      'golden-app-key',
    )

    expect(ret.resultCode).toBe(0)
    const reqData = requireReqData(ret)
    expect(readHeader(reqData)).toEqual({
      length: 176,
      version: 0,
      flag: 0,
      serviceID: 15,
      commandID: 261,
      seqNum: 0,
      reserved: 0,
    })

    const decoded = decodeService(reqData)
    expect(decoded.serviceHead).toMatchObject({
      serviceId: WL.Service.ServiceID.SERVICE_LOGIN,
      commandId: WL.Login.LoginCommandId.LOGIN_COMMAND_LOGIN_APP,
      commandType: WL.Service.CommandType.COMMAND_REQUEST,
      seq: 0,
    })

    const reqLoginApp = requireValue(
      requireValue(decoded.loginMessage, 'loginMessage').reqLoginApp,
      'reqLoginApp',
    )

    expect(reqLoginApp.account).toBe('13800138000')
    expect(reqLoginApp.countryCode).toBe('86')
    expect(reqLoginApp.password).toBe(md5('golden-password'))
    expect(reqLoginApp.pduVersion).toBe(4)
    expect(reqLoginApp.clientType).toBe(WL.Common.ClientType.CLIENT_WINDOWS)
    expect(reqLoginApp.signature).toBe(
      JSON.stringify({
        et: String(FROZEN_SECONDS + 20),
        app_id: 'golden-app-id',
        sign: md5(String(FROZEN_SECONDS + 20) + 'golden-app-key'),
      }),
    )

    expect(uint8Array2HexStr(reqData)).toBe(GOLDEN.login)
  })

  it('encodes the create group request to the captured bytes', () => {
    const ret = WeilaPBGroupWrapper.buildCreateGroupReq(
      'Golden Group',
      3,
      'avatar.png',
      2,
      1,
      [1001, 1002],
    )

    expect(ret.resultCode).toBe(0)
    const reqData = requireReqData(ret)
    expect(readHeader(reqData)).toEqual({
      length: 68,
      version: 0,
      flag: 0,
      serviceID: 15,
      commandID: 1026,
      seqNum: 0,
      reserved: 0,
    })

    const decoded = decodeService(reqData)
    expect(decoded.serviceHead).toMatchObject({
      serviceId: WL.Service.ServiceID.SERVICE_GROUP,
      commandId: WL.Group.GroupCommandId.GROUP_COMMAND_CREATE_GROUP,
      commandType: WL.Service.CommandType.COMMAND_REQUEST,
      seq: 0,
    })

    const reqCreateGroup = requireValue(
      requireValue(decoded.groupMessage, 'groupMessage').reqCreateGroup,
      'reqCreateGroup',
    )

    expect(reqCreateGroup.name).toBe('Golden Group')
    expect(reqCreateGroup.type).toBe(3)
    expect(reqCreateGroup.avatar).toBe('avatar.png')
    expect(reqCreateGroup.class).toBe(2)
    expect(reqCreateGroup.publicType).toBe(1)
    expect(Array.from(requireValue(reqCreateGroup.memberIdList, 'memberIdList'))).toEqual([
      1001, 1002,
    ])

    expect(uint8Array2HexStr(reqData)).toBe(GOLDEN.group)
  })

  it('encodes a text session message and decodes the text back', () => {
    const sessionId = Long.fromString('9007199254740993')

    const ret = WeilaPBSessionWrapper.buildTextSessionMsgReq(
      sessionId,
      1,
      2001,
      false,
      'hello golden world',
    )

    expect(ret.resultCode).toBe(0)
    const reqData = requireReqData(ret)
    expect(readHeader(reqData)).toEqual({
      length: 104,
      version: 0,
      flag: 0,
      serviceID: 15,
      commandID: 1283,
      seqNum: 0,
      reserved: 0,
    })

    const decoded = decodeService(reqData)
    expect(decoded.serviceHead).toMatchObject({
      serviceId: WL.Service.ServiceID.SERVICE_SESSION,
      commandId: WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
      commandType: WL.Service.CommandType.COMMAND_REQUEST,
      seq: 0,
    })

    const sessionMessage = requireValue(decoded.sessionMessage, 'sessionMessage')
    const reqMsg = requireValue(sessionMessage.reqMsg, 'reqMsg')
    const msgData = requireValue(reqMsg.msgData, 'msgData')
    expect(msgData.senderId).toBe(2001)
    expect(requireValue(msgData.sessionId, 'sessionId').toString()).toBe('9007199254740993')
    expect(msgData.sessionType).toBe(1)
    expect(msgData.msgId).toBe(0)
    expect(msgData.msgType).toBe(WL.Session.MessageType.MSG_TYPE_TEXT)
    expect(requireValue(msgData.created, 'created').toString()).toBe(String(FROZEN_SECONDS))
    expect(msgData.autoReply).toBe(0)

    const textData = requireValue(msgData.textData, 'textData')
    expect(TextMsgDataParser.decodeSessionTextMsg(textData)).toMatchObject({
      msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
      textData: 'hello golden world',
    })

    expect(uint8Array2HexStr(reqData)).toBe(GOLDEN.text)
  })
})
