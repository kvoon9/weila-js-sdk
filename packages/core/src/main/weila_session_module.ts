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
	WL_IDbSetting,
	WL_IDbSettingID,
} from "db/weila_db_data";
import {
	default_group_logo,
	WL_CoreInterface,
	WL_PttAudioItem,
	WL_PttFsmListener,
	WL_PttPacket,
	WL_PttPackType,
	WL_PttPayload
} from "main/weila_internal_data"
import {WL} from "proto/weilapb";
import Long from "long";
import {WeilaPBSessionWrapper} from "proto/weilapb_session_wrapper";
import {WeilaDB} from "db/weila_db";
import {WLBuildMsgRet} from "proto/weilapb_wrapper_data";
import {getLogger} from "log/weila_log";
import WLPttFsm from "main/weila_pttFsm";
import {decompositionAudioData, fetchWithTimeout, getAppKeyAndId, getMsgDataIdByCombo, getOpusDataFrameCount} from "main/weila_utils";
import {MD5} from "crypto-js";
import {
	WL_ExtEventID,
	WL_PttPlayInd,
	WL_PttPlayIndData,
	WL_PttRecordInd,
	WL_PttRecordState
} from "main/weila_external_data";

const wllog = getLogger('MOD:session:info');
const wlerr = getLogger('MOD:session:err');

interface WL_BurstInfo {
	sessionId: string;
	sessionType: number;
	packetPayloadList: WL_PttPayload[];
	curMarker: WL_PttPackType;
	dbMsgData: WL_IDbMsgData|null;
	dbMsgId: number;
	created: number;
}

export default class WLSessionModule {
	private sessionList: WL_IDbSession[];
	private token: string|null;
	private pttFsm: WLPttFsm|null;
	private curBurstInfo: WL_BurstInfo|null;

	constructor(private coreInterface: WL_CoreInterface) {
		this.token = null;
		this.curBurstInfo = null;
		this.coreInterface.registerPbMsgHandler(WL.Service.ServiceID.SERVICE_SESSION, this.onPbMsgHandler.bind(this));

		const listener = {} as WL_PttFsmListener;
		listener.onPlayInd = this.onPttPlayInd.bind(this);
		listener.onRecordPttPacketInd = this.onPttPacketRecv.bind(this);
		this.pttFsm = new WLPttFsm(listener);
	}

	private async saveSessionInfo(dBSession: WL_IDbSession): Promise<boolean> {
		if (dBSession.sessionType == WL_IDbSessionType.SESSION_INDIVIDUAL_TYPE) {
			const userInfo = await WeilaDB.getInstance().getUser(parseInt(dBSession.sessionId));
			if (userInfo) {
				dBSession.sessionName = userInfo.nick;
				dBSession.sessionAvatar = userInfo.avatar;
			}
		}else if (dBSession.sessionType == WL_IDbSessionType.SESSION_GROUP_TYPE) {
			const groupInfo: WL_IDbGroup = await WeilaDB.getInstance().getGroup(dBSession.sessionId);
			if (groupInfo) {
				dBSession.sessionName = groupInfo.name;
				dBSession.sessionAvatar = groupInfo.avatar;
			}
		}else if (dBSession.sessionType == WL_IDbSessionType.SESSION_SERVICE_TYPE) {
			const idNumber = Long.fromValue(dBSession.sessionId);
			const service: WL_IDbService|undefined = await WeilaDB.getInstance().getService(idNumber.high);
			if (service) {
				dBSession.sessionName = service.name;
				dBSession.sessionAvatar = service.avatar;
			}
		}

		await WeilaDB.getInstance().putSession(dBSession);
		return true;
	}

	private async updateSessionByNewMsgData(msgData: WL_IDbMsgData): Promise<void> {
		const index = this.sessionList.findIndex(value => {
			return value.sessionId == msgData.sessionId && value.sessionType == msgData.sessionType;
		});

		if (index == -1) {
			let session: WL_IDbSession = {} as WL_IDbSession
			session.sessionId = msgData.sessionId;
			session.sessionType = msgData.sessionType;
			if (msgData.sessionType == WL_IDbSessionType.SESSION_SERVICE_TYPE) {
				// 如果是之前没有这个session，说明此服务也不再DB中，所以需要从服务器获取服务的信息
				const serviceSession: WL_IDbServiceSessionInfo|undefined = await this.coreInterface.executeCoreFunc('weila_getServiceSession', msgData.sessionId);
				if (serviceSession) {
					session.sessionId = msgData.sessionId;
					session.sessionType = msgData.sessionType;
					session.sessionName = serviceSession.service.name;
					session.sessionAvatar = serviceSession.service.avatar;
					session.extra = serviceSession.serviceSession;
				}
			}else {
				if (msgData.sessionType == WL_IDbSessionType.SESSION_GROUP_TYPE) {
					await this.coreInterface.executeCoreFunc('weila_getGroupFromServer', session.sessionId);
				}

				session = await WeilaDB.getInstance().fillSessionInfo(session);
			}
			session.lastMsgId = msgData.msgId;
			session.latestUpdate = new Date().getTime() / 1000;
			session.combo_id_type = session.sessionId + "_" + session.sessionType;
			await WeilaDB.getInstance().putSession(session);
			this.sessionList.push(session);
			//发送有新的会话通知
			this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_SESSION_OPEN_IND, session);
		}else {
			this.sessionList[index].lastMsgId = msgData.msgId;
			this.sessionList[index].latestUpdate = new Date().getTime() / 1000;
			await WeilaDB.getInstance().putSession(this.sessionList[index]);
		}
	}

	private async getAudioMsgDataFromTextMsgData(msgData: WL_IDbMsgData): Promise<WL_IDbMsgData> {
		try {
			const weilaTokenItem = await WeilaDB.getInstance().getSettingItem(WL_IDbSettingID.SETTING_LOGIN_TOKEN);
			const weilaToken = weilaTokenItem.data;
			let speakerInfo = '';
			const senderUserInfo = await WeilaDB.getInstance().getUser(msgData.senderId);

			if (senderUserInfo) {
				speakerInfo = senderUserInfo.nick;
			}else {
				speakerInfo = '未知用户';
			}

			if (msgData.sessionType == WL_IDbSessionType.SESSION_GROUP_TYPE) {
				const groupInfo = await WeilaDB.getInstance().getGroup(msgData.sessionId);
				if (groupInfo) {
					speakerInfo += '在' + groupInfo.name + '里';
				}
			}else if (msgData.sessionType == WL_IDbSessionType.SESSION_SERVICE_TYPE) {
				const service = await WeilaDB.getInstance().getService(Long.fromValue(msgData.sessionId).high);
				if (service) {
					speakerInfo += '在' + service.name + '里';
				}
			}
			speakerInfo += '说';

			const appKeyAndId = WeilaDB.getAppAuthInfo() ? WeilaDB.getAppAuthInfo() : getAppKeyAndId();
			const data = {};
			data['user_id'] = this.coreInterface.getLoginUserInfo().userId;
			data['text'] = speakerInfo + msgData.textData;
			wllog('文字转语音，文字：%s', data['text']);
			data['speed'] = 8;
			data['vol'] = 6;
			data['et'] = '' + (Math.floor(Date.now() / 1000) + 20);
			data['app_id'] = appKeyAndId.appId;
			data['sign'] = MD5(data['et'] + appKeyAndId.appKey).toString();
			const response = await fetchWithTimeout('/v1/speech/synthesis/ptt-flx?access-token=' + weilaToken,
				{method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'}});

			if (response.ok) {
				const data = await response.json();
				if (data.errcode == 0) {
					let matchResult = data.data.url.match(/(http|https):\/\/([^\/]+)\/(.+)/i);
					if (matchResult && matchResult.length >= 4) {
						//const pttUrl = "/" + matchResult[3];
						const pttUrl = data.data.url;
						const audioData = await fetchWithTimeout(pttUrl).then(value => {
							if (value.ok) {
								return value.arrayBuffer();
							}

							wlerr('获取音频数据出错:', value.statusText);
							return null;
						}).catch(reason => {
							wlerr('获取音频数据失败', reason);
						});

						if (audioData) {
							const audioMsgData = {} as WL_IDbMsgData;
							audioMsgData.sessionId = msgData.sessionId;
							audioMsgData.sessionType = msgData.sessionType;
							audioMsgData.msgId = msgData.msgId;
							audioMsgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE;
							audioMsgData.created = msgData.created;
							audioMsgData.senderId = msgData.senderId;
							audioMsgData.audioData = {} as WL_IDbAudioData;
							audioMsgData.audioData.data = new Uint8Array(audioData.slice(10));
							audioMsgData.audioData.frameCount = getOpusDataFrameCount(audioMsgData.audioData.data);
							audioMsgData.combo_id = getMsgDataIdByCombo(audioMsgData, 0);
							return audioMsgData;
						}else {
							return Promise.reject('获取音频数据失败');
						}
					}else {
						return Promise.reject('ptt的地址不正确');
					}
				}else {
					return Promise.reject('获取ptt地址失败:' + data.errmsg);
				}
			}else{
				return Promise.reject(response.statusText);
			}
		}catch (e) {
			return Promise.reject(e);
		}
	}

	private onPbMsgHandler(data: any): void {
		const serverMessage = data as WL.Service.IServiceMessage;
		if (serverMessage.serviceHead.commandType == WL.Service.CommandType.COMMAND_RESPONSE) {
			switch (serverMessage.serviceHead.commandId) {
				case WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA: {
					this.coreInterface.rspPbMsg(serverMessage.serviceHead.seq, serverMessage.serviceHead.resultCode,
						serverMessage.sessionMessage.rspMsg);
				}
				break;

				case WL.Session.SessionCommandId.SESSION_COMMAND_GET_SESSION: {
					this.coreInterface.rspPbMsg(serverMessage.serviceHead.seq, serverMessage.serviceHead.resultCode,
						serverMessage.sessionMessage.rspGetSession);
				}
				break;

				case WL.Session.SessionCommandId.SESSION_COMMAND_GET_MSG: {
					this.coreInterface.rspPbMsg(serverMessage.serviceHead.seq, serverMessage.serviceHead.resultCode,
						serverMessage.sessionMessage.rspGetMsg);
				}
				break;

				case WL.Session.SessionCommandId.SESSION_COMMAND_READ_MSG: {
					this.coreInterface.rspPbMsg(serverMessage.serviceHead.seq, serverMessage.serviceHead.resultCode,
						serverMessage.sessionMessage.rspMsgRead);
				}
				break;

				case WL.Session.SessionCommandId.SESSION_COMMAND_REMOVE_SESSION: {
					this.coreInterface.rspPbMsg(serverMessage.serviceHead.seq, serverMessage.serviceHead.resultCode, true);
				}
				break;
			}
		}else if (serverMessage.serviceHead.commandType == WL.Service.CommandType.COMMAND_NOTIFY) {
			if (serverMessage.serviceHead.commandId == WL.Session.SessionCommandId.SESSION_COMMAND_MSGDATA) {
				(async () => {
					const msgDataRaw = serverMessage.sessionMessage.ntfMsg.msgData;
					const loginUserInfo = this.coreInterface.getLoginUserInfo();
					const msgDatas = WeilaDB.getInstance().convertFromMsgDataRaws([msgDataRaw], loginUserInfo.userId);
					wllog('转换后的消息:', msgDatas, msgDatas.length);
					if (msgDatas.length) {
						const msgData = msgDatas[0];
						msgData.combo_id = getMsgDataIdByCombo(msgData, 0);

						if (msgData.msgType == WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE) {
							const audioMsgData = await this.pttFsm.putPttMsgData(msgData);
							await this.updateSessionByNewMsgData(audioMsgData);
							//发送通知消息出去
							this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_MSG_RECV_IND, audioMsgData);
						}else if (msgData.msgType == WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE) {
							msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ;
							this.isTTSPermit(msgData).then(async value => {
								if (value) {
									const audioData = await this.getAudioMsgDataFromTextMsgData(msgData);
									this.pttFsm.putAudioMsgData(audioData, false);
								}
							}).catch(reason => {
								wlerr('转TTS出错', reason);
							})
						}else if (msgData.msgType == WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE) {
							msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW;
							this.pttFsm.putAudioMsgData(msgData, true);
						}else {
							msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ;
						}

						wllog('incoming msgdata:', msgData);
						if (msgData.msgType != WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE) {
							if (msgData.msgType != WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE) {
								await this.updateSessionByNewMsgData(msgData);
								//发送通知消息出去
								this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_MSG_RECV_IND, msgData);
								await WeilaDB.getInstance().putMsgData(msgData);
							}else {
								const withdrawMsgData =
									await WeilaDB.getInstance().getMsgDataByMsgId(msgData.sessionId, msgData.sessionType, msgData.withdrawMsgId);

								wllog('withdraw msg is:', withdrawMsgData);
								if (withdrawMsgData) {
									withdrawMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_WITHDRAW;
									//发送通知消息出去
									this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_MSG_RECV_IND, withdrawMsgData);
									await WeilaDB.getInstance().putMsgData(withdrawMsgData);
								}
							}
						}
					}
				})();
			}else if (serverMessage.serviceHead.commandId == WL.Session.SessionCommandId.SESSION_COMMAND_BURST_CONTROL) {
				wllog('收到发言控制消息:', serverMessage.sessionMessage.ntfBurstControl);
			}
		}
	}

	private async isTTSPermit(msgData: WL_IDbMsgData): Promise<boolean> {
		const sessionSetting = await WeilaDB.getInstance().getSessionSetting(msgData.sessionId, msgData.sessionType);
		if (sessionSetting) {
			return sessionSetting.tts;
		}

		return false;
	}

	public async getMsgDataFromServer(sessionId: string, sessionType: number, fromMsgId: number, count: number): Promise<boolean> {
		const buildResult = WeilaPBSessionWrapper.buildMsgGetMsgReq(
			Long.fromValue(sessionId),
			sessionType,
			fromMsgId,
			count);

		let readMsgId = 0;

		const sessionIdx = this.sessionList.findIndex(value => {
			return value.sessionId == sessionId && value.sessionType == sessionType;
		});

		if (sessionIdx != -1) {
			readMsgId = this.sessionList[sessionIdx].readMsgId;
		}

		if (buildResult.resultCode == 0) {
			console.time('getMsgDataFromServer')
			const rspGetMsg = await this.coreInterface.sendPbMsg(buildResult) as WL.Session.IRspGetMsg;
			wllog("从服务器获取:" + rspGetMsg.msgList.length + " 条记录");
			let msgDatas = WeilaDB.getInstance().convertFromMsgDataRaws(
					rspGetMsg.msgList,
					this.coreInterface.getLoginUserInfo().userId);

			for(let msgData of msgDatas) {
				msgData.combo_id = getMsgDataIdByCombo(msgData, 0);
			}

			msgDatas = msgDatas.filter(value => {
				return value.msgType != WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE;
			});

			const comboIdList = msgDatas.map(value => {
				return value.combo_id;
			});

			const oldMsgDatas = await WeilaDB.getInstance().getMsgDataByComboIds(comboIdList);
			if (oldMsgDatas.length) {
				const oldMsgComboIds = oldMsgDatas.map(value => {
					return value.combo_id;
				})

				msgDatas = msgDatas.filter(value => {
					return oldMsgComboIds.indexOf(value.combo_id) == -1;
				});
			}

			msgDatas.forEach(value => {
				if (value.senderId != this.coreInterface.getLoginUserInfo().userId) {
					if (value.msgId > readMsgId) {
						value.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW;
					}else {
						value.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ;
					}
				}else {
					value.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT;
				}
			});

			await WeilaDB.getInstance().putMsgDatas(msgDatas);
			wllog('从服务器中获取会话%d条消息成功', msgDatas.length);

			console.timeEnd('getMsgDataFromServer')
			return true;
		}

		return Promise.reject('创建读取消息异常:' + buildResult.resultCode);
	}

	public async getMsgDatas(
		sessionId: string,
		sessionType: number,
		startMsgId: number,
		count: number): Promise<WL_IDbMsgData[]|undefined> {

		let dbMsgDataList = [];

		if (startMsgId == 0) {
			dbMsgDataList =
				await WeilaDB.getInstance().getLastMsgDatas(sessionId, sessionType, count);
		}else {
			dbMsgDataList =
				await WeilaDB.getInstance().getMsgDatasWithRange(sessionId, sessionType, startMsgId, count);
		}

		wllog('从数据库得到的%d条数据:', dbMsgDataList.length);

		if (dbMsgDataList.length < count) {
			await this.getMsgDataFromServer(sessionId, sessionType, startMsgId, count);
		}

		if (startMsgId) {
			return WeilaDB.getInstance().getMsgDatasWithRange(sessionId, sessionType, startMsgId, count);
		}

		return WeilaDB.getInstance().getLastMsgDatas(sessionId, sessionType, count);
	}

	public async setSessionMsgRead(sessionId: string, sessionType: number, msgId: number): Promise<boolean> {
		const buildResult = WeilaPBSessionWrapper.buildMsgReadReq(Long.fromValue(sessionId), sessionType, msgId);
		if (buildResult.resultCode == 0) {
			const rsp = await this.coreInterface.sendPbMsg(buildResult);
			wllog('设已读的响应结果', rsp);
			return true;
		}

		return Promise.reject('创建读取消息异常:' + buildResult.resultCode);
	}

	public async initSessions(): Promise<boolean> {
		const dbInstance = WeilaDB.getInstance();
		let settingItem = await dbInstance.getSettingItem(WL_IDbSettingID.SETTING_SESSION_LATEST_UPDATE);
		let latestTime = 0;
		if (settingItem) {
			latestTime = settingItem.data as number;
		}
		const buildResult = WeilaPBSessionWrapper.buildGetSessionReq(Long.fromValue(latestTime));

		if (buildResult.resultCode == 0) {
			let rspMsg = await this.coreInterface.sendPbMsg(buildResult, 30000) as WL.Session.IRspGetSession;
			wllog("buildGetSessionReq:", rspMsg);
			if (!settingItem) {
				settingItem = {} as WL_IDbSetting;
				settingItem.id = WL_IDbSettingID.SETTING_SESSION_LATEST_UPDATE;
			}
			settingItem.data = Long.fromValue(rspMsg.latestUpdated).toNumber();
			await dbInstance.putSettingItem(settingItem);

			wllog('initSessions:', rspMsg.sessionInfoList);
			if (rspMsg.sessionInfoList.length) {
				const sessionInfos: WL_IDbSession[] = await dbInstance.convertFromSessionRaw(rspMsg.sessionInfoList);
				await dbInstance.putSessions(sessionInfos);
				wllog('after convert:', sessionInfos);
			}

			this.sessionList = await dbInstance.getSessions();
			wllog('会话列表:', this.sessionList);

			return true;
		}

		return Promise.reject('创建消息失败:' + buildResult.resultCode);
	}

	public async sendAudioMsg(sessionId: string, sessionType: number, audioUrl: string, frameCount?: number): Promise<boolean> {
		const audioData = {} as WL_IDbAudioData;
		audioData.audioUrl = audioUrl;
		audioData.frameCount = frameCount ? frameCount : 0;

		return this.sendMsgData(sessionId, sessionType, audioData, WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE);
	}


	public async sendPttMsgByData(sessionId: string, sessionType: number, data: Uint8Array): Promise<boolean> {
		const pttData = {} as WL_IDbPttData;
		const pttCodeData = data.subarray(10)
		pttData.data = pttCodeData;
		pttData.frameCount = getOpusDataFrameCount(pttCodeData);
		pttData.seqInPackage = 0;
		pttData.seq = Math.floor(Date.now() / 1000);
		pttData.mark = WL_PttPackType.PTT_WHOLE_PACK;
		pttData.sourceType = WL.Session.AudioSourceType.PTT_SOURCE_APP;

		return this.sendMsgData(sessionId, sessionType, pttData, WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE);
	}
	

	public async sendMsgData(sessionId: string, sessionType: number,
	                         data: string|WL_IDbAudioData|WL_IDbFileData|WL_IDbLocationShared|WL_IDbPttData,
	                         msgType: WL_IDbMsgDataType,
	                         msgData?: WL_IDbMsgData): Promise<boolean> {
		let buildResult = null as WLBuildMsgRet|null;
		const seqSetting = await WeilaDB.getInstance().getSettingItem(WL_IDbSettingID.SETTING_MSG_SENDING_SEQ);
		const index = this.sessionList.findIndex(value => {
			return value.sessionId == sessionId && value.sessionType == sessionType;
		});
		const lastMsgData = await WeilaDB.getInstance().getLastMsgData(sessionId, sessionType);

		let dbMsgData = {} as WL_IDbMsgData;
		if (msgData) {
			dbMsgData = msgData;
		}else {
			dbMsgData.msgType = msgType;
			dbMsgData.sessionId = sessionId;
			dbMsgData.sessionType = sessionType;
			dbMsgData.senderId = this.coreInterface.getLoginUserInfo().userId;
			dbMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT;
			dbMsgData.created = new Date().getTime() / 1000;
			dbMsgData.msgId = lastMsgData ? lastMsgData.msgId + 1 : 0;
			dbMsgData.autoReply = 0;
			dbMsgData.combo_id = getMsgDataIdByCombo(dbMsgData, seqSetting.data++);
			await WeilaDB.getInstance().putSettingItem(seqSetting);
		}

		if (msgType == WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE) {
			dbMsgData.textData = data as string;
			buildResult = WeilaPBSessionWrapper.buildTextSessionMsgReq(Long.fromValue(sessionId), sessionType,
				this.coreInterface.getLoginUserInfo().userId, false, data as string);
		}else if (msgType == WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE || msgType == WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE) {
			dbMsgData.fileInfo = data as WL_IDbFileData;
			buildResult = WeilaPBSessionWrapper.buildMediaInfoSessionMsgReq(Long.fromValue(sessionId), sessionType,
				this.coreInterface.getLoginUserInfo().userId, false, data as WL_IDbFileData, msgType == WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE);
		}else if (msgType == WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE) {
			dbMsgData.fileInfo = data as WL_IDbFileData;
			buildResult = WeilaPBSessionWrapper.buildImageSessionMsgReq(Long.fromValue(sessionId), sessionType,
				this.coreInterface.getLoginUserInfo().userId, false, dbMsgData.fileInfo.fileUrl);
		}else if (msgType == WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE) {
			dbMsgData.location = data as WL_IDbLocationShared;
			buildResult = WeilaPBSessionWrapper.buildLocationInfoSessionMsgReq(Long.fromValue(sessionId), sessionType,
				this.coreInterface.getLoginUserInfo().userId, false, data as WL_IDbLocationShared);
		}else if (msgType == WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE) {
			dbMsgData.audioData = data as WL_IDbAudioData;
			buildResult = WeilaPBSessionWrapper.buildAudioSessionMsgReq(Long.fromValue(sessionId), sessionType,
				this.coreInterface.getLoginUserInfo().userId, false, data as string);
		}else if (msgType == WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE) {
			dbMsgData.pttData = data as WL_IDbPttData;
			buildResult = WeilaPBSessionWrapper.buildPttSessionMsgReq(Long.fromValue(sessionId), sessionType,
				this.coreInterface.getLoginUserInfo().userId, false, data as WL_IDbPttData);
		}

		if (buildResult.resultCode == 0) {
			try {
				const rspMsg = await this.coreInterface.sendPbMsg(buildResult) as WL.Session.IRspMsg;
				await WeilaDB.getInstance().delMsgDataByComboId(dbMsgData.combo_id);

				wllog('发送消息成功,返回结果id:', rspMsg.msgId);
				dbMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT;
				dbMsgData.msgId = rspMsg.msgId;
				dbMsgData.combo_id = getMsgDataIdByCombo(dbMsgData, 0);
				if (index !== -1) {
					this.sessionList[index].lastMsgId = dbMsgData.msgId;
					this.sessionList[index].latestUpdate = new Date().getTime() / 1000;
					wllog("session:", this.sessionList);
					await WeilaDB.getInstance().putSession(this.sessionList[index]);
				}else {
					await this.startSession(sessionId, sessionType, undefined, dbMsgData.msgId);
				}
				return true;
			}catch (e) {
				wlerr('发送会话消息失败:', e);
				dbMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT;
				return Promise.reject(e);
			}finally {
				// 不管消息发送成功与否，都存入数据库，并对外发布此消息。
				await WeilaDB.getInstance().putMsgData(dbMsgData);
				// 通知消息发送
				this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_MSG_SEND_IND, dbMsgData);
			}
		}

		return Promise.reject('创建消息失败:不存在消息类型:' + msgType);
	}

	public async deleteSession(sessionId: string, sessionType: number): Promise<boolean> {
		const buildMsgRet = WeilaPBSessionWrapper.buildRemoveSessionReq(Long.fromValue(sessionId), sessionType);
		if (buildMsgRet.resultCode == 0) {
			try {
				await this.coreInterface.sendPbMsg(buildMsgRet);
			}finally {
				const sessionInfo = await WeilaDB.getInstance().getSession(sessionId, sessionType);
				const index = this.sessionList.findIndex(value => {
					return value.sessionId == sessionId && value.sessionType == sessionType;
				});
				if (index != -1) {
					this.sessionList.splice(index, 1);
				}
				if (sessionInfo) {
					await WeilaDB.getInstance().delSessions([sessionInfo.combo_id_type]);
				}
			}

			return true;
		}

		return Promise.reject('创建消息失败:' + buildMsgRet.resultCode);
	}

	public async startSession(sessionId: string, sessionType: number, extra?: any, lastMsgId?: number): Promise<WL_IDbSession> {
		const dbSessionInfo = await WeilaDB.getInstance().getSession(sessionId, sessionType);
		if (dbSessionInfo) {
			return dbSessionInfo;
		}

		const sessionInfo = {} as WL_IDbSession;
		sessionInfo.sessionId = sessionId;
		sessionInfo.sessionType = sessionType;
		sessionInfo.combo_id_type = sessionId + "_" + sessionType;
		sessionInfo.readMsgId = 0;
		sessionInfo.latestUpdate = new Date().getTime() / 1000;
		sessionInfo.lastMsgId = lastMsgId ? lastMsgId : 0;
		sessionInfo.sessionName = '';
		sessionInfo.sessionAvatar = default_group_logo;
		sessionInfo.status = WL_IDbSessionStatus.SESSION_ACTIVATE;
		sessionInfo.extra = extra;

		await this.saveSessionInfo(sessionInfo);
		this.sessionList.push(sessionInfo);

		this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_NEW_SESSION_OPEN_IND, sessionInfo);
		return sessionInfo;
	}

	public async initAudioSystem(): Promise<boolean> {
		return this.pttFsm.initAudio();
	}

	public async playSingleAudioItem(msgData: WL_IDbMsgData): Promise<boolean> {
		return this.pttFsm.playSingle(msgData);
	}

	public async playHistoryAudioItems(msgDatas: WL_IDbMsgData[]): Promise<boolean> {
		return this.pttFsm.playHistory(msgDatas);
	}

	public stopPlayAudio() {
		return this.pttFsm.stopPlayAudio();
	}

	private async onPttPlayInd(audioItem: WL_PttAudioItem|null, indData: WL_PttPlayIndData): Promise<void> {
		const pttPlayInd = {} as WL_PttPlayInd;
		pttPlayInd.msgData = audioItem ? audioItem.msgData : null;
		pttPlayInd.indData = indData;
		this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_PTT_PLAY_IND, pttPlayInd);
	}


	private async sendPttPacket(pttPacket: WL_PttPacket, isNotify: boolean): Promise<void> {
		wllog('onPttPacketRecv', this.curBurstInfo);
		const pttData = {} as WL_IDbPttData;
		pttData.seq = pttPacket.seq;
		pttData.data = pttPacket.data;
		pttData.frameCount = pttPacket.frameCount;
		pttData.seqInPackage = pttPacket.seqInPackage;
		pttData.mark = pttPacket.mark;
		pttData.sourceType = WL.Session.AudioSourceType.PTT_SOURCE_APP;

		if (pttPacket.mark == WL_PttPackType.PTT_FIRST_PACK || pttPacket.mark == WL_PttPackType.PTT_WHOLE_PACK) {
			const seqSetting = await WeilaDB.getInstance().getSettingItem(WL_IDbSettingID.SETTING_MSG_SENDING_SEQ);
			const lastMsgData = await WeilaDB.getInstance().getLastMsgData(this.curBurstInfo.sessionId, this.curBurstInfo.sessionType);
			this.curBurstInfo.dbMsgData = {} as WL_IDbMsgData;
			this.curBurstInfo.dbMsgData.audioData = {} as WL_IDbAudioData;
			this.curBurstInfo.dbMsgData.audioData.data = pttData.data.slice(0);
			this.curBurstInfo.dbMsgData.audioData.frameCount = pttData.frameCount;
			this.curBurstInfo.dbMsgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE;
			this.curBurstInfo.dbMsgData.senderId = this.coreInterface.getLoginUserInfo().userId;
			this.curBurstInfo.dbMsgData.sessionId = this.curBurstInfo.sessionId;
			this.curBurstInfo.dbMsgData.sessionType = this.curBurstInfo.sessionType;
			this.curBurstInfo.dbMsgData.autoReply = 0;
			this.curBurstInfo.dbMsgData.msgId = lastMsgData ? lastMsgData.msgId + 1 : 0;
			this.curBurstInfo.dbMsgData.combo_id = getMsgDataIdByCombo(this.curBurstInfo.dbMsgData, seqSetting.data++);
		}else {
			if (this.curBurstInfo.dbMsgData) {
				const newData =
					new Uint8Array(this.curBurstInfo.dbMsgData.audioData.data.length + pttPacket.data.length);
				newData.set(this.curBurstInfo.dbMsgData.audioData.data);
				newData.set(pttPacket.data, this.curBurstInfo.dbMsgData.audioData.data.length);
				this.curBurstInfo.dbMsgData.audioData.frameCount += pttPacket.frameCount;
				this.curBurstInfo.dbMsgData.audioData.data = newData;
			}else {
				return;
			}
		}

		const buildMsgRet = WeilaPBSessionWrapper.buildPttSessionMsgReq(
			Long.fromValue(this.curBurstInfo.sessionId),
			this.curBurstInfo.sessionType,
			this.coreInterface.getLoginUserInfo().userId,
			false,
			pttData);

		if (buildMsgRet.resultCode == 0) {
			try {
				const rsp = await this.coreInterface.sendPbMsg(buildMsgRet) as WL.Session.IRspMsg;
				this.curBurstInfo.dbMsgData.msgId = rsp.msgId;
				this.curBurstInfo.dbMsgData.created = Long.fromValue(rsp.created).toNumber();
				this.curBurstInfo.dbMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT;
				await WeilaDB.getInstance().putMsgData(this.curBurstInfo.dbMsgData);
			}catch (e) {
				this.curBurstInfo.dbMsgData.msgId = -1;
				this.curBurstInfo.dbMsgData.created = new Date().getTime() / 1000;
				this.curBurstInfo.dbMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT;
				await WeilaDB.getInstance().putMsgData(this.curBurstInfo.dbMsgData);
			}finally {
				//依据marker状态发送不同的对外信息。
				const index = this.sessionList.findIndex(value => {
					return value.sessionId == this.curBurstInfo.sessionId &&
						value.sessionType == this.curBurstInfo.sessionType;
				});

				if (index !== -1) {
					this.sessionList[index].lastMsgId = this.curBurstInfo.dbMsgData.msgId;
				}

				const pttRecordInd: WL_PttRecordInd = {} as WL_PttRecordInd;
				pttRecordInd.msgData = this.curBurstInfo.dbMsgData;
				if (this.curBurstInfo.dbMsgData.status == WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT) {
					if (pttPacket.mark == WL_PttPackType.PTT_INTER_PACK) {
						pttRecordInd.state = WL_PttRecordState.PTT_AUDIO_RECORDING;
					} else if (pttPacket.mark == WL_PttPackType.PTT_END_PACK ||
						pttPacket.mark == WL_PttPackType.PTT_WHOLE_PACK) {

						await WeilaDB.getInstance().delMsgDataByComboId(this.curBurstInfo.dbMsgData.combo_id);
						this.curBurstInfo.dbMsgData.combo_id = getMsgDataIdByCombo(this.curBurstInfo.dbMsgData, 0);
						await WeilaDB.getInstance().putMsgData(this.curBurstInfo.dbMsgData);

						pttRecordInd.state = WL_PttRecordState.PTT_AUDIO_RECORDING_END;
						this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_MSG_SEND_IND, this.curBurstInfo.dbMsgData);
					} else {
						pttRecordInd.state = WL_PttRecordState.PTT_AUDIO_RECORDING_START;
					}
				}else {
					if (isNotify) {
						await this.pttFsm.releaseTalkByError();
						pttRecordInd.state = WL_PttRecordState.PTT_AUDIO_RECORDING_END;
						this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_MSG_SEND_IND, this.curBurstInfo.dbMsgData);
					}
				}

				if (isNotify) {
					this.coreInterface.sendExtEvent(WL_ExtEventID.WL_EXT_PTT_RECORD_IND, pttRecordInd);
				}
			}
		}
	}

	public async sendPttPacketsByAudioData(sessionId: string, sessionType: number, audioData: Uint8Array): Promise<boolean> {
		let pttPayloads = decompositionAudioData(audioData);
		WLPttFsm.pttSeq++;
		this.curBurstInfo = {} as WL_BurstInfo;
		this.curBurstInfo.curMarker = WL_PttPackType.PTT_FIRST_PACK;
		this.curBurstInfo.packetPayloadList = [];
		this.curBurstInfo.sessionId = sessionId;
		this.curBurstInfo.sessionType = sessionType;

		for (let i = 0; i < pttPayloads.length; i++) {
			const pttMsgData = {} as WL_PttPacket;
			if (i == 0) {
				pttMsgData.mark = WL_PttPackType.PTT_FIRST_PACK;
			}else if (i == pttPayloads.length - 1) {
				pttMsgData.mark = WL_PttPackType.PTT_END_PACK;
			}else {
				pttMsgData.mark = WL_PttPackType.PTT_INTER_PACK;
			}

			pttMsgData.data = pttPayloads[i].data;
			pttMsgData.sourceType = 5;
			pttMsgData.frameCount = pttPayloads[i].frameCount;
			pttMsgData.seq = WLPttFsm.pttSeq;
			pttMsgData.seqInPackage = i;
	
			if (pttPayloads.length == 1) {
				pttMsgData.mark = WL_PttPackType.PTT_WHOLE_PACK;
			}
	
			await this.sendPttPacket(pttMsgData, false);
		}

		return true;
	}

	private async onPttPacketRecv(pttPacket: WL_PttPacket): Promise<void> {
		return this.sendPttPacket(pttPacket, true);
	}

	public async requestTalk(sessionId: string, sessionType: number): Promise<boolean> {
		//要判断一下是否可以申请发言
		const ret = await this.canTalk(sessionId, sessionType);
		if (ret) {
			await this.pttFsm.requestTalk();
			this.curBurstInfo = {} as WL_BurstInfo;
			this.curBurstInfo.curMarker = WL_PttPackType.PTT_FIRST_PACK;
			this.curBurstInfo.packetPayloadList = [];
			this.curBurstInfo.sessionId = sessionId;
			this.curBurstInfo.sessionType = sessionType;
			return true;
		}

		return false;
	}

	public async releaseTalk(): Promise<boolean> {
		return this.pttFsm.releaseTalk();
	}

	private async canTalk(sessionId: string, sessionType: number): Promise<boolean> {
		if (sessionType == WL_IDbSessionType.SESSION_GROUP_TYPE) {
			const groupInfo = await WeilaDB.getInstance().getGroup(sessionId);
			return groupInfo.speechEnable;
		}

		return true;
	}

	getSessionList(): WL_IDbSession[] {
		return this.sessionList;
	}

	playNext() {
		return this.pttFsm.playNext();
	}
}
