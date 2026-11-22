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
    const reqGetSession: WL.Session.ReqGetSession.$Properties = { latestUpdated: updateTime }

    if (type !== undefined) {
      reqGetSession.type = type
    }

    const sessionMessage = WL.Session.SessionMessage.create({ reqGetSession })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_GET_SESSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMessage,
    )
  },

  buildRemoveSessionReq(sessionId: Long, sessionType: number): WLBuildMsgRet {
    const sessionMessage = WL.Session.SessionMessage.create({
      reqRemoveSession: { sessionId, sessionType },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_REMOVE_SESSION,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMessage,
    )
  },

  buildMsgReadReq(sessionId: Long, sessionType: number, readMsgId: number): WLBuildMsgRet {
    const sessionMessage = WL.Session.SessionMessage.create({
      reqMsgRead: { sessionId, sessionType, readMsgId },
    })

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
    const sessionMessage = WL.Session.SessionMessage.create({
      reqGetUnreadMsg: { sessionId, sessionType, fromMsgId, toMsgId },
    })

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
    const sessionMessage = WL.Session.SessionMessage.create({
      reqGetMsg: { sessionId, sessionType, msgId, count },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_GET_MSG,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMessage,
    )
  },

  buildBurstControlReq(sessionId: Long, sessionType: number, burstType: number): WLBuildMsgRet {
    const sessionMessage = WL.Session.SessionMessage.create({
      reqBurstControl: { sessionId, sessionType, burstType },
    })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_BURST_CONTROL,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMessage,
    )
  },

  buildMonitorControlReq(status: number, duration: number, subUserId: number): WLBuildMsgRet {
    const sessionMessage = WL.Session.SessionMessage.create({
      reqMonitorControl: { status, duration },
    })

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
    const msgData: WL.Session.MsgData.$Properties = {
      created: Long.fromNumber(Date.now() / 1000),
      msgId,
      sessionId,
      autoReply: autoReply ? 1 : 0,
      senderId,
      sessionType,
    }

    switch (msgType) {
      // Text, image, video, file, and location all travel as encoded text.
      case WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE:
      case WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE:
      case WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE:
      case WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE:
      case WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE:
        {
          msgData.msgType = WL.Session.MessageType.MSG_TYPE_TEXT
          msgData.textData = TextMsgDataParser.encodeSessionTextMsg({
            dataType: msgType,
            data,
          })
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_COMMAND_TYPE:
        {
          msgData.msgType = WL.Session.MessageType.MSG_TYPE_TEXT
          msgData.textData = TextMsgDataParser.encodeSessionTextMsg({
            dataType: msgType,
          })
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE:
        {
          msgData.msgType = WL.Session.MessageType.MSG_TYPE_AUDIO

          if (typeof data === 'string') {
            msgData.audioData = { url: data }
          } else {
            const audioPayload: Uint8Array = data
            // Copy the caller's buffer so the frame owns its bytes.
            msgData.audioData = { payload: audioPayload.slice() }
          }
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE:
        {
          const pttData: WL_IDbPttData = data

          msgData.msgType = WL.Session.MessageType.MSG_TYPE_PTT
          msgData.pttData = {
            marker: pttData.mark,
            opusData: {
              frameCount: pttData.frameCount,
              payload: pttData.data.slice(0),
            },
            packageSeq: pttData.seqInPackage,
            seq: pttData.seq,
            monitor: 0,
            source: WL.Session.AudioSourceType.PTT_SOURCE_APP,
          }
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_SERVICE_TYPE:
        {
          msgData.msgType = WL.Session.MessageType.MSG_TYPE_SERVICE
          msgData.serviceData = data
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_SWITCH_TYPE:
        {
          msgData.msgType = WL.Session.MessageType.MSG_TYPE_SWITCH
          msgData.switchData = { serviceData: data }
        }

        break

      case WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE:
        {
          msgData.msgType = WL.Session.MessageType.MSG_TYPE_REVOCATION
          msgData.revocationMsgId = data
        }

        break

      default: {
        return { resultCode: -1 }
      }
    }

    const sessionMessage = WL.Session.SessionMessage.create({ reqMsg: { msgData } })

    return BuildWeilaMsg.buildWeilaMsgReq(
      WL.Service.ServiceID.SERVICE_SESSION,
      WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA,
      WL.Service.CommandType.COMMAND_REQUEST,
      sessionMessage,
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
