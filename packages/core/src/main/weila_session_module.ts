import {
  WL_IDbAudioData,
  WL_IDbFileData,
  WL_IDbGroup,
  WL_IDbLocationShared,
  WL_IDbMsgData,
  WL_IDbMsgDataStatus,
  WL_IDbMsgDataType,
  WL_IDbPttData,
  WL_IDbService,
  WL_IDbServiceSessionInfo,
  WL_IDbSession,
  WL_IDbSessionStatus,
  WL_IDbSessionType,
  WL_SessionProfileUpdate,
  WL_IDbSettingID,
  applySessionExtraProfile,
  isGroupSessionType,
  isIndividualSessionType,
  isServiceSessionType,
} from 'db/weila_db_data'
import { dbEnum } from 'db/db_enum'
import {
  default_group_logo,
  WL_CoreInterface,
  WL_PttAudioItem,
  WL_PttFsmListener,
  WL_PttPacket,
  WL_PttPackType,
  WL_PttPayload,
} from 'main/weila_internal_data'
import { WL } from 'proto/weilapb'
import Long from 'long'
import { WeilaPBSessionWrapper } from 'proto/weilapb_session_wrapper'
import { WeilaDB } from 'db/weila_db'
import { WLBuildMsgRet } from 'proto/weilapb_wrapper_data'
import { getLogger } from 'log/weila_log'
import WLPttFsm from 'main/weila_pttFsm'
import {
  decompositionAudioData,
  fetchWithTimeout,
  getAppKeyAndId,
  getMsgDataIdByCombo,
  getOpusDataFrameCount,
} from 'main/weila_utils'
import { MD5 } from 'crypto-js'
import {
  WL_ExtEventID,
  WL_PttPlayIndData,
  WL_PttRecordInd,
  WL_PttRecordState,
} from 'main/weila_external_data'

const wllog = getLogger('MOD:session:info')
const wlerr = getLogger('MOD:session:err')

interface SpeechSynthesisPayload {
  user_id: number
  text: string
  speed: number
  vol: number
  et: string
  app_id: string
  sign: string
}

interface WL_BurstInfo {
  sessionId: string
  sessionType: number
  packetPayloadList: WL_PttPayload[]
  curMarker: WL_PttPackType
  dbMsgData: WL_IDbMsgData | null
  dbMsgId: number
  created: number
}

interface WL_ActiveSessionInfo {
  sessionId: string
  sessionType: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (!isRecord(a) || !isRecord(b)) return false

  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)

  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false

    if (!isDeepEqual(a[key], b[key])) return false
  }

  return true
}

type MsgPayload =
  | string
  | number
  | WL_IDbAudioData
  | WL_IDbFileData
  | WL_IDbLocationShared
  | WL_IDbPttData

interface MsgSendRequest {
  msgType: WL_IDbMsgDataType
  data: MsgPayload
}

function isTextRequest(request: MsgSendRequest): request is MsgSendRequest & { data: string } {
  return request.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE
}

function isMediaFileRequest(
  request: MsgSendRequest,
): request is MsgSendRequest & { data: WL_IDbFileData } {
  return (
    request.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE ||
    request.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE
  )
}

function isImageRequest(
  request: MsgSendRequest,
): request is MsgSendRequest & { data: WL_IDbFileData } {
  return request.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE
}

function isLocationRequest(
  request: MsgSendRequest,
): request is MsgSendRequest & { data: WL_IDbLocationShared } {
  return request.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE
}

function isAudioRequest(
  request: MsgSendRequest,
): request is MsgSendRequest & { data: WL_IDbAudioData } {
  return request.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
}

function isPttRequest(
  request: MsgSendRequest,
): request is MsgSendRequest & { data: WL_IDbPttData } {
  return request.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE
}

function isWithdrawRequest(request: MsgSendRequest): request is MsgSendRequest & { data: number } {
  return request.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE
}

/** Routes one session response to the waiting sendPbMsg caller. */
type SessionResponseRoute = (
  serviceHead: WL.Service.ServiceHead.$Properties,
  sessionMessage: WL.Session.ISessionMessage | null | undefined,
) => void

export default class WLSessionModule {
  private sessionList: WL_IDbSession[] = []
  private pttFsm: WLPttFsm
  private curBurstInfo: WL_BurstInfo | null
  private activeSession: WL_ActiveSessionInfo | null

  /**
   * Response routing per session command. Every command the module awaits
   * via sendPbMsg must have a route here; a missing route leaves the caller
   * to die on the watchdog timeout. `weila_session_module.spec.ts` guards
   * the wrapper's builders against this table. Notifications stay in the
   * switch below: only COMMAND_RESPONSE traffic is routed through the table.
   */
  private readonly responseRoutes = new Map<number, SessionResponseRoute>([
    [
      WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
      (serviceHead, sessionMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          sessionMessage ? sessionMessage.rspMsg : null,
        )
      },
    ],
    [
      WL.Session.SessionCommandId.SESSION_COMMAND_GET_SESSION,
      (serviceHead, sessionMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          sessionMessage ? sessionMessage.rspGetSession : null,
        )
      },
    ],
    [
      WL.Session.SessionCommandId.SESSION_COMMAND_GET_MSG,
      (serviceHead, sessionMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          sessionMessage ? sessionMessage.rspGetMsg : null,
        )
      },
    ],
    [
      WL.Session.SessionCommandId.SESSION_COMMAND_READ_MSG,
      (serviceHead, sessionMessage) => {
        this.coreInterface.rspPbMsg(
          serviceHead.seq ?? 0,
          serviceHead.resultCode ?? 0,
          sessionMessage ? sessionMessage.rspMsgRead : null,
        )
      },
    ],
    [
      WL.Session.SessionCommandId.SESSION_COMMAND_REMOVE_SESSION,
      (serviceHead) => {
        this.coreInterface.rspPbMsg(serviceHead.seq ?? 0, serviceHead.resultCode ?? 0, true)
      },
    ],
  ])

  constructor(private coreInterface: WL_CoreInterface) {
    this.curBurstInfo = null
    this.activeSession = null
    this.coreInterface.registerPbMsgHandler(
      WL.Service.ServiceID.SERVICE_SESSION,
      this.onPbMsgHandler.bind(this),
    )

    const listener: WL_PttFsmListener = {
      onPlayInd: this.onPttPlayInd.bind(this),
      onRecordPttPacketInd: this.onPttPacketRecv.bind(this),
    }

    this.pttFsm = new WLPttFsm(listener)
  }

  private async saveSessionInfo(dBSession: WL_IDbSession): Promise<boolean> {
    if (isIndividualSessionType(dBSession.sessionType)) {
      const userInfo = await WeilaDB.getInstance().getUser(parseInt(dBSession.sessionId))

      if (userInfo) {
        dBSession.sessionName = userInfo.nick
        dBSession.sessionAvatar = userInfo.avatar
      }
    } else if (isGroupSessionType(dBSession.sessionType)) {
      const groupInfo: WL_IDbGroup | undefined = await WeilaDB.getInstance().getGroup(
        dBSession.sessionId,
      )

      if (groupInfo) {
        dBSession.sessionName = groupInfo.name
        dBSession.sessionAvatar = groupInfo.avatar || default_group_logo
      }
    } else if (isServiceSessionType(dBSession.sessionType)) {
      const idNumber = Long.fromValue(dBSession.sessionId)

      const service: WL_IDbService | undefined = await WeilaDB.getInstance().getService(
        idNumber.high,
      )

      if (service) {
        dBSession.sessionName = service.name
        dBSession.sessionAvatar = service.avatar
      }
    }

    if (!dBSession.sessionName) {
      applySessionExtraProfile(dBSession)
    }

    await WeilaDB.getInstance().putSession(dBSession)

    return true
  }

  private findSessionIndex(sessionId: string, sessionType: number): number {
    return this.sessionList.findIndex((value) => {
      return (
        value.sessionId === sessionId &&
        value.sessionType === dbEnum<WL_IDbSessionType>(sessionType)
      )
    })
  }

  private isActiveSession(sessionId: string, sessionType: number): boolean {
    return (
      this.activeSession?.sessionId === sessionId && this.activeSession?.sessionType === sessionType
    )
  }

  private async persistSessionUpdate(session: WL_IDbSession): Promise<void> {
    await WeilaDB.getInstance().putSession(session)
    this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_SESSION_UPDATED_IND, session)
  }

  public async updateSessionProfile(
    sessionId: string,
    sessionType: number,
    profile: WL_SessionProfileUpdate,
  ): Promise<WL_IDbSession | undefined> {
    const session = await WeilaDB.getInstance().getSession(sessionId, sessionType)

    if (!session) {
      return undefined
    }

    let changed = false
    const sessionName = profile.sessionName?.trim()

    if (sessionName && session.sessionName !== sessionName) {
      session.sessionName = sessionName
      changed = true
    }

    if (profile.sessionAvatar && session.sessionAvatar !== profile.sessionAvatar) {
      session.sessionAvatar = profile.sessionAvatar
      changed = true
    }

    if (profile.extra !== undefined && !isDeepEqual(session.extra, profile.extra)) {
      session.extra = profile.extra
      changed = true
    }

    if (!changed) {
      return session
    }

    const index = this.findSessionIndex(sessionId, sessionType)

    if (index !== -1) {
      this.sessionList[index] = session
      await this.persistSessionUpdate(this.sessionList[index])
    } else {
      await this.persistSessionUpdate(session)
    }

    return session
  }

  private applySessionMsgData(
    session: WL_IDbSession,
    msgData: WL_IDbMsgData,
    markRead: boolean,
    countUnread = true,
  ): void {
    const isIncoming = msgData.senderId !== this.coreInterface.getLoginUserInfo().userId
    session.lastMsgId = msgData.msgId
    session.lastMsgData = msgData
    session.latestUpdate = new Date().getTime() / 1000

    if (markRead && msgData.msgId > 0) {
      session.readMsgId = Math.max(session.readMsgId || 0, msgData.msgId)
      session.unreadCount = 0
    } else if (countUnread && isIncoming && msgData.msgId > 0) {
      session.unreadCount = (session.unreadCount || 0) + 1
    }
  }

  private async syncSessionReadAck(
    sessionId: string,
    sessionType: number,
    readMsgId: number,
  ): Promise<boolean> {
    if (readMsgId <= 0) {
      return true
    }

    const buildResult = WeilaPBSessionWrapper.buildMsgReadReq(
      Long.fromValue(sessionId),
      sessionType,
      readMsgId,
    )

    if (buildResult.resultCode === 0) {
      const rsp = await this.coreInterface.sendPbMsg(buildResult)
      wllog('设已读的响应结果', rsp)

      return true
    }

    return Promise.reject('创建读取消息异常:' + buildResult.resultCode)
  }

  private async updateSessionReadLocally(index: number, msgId: number): Promise<boolean> {
    if (index === -1 || msgId <= 0) {
      return false
    }

    const session = this.sessionList[index]
    const nextReadMsgId = Math.max(session.readMsgId || 0, msgId)

    if (nextReadMsgId <= (session.readMsgId || 0)) {
      return false
    }

    session.readMsgId = nextReadMsgId
    session.unreadCount = 0
    await this.persistSessionUpdate(session)

    return true
  }

  private async updateSessionByNewMsgData(
    msgData: WL_IDbMsgData,
    countUnread = true,
  ): Promise<void> {
    const index = this.findSessionIndex(msgData.sessionId, msgData.sessionType)
    const shouldMarkRead = this.isActiveSession(msgData.sessionId, msgData.sessionType)

    if (index === -1) {
      let session: WL_IDbSession = {
        sessionId: msgData.sessionId,
        sessionType: dbEnum<WL_IDbSessionType>(msgData.sessionType),
        combo_id_type: msgData.sessionId + '_' + msgData.sessionType,
        sessionName: '',
        sessionAvatar: '',
        status: WL_IDbSessionStatus.SESSION_ACTIVATE,
        readMsgId: 0,
        lastMsgId: 0,
        latestUpdate: 0,
      }

      if (isServiceSessionType(msgData.sessionType)) {
        // 如果是之前没有这个session，说明此服务也不再DB中，所以需要从服务器获取服务的信息
        const serviceSession: WL_IDbServiceSessionInfo | undefined =
          await this.coreInterface.executeCoreFunc('weila_getServiceSession', msgData.sessionId)

        if (serviceSession) {
          session.sessionId = msgData.sessionId
          session.sessionType = dbEnum<WL_IDbSessionType>(msgData.sessionType)
          session.sessionName = serviceSession.service.name
          session.sessionAvatar = serviceSession.service.avatar
          session.extra = serviceSession.serviceSession
        }
      } else {
        if (isGroupSessionType(msgData.sessionType)) {
          try {
            await this.coreInterface.executeCoreFunc('weila_getGroupFromServer', session.sessionId)
          } catch (err) {
            wlerr('新消息创建会话时获取群信息失败:', {
              sessionId: session.sessionId,
              sessionType: session.sessionType,
              err,
            })
          }
        }

        session = await WeilaDB.getInstance().fillSessionInfo(session)
      }

      this.applySessionMsgData(session, msgData, shouldMarkRead, countUnread)

      if (!shouldMarkRead) {
        session.readMsgId = session.readMsgId || 0
        session.unreadCount = session.unreadCount || 0
      }

      session.combo_id_type = session.sessionId + '_' + session.sessionType
      await WeilaDB.getInstance().putSession(session)
      this.sessionList.push(session)
      //发送有新的会话通知
      this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_SESSION_OPEN_IND, session)
    } else {
      this.applySessionMsgData(this.sessionList[index], msgData, shouldMarkRead, countUnread)
      await this.persistSessionUpdate(this.sessionList[index])
    }

    if (shouldMarkRead && msgData.msgId > 0) {
      void this.syncSessionReadAck(msgData.sessionId, msgData.sessionType, msgData.msgId).catch(
        (reason) => {
          wlerr('同步活跃会话已读失败:', reason)
        },
      )
    }
  }

  private async getAudioMsgDataFromTextMsgData(msgData: WL_IDbMsgData): Promise<WL_IDbMsgData> {
    try {
      const weilaTokenItem = await WeilaDB.getInstance().getSettingItem(
        WL_IDbSettingID.SETTING_LOGIN_TOKEN,
      )

      const weilaToken = weilaTokenItem?.data ?? ''
      let speakerInfo = ''
      const senderUserInfo = await WeilaDB.getInstance().getUser(msgData.senderId)

      if (senderUserInfo) {
        speakerInfo = senderUserInfo.nick
      } else {
        speakerInfo = '未知用户'
      }

      if (isGroupSessionType(msgData.sessionType)) {
        const groupInfo = await WeilaDB.getInstance().getGroup(msgData.sessionId)

        if (groupInfo) {
          speakerInfo += '在' + groupInfo.name + '里'
        }
      } else if (isServiceSessionType(msgData.sessionType)) {
        const service = await WeilaDB.getInstance().getService(
          Long.fromValue(msgData.sessionId).high,
        )

        if (service) {
          speakerInfo += '在' + service.name + '里'
        }
      }

      speakerInfo += '说'

      const appKeyAndId = WeilaDB.getAppAuthInfo() ? WeilaDB.getAppAuthInfo() : getAppKeyAndId()
      const et = '' + (Math.floor(Date.now() / 1000) + 20)

      const data: SpeechSynthesisPayload = {
        user_id: this.coreInterface.getLoginUserInfo().userId,
        text: speakerInfo + msgData.textData,
        speed: 8,
        vol: 6,
        et,
        app_id: appKeyAndId.appId,
        sign: MD5(et + appKeyAndId.appKey).toString(),
      }

      wllog('文字转语音，文字：%s', data.text)

      const response = await fetchWithTimeout(
        '/v1/speech/synthesis/ptt-flx?access-token=' + weilaToken,
        {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        },
      )

      if (response.ok) {
        const speechRsp = await response.json()

        if (speechRsp.errcode === 0) {
          let matchResult = speechRsp.data.url.match(/(http|https):\/\/([^/]+)\/(.+)/i)

          if (matchResult && matchResult.length >= 4) {
            //const pttUrl = "/" + matchResult[3];
            const pttUrl = speechRsp.data.url

            const audioData = await fetchWithTimeout(pttUrl)
              .then((value) => {
                if (value.ok) {
                  return value.arrayBuffer()
                }

                wlerr('获取音频数据出错:', value.statusText)

                return null
              })
              .catch((reason) => {
                wlerr('获取音频数据失败', reason)
              })

            if (audioData) {
              const audioBytes = new Uint8Array(audioData.slice(10))

              const audio: WL_IDbAudioData = {
                data: audioBytes,
                frameCount: getOpusDataFrameCount(audioBytes),
              }

              const audioMsgData: WL_IDbMsgData = {
                combo_id: '',
                sessionId: msgData.sessionId,
                sessionType: msgData.sessionType,
                msgId: msgData.msgId,
                msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE,
                created: msgData.created,
                senderId: msgData.senderId,
                audioData: audio,
                autoReply: 0,
                status: WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW,
              }

              audioMsgData.combo_id = getMsgDataIdByCombo(audioMsgData, 0)

              return audioMsgData
            } else {
              return Promise.reject('获取音频数据失败')
            }
          } else {
            return Promise.reject('ptt的地址不正确')
          }
        } else {
          return Promise.reject('获取ptt地址失败:' + speechRsp.errmsg)
        }
      } else {
        return Promise.reject(response.statusText)
      }
    } catch (e) {
      return Promise.reject(e)
    }
  }

  private onPbMsgHandler(data: WL.Service.IServiceMessage): void {
    const serverMessage = data
    const serviceHead = serverMessage.serviceHead

    if (!serviceHead) return

    if (serviceHead.commandType === WL.Service.CommandType.COMMAND_RESPONSE) {
      const commandId = serviceHead.commandId

      if (commandId !== undefined && commandId !== null) {
        const route = this.responseRoutes.get(commandId)

        if (route) route(serviceHead, serverMessage.sessionMessage)
      }
    } else if (serviceHead.commandType === WL.Service.CommandType.COMMAND_NOTIFY) {
      const sessionMessage = serverMessage.sessionMessage

      if (!sessionMessage) return

      if (serviceHead.commandId === WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA) {
        void (async () => {
          const ntfMsg = sessionMessage.ntfMsg

          if (!ntfMsg) return
          const msgDataRaw = ntfMsg.msgData

          if (!msgDataRaw) return
          const loginUserInfo = this.coreInterface.getLoginUserInfo()

          const msgDatas = WeilaDB.getInstance().convertFromMsgDataRaws(
            [msgDataRaw],
            loginUserInfo.userId,
          )

          wllog('转换后的消息:', msgDatas, msgDatas.length)

          if (msgDatas.length) {
            const msgData = msgDatas[0]
            msgData.combo_id = getMsgDataIdByCombo(msgData, 0)
            const isPttMsg = msgData.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE

            if (isPttMsg) {
              const { msgData: audioMsgData, isNewAudioItem } =
                await this.pttFsm.putPttMsgData(msgData)

              await this.updateSessionByNewMsgData(audioMsgData, isNewAudioItem)
              // PTT 分片用于实时播放和本地聚合，服务端随后会下发同一 msgId 的 AUDIO 消息。
              // 避免把同一条语音按“实时分片”和“最终音频”各通知一次。
            } else if (msgData.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE) {
              msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ
              this.isTTSPermit(msgData)
                .then(async (value) => {
                  if (value) {
                    const audioData = await this.getAudioMsgDataFromTextMsgData(msgData)
                    this.pttFsm.putAudioMsgData(audioData, false)
                  }
                })
                .catch((reason) => {
                  wlerr('转TTS出错', reason)
                })
            } else if (msgData.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE) {
              msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW
              this.pttFsm.putAudioMsgData(msgData, true)
            } else {
              msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ
            }

            wllog('incoming msgdata:', msgData)

            if (!isPttMsg) {
              if (msgData.msgType !== WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE) {
                await this.updateSessionByNewMsgData(msgData)
                //发送通知消息出去
                this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_MSG_RECV_IND, msgData)
                await WeilaDB.getInstance().putMsgData(msgData)
              } else {
                const withdrawMsgId = msgData.withdrawMsgId

                if (withdrawMsgId !== undefined) {
                  const withdrawMsgData = await WeilaDB.getInstance().getMsgDataByMsgId(
                    msgData.sessionId,
                    msgData.sessionType,
                    withdrawMsgId,
                  )

                  wllog('withdraw msg is:', withdrawMsgData)

                  if (withdrawMsgData) {
                    withdrawMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_WITHDRAW
                    //发送通知消息出去
                    this.coreInterface.sendExtEvent(
                      WL_ExtEventID.WL_EXT_NEW_MSG_RECV_IND,
                      withdrawMsgData,
                    )
                    await WeilaDB.getInstance().putMsgData(withdrawMsgData)
                  }
                }
              }
            }
          }
        })()
      } else if (
        serviceHead.commandId === WL.Session.SessionCommandId.SESSION_COMMAND_BURST_CONTROL
      ) {
        wllog('收到发言控制消息:', sessionMessage.ntfBurstControl)
      }
    }
  }

  private async isTTSPermit(msgData: WL_IDbMsgData): Promise<boolean> {
    const sessionSetting = await WeilaDB.getInstance().getSessionSetting(
      msgData.sessionId,
      msgData.sessionType,
    )

    if (sessionSetting) {
      return sessionSetting.tts
    }

    return false
  }

  public async getMsgDataFromServer(
    sessionId: string,
    sessionType: number,
    fromMsgId: number,
    count: number,
  ): Promise<boolean> {
    const buildResult = WeilaPBSessionWrapper.buildMsgGetMsgReq(
      Long.fromValue(sessionId),
      sessionType,
      fromMsgId,
      count,
    )

    let readMsgId = 0

    const sessionIdx = this.sessionList.findIndex((value) => {
      return (
        value.sessionId === sessionId &&
        value.sessionType === dbEnum<WL_IDbSessionType>(sessionType)
      )
    })

    if (sessionIdx !== -1) {
      readMsgId = this.sessionList[sessionIdx].readMsgId
    }

    if (buildResult.resultCode === 0) {
      const rspGetMsg: WL.Session.IRspGetMsg = await this.coreInterface.sendPbMsg(buildResult)
      const msgList = rspGetMsg.msgList ?? []
      wllog('从服务器获取:' + msgList.length + ' 条记录')

      let msgDatas = WeilaDB.getInstance().convertFromMsgDataRaws(
        msgList,
        this.coreInterface.getLoginUserInfo().userId,
      )

      for (let msgData of msgDatas) {
        msgData.combo_id = getMsgDataIdByCombo(msgData, 0)
      }

      // 先处理服务器历史中的撤回控制消息：把原消息标记为已撤回，控制消息本身不保留。
      const nonWithdrawMsgDatas: WL_IDbMsgData[] = []

      for (const msgData of msgDatas) {
        if (msgData.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE) {
          if (msgData.withdrawMsgId) {
            const target = await WeilaDB.getInstance().getMsgDataByMsgId(
              msgData.sessionId,
              msgData.sessionType,
              msgData.withdrawMsgId,
            )

            if (target) {
              target.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_WITHDRAW
              await WeilaDB.getInstance().putMsgData(target)
            }
          }

          continue
        }

        nonWithdrawMsgDatas.push(msgData)
      }

      msgDatas = nonWithdrawMsgDatas

      const comboIdList = msgDatas.map((value) => {
        return value.combo_id
      })

      const oldMsgDatas = await WeilaDB.getInstance().getMsgDataByComboIds(comboIdList)

      if (oldMsgDatas.length) {
        const oldMsgComboIds = oldMsgDatas.map((value) => {
          return value.combo_id
        })

        msgDatas = msgDatas.filter((value) => {
          return oldMsgComboIds.indexOf(value.combo_id) === -1
        })
      }

      msgDatas.forEach((value) => {
        if (value.senderId !== this.coreInterface.getLoginUserInfo().userId) {
          if (value.msgId > readMsgId) {
            value.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW
          } else {
            value.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ
          }
        } else {
          value.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT
        }
      })

      await WeilaDB.getInstance().putMsgDatas(msgDatas)
      wllog('从服务器中获取会话%d条消息成功', msgDatas.length)

      return true
    }

    return Promise.reject('创建读取消息异常:' + buildResult.resultCode)
  }

  public async getMsgDatas(
    sessionId: string,
    sessionType: number,
    startMsgId: number,
    count: number,
  ): Promise<WL_IDbMsgData[] | undefined> {
    let dbMsgDataList = []

    if (startMsgId === 0) {
      dbMsgDataList = await WeilaDB.getInstance().getLastMsgDatas(sessionId, sessionType, count)
    } else {
      dbMsgDataList = await WeilaDB.getInstance().getMsgDatasWithRange(
        sessionId,
        sessionType,
        startMsgId,
        count,
      )
    }

    wllog('从数据库得到的%d条数据:', dbMsgDataList.length)

    if (dbMsgDataList.length < count) {
      await this.getMsgDataFromServer(sessionId, sessionType, startMsgId, count)
    }

    if (startMsgId) {
      return WeilaDB.getInstance().getMsgDatasWithRange(sessionId, sessionType, startMsgId, count)
    }

    return WeilaDB.getInstance().getLastMsgDatas(sessionId, sessionType, count)
  }

  public async setSessionMsgRead(
    sessionId: string,
    sessionType: number,
    msgId: number,
  ): Promise<boolean> {
    const index = this.findSessionIndex(sessionId, sessionType)
    const currentReadMsgId = index !== -1 ? this.sessionList[index].readMsgId || 0 : 0
    const targetMsgId = Math.max(currentReadMsgId, msgId)

    if (targetMsgId <= currentReadMsgId) {
      return true
    }

    if (index !== -1) {
      await this.updateSessionReadLocally(index, targetMsgId)
    }

    await this.syncSessionReadAck(sessionId, sessionType, targetMsgId)

    return true
  }

  public async setActiveSession(sessionId: string, sessionType: number): Promise<boolean> {
    this.activeSession = {
      sessionId,
      sessionType,
    }

    const index = this.findSessionIndex(sessionId, sessionType)

    if (index === -1) {
      return true
    }

    const session = this.sessionList[index]
    const targetMsgId = session.lastMsgId || 0

    if (targetMsgId > (session.readMsgId || 0)) {
      await this.updateSessionReadLocally(index, targetMsgId)
      await this.syncSessionReadAck(sessionId, sessionType, targetMsgId)
    }

    return true
  }

  public clearActiveSession(): void {
    this.activeSession = null
  }

  private async syncSessionsByType(type: number, settingId: WL_IDbSettingID): Promise<boolean> {
    const dbInstance = WeilaDB.getInstance()
    let settingItem = await dbInstance.getSettingItem(settingId)
    let latestTime = 0

    if (settingItem) {
      latestTime = settingItem.data
    }

    const buildResult = WeilaPBSessionWrapper.buildGetSessionReq(Long.fromValue(latestTime), type)

    if (buildResult.resultCode === 0) {
      const rspMsg: WL.Session.IRspGetSession = await this.coreInterface.sendPbMsg(
        buildResult,
        30000,
      )

      wllog('buildGetSessionReq type=%d:', type, rspMsg)

      const latestUpdated = Long.fromValue(rspMsg.latestUpdated ?? 0).toNumber()

      if (!settingItem) {
        settingItem = { id: settingId, data: latestUpdated }
      } else {
        settingItem.data = latestUpdated
      }

      await dbInstance.putSettingItem(settingItem)

      const sessionInfoList = rspMsg.sessionInfoList ?? []
      wllog('initSessions type=%d:', type, sessionInfoList)

      if (sessionInfoList.length) {
        const sessionInfos: WL_IDbSession[] =
          await dbInstance.convertFromSessionRaw(sessionInfoList)

        await dbInstance.putSessions(sessionInfos)
        wllog('after convert type=%d:', type, sessionInfos)
      }

      return true
    }

    return Promise.reject('创建消息失败:' + buildResult.resultCode)
  }

  public async initSessions(): Promise<boolean> {
    await this.syncSessionsByType(0, WL_IDbSettingID.SETTING_SESSION_LATEST_UPDATE)
    await this.syncSessionsByType(1, WL_IDbSettingID.SETTING_CORP_SESSION_LATEST_UPDATE)

    this.sessionList = await WeilaDB.getInstance().getSessions()
    wllog('会话列表:', this.sessionList)

    return true
  }

  public async sendAudioMsg(
    sessionId: string,
    sessionType: number,
    audioUrl: string,
    frameCount?: number,
  ): Promise<boolean> {
    const audioData: WL_IDbAudioData = {
      audioUrl,
      frameCount: frameCount ? frameCount : 0,
    }

    return this.sendMsgData(
      sessionId,
      sessionType,
      audioData,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE,
    )
  }

  public async sendPttMsgByData(
    sessionId: string,
    sessionType: number,
    data: Uint8Array,
  ): Promise<boolean> {
    const pttCodeData = data.subarray(10)

    const pttData: WL_IDbPttData = {
      data: pttCodeData,
      frameCount: getOpusDataFrameCount(pttCodeData),
      seqInPackage: 0,
      seq: Math.floor(Date.now() / 1000),
      mark: WL_PttPackType.PTT_WHOLE_PACK,
      sourceType: WL.Session.AudioSourceType.PTT_SOURCE_APP,
    }

    return this.sendMsgData(
      sessionId,
      sessionType,
      pttData,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE,
    )
  }

  public async sendMsgData(
    sessionId: string,
    sessionType: number,
    data: MsgPayload,
    msgType: WL_IDbMsgDataType,
    msgData?: WL_IDbMsgData,
  ): Promise<boolean> {
    let buildResult: WLBuildMsgRet | null = null

    const seqSetting = await WeilaDB.getInstance().getSettingItem(
      WL_IDbSettingID.SETTING_MSG_SENDING_SEQ,
    )

    const index = this.sessionList.findIndex((value) => {
      return (
        value.sessionId === sessionId &&
        value.sessionType === dbEnum<WL_IDbSessionType>(sessionType)
      )
    })

    const lastMsgData = await WeilaDB.getInstance().getLastMsgData(sessionId, sessionType)

    const request: MsgSendRequest = { msgType, data }
    let dbMsgData: WL_IDbMsgData

    if (msgData) {
      dbMsgData = msgData
    } else {
      dbMsgData = {
        combo_id: '',
        msgType,
        sessionId,
        sessionType,
        senderId: this.coreInterface.getLoginUserInfo().userId,
        status: WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT,
        created: new Date().getTime() / 1000,
        msgId: lastMsgData ? lastMsgData.msgId + 1 : 0,
        autoReply: 0,
      }
      dbMsgData.combo_id = getMsgDataIdByCombo(dbMsgData, seqSetting?.data ?? 0)

      if (seqSetting) {
        seqSetting.data = (seqSetting.data ?? 0) + 1
        await WeilaDB.getInstance().putSettingItem(seqSetting)
      }
    }

    if (isTextRequest(request)) {
      dbMsgData.textData = request.data
      buildResult = WeilaPBSessionWrapper.buildTextSessionMsgReq(
        Long.fromValue(sessionId),
        sessionType,
        this.coreInterface.getLoginUserInfo().userId,
        false,
        request.data,
      )
    } else if (isMediaFileRequest(request)) {
      dbMsgData.fileInfo = request.data
      buildResult = WeilaPBSessionWrapper.buildMediaInfoSessionMsgReq(
        Long.fromValue(sessionId),
        sessionType,
        this.coreInterface.getLoginUserInfo().userId,
        false,
        request.data,
        msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE,
      )
    } else if (isImageRequest(request)) {
      dbMsgData.fileInfo = request.data
      buildResult = WeilaPBSessionWrapper.buildImageSessionMsgReq(
        Long.fromValue(sessionId),
        sessionType,
        this.coreInterface.getLoginUserInfo().userId,
        false,
        dbMsgData.fileInfo.fileUrl ?? '',
      )
    } else if (isLocationRequest(request)) {
      dbMsgData.location = request.data
      buildResult = WeilaPBSessionWrapper.buildLocationInfoSessionMsgReq(
        Long.fromValue(sessionId),
        sessionType,
        this.coreInterface.getLoginUserInfo().userId,
        false,
        request.data,
      )
    } else if (isAudioRequest(request)) {
      const audioData = request.data
      dbMsgData.audioData = audioData

      const payload =
        audioData.data && audioData.data.length > 0 ? audioData.data : (audioData.audioUrl ?? '')

      buildResult = WeilaPBSessionWrapper.buildAudioSessionMsgReq(
        Long.fromValue(sessionId),
        sessionType,
        this.coreInterface.getLoginUserInfo().userId,
        false,
        payload,
      )
    } else if (isPttRequest(request)) {
      dbMsgData.pttData = request.data
      buildResult = WeilaPBSessionWrapper.buildPttSessionMsgReq(
        Long.fromValue(sessionId),
        sessionType,
        this.coreInterface.getLoginUserInfo().userId,
        false,
        request.data,
      )
    } else if (isWithdrawRequest(request)) {
      dbMsgData.withdrawMsgId = request.data
      buildResult = WeilaPBSessionWrapper.buildWithDrawMsgReq(
        Long.fromValue(sessionId),
        sessionType,
        this.coreInterface.getLoginUserInfo().userId,
        false,
        request.data,
      )
    }

    if (!buildResult) {
      return Promise.reject('创建消息失败:不存在消息类型:' + msgType)
    }

    if (buildResult.resultCode === 0) {
      try {
        const rspMsg: WL.Session.IRspMsg = await this.coreInterface.sendPbMsg(buildResult)
        await WeilaDB.getInstance().delMsgDataByComboId(dbMsgData.combo_id)

        // 撤回消息发送成功，立即将原消息标记为已撤回
        if (isWithdrawRequest(request)) {
          const withdrawMsgId = request.data

          const originalMsg = await WeilaDB.getInstance().getMsgDataByMsgId(
            sessionId,
            sessionType,
            withdrawMsgId,
          )

          if (originalMsg) {
            originalMsg.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_WITHDRAW
            await WeilaDB.getInstance().putMsgData(originalMsg)
            this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_MSG_RECV_IND, originalMsg)
          }
        }

        wllog('发送消息成功,返回结果id:', rspMsg.msgId)
        dbMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT
        dbMsgData.msgId = rspMsg.msgId ?? 0
        dbMsgData.combo_id = getMsgDataIdByCombo(dbMsgData, 0)

        if (index !== -1) {
          this.applySessionMsgData(this.sessionList[index], dbMsgData, true)
          wllog('session:', this.sessionList)
          await this.persistSessionUpdate(this.sessionList[index])
        } else {
          await this.startSession(sessionId, sessionType, undefined, dbMsgData.msgId, dbMsgData)
        }

        return true
      } catch (e) {
        wlerr('发送会话消息失败:', e)
        dbMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT

        return Promise.reject(e)
      } finally {
        // 撤回消息本身只是协议控制消息，不需要作为会话消息展示，
        // 原消息已在前面的逻辑中标记为已撤回并通知 UI。
        if (msgType !== WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE) {
          // 不管消息发送成功与否，都存入数据库，并对外发布此消息。
          await WeilaDB.getInstance().putMsgData(dbMsgData)
          // 通知消息发送
          this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_MSG_SEND_IND, dbMsgData)
        }
      }
    }

    return Promise.reject('创建消息失败:不存在消息类型:' + msgType)
  }

  public async deleteSession(sessionId: string, sessionType: number): Promise<boolean> {
    const buildMsgRet = WeilaPBSessionWrapper.buildRemoveSessionReq(
      Long.fromValue(sessionId),
      sessionType,
    )

    if (buildMsgRet.resultCode === 0) {
      try {
        await this.coreInterface.sendPbMsg(buildMsgRet)
      } finally {
        const sessionInfo = await WeilaDB.getInstance().getSession(sessionId, sessionType)
        const index = this.findSessionIndex(sessionId, sessionType)

        if (index !== -1) {
          this.sessionList.splice(index, 1)
        }

        if (this.isActiveSession(sessionId, sessionType)) {
          this.clearActiveSession()
        }

        if (sessionInfo) {
          await WeilaDB.getInstance().delSessions([sessionInfo.combo_id_type])
        }
      }

      return true
    }

    return Promise.reject('创建消息失败:' + buildMsgRet.resultCode)
  }

  public async startSession(
    sessionId: string,
    sessionType: number,
    extra?: any,
    lastMsgId?: number,
    lastMsgData?: WL_IDbMsgData,
  ): Promise<WL_IDbSession> {
    const dbSessionInfo = await WeilaDB.getInstance().getSession(sessionId, sessionType)

    if (dbSessionInfo) {
      if (extra) {
        dbSessionInfo.extra = extra

        if (applySessionExtraProfile(dbSessionInfo)) {
          const index = this.findSessionIndex(sessionId, sessionType)

          if (index !== -1) {
            this.sessionList[index] = dbSessionInfo
            await this.persistSessionUpdate(this.sessionList[index])
          } else {
            await WeilaDB.getInstance().putSession(dbSessionInfo)
          }
        }
      }

      return dbSessionInfo
    }

    const sessionInfo: WL_IDbSession = {
      sessionId,
      sessionType: dbEnum<WL_IDbSessionType>(sessionType),
      combo_id_type: sessionId + '_' + sessionType,
      readMsgId: lastMsgId ? lastMsgId : 0,
      unreadCount: 0,
      latestUpdate: new Date().getTime() / 1000,
      lastMsgId: lastMsgId ? lastMsgId : 0,
      sessionName: '',
      sessionAvatar: default_group_logo,
      status: WL_IDbSessionStatus.SESSION_ACTIVATE,
      extra,
    }

    if (lastMsgData) {
      sessionInfo.lastMsgData = lastMsgData
    }

    await this.saveSessionInfo(sessionInfo)
    this.sessionList.push(sessionInfo)

    this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_SESSION_OPEN_IND, sessionInfo)

    return sessionInfo
  }

  public async initAudioSystem(): Promise<boolean> {
    return this.pttFsm.initAudio()
  }

  public async playSingleAudioItem(msgData: WL_IDbMsgData): Promise<boolean> {
    return this.pttFsm.playSingle(msgData)
  }

  public async playHistoryAudioItems(msgDatas: WL_IDbMsgData[]): Promise<boolean> {
    return this.pttFsm.playHistory(msgDatas)
  }

  public isPttFsmIdle(): boolean {
    return this.pttFsm?.pttFsmService?.getSnapshot().matches('idle') ?? true
  }

  public stopPlayAudio(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.pttFsm.stopPlayAudio()
      const maxWaitTime = 5000
      const checkInterval = 50
      let elapsed = 0

      const timer = setInterval(() => {
        elapsed += checkInterval

        if (this.isPttFsmIdle()) {
          clearInterval(timer)
          resolve()
        } else if (elapsed >= maxWaitTime) {
          clearInterval(timer)
          reject(new Error('stopPlayAudio timeout'))
        }
      }, checkInterval)
    })
  }

  private async onPttPlayInd(
    audioItem: WL_PttAudioItem | null,
    indData: WL_PttPlayIndData,
  ): Promise<void> {
    const pttPlayInd = {
      msgData: audioItem ? audioItem.msgData : null,
      indData,
    }

    this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_PTT_PLAY_IND, pttPlayInd)
  }

  private async sendPttPacket(pttPacket: WL_PttPacket, isNotify: boolean): Promise<void> {
    const burstInfo = this.curBurstInfo

    if (!burstInfo) return

    wllog('onPttPacketRecv', burstInfo)

    const pttData: WL_IDbPttData = {
      seq: pttPacket.seq,
      data: pttPacket.data,
      frameCount: pttPacket.frameCount,
      seqInPackage: pttPacket.seqInPackage,
      mark: pttPacket.mark,
      sourceType: WL.Session.AudioSourceType.PTT_SOURCE_APP,
    }

    if (
      pttPacket.mark === WL_PttPackType.PTT_FIRST_PACK ||
      pttPacket.mark === WL_PttPackType.PTT_WHOLE_PACK
    ) {
      const seqSetting = await WeilaDB.getInstance().getSettingItem(
        WL_IDbSettingID.SETTING_MSG_SENDING_SEQ,
      )

      const lastMsgData = await WeilaDB.getInstance().getLastMsgData(
        burstInfo.sessionId,
        burstInfo.sessionType,
      )

      const audioData: WL_IDbAudioData = {
        data: pttData.data.slice(0),
        frameCount: pttData.frameCount,
      }

      const dbMsgData: WL_IDbMsgData = {
        combo_id: '',
        audioData,
        msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE,
        senderId: this.coreInterface.getLoginUserInfo().userId,
        sessionId: burstInfo.sessionId,
        sessionType: burstInfo.sessionType,
        autoReply: 0,
        msgId: lastMsgData ? lastMsgData.msgId + 1 : 0,
        created: 0,
        status: WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT,
      }

      dbMsgData.combo_id = getMsgDataIdByCombo(dbMsgData, seqSetting?.data ?? 0)
      burstInfo.dbMsgData = dbMsgData
    } else {
      const dbMsgData = burstInfo.dbMsgData

      if (!dbMsgData) return

      const audioData = dbMsgData.audioData

      if (!audioData?.data) return

      const newData = new Uint8Array(audioData.data.length + pttPacket.data.length)
      newData.set(audioData.data)
      newData.set(pttPacket.data, audioData.data.length)
      audioData.frameCount += pttPacket.frameCount
      audioData.data = newData
    }

    const dbMsgData = burstInfo.dbMsgData

    if (!dbMsgData) return

    const buildMsgRet = WeilaPBSessionWrapper.buildPttSessionMsgReq(
      Long.fromValue(burstInfo.sessionId),
      burstInfo.sessionType,
      this.coreInterface.getLoginUserInfo().userId,
      false,
      pttData,
    )

    if (buildMsgRet.resultCode === 0) {
      try {
        const rsp: WL.Session.IRspMsg = await this.coreInterface.sendPbMsg(buildMsgRet)
        dbMsgData.msgId = rsp.msgId ?? 0
        dbMsgData.created = Long.fromValue(rsp.created ?? 0).toNumber()
        dbMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT
        await WeilaDB.getInstance().putMsgData(dbMsgData)
      } catch {
        dbMsgData.msgId = -1
        dbMsgData.created = new Date().getTime() / 1000
        dbMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT
        await WeilaDB.getInstance().putMsgData(dbMsgData)
      } finally {
        const pttRecordInd: WL_PttRecordInd = {
          msgData: dbMsgData,
          state: WL_PttRecordState.PTT_AUDIO_RECORDING_START,
        }

        if (dbMsgData.status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT) {
          if (pttPacket.mark === WL_PttPackType.PTT_INTER_PACK) {
            pttRecordInd.state = WL_PttRecordState.PTT_AUDIO_RECORDING
          } else if (
            pttPacket.mark === WL_PttPackType.PTT_END_PACK ||
            pttPacket.mark === WL_PttPackType.PTT_WHOLE_PACK
          ) {
            await WeilaDB.getInstance().delMsgDataByComboId(dbMsgData.combo_id)
            dbMsgData.combo_id = getMsgDataIdByCombo(dbMsgData, 0)
            await WeilaDB.getInstance().putMsgData(dbMsgData)
            const sessionIndex = this.findSessionIndex(burstInfo.sessionId, burstInfo.sessionType)

            if (sessionIndex !== -1) {
              this.applySessionMsgData(this.sessionList[sessionIndex], dbMsgData, true)
              await this.persistSessionUpdate(this.sessionList[sessionIndex])
            } else {
              await this.startSession(
                burstInfo.sessionId,
                burstInfo.sessionType,
                undefined,
                dbMsgData.msgId,
                dbMsgData,
              )
            }

            pttRecordInd.state = WL_PttRecordState.PTT_AUDIO_RECORDING_END
            this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_MSG_SEND_IND, dbMsgData)
          } else {
            pttRecordInd.state = WL_PttRecordState.PTT_AUDIO_RECORDING_START
          }
        } else {
          if (isNotify) {
            await this.pttFsm.releaseTalkByError()
            pttRecordInd.state = WL_PttRecordState.PTT_AUDIO_RECORDING_END
            this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_MSG_SEND_IND, dbMsgData)
          }
        }

        if (isNotify) {
          this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_PTT_RECORD_IND, pttRecordInd)
        }
      }
    }
  }

  public async sendPttPacketsByAudioData(
    sessionId: string,
    sessionType: number,
    audioData: Uint8Array,
  ): Promise<boolean> {
    let pttPayloads = decompositionAudioData(audioData)
    WLPttFsm.pttSeq++
    this.curBurstInfo = {
      curMarker: WL_PttPackType.PTT_FIRST_PACK,
      packetPayloadList: [],
      sessionId,
      sessionType,
      dbMsgData: null,
      dbMsgId: 0,
      created: 0,
    }

    for (let i = 0; i < pttPayloads.length; i++) {
      let mark = WL_PttPackType.PTT_INTER_PACK

      if (i === 0) {
        mark = WL_PttPackType.PTT_FIRST_PACK
      } else if (i === pttPayloads.length - 1) {
        mark = WL_PttPackType.PTT_END_PACK
      }

      if (pttPayloads.length === 1) {
        mark = WL_PttPackType.PTT_WHOLE_PACK
      }

      const pttMsgData: WL_PttPacket = {
        mark,
        data: pttPayloads[i].data,
        sourceType: 5,
        frameCount: pttPayloads[i].frameCount,
        seq: WLPttFsm.pttSeq,
        seqInPackage: i,
      }

      await this.sendPttPacket(pttMsgData, false)
    }

    return true
  }

  private async onPttPacketRecv(pttPacket: WL_PttPacket): Promise<void> {
    return this.sendPttPacket(pttPacket, true)
  }

  public async requestTalk(sessionId: string, sessionType: number): Promise<boolean> {
    await this.pttFsm.requestTalk()
    this.curBurstInfo = {
      curMarker: WL_PttPackType.PTT_FIRST_PACK,
      packetPayloadList: [],
      sessionId,
      sessionType,
      dbMsgData: null,
      dbMsgId: 0,
      created: 0,
    }

    return true
  }

  public async releaseTalk(): Promise<boolean> {
    return this.pttFsm.releaseTalk()
  }

  public clearActiveSessionState(): void {
    this.clearActiveSession()
  }

  getSessionList(): WL_IDbSession[] {
    return this.sessionList
  }

  playNext() {
    return this.pttFsm.playNext()
  }
}
