import Long from 'long'
import { WLBuildMsgRet } from './weilapb_wrapper_data'
import { WL } from './weilapb'
import { TextMsgDataParser } from './weilapb_textmsg_parser'
import { BuildWeilaMsg } from './weilapb_wrapper'
import {
  WL_IDbFileData,
  WL_IDbLocationShared,
  WL_IDbMsgDataType,
  WL_IDbPttData,
} from 'db/weila_db_data'

const WeilaPBSessionWrapper = {
  buildGetSessionReq(updateTime: Long, type?: number): WLBuildMsgRet {
    const sessionMessage = new WL.Session.SessionMessage()
    sessionMessage.reqGetSession = new WL.Session.ReqGetSession()
    sessionMessage.reqGetSession.latestUpdated = updateTime

    if (type !== undefined) {
      sessionMessage.reqGetSession.type = type
    }

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_GET_SESSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMessage,
    )
  },

  buildRemoveSessionReq(sessionId: Long, sessionType: number): WLBuildMsgRet {
    const sessionMessage = new WL.Session.SessionMessage()
    sessionMessage.reqRemoveSession = new WL.Session.ReqRemoveSession()
    sessionMessage.reqRemoveSession.sessionId = sessionId
    sessionMessage.reqRemoveSession.sessionType = sessionType

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_REMOVE_SESSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMessage,
    )
  },

  buildMsgReadReq(sessionId: Long, sessionType: number, readMsgId: number): WLBuildMsgRet {
    const sessionMessage = new WL.Session.SessionMessage()
    sessionMessage.reqMsgRead = new WL.Session.ReqMsgRead()
    sessionMessage.reqMsgRead.sessionId = sessionId
    sessionMessage.reqMsgRead.sessionType = sessionType
    sessionMessage.reqMsgRead.readMsgId = readMsgId

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_READ_MSG,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMessage,
    )
  },

  buildMsgGetUnReadReq(
    sessionId: Long,
    sessionType: number,
    fromMsgId: number,
    toMsgId: number,
  ): WLBuildMsgRet {
    const sessionMessage = new WL.Session.SessionMessage()
    sessionMessage.reqGetUnreadMsg = new WL.Session.ReqGetUnreadMsg()
    sessionMessage.reqGetUnreadMsg.sessionId = sessionId
    sessionMessage.reqGetUnreadMsg.sessionType = sessionType
    sessionMessage.reqGetUnreadMsg.fromMsgId = fromMsgId
    sessionMessage.reqGetUnreadMsg.toMsgId = toMsgId

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_GET_UNREAD_MSG,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMessage,
    )
  },

  buildMsgGetMsgReq(
    sessionId: Long,
    sessionType: number,
    msgId: number,
    count: number,
  ): WLBuildMsgRet {
    const sessionMessage = new WL.Session.SessionMessage()
    sessionMessage.reqGetMsg = new WL.Session.ReqGetMsg()
    sessionMessage.reqGetMsg.sessionId = sessionId
    sessionMessage.reqGetMsg.sessionType = sessionType
    sessionMessage.reqGetMsg.msgId = msgId
    sessionMessage.reqGetMsg.count = count

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_GET_MSG,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMessage,
    )
  },

  buildBurstControlReq(sessionId: Long, sessionType: number, burstType: number): WLBuildMsgRet {
    const sessionMessage = new WL.Session.SessionMessage()
    sessionMessage.reqBurstControl = new WL.Session.ReqBurstControl()
    sessionMessage.reqBurstControl.sessionId = sessionId
    sessionMessage.reqBurstControl.sessionType = sessionType
    sessionMessage.reqBurstControl.burstType = burstType

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_BURST_CONTROL,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMessage,
    )
  },

  buildMonitorControlReq(status: number, duration: number, subUserId: number): WLBuildMsgRet {
    const sessionMessage = new WL.Session.SessionMessage()
    sessionMessage.reqMonitorControl = new WL.Session.ReqMonitorControl()
    sessionMessage.reqMonitorControl.status = status
    sessionMessage.reqMonitorControl.duration = duration

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_MONITOR_CONTROL,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMessage,
      subUserId,
    )
  },

  buildMsgDataReq(
    sessionId: Long,
    sessionType: number,
    senderId: number,
    autoReply: boolean,
    data: any,
    msgId: number,
    msgType: WL_IDbMsgDataType,
  ): WLBuildMsgRet {
    const buildMsgRet: WLBuildMsgRet = { resultCode: 0 }
    const sessionMsg = new WL.Session.SessionMessage()
    sessionMsg.reqMsg = new WL.Session.ReqMsg()

    sessionMsg.reqMsg.msgData = new WL.Session.MsgData()
    sessionMsg.reqMsg.msgData.created = Long.fromNumber(Date.now() / 1000)
    sessionMsg.reqMsg.msgData.msgId = msgId
    sessionMsg.reqMsg.msgData.sessionId = sessionId
    sessionMsg.reqMsg.msgData.autoReply = autoReply ? 1 : 0
    sessionMsg.reqMsg.msgData.senderId = senderId
    sessionMsg.reqMsg.msgData.sessionType = sessionType

    switch (msgType) {
      case WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE:
      case WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE:
        {
          sessionMsg.reqMsg.msgData.msgType = WL.Session.MessageType.MSG_TYPE_TEXT
          sessionMsg.reqMsg.msgData.textData = TextMsgDataParser.encodeSessionTextMsg({
            dataType: msgType,
            data,
          })
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE:
      case WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE:
        {
          sessionMsg.reqMsg.msgData.msgType = WL.Session.MessageType.MSG_TYPE_TEXT
          sessionMsg.reqMsg.msgData.textData = TextMsgDataParser.encodeSessionTextMsg({
            dataType: msgType,
            data,
          })
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE:
        {
          sessionMsg.reqMsg.msgData.msgType = WL.Session.MessageType.MSG_TYPE_TEXT
          sessionMsg.reqMsg.msgData.textData = TextMsgDataParser.encodeSessionTextMsg({
            dataType: msgType,
            data,
          })
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_COMMAND_TYPE:
        {
          sessionMsg.reqMsg.msgData.msgType = WL.Session.MessageType.MSG_TYPE_TEXT
          sessionMsg.reqMsg.msgData.textData = TextMsgDataParser.encodeSessionTextMsg({
            dataType: msgType,
          })
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE:
        {
          sessionMsg.reqMsg.msgData.msgType = WL.Session.MessageType.MSG_TYPE_AUDIO
          sessionMsg.reqMsg.msgData.audioData = new WL.Session.AudioData()

          if (typeof data === 'string') {
            sessionMsg.reqMsg.msgData.audioData.url = data
          } else {
            const audioPayload: Uint8Array = data
            sessionMsg.reqMsg.msgData.audioData.payload = audioPayload.slice()
          }
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE:
        {
          const pttData: WL_IDbPttData = data
          sessionMsg.reqMsg.msgData.msgType = WL.Session.MessageType.MSG_TYPE_PTT
          sessionMsg.reqMsg.msgData.pttData = new WL.Session.PttData()
          sessionMsg.reqMsg.msgData.pttData.marker = pttData.mark
          sessionMsg.reqMsg.msgData.pttData.opusData = new WL.Session.CodecData()
          sessionMsg.reqMsg.msgData.pttData.opusData.frameCount = pttData.frameCount
          sessionMsg.reqMsg.msgData.pttData.opusData.payload = pttData.data.slice(0)
          sessionMsg.reqMsg.msgData.pttData.packageSeq = pttData.seqInPackage
          sessionMsg.reqMsg.msgData.pttData.seq = pttData.seq
          sessionMsg.reqMsg.msgData.pttData.monitor = 0
          sessionMsg.reqMsg.msgData.pttData.source = WL.Session.AudioSourceType.PTT_SOURCE_APP
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_SERVICE_TYPE:
        {
          sessionMsg.reqMsg.msgData.msgType = WL.Session.MessageType.MSG_TYPE_SERVICE
          sessionMsg.reqMsg.msgData.serviceData = data
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_SWITCH_TYPE:
        {
          sessionMsg.reqMsg.msgData.msgType = WL.Session.MessageType.MSG_TYPE_SWITCH
          sessionMsg.reqMsg.msgData.switchData = new WL.Session.SwitchData()
          sessionMsg.reqMsg.msgData.switchData.serviceData = data
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE:
        {
          sessionMsg.reqMsg.msgData.msgType = WL.Session.MessageType.MSG_TYPE_REVOCATION
          sessionMsg.reqMsg.msgData.revocationMsgId = data
        }

        break

      default: {
        buildMsgRet.resultCode = -1

        return buildMsgRet
      }
    }

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMsg,
    )
  },

  buildTextSessionMsgReq(
    sessionId: Long,
    sessionType: number,
    senderId: number,
    autoReply: boolean,
    text: string,
  ): WLBuildMsgRet {
    return this.buildMsgDataReq(
      sessionId,
      sessionType,
      senderId,
      autoReply,
      text,
      0,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
    )
  },

  buildImageSessionMsgReq(
    sessionId: Long,
    sessionType: number,
    senderId: number,
    autoReply: boolean,
    imageUrl: string,
  ): WLBuildMsgRet {
    return this.buildMsgDataReq(
      sessionId,
      sessionType,
      senderId,
      autoReply,
      imageUrl,
      0,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE,
    )
  },

  buildMediaInfoSessionMsgReq(
    sessionId: Long,
    sessionType: number,
    senderId: number,
    autoReply: boolean,
    fileInfo: WL_IDbFileData,
    isFile: boolean,
  ): WLBuildMsgRet {
    const msgType = isFile
      ? WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE
      : WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE

    return this.buildMsgDataReq(sessionId, sessionType, senderId, autoReply, fileInfo, 0, msgType)
  },

  buildLocationInfoSessionMsgReq(
    sessionId: Long,
    sessionType: number,
    senderId: number,
    autoReply: boolean,
    data: WL_IDbLocationShared,
  ): WLBuildMsgRet {
    return this.buildMsgDataReq(
      sessionId,
      sessionType,
      senderId,
      autoReply,
      data,
      0,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE,
    )
  },

  buildAudioSessionMsgReq(
    sessionId: Long,
    sessionType: number,
    senderId: number,
    autoReply: boolean,
    data: string | Uint8Array,
  ): WLBuildMsgRet {
    return this.buildMsgDataReq(
      sessionId,
      sessionType,
      senderId,
      autoReply,
      data,
      0,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE,
    )
  },

  buildPttSessionMsgReq(
    sessionId: Long,
    sessionType: number,
    senderId: number,
    autoReply: boolean,
    data: WL_IDbPttData,
  ): WLBuildMsgRet {
    return this.buildMsgDataReq(
      sessionId,
      sessionType,
      senderId,
      autoReply,
      data,
      0,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE,
    )
  },

  buildServiceSessionMsgReq(
    sessionId: Long,
    sessionType: number,
    senderId: number,
    autoReply: boolean,
    data: string,
  ): WLBuildMsgRet {
    return this.buildMsgDataReq(
      sessionId,
      sessionType,
      senderId,
      autoReply,
      data,
      0,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_SERVICE_TYPE,
    )
  },

  buildSwitchSessionMsgReq(
    sessionId: Long,
    sessionType: number,
    senderId: number,
    autoReply: boolean,
    data: string,
  ): WLBuildMsgRet {
    return this.buildMsgDataReq(
      sessionId,
      sessionType,
      senderId,
      autoReply,
      data,
      0,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_SWITCH_TYPE,
    )
  },

  buildWithDrawMsgReq(
    sessionId: Long,
    sessionType: number,
    senderId: number,
    autoReply: boolean,
    msgId: number,
  ): WLBuildMsgRet {
    return this.buildMsgDataReq(
      sessionId,
      sessionType,
      senderId,
      autoReply,
      msgId,
      0,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE,
    )
  },
}

export { WeilaPBSessionWrapper }
