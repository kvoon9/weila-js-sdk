import Long from 'long'

interface WLMsgHeader {
  length: number
  version: number
  flag: number
  serviceID: number
  commandID: number
  seqNum: number
  reserved: number
}

interface WLBuildMsgRet {
  resultCode: number
  weilaMsgHeader?: WLMsgHeader
  reqData?: Uint8Array
}

interface WLSessionInfo {
  sessionId: Long
  sessionType: number
}

interface WLGroupAttributeInfo {
  groupId: Long
  groupName?: string
  avatar?: string
  ownerId?: number
  groupType?: number
  desc?: string
  publicType?: number
  authType?: number
  authPassword?: string
  groupClass?: number
  audioQuality?: number
  speechAvailable?: boolean
  groupLocation?: string
  latitude?: string
  longitude?: string
  burstType?: number
  memberCountLimit?: number
}

export { WLMsgHeader, WLBuildMsgRet, WLGroupAttributeInfo, WLSessionInfo }
