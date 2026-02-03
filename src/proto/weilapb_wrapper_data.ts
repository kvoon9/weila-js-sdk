import Long from "long";

interface WLMsgHeader {
    length: number;
    version: number;
    flag: number;
    serviceID: number;
    commandID: number;
    seqNum: number;
    reserved: number;
}

interface WLBuildMsgRet {
    resultCode: number;
    weilaMsgHeader?: WLMsgHeader;
    reqData?: Uint8Array;
}

interface WLSessionInfo {
    sessionId: Long;
    sessionType: number;
}

interface WLGroupAttributeInfo {
    groupId: Long;
    groupName?: string;
    avatar?: string;
    ownerId?: number;
    groupType?: number;
    desc?: string;
    publicType?: number;
    authType?: number;
    authPassword?: string;
    groupClass?: number;
    audioQuality?: number;
    speechAvailable?:boolean;
    groupLocation?: string;
    latitude?: string;
    longitude?: string;
    burstType?: number;
    memberCountLimit?: number;
}

interface WLGroupMemberInfo {
    userId: number;
    status?: number;
    memberType?: number;
    remark?: string;
    priority?: number;
    speechAvailable?: boolean;
    speechDisableTimeout?: number;
    bannedStatus?: number;
    tts?: boolean;
    locationShared?: boolean;
    createdTime: Long;
}

interface WLChangeUserInfoData {
    sex?: number;
    nick?: string;
    avatar?: string;
    signature?: string
}

interface WLChangeFriendInfo {
    remark?: string;
    label?: string;
    desc?: string;
    bannedStatus?: boolean;
    tts?: boolean;
    locationShared?: boolean
}

interface WLLocationInfo {
    userId: number;
    clientType: number;
    locationType: number;
    latitude: number;
    longitude: number;
    speed: number;
    altitude: number;
    radius: number;
    timestamp: Long;
    direction: number;
}

interface WLLocationControl {
    status: boolean;
    frequency: number;
    duration: number;
}

export {WLMsgHeader, WLBuildMsgRet,WLGroupMemberInfo, WLChangeUserInfoData, WLGroupAttributeInfo,
    WLChangeFriendInfo, WLLocationInfo, WLSessionInfo, WLLocationControl};
