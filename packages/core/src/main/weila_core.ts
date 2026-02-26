// @ts-ignore
import Network from 'main/weila_network.worker'
import { fsmEvents, mainFsm } from 'fsm/weila_fsmScript'
import { WLConfig } from 'main/weila_config'
import { interpret } from 'xstate'
import Long from 'long'

import {
  WL_CoreInterface,
  WL_LoginParam,
  WL_LoginResult,
  WL_NetworkEvent,
  WL_NetworkEventID,
  WL_NetworkState,
  WL_PbMsgData,
  WL_PbMsgHandler,
  WL_PromiseCallback,
} from 'main/weila_internal_data'
import { WLBuildMsgRet } from 'proto/weilapb_wrapper_data'
import {
  WL_IDbAudioData,
  WL_IDbExtension,
  WL_IDbExtensionInfo,
  WL_IDbFileData,
  WL_IDbFriend,
  WL_IDbGroup,
  WL_IDbGroupMember,
  WL_IDbGroupType,
  WL_IDbLocationInfo,
  WL_IDbLocationShared,
  WL_IDbMsgData,
  WL_IDbMsgDataStatus,
  WL_IDbMsgDataType,
  WL_IDbNotification,
  WL_IDbServiceSessionInfo,
  WL_IDbServiceStaffInfo,
  WL_IDbSession,
  WL_IDbSessionSetting,
  WL_IDbSessionSettingParams,
  WL_IDbSessionType,
  WL_IDbSettingID,
  WL_IDbUserInfo,
} from 'db/weila_db_data'
import { getLogger } from 'log/weila_log'
import {
  calculateOpusDataFrame,
  fetchWithTimeout,
  getMsgDataIdByCombo,
  getPbResultCodeMassage,
} from 'main/weila_utils'
import WLLoginModule from 'main/weila_login_module'
import WLSessionModule from 'main/weila_session_module'
import WLFriendModule from 'main/weila_friend_module'
import WLGroupModule from 'main/weila_group_module'
import WLLocationModule from 'main/weila_location_module'
import WLUserModule from 'main/weila_user_module'
import { WL } from 'proto/weilapb'
import { WeilaDB } from 'db/weila_db'
import { TinyEmitter } from 'tiny-emitter'
import {
  WL_AnswerStatus,
  WL_DataPrepareInd,
  WL_DataPrepareState,
  WL_ExtEventCallback,
  WL_ExtEventID,
} from 'main/weila_external_data'
import { AliOssHelper, WL_UploadResult } from 'main/weila_ali_oss'
import { TextMsgDataParser } from 'proto/weilapb_textmsg_parser'
import WLBusinessModule from 'main/weila_business_module'

const wllog = getLogger('CORE:info')
const wlerr = getLogger('CORE:err')

interface WL_WaitingRspPbMsgInfo {
  resolve(value: any): any
  reject(reason: any): any
  pbMsgData: WL_PbMsgData
  timeout: number
}

interface WL_SendingPbMsgInfo {
  resolve(value: any): any
  reject(reason: any): any
  buildPbMsg: WLBuildMsgRet
  timeout?: number
}

class WeilaCore implements WL_CoreInterface {
  readonly maxRetryLoginTimes = 2
  mainFsm?: any
  mainFsmService?: any
  network?: Network
  waitingRspMap: Map<number, WL_WaitingRspPbMsgInfo>
  waitingTimeoutChecking: boolean
  pbMsgHandlerList: Map<number, WL_PbMsgHandler>
  sendingPbMsgList: WL_SendingPbMsgInfo[]
  loginUserInfo?: WL_IDbUserInfo
  loginModule: WLLoginModule
  sessionModule: WLSessionModule
  friendModule: WLFriendModule
  groupModule: WLGroupModule
  businessModule: WLBusinessModule
  locationModule: WLLocationModule
  userModule: WLUserModule
  isLoginReady: boolean
  emitter: TinyEmitter
  heartbeatTimerId: any
  refreshTokenTimerId: any

  constructor() {
    this.emitter = new TinyEmitter()
    this.waitingTimeoutChecking = false
    this.isLoginReady = false
    this.mainFsm = mainFsm
      .withContext({
        loginParam: null,
        core: this,
      })
      .withConfig({
        services: {
          loadResource: this.loadResource.bind(this),
          prepareData: this.prepareData.bind(this),
          loginServer: this.loginServer.bind(this),
          logout: this.logout.bind(this),
        },
        actions: {
          onResourceLoadFail: this.onResourceLoadFail.bind(this),
          onLoadingResource: this.onLoadingResource.bind(this),
          onException: this.onException.bind(this),
          onReadyEntry: this.onReadyEntry.bind(this),
          onReadyExit: this.onReadyExit.bind(this),
          onSysTimeChecking: this.onSysTimeChecking.bind(this),
          onDataInit: this.onDataInit.bind(this),
          onDataInited: this.onDataInited.bind(this),
          onDataPrepareFail: this.onDataPrepareFail.bind(this),
          onLoginServerSucc: this.onLoginSucc.bind(this),
          onLoginServerFail: this.onLoginFail.bind(this),
          connectServer: this.connectServer.bind(this),
          onConnecting: this.onConnecting.bind(this),
          onDisconnectInReadyState: this.onDisconnectInReadyState.bind(this),
          onLoginRetryFail: this.onLoginRetryFail.bind(this),
          onLoginTryEntry: this.onLoginTryEntry.bind(this),
        },
        guards: {
          isLoginSucc: this.isLoginSucc.bind(this),
          canRetry: this.canRetry.bind(this),
        },
      })

    // 主要状态机的激活
    this.mainFsmService = interpret(this.mainFsm)
      .onTransition((state, event) => {
        wllog(
          '事件:%s 从状态:%s ===> 状态:%s',
          JSON.stringify(event),
          state.history ? JSON.stringify(state.history.value) : '初始状态',
          JSON.stringify(state.value),
        )
      })
      .start()

    this.waitingRspMap = new Map<number, WL_WaitingRspPbMsgInfo>()
    this.pbMsgHandlerList = new Map<number, WL_PbMsgHandler>()
    this.sendingPbMsgList = []

    this.network = new Network()
    this.network.onmessage = this.onNetworkMessage.bind(this)

    this.loginModule = new WLLoginModule(this)
    this.friendModule = new WLFriendModule(this)
    this.groupModule = new WLGroupModule(this)
    this.businessModule = new WLBusinessModule(this)
    this.sessionModule = new WLSessionModule(this)
    this.locationModule = new WLLocationModule(this)
    this.userModule = new WLUserModule(this)
  }

  sendExtEvent(event: WL_ExtEventID, data: any): void {
    this.emitter.emit('ext_event', event, data)
  }

  getLoginUserInfo(): WL_IDbUserInfo {
    return this.loginUserInfo
  }

  registerPbMsgHandler(serviceId: number, handler: WL_PbMsgHandler): void {
    this.pbMsgHandlerList.set(serviceId, handler)
  }

  rspPbMsg(seq: number, resultCode: number, data: any): void {
    if (this.waitingRspMap.has(seq)) {
      const sendingItem = this.waitingRspMap.get(seq)
      this.waitingRspMap.delete(seq)

      if (sendingItem) {
        if (resultCode === 0) {
          sendingItem.resolve(data)
        } else {
          let errorMessage = 'RET_CODE:' + resultCode + '-MESSAGE:'
          const msg = getPbResultCodeMassage(resultCode)
          errorMessage += msg ? msg : '未知错误码'
          errorMessage += ':END'
          sendingItem.reject(new Error(errorMessage))
        }
      }
    }
  }

  async executeCoreFunc(funcName: string, ...argvs: any[]): Promise<any> {
    if (funcName in this) {
      return this[funcName](...argvs)
    }

    return Promise.reject(new Error('Not Support Function:' + funcName))
  }

  sendPbMsg(buildPbMsg: WLBuildMsgRet, timeout?: number): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const sendingItem = {} as WL_SendingPbMsgInfo
      sendingItem.resolve = resolve
      sendingItem.reject = reject
      sendingItem.buildPbMsg = buildPbMsg
      sendingItem.timeout = timeout ? timeout : 6000
      this.sendingPbMsgList.push(sendingItem)
      setTimeout(this.processSendingPbMsg.bind(this), 0)
    })
  }

  private processSendingPbMsg(): void {
    wllog(
      '处理PB消息，队列有%d个等待发送消息',
      this.sendingPbMsgList.length,
      this.waitingTimeoutChecking,
    )
    if (this.sendingPbMsgList.length > 0) {
      const shouldCheck = this.waitingRspMap.size === 0
      const sendingItem = this.sendingPbMsgList.shift()!
      const waitingItem = {} as WL_WaitingRspPbMsgInfo
      waitingItem.resolve = sendingItem.resolve
      waitingItem.reject = sendingItem.reject
      waitingItem.pbMsgData = {} as WL_PbMsgData
      waitingItem.pbMsgData.header = sendingItem.buildPbMsg.weilaMsgHeader
      waitingItem.pbMsgData.pbMsgData = sendingItem.buildPbMsg.reqData
      waitingItem.timeout = new Date().getTime() + sendingItem.timeout
      this.waitingRspMap.set(sendingItem.buildPbMsg.weilaMsgHeader!.seqNum, waitingItem)
      this.sendNetworkEvent(WL_NetworkEventID.NET_SEND_DATA_EVT, sendingItem.buildPbMsg.reqData)
    }

    if (this.sendingPbMsgList.length > 0) {
      setTimeout(this.processSendingPbMsg.bind(this), 0)
    }

    if (!this.waitingTimeoutChecking) {
      setTimeout(() => {
        this.mainFsmService.send('FSM_SYSTEM_WATCH_TIMEOUT_EVT')
      }, 1000)
      this.waitingTimeoutChecking = true
    }
  }

  private sendNetworkEvent(eventId: WL_NetworkEventID, eventData: any) {
    const netEvent = {} as WL_NetworkEvent
    netEvent.eventId = eventId
    netEvent.eventData = eventData
    this.network.postMessage(netEvent)
  }

  private onNetworkMessage(event: any) {
    const netEvent = event.data as WL_NetworkEvent
    switch (netEvent.eventId) {
      case WL_NetworkEventID.NET_STATE_IND_EVT:
        {
          const netState = netEvent.eventData as WL_NetworkState
          if (netState === WL_NetworkState.NET_CONNECTED_STATE) {
            this.mainFsmService.send(fsmEvents.FSM_NET_CONNECTED_IND_EVT)
          } else if (netState === WL_NetworkState.NET_CONNECTING_STATE) {
            this.mainFsmService.send(fsmEvents.FSM_NET_CONNECTING_IND_EVT)
          } else if (netState === WL_NetworkState.NET_DISCONNECTED_STATE) {
            this.mainFsmService.send(fsmEvents.FSM_NET_DISCONNECT_IND_EVT)

            const keys = this.waitingRspMap.keys()
            for (let k of keys) {
              const waitingRsp = this.waitingRspMap.get(k)
              waitingRsp.reject(new Error('网络失去连接'))
              this.waitingRspMap.delete(k)
            }
          }
        }
        break

      case WL_NetworkEventID.NET_MSG_RECV_IND_EVT:
        {
          const msgData = netEvent.eventData as WL_PbMsgData
          const serverMessage = WL.Service.ServiceMessage.decode(msgData.pbMsgData)

          if (this.pbMsgHandlerList.has(serverMessage.serviceHead.serviceId)) {
            const handler = this.pbMsgHandlerList.get(serverMessage.serviceHead.serviceId)
            handler(serverMessage)
          }
        }
        break

      case WL_NetworkEventID.NET_EXCEPTION_IND_EVT:
        {
          this.mainFsmService.send(fsmEvents.FSM_NET_EXCEPTION_IND_EVT)
        }
        break
    }
  }

  private async loadResource(context: any, event: any): Promise<any> {
    const callback = event.data
    try {
      await WLConfig.loadResource()
      callback.resolve(true)
      wllog('加载数据成功')
    } catch (e) {
      wlerr('加载数据失败', e)
      callback.reject(e)
      return Promise.reject(e)
    }

    return true
  }

  private async prepareData(context: any, event: any): Promise<boolean> {
    console.time('prepare data')
    const ind = {} as WL_DataPrepareInd
    ind.state = WL_DataPrepareState.PREPARE_PROGRESS_IND
    ind.msg = 'SDK.FriendInit'
    this.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
    await this.friendModule.initFriends()
    ind.msg = 'SDK.GroupInit'
    this.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
    await this.groupModule.initGroups()
    ind.msg = 'SDK.SessionInit'
    this.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
    await this.sessionModule.initSessions()
    ind.msg = 'SDK.ExtensionInit'
    this.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
    await this.loginModule.initExtension()
    console.timeEnd('prepare data')
    ind.msg = 'SDK.Services'
    this.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
    const sessionList = this.sessionModule.getSessionList()
    try {
      await this.businessModule.initService(
        sessionList.filter((value) => {
          return value.sessionType === WL_IDbSessionType.SESSION_SERVICE_TYPE
        }),
      )
    } catch (e) {
      wlerr('初始化服务失败:', e)
    }
    return true
  }

  private async logout(context: any, event: any): Promise<boolean> {
    return this.loginModule.logoutReq()
  }

  private async loginServer(context: any, event: any): Promise<WL_LoginResult> {
    const loginParam = context.loginParam as WL_LoginParam
    const loginResult = {} as WL_LoginResult
    console.log('loginServer', context)
    loginResult.callback = loginParam.callback
    loginParam.retryCount++
    try {
      wllog('开始登陆')
      loginResult.loginUserInfo = await this.loginModule.loginReq(
        loginParam.account,
        loginParam.password,
        loginParam.countryCode,
      )
      wllog('loginServer succ', loginResult)
      return loginResult
    } catch (e) {
      loginResult.error = e
      wllog('loginServer error', loginResult, e)
      return Promise.reject(loginResult)
    }
  }

  private onResourceLoadFail(context: any, event: any, actionMeta: any) {
    wlerr('初始加载数据出错', event.data)
  }

  private onLoadingResource(context: any, event: any, actionMeta: any) {
    wllog('加载数据成功')
  }

  private onException(context: any, event: any, actionMeta: any) {
    this.sendExtEvent(WL_ExtEventID.WL_EXT_SYSTEM_EXCEPTION_IND, event.data)
  }

  private onDataInit(context: any, event: any, actionMeta: any) {
    // 对外发出正在准备数据中.
    const ind = {} as WL_DataPrepareInd
    ind.state = WL_DataPrepareState.START_PREPARING
    ind.msg = 'Commons.startPrepare'
    this.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
  }

  private onDataInited(context: any, event: any, actionMeta: any) {
    // 对外通知数据已经准备好
    const ind = {} as WL_DataPrepareInd
    ind.state = WL_DataPrepareState.PREPARE_SUCC_END
    ind.msg = 'Commons.prepareFinishSucc'
    this.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
  }

  private onDataPrepareFail(context: any, event: any, actionMeta: any) {
    // 因为数据准备失败，登出系统
    this.weila_logout().then((value) => {})

    //通知外部，出现异常，并告知异常信息
    const ind = {} as WL_DataPrepareInd
    ind.state = WL_DataPrepareState.PREPARE_FAIL_END
    ind.msg = 'Commons.prepareFinishFail'
    this.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
  }

  private onLoginFail(context: any, event: any, actionMeta: any) {
    wllog('onLoginFail:', event)
    this.sendNetworkEvent(WL_NetworkEventID.NET_DISCONNECT_EVT, null)
    this.mainFsmService.send('FSM_LOGIN_PROCEDURE_FAIL_EVT', { data: event.data })
  }

  private onLoginSucc(context: any, event: any, actionMeta: any) {
    const loginResult = event.data as WL_LoginResult
    wllog('onLogin:', event)
    this.loginUserInfo = loginResult.loginUserInfo
    if (loginResult.callback) {
      loginResult.callback.resolve(loginResult.loginUserInfo)
    }
    this.mainFsmService.send('FSM_LOGIN_PROCEDURE_SUCC_EVT', { data: event.data })
  }

  private onSysTimeChecking(context: any, event: any, actionMeta: any) {
    wllog(
      '--------->onSysTimeChecking',
      event,
      this.waitingRspMap.size,
      this.waitingTimeoutChecking,
    )
    if (this.waitingRspMap.size > 0) {
      const timeoutKeyList = []
      const now = new Date().getTime()

      this.waitingRspMap.forEach((value, key) => {
        wllog('checkSendingMsgItemTimeout:', value.timeout, now)
        if (value.timeout <= now) {
          timeoutKeyList.push(key)
        }
      })

      timeoutKeyList.forEach((key) => {
        let waitingPbMsg = this.waitingRspMap.get(key)
        waitingPbMsg.reject(new Error('消息超时'))
        waitingPbMsg = null
        this.waitingRspMap.delete(key)
      })

      if (this.waitingRspMap.size > 0) {
        setTimeout(() => {
          this.mainFsmService.send('FSM_SYSTEM_WATCH_TIMEOUT_EVT')
        }, 2000)
        this.waitingTimeoutChecking = true
      } else {
        this.waitingTimeoutChecking = false
      }
    } else {
      this.waitingTimeoutChecking = false
    }
  }

  private onReadyEntry(context: any, event: any, actionMeta: any) {
    wllog('系统已经准备好，可以接受任何消息')
    this.isLoginReady = true
    this.heartbeatTimerId = setInterval(() => {
      this.loginModule
        .sendHeartbeat()
        .then((value) => {
          wllog('发送心跳成功')
        })
        .catch((reason) => {
          wlerr('发送心跳失败', reason)
        })
    }, 59000)

    this.refreshTokenTimerId = setInterval(() => {
      this.loginModule
        .refreshToken()
        .then((value) => {
          wllog('刷新token成功')
        })
        .catch((reason) => {
          wlerr('刷新token失败:', reason)
        })
    }, 3600000)
  }

  private onReadyExit(context: any, event: any, actionMeta: any) {
    wllog('系统没有准备好')
    this.isLoginReady = false

    clearInterval(this.heartbeatTimerId)
    this.heartbeatTimerId = null

    clearInterval(this.refreshTokenTimerId)
    this.refreshTokenTimerId = null
  }

  private onLoginTryEntry(context: any, event: any, actionMeta: any) {
    wllog('onLoginTryEntry', event.data, event.type)
    if (event.data && event.data.error) {
      const index = event.data.error.message.search(/.*-MESSAGE:.*:END/)
      wllog('onLoginTryEntry', index)
      if (index !== -1) {
        this.mainFsmService.send(event.type, { data: event.data })
      }
    }
  }

  private canRetry(context: any, event: any): boolean {
    const loginParams = context.loginParam as WL_LoginParam
    wllog('canRetry', loginParams)
    return loginParams.retryCount < this.maxRetryLoginTimes
  }

  private isLoginSucc(context: any, event: any): boolean {
    const loginResult = event.data.loginResult as WL_LoginResult
    return loginResult.loginUserInfo !== undefined
  }

  private connectServer(context: any, event: any, actionMeta: any) {
    this.sendNetworkEvent(WL_NetworkEventID.NET_CONNECT_EVT, null)
  }

  private onConnecting(context: any, event: any, actionMeta: any) {
    wllog('onConnecting:', context, event, actionMeta.state.value)
  }

  private onDisconnectInReadyState(context: any, event: any, actionMeta: any) {
    const loginParam = context.loginParam as WL_LoginParam
  }

  private onLoginRetryFail(context: any, event: any, actionMeta: any) {
    wllog('onLoginRetryFail', event.data)
    const loginParam = context.loginParam as WL_LoginParam
    if (event.data && event.data.error) {
      loginParam.callback.reject(event.data.error)
    } else {
      loginParam.callback.reject(new Error('登陆尝试多次失败'))
    }
    context.loginParam = null
  }

  /**
   * 注册微喇SDK的事件回调函数，所有的SDK外发信息都会发到这个回调函数中去
   * @param callback 事件回调函数，回调的事件在weila_external_data.d.ts定义
   */
  public weila_onEvent(callback: WL_ExtEventCallback): void {
    this.emitter.on('ext_event', callback)
  }

  /**
   * 微喇初始化，使用微喇的时候，首先需要调用此函数进行初始化
   * 第一次初始化会有一点慢，因为需要下载比较大的数据。后续数据缓存后
   * 就会比较快了。建议初始化的时候，屏蔽屏幕的操作
   */
  public async weila_init(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const callback = {} as WL_PromiseCallback
      callback.resolve = resolve
      callback.reject = reject
      this.mainFsmService.send(fsmEvents.FSM_LOAD_RESOURCE_EVT, { data: callback })
    })
  }

  /**
   * 注册服务器，注册过程包括联网。注册会自动重试数次，如果数次失败后才会告知失败
   * @param account 微喇号或手机号
   * @param password 密码
   * @param countryCode 如果是微喇号，则必须是'0'，否则是国家码，如'86'
   * 返回Promise，成功带回登录用户的信息，失败则告知失败信息
   */
  public async weila_login(
    account: string,
    password: string,
    countryCode: string,
  ): Promise<WL_IDbUserInfo> {
    return new Promise<WL_IDbUserInfo>((resolve, reject) => {
      const params = {} as WL_LoginParam
      params.retryCount = 0
      params.callback = {} as WL_PromiseCallback
      params.callback.resolve = resolve
      params.callback.reject = reject
      params.account = account
      params.password = password
      params.countryCode = countryCode
      this.mainFsmService.send(fsmEvents.FSM_LOGIN_SERVER_EVT, { data: params })
    })
  }

  /**
   * 微喇音频初始化，此函数必须在网页的某个事件中执行，如点击。因为根据网页的规则，如果不是人为的触发音频初始化，初始化会失败
   * 所以此函数的调用必须放到网页的人为事件中操作，可以建议放到登陆的按钮事件中操作
   */
  public async weila_audioInit(): Promise<boolean> {
    return this.sessionModule.initAudioSystem()
  }

  /**
   * 播放单条语音，如果连续执行，会停止前一条的播放才会播放新的
   * @param audioMsgData 单条语音消息
   */
  public async weila_playSingle(audioMsgData: WL_IDbMsgData): Promise<boolean> {
    console.log('weila_playSingle--------------->')
    console.log('weila_playSingle', JSON.stringify(audioMsgData))

    if (
      audioMsgData.msgType !== WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE &&
      audioMsgData.msgType !== WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE
    ) {
      return false
    }

    if (audioMsgData.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE) {
      if (!audioMsgData.audioData.data && audioMsgData.audioData.audioUrl) {
        const audioUrl = audioMsgData.audioData.audioUrl.replace(/^http(?!s)/, 'https')
        try {
          audioMsgData.audioData = await this.weila_fetchAudioData(audioMsgData.audioData.audioUrl)
          if (!audioMsgData.audioData) {
            audioMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR
            audioMsgData.audioData = {
              audioUrl: audioUrl,
              frameCount: 0,
            }
          }
        } catch (e) {
          audioMsgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR
          audioMsgData.audioData = {
            audioUrl: audioUrl,
            frameCount: 0,
          }
        } finally {
          await WeilaDB.getInstance().putMsgData(audioMsgData)
          console.log(
            'audioMsgData audioData is undefined ? ',
            audioMsgData.audioData === undefined,
          )
        }

        if (audioMsgData.status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR) {
          return false
        }
      }
    } else {
      console.log('ptt消息体', JSON.stringify(audioMsgData))
      audioMsgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
      audioMsgData.audioData = {
        frameCount: audioMsgData.pttData.frameCount,
        data: audioMsgData.pttData.data,
      }

      await WeilaDB.getInstance().putMsgData(audioMsgData)
      if (audioMsgData.status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR) {
        return false
      }
    }

    return this.sessionModule.playSingleAudioItem(audioMsgData)
  }

  /**
   * 停止单条语音的播放
   */
  public weila_stopSingle() {
    return this.sessionModule.stopPlayAudio()
  }

  /**
   * 播放历史语音，播放一组的语音
   * @param audioMsgDatas 一组的语音
   */
  public async weila_playHistoryList(audioMsgDatas: WL_IDbMsgData[]): Promise<boolean> {
    audioMsgDatas = audioMsgDatas.filter((value) => {
      return (
        value.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE &&
        value.status !== WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR
      )
    })

    for (let msgData of audioMsgDatas) {
      if (!msgData.audioData.data && msgData.audioData.audioUrl) {
        msgData.audioData = await this.weila_fetchAudioData(msgData.audioData.audioUrl)
        if (!msgData.audioData) {
          msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR
        }

        await WeilaDB.getInstance().putMsgData(msgData)
      }
    }

    audioMsgDatas = audioMsgDatas.filter((value) => {
      return value.status !== WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR
    })

    return this.sessionModule.playHistoryAudioItems(audioMsgDatas)
  }

  /**
   * 依据消息所在数据库的id获取对应的消息信息
   * @param comboId  数据库中的comboId
   */
  public async weila_getMsgData(comboId: string): Promise<WL_IDbMsgData> {
    return WeilaDB.getInstance().getMsgData(comboId)
  }

  /**
   * 先从本地数据库中获取消息数据，如果本地不够，则会自动从服务器中拉取
   * @param sessionId 会话id
   * @param sessionType 会话类型
   * @param fromMsgId 指定的消息id， 如果是0，则会从最新的消息往后取count条
   * @param count 指定数量
   * 返回对应的消息数组，数量不一定等于指定数量，因为可能不存在
   */
  public async weila_getMsgDatas(
    sessionId: string,
    sessionType: number,
    fromMsgId: number,
    count: number,
  ): Promise<WL_IDbMsgData[]> {
    const result = await this.sessionModule.getMsgDatas(sessionId, sessionType, fromMsgId, count)
    return result.toReversed()
  }

  /**
   * 申请发言
   * @param sessionId 会话id
   * @param sessionType 会话类型
   */
  public async weila_requestTalk(sessionId: string, sessionType: number): Promise<boolean> {
    return this.sessionModule.requestTalk(sessionId, sessionType)
  }

  /**
   * 释放发言
   */
  public async weila_releaseTalk(): Promise<boolean> {
    return this.sessionModule.releaseTalk()
  }

  /**
   * 登出系统
   */
  public async weila_logout(): Promise<boolean> {
    return this.mainFsmService.send('FSM_LOGOUT_EVT')
  }

  /**
   * 从本地数据库中获取指定群的群成员信息
   * @param groupId 群id
   * 返回群成员数组
   */
  public async weila_getGroupMembers(groupId: string): Promise<WL_IDbGroupMember[]> {
    return WeilaDB.getInstance().getGroupMembers(groupId)
  }

  /**
   * 从本地数据库中获取指定id的群信息
   * @param groupId 群id
   * 可能返回undefined，因为可能不存在
   */
  public async weila_getGroup(groupId: string): Promise<WL_IDbGroup | undefined> {
    return WeilaDB.getInstance().getGroup(groupId)
  }

  /**
   * 从服务器获取群信息。如果临时会话刚建立的时候，如果发现此会话的群不存在，则可以通过此接口获取
   * @param groupId
   */
  public async weila_getGroupFromServer(groupId: string): Promise<WL_IDbGroup | undefined> {
    return await this.groupModule.getGroupFromServer(groupId)
  }

  /**
   * 获取用户加入的所有群信息，从本地数据库中获取
   */
  public async weila_getAllGroups(): Promise<WL_IDbGroup[]> {
    return WeilaDB.getInstance().getGroups()
  }

  /**
   * 修改群主为指定的owner
   * @param groupId
   * @param ownerUserId
   */
  public async weila_changeGroupOwner(groupId: string, ownerUserId: number): Promise<boolean> {
    return this.groupModule.changeGroupOwner(groupId, ownerUserId)
  }

  /**
   * 退出群。如果群主是本人而且群成员超过1，则不可以直接退群，必须先变更群主为其他成员再退出或直接解散群
   * @param groupId
   */
  public async weila_quitGroup(groupId: string): Promise<boolean> {
    return this.groupModule.quitGroup(groupId)
  }

  /**
   * 使设备退出指定id列表代表的所有群
   * @param groupIds 群id列表
   * @param subUserId 设备id
   */
  public async weila_quitGroupsForDevice(groupIds: string[], subUserId: number): Promise<boolean> {
    for (const groupId of groupIds) {
      await this.groupModule.quitGroup(groupId, subUserId)
    }

    return true
  }

  /**
   * 踢出群成员
   * @param groupId 群id
   * @param memberUserIds 成员id列表
   */
  public async weila_deleteMembers(groupId: string, memberUserIds: number[]): Promise<boolean> {
    return this.groupModule.deleteGroupMembers(groupId, memberUserIds)
  }

  /**
   * 从数据库中获取指定群的管理者群成员
   * @param groupId 群id
   */
  public async weila_getGroupAdminMembers(groupId: string): Promise<WL_IDbGroupMember[]> {
    return WeilaDB.getInstance().getGroupAdminMembers(groupId)
  }

  /**
   * 更改群友类型，例如可以提升管理员或降级为普通成员
   * @param groupId 群id
   * @param memberUserId 成员的user id
   * @param memberType 类型 WL_IDbMemberType
   */
  public async weila_changeMemberType(
    groupId: string,
    memberUserId: number,
    memberType: number,
  ): Promise<boolean> {
    return this.groupModule.changeMemberType(groupId, memberUserId, memberType)
  }

  /**
   * 邀请用户加入群
   * @param groupId 群id
   * @param userIds 用户id列表
   */
  public async weila_inviteUserJoinGroup(groupId: string, userIds: number[]): Promise<boolean> {
    return this.groupModule.inviteUser(groupId, userIds)
  }

  /**
   * 让设备加入到指定的群
   * @param groupId 群id
   * @param userIds 设备id列表
   */
  public async weila_addDeviceMembers(groupId: string, userIds: number[]): Promise<number[]> {
    return this.groupModule.addSubDeviceMember(groupId, userIds)
  }

  /**
   * 从数据库中获取用户id对应的用户信息
   * @param userId 用户id
   */
  public async weila_getUserInfo(userId: number): Promise<WL_IDbUserInfo | undefined> {
    return WeilaDB.getInstance().getUser(userId)
  }

  /**
   * 从数据库中获取id数组代表的一批用户信息
   * @param userIdList 用户id列表
   */
  public async weila_getUserInfos(userIdList: number[]): Promise<WL_IDbUserInfo[]> {
    return WeilaDB.getInstance().getUserInfos(userIdList)
  }

  /**
   * 从数据库中获取指定id数组的好友
   * @param userIds 如果为空，则获取所有的好友信息
   */
  public async weila_getFriends(userIds?: number[]): Promise<WL_IDbFriend[]> {
    return WeilaDB.getInstance().getFriends(userIds)
  }

  /**
   * 从内存中获取会话
   * @param sessionId 会话id
   * @param sessionType 会话类型
   */
  public weila_getSession(sessionId: string, sessionType: number): WL_IDbSession | undefined {
    const sessionList = this.sessionModule.getSessionList()
    const index = sessionList.findIndex((value) => {
      return value.sessionId === sessionId && value.sessionType === sessionType
    })

    return index !== -1 ? sessionList[index] : undefined
  }

  /**
   * 获取内存中的会话列表
   */
  public weila_getSessions(): WL_IDbSession[] {
    return this.sessionModule.getSessionList()?.slice()
  }

  /**
   * 从数据库中获取会话信息
   * @param sessionId 会话id
   * @param sessionType 会话类型
   */
  public async weila_getSessionFromDb(
    sessionId: string,
    sessionType: number,
  ): Promise<WL_IDbSession | undefined> {
    return WeilaDB.getInstance().getSession(sessionId, sessionType)
  }

  /**
   * 从数据库中获取所有会话信息
   */
  public async weila_getSessionsFromDb(): Promise<WL_IDbSession[]> {
    return WeilaDB.getInstance().getSessions()
  }

  /**
   * 清除数据库中的会话所有消息
   * @param sessionId 会话id
   * @param sessionType 会话类型
   */
  public async weila_clearSession(sessionId: string, sessionType: number): Promise<boolean> {
    await WeilaDB.getInstance().delMsgDatas(sessionId, sessionType)
    return true
  }

  /**
   * 删除服务器中和数据库以及内存中的会话
   * @param sessionId 会话id
   * @param sessionType 会话类型
   */
  public async weila_deleteSession(sessionId: string, sessionType: number): Promise<boolean> {
    return this.sessionModule.deleteSession(sessionId, sessionType)
  }

  /**
   * 从数据库获取指定的会话配置，如静音，tts或共享
   * @param sessionId 会话id
   * @param sessionType 会话类型
   */
  public async weila_getSessionSetting(
    sessionId: string,
    sessionType: number,
  ): Promise<WL_IDbSessionSetting | undefined> {
    return WeilaDB.getInstance().getSessionSetting(sessionId, sessionType)
  }

  /**
   * 从数据库获取所有的会话配置
   */
  public async weila_getSessionSettings(): Promise<WL_IDbSessionSetting[]> {
    return WeilaDB.getInstance().getSessionSettings()
  }

  /**
   * 从数据库更新指定会话设置
   * @param sessionId 会话id
   * @param sessionType 会话类型
   * @param settingParam 更新项，不需要更新的属性则留空
   */
  public async weila_updateSessionSetting(
    sessionId: string,
    sessionType: number,
    settingParam: WL_IDbSessionSettingParams,
  ): Promise<boolean> {
    return WeilaDB.getInstance().updateSessionSetting(sessionId, sessionType, settingParam)
  }

  /**
   * 开启新的会话，如果打算从好友或群中选择一个聊天，则先要执行这个，创建会话, 此时会发送WL_EXT_NEW_SESSION_OPEN_IND到外部
   * @param sessionId 会话id
   * @param sessionType 会话类型
   * @param extra 会话额外数据（一般用在服务号）
   */
  public async weila_startNewSession(
    sessionId: string,
    sessionType: number,
    extra?: any,
  ): Promise<WL_IDbSession> {
    return this.sessionModule.startSession(sessionId, sessionType, extra)
  }

  /**
   * 从数据库中获取所有系统通知项
   */
  public async weila_getAllTypeNotifications(): Promise<WL_IDbNotification[]> {
    return WeilaDB.getInstance().getAllNotifications()
  }

  /**
   * 修改数据库中的通知消息
   * @param notification
   */
  public async weila_updateNotification(notification: WL_IDbNotification): Promise<number> {
    return WeilaDB.getInstance().putNotification(notification)
  }

  /**
   * 发送指定会话的语音信息
   * @param sessionId 会话id
   * @param sessionType 会话类型
   * @param audioData 微喇服务器URL下载后的完整数据，Unit8Array格式
   * @returns  Promise<boolean>  true = success, false = failed
   */
  public async weila_sendPttAudioData(
    sessionId: string,
    sessionType: number,
    audioData: Uint8Array,
  ): Promise<boolean> {
    if (!this.isLoginReady) {
      return Promise.reject('微喇状态不正确')
    }

    return this.sessionModule.sendPttMsgByData(sessionId, sessionType, audioData)
  }

  /**
   * 发送音频消息到指定会话。
   *
   * @param sessionId - 会话ID。
   * @param sessionType - 会话类型（例如，个人聊天，群聊）。
   * @param audioUrl - 要发送的音频文件的URL。
   * @returns 如果消息发送成功，返回一个解析为 `true` 的 Promise；如果状态不正确，则返回一个带有错误消息的拒绝 Promise。
   * @throws 如果用户未登录，将拒绝并带有错误消息。
   */
  public async weila_sendAudioMsg(
    sessionId: string,
    sessionType: number,
    audioUrl: string,
    frameCount?: number,
  ): Promise<boolean> {
    if (!this.isLoginReady) {
      return Promise.reject('微喇状态不正确')
    }

    return this.sessionModule.sendAudioMsg(sessionId, sessionType, audioUrl, frameCount)
  }

  /**
   * Sends PTT (Push-To-Talk) audio data for a given session.
   *
   * @param sessionId - The ID of the session to which the audio data will be sent.
   * @param sessionType - The type of the session.
   * @param audioData - The audio data to be sent as a Uint8Array.
   * @returns A promise that resolves to `true` if the audio data is sent successfully, or rejects with an error message if the state is not correct.
   * @throws Will reject with an error message if the login state is not ready.
   */
  public async weila_sendPTTByAudioData(
    sessionId: string,
    sessionType: number,
    audioData: Uint8Array,
  ): Promise<boolean> {
    if (!this.isLoginReady) {
      return Promise.reject('微喇状态不正确')
    }

    return this.sessionModule.sendPttPacketsByAudioData(sessionId, sessionType, audioData)
  }

  /**
   * 发送指定会话的文字信息
   * @param sessionId 会话id
   * @param sessionType 会话类型
   * @param text 文字，字符串
   */
  public async weila_sendTextMsg(
    sessionId: string,
    sessionType: number,
    text: string,
  ): Promise<boolean> {
    if (!this.isLoginReady) {
      return Promise.reject('微喇状态不正确')
    }

    return this.sessionModule.sendMsgData(
      sessionId,
      sessionType,
      text,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
    )
  }

  /**
   * 发送位置信息
   * @param sessionId 会话id
   * @param sessionType 会话类型
   * @param position 共享位置信息
   */
  public async weila_sendPosition(
    sessionId: string,
    sessionType: number,
    position: WL_IDbLocationShared,
  ): Promise<boolean> {
    if (!this.isLoginReady) {
      return Promise.reject('微喇状态不正确')
    }

    return this.sessionModule.sendMsgData(
      sessionId,
      sessionType,
      position,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE,
    )
  }

  private async weila_sendFileInfo(
    sessionId: string,
    sessionType: number,
    filename: string,
    data: File,
    msgType: WL_IDbMsgDataType,
  ): Promise<boolean> {
    if (!this.isLoginReady) {
      return Promise.reject('微喇状态不正确')
    }
    const lastMsgData = await WeilaDB.getInstance().getLastMsgData(sessionId, sessionType)
    const msgData: WL_IDbMsgData = {} as WL_IDbMsgData
    const seqSetting = await WeilaDB.getInstance().getSettingItem(
      WL_IDbSettingID.SETTING_MSG_SENDING_SEQ,
    )
    let index = filename.lastIndexOf('\\')
    if (index === -1) {
      index = filename.lastIndexOf('/')
    }
    msgData.fileInfo = {} as WL_IDbFileData
    if (index !== -1) {
      msgData.fileInfo.fileName = filename.substring(index + 1)
    } else {
      msgData.fileInfo.fileName = filename
    }
    msgData.fileInfo.fileUrl = ''
    msgData.fileInfo.fileThumbnail = TextMsgDataParser.getExtendFileFormatUrl(
      msgData.fileInfo.fileName,
    )
    msgData.fileInfo.fileSize = data.size
    msgData.msgType = msgType
    msgData.msgId = lastMsgData ? lastMsgData.msgId + 1 : 0
    msgData.sessionType = sessionType
    msgData.sessionId = sessionId
    msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENDING
    msgData.senderId = this.loginUserInfo.userId
    msgData.created = new Date().getTime() / 1000

    msgData.autoReply = 0
    msgData.combo_id = getMsgDataIdByCombo(msgData, seqSetting.data++)
    await WeilaDB.getInstance().putSettingItem(seqSetting)
    await WeilaDB.getInstance().putMsgData(msgData)
    this.sendExtEvent(WL_ExtEventID.WL_EXT_MSG_SEND_IND, msgData)

    const uploadResult = await AliOssHelper.getInstance().uploadToCache(
      this.loginUserInfo!.userId,
      sessionId,
      sessionType,
      filename,
      data,
    )

    if (uploadResult.statusCode === 200) {
      msgData.fileInfo.fileUrl = uploadResult.remoteUrl
      return this.sessionModule.sendMsgData(
        sessionId,
        sessionType,
        msgData.fileInfo,
        msgType,
        msgData,
      )
    } else {
      wllog('上传文件失败', uploadResult)
      msgData.status = WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT
    }

    return Promise.reject('上传图片失败:' + uploadResult.statusCode)
  }

  /**
   * 发送图片到指定的会话
   * @param sessionId 会话id
   * @param sessionType 会话类型
   * @param imageName 图片名字
   * @param image 图片文件数据，File类型
   */
  public async weila_sendImage(
    sessionId: string,
    sessionType: number,
    imageName: string,
    image: File,
  ): Promise<boolean> {
    return this.weila_sendFileInfo(
      sessionId,
      sessionType,
      imageName,
      image,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE,
    )
  }

  /**
   * 发送指定的文件数据到会话中
   * @param sessionId
   * @param sessionType
   * @param filename 文件名
   * @param fileData 文件数据，File类型
   */
  public async weila_sendFile(
    sessionId: string,
    sessionType: number,
    filename: string,
    fileData: File,
  ): Promise<boolean> {
    return this.weila_sendFileInfo(
      sessionId,
      sessionType,
      filename,
      fileData,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE,
    )
  }

  /**
   * 发送指定的视频文件到会话中
   * @param sessionId
   * @param sessionType
   * @param videoName 视频文件名
   * @param video 视频内容，File类型
   */
  public async weila_sendVideo(
    sessionId: string,
    sessionType: number,
    videoName: string,
    video: File,
  ): Promise<boolean> {
    return this.weila_sendFileInfo(
      sessionId,
      sessionType,
      videoName,
      video,
      WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE,
    )
  }

  /**
   * 获取指定会话中共享位置的成员位置信息，返回位置信息列表，代表所有共享用户的位置信息
   * @param sessionId 会话id
   * @param sessionType 会话类型
   */
  public async weila_getLocation(
    sessionId: string,
    sessionType: number,
  ): Promise<WL_IDbLocationInfo[]> {
    return this.locationModule.getLocation(sessionId, sessionType)
  }

  /**
   * 应答加群申请
   * @param groupId 群id
   * @param joinId 申请入群id
   * @param answerStatus WL_AnswerStatus类型
   */
  public async weila_answerGroupJoin(
    groupId: string,
    joinId: number,
    answerStatus: number,
  ): Promise<boolean> {
    return this.groupModule.answerGroupJoin(groupId, joinId, answerStatus)
  }

  /**
   * 邀请好友
   * @param inviteeId 被邀请者用户id
   * @param detail 详情留言
   * @param remark 备注
   */
  public async weila_inviteFriend(
    inviteeId: number,
    detail: string,
    remark: string,
  ): Promise<boolean> {
    return this.friendModule.inviteFriend(inviteeId, detail, remark)
  }

  /**
   * 获取在线的好友
   */
  public async weila_getOnlineFriends(): Promise<WL_IDbFriend[]> {
    return this.friendModule.getOnlineFriends()
  }

  /**
   * 给设备邀请好友
   * @param inviteeIds 邀请的好友id
   * @param subUserId 设备id
   * @param detail 留言
   */
  public async weila_inviteFriendsForDevice(
    inviteeIds: number[],
    subUserId: number,
    detail: string,
  ): Promise<boolean> {
    return this.friendModule.inviteFriendsForDevice(inviteeIds, subUserId, detail)
  }

  /**
   * 删除设备的好友
   * @param userIds 好友列表
   * @param subUserId 设备id
   */
  public async weila_deleteFriendsForDevice(
    userIds: number[],
    subUserId: number,
  ): Promise<boolean> {
    return this.friendModule.deleteFriends(userIds, subUserId)
  }

  /**
   * 删除指定用户id数组的所有好友
   * @param userIds
   */
  public async weila_deleteFriends(userIds: number[]): Promise<boolean> {
    return this.friendModule.deleteFriends(userIds)
  }

  /**
   * 应答好友申请
   * @param inviterUserId 邀请者用户id
   * @param answerStatus WL_AnswerStatus类型
   * @param info 留言
   */
  public async weila_answerFriendInvite(
    inviterUserId: number,
    answerStatus: number,
    info: string,
  ): Promise<boolean> {
    return this.friendModule.answerFriendInvite(inviterUserId, answerStatus, info)
  }

  /**
   * 应答群邀请
   * @param groupId 邀请的群id
   * @param invitorId 邀请者
   * @param status WL_AnswerStatus类型
   */
  public async weila_answerGroupInvitation(
    groupId: string,
    invitorId: number,
    status: number,
  ): Promise<boolean> {
    return this.groupModule.answerGroupInvitation(groupId, invitorId, status)
  }

  /**
   * 创建群，可以是普通群或临时群
   * @param name 群名
   * @param groupType 群类型（正式或临时）
   * @param groupIcon 群头像，Blog数据或空用默认
   * @param publicType 公开或不公开
   * @param memberUserIdList 邀请的成员用户id
   */
  public async weila_createGroup(
    name: string,
    groupType: number,
    groupIcon: Blob | null,
    publicType: number,
    memberUserIdList: number[],
  ): Promise<WL_IDbGroup> {
    let avatar = ''
    if (groupIcon) {
      try {
        const uploadResult = await AliOssHelper.getInstance().uploadToAvatar(
          this.loginUserInfo.userId,
          true,
          groupIcon,
          100,
          100,
        )
        if (uploadResult.statusCode === 200) {
          avatar = uploadResult.remoteUrl
        }
        wllog('上传头像成功:', uploadResult)
      } catch (e) {
        wllog('上传头像失败:', e)
        avatar = ''
      }
    }

    const groupInfo: WL_IDbGroup = await this.groupModule.createGroup(
      name,
      groupType,
      avatar,
      publicType,
      memberUserIdList,
    )
    if (groupType === WL_IDbGroupType.GROUP_TEMP) {
      await this.weila_startNewSession(groupInfo.groupId, WL_IDbSessionType.SESSION_GROUP_TYPE)
    }

    return groupInfo
  }

  /**
   * 申请加入指定群id的群
   * @param groupId 群id
   * @param detail 留言
   * @param password 如果群有密码，则输入
   */
  public async weila_joinGroup(
    groupId: string,
    detail?: string,
    password?: string,
  ): Promise<boolean> {
    return this.groupModule.joinGroup(groupId, detail, password)
  }

  /**
   * 按照关键字(微喇号或手机号）搜索用户信息
   * @param key 关键字
   */
  public async weila_searchUserInfos(key: string): Promise<WL_IDbUserInfo[]> {
    return this.userModule.searchUserByNumber(key)
  }

  /**
   * 解散指定id的群
   * @param groupId
   */
  public async weila_dismissGroup(groupId: string): Promise<boolean> {
    return this.groupModule.dismissGroup(groupId)
  }

  /**
   * 获取指定群的在线成员
   * @param groupId
   */
  public async weila_getOnlineMemberIds(groupId: string): Promise<number[]> {
    return this.groupModule.getGroupOnlineMembers(groupId)
  }

  /**
   * 刷新数据库存储的消息
   * @param msgData
   */
  public async weila_updateMsgData(msgData: WL_IDbMsgData): Promise<string> {
    return WeilaDB.getInstance().putMsgData(msgData)
  }

  /**
   * 上传图片到服务器，返回上传后的url和其他信息
   * @param sessionId 会话id
   * @param sessionType 会话类型
   * @param imageFile 图片
   */
  public async weila_uploadImageCache(
    sessionId: string,
    sessionType: number,
    imageFile: File,
  ): Promise<string> {
    const name = new Date().toTimeString() + '_map.png'
    const result: WL_UploadResult = await AliOssHelper.getInstance().uploadToCache(
      this.loginUserInfo.userId,
      sessionId,
      sessionType,
      name,
      imageFile,
    )
    wllog('weila_uploadImageCache', result)
    if (result.statusCode === 200) {
      return result.remoteUrl
    }

    return Promise.reject(new Error('上传出错'))
  }

  /**
   * 获取登录扩展信息
   */
  public async weila_getExtensions(): Promise<WL_IDbExtension[]> {
    return this.loginModule.getExtensionList()
  }

  /**
   * 更新数据库中的扩展信息
   * @param extensionInfo
   */
  public async weila_putExtension(extensionInfo: WL_IDbExtensionInfo): Promise<number> {
    return WeilaDB.getInstance().putExtension(extensionInfo)
  }

  /**
   * 获取设备id的所有群信息
   * @param subUserId 设备id
   */
  public async weila_getDeviceSubGroups(subUserId: number): Promise<WL_IDbGroup[]> {
    return this.groupModule.getDeviceSubGroups(subUserId)
  }

  /**
   * 获取设备所有的好友
   * @param subUserId 设备id
   */
  public async weila_getDeviceSubFriends(subUserId: number): Promise<WL_IDbFriend[]> {
    return this.friendModule.getDeviceSubFriends(subUserId)
  }

  /**
   * 修改设备的设置
   * @param cfgKey 设置字段
   * @param cfgValue 设置值
   * @param subUserId 设备id
   */
  public async weila_setDeviceConfig(
    cfgKey: string,
    cfgValue: string,
    subUserId: number,
  ): Promise<string> {
    return this.loginModule.setDeviceConfig(cfgKey, cfgValue, subUserId)
  }

  /**
   * 绑定设备
   * @param verifyCode 设备验证码
   */
  public async weila_bindDevice(verifyCode: string): Promise<number> {
    return this.loginModule.bindDevice(verifyCode)
  }

  /**
   * 解除绑定设备
   * @param deviceUserId 设备UserId
   */
  public async weila_unbindDevice(deviceUserId: number): Promise<number> {
    return this.loginModule.unbindDevice(deviceUserId)
  }

  /**
   * 如果此时正在播放实时语音，调用此命令，可以直接跳过当前播放，播放下一条
   */
  public weila_playNext() {
    return this.sessionModule.playNext()
  }

  /**
   * 获取指定会话id的服务会话信息
   * @param sessionId 会话id
   */
  public async weila_getServiceSession(
    sessionId: string,
  ): Promise<WL_IDbServiceSessionInfo | undefined> {
    const session: WL_IDbSession | undefined = await WeilaDB.getInstance().getSession(
      sessionId,
      WL_IDbSessionType.SESSION_SERVICE_TYPE,
    )
    if (session) {
      const serviceId = Long.fromValue(session.sessionId).high
      const service = await WeilaDB.getInstance().getService(serviceId)
      if (service) {
        const serviceSessionInfo = {} as WL_IDbServiceSessionInfo
        serviceSessionInfo.serviceSession = session.extra
        if (serviceSessionInfo.serviceSession) {
          serviceSessionInfo.service = service
          serviceSessionInfo.staffs = await WeilaDB.getInstance().getServiceStaffs(
            serviceSessionInfo.serviceSession.staffIds,
          )
          serviceSessionInfo.customer = await WeilaDB.getInstance().getUser(
            serviceSessionInfo.serviceSession.customerId,
          )
          return serviceSessionInfo
        }
      }
    }
    return this.businessModule.getSessionServiceFromServer(sessionId)
  }

  /**
   * 客服接受新的服务会话
   * @param sessionId 会话id
   */
  public async weila_staffAcceptSession(sessionId: string): Promise<boolean> {
    return this.businessModule.staffAcceptSession(sessionId)
  }

  /**
   * 客服退出服务会话，如果会话还有别的客服，则服务会话不结束
   * @param sessionId 会话id
   */
  public async weila_staffExitSession(sessionId: string): Promise<boolean> {
    return this.businessModule.staffExitSession(sessionId)
  }

  /**
   * 客服关闭服务会话，不管里面有没有客服，服务会话会结束
   * @param sessionId 会话id
   */
  public async weila_staffCloseSession(sessionId: string): Promise<boolean> {
    return this.businessModule.staffCloseSession(sessionId)
  }

  /**
   * 邀请其他客服进入客服会话
   * @param sessionId 会话id
   * @param userIds 被邀请用户id列表
   * @param content 内容
   */
  public async weila_staffSessionInvite(
    sessionId: string,
    userIds: number[],
    content?: string,
  ): Promise<boolean> {
    return this.businessModule.staffSessionInvite(sessionId, userIds, content)
  }

  /**
   * 应答其他客服对自己的邀请
   * @param sessionId 会话id
   * @param status 应答情况
   */
  public async weila_staffAnswerSessionInvite(
    sessionId: string,
    status: WL_AnswerStatus,
  ): Promise<boolean> {
    return this.businessModule.staffAnswerSessionInvite(sessionId, status)
  }

  /**
   * 移除服务会话中的其他客服
   * @param sessionId 会话id
   * @param staffIds 被移除的客服id列表
   */
  public async weila_staffRemoveSessionStaff(
    sessionId: string,
    staffIds: number[],
  ): Promise<boolean> {
    return this.businessModule.staffRemoveSessionStaff(sessionId, staffIds)
  }

  /**
   * 搜索该服务下的客服
   * @param serviceId 服务号id
   * @param pageIndex 页索引
   * @param pageSize 一页所含返回数量
   * @param staffClass 客服类型，可选
   */
  public async weila_staffSearchStaffs(
    serviceId: number,
    pageIndex: number,
    pageSize: number,
    staffClass?: number,
  ): Promise<WL_IDbServiceStaffInfo[]> {
    return this.businessModule.staffSearchStaffs(serviceId, pageIndex, pageSize, staffClass)
  }

  /**
   * 重置服务会话，重置后，服务会自动重新发送新的会话出去给所有客服
   * @param sessionId 会话id
   */
  public async weila_staffResetSession(sessionId: string): Promise<boolean> {
    return this.businessModule.staffResetSession(sessionId)
  }

  /**
   * 获取指定的客服id的客服信息
   * @param userIds 用户id
   */
  public async weila_getStaffInfos(userIds: number[]): Promise<WL_IDbServiceStaffInfo[]> {
    return WeilaDB.getInstance().getServiceStaffs(userIds)
  }

  /**
   * 获取对应于服务号和客户相关的会话id
   * @param serviceId
   * @param customerId
   */
  public weila_getServiceSessionId(serviceId: number, customerId: number): string {
    return new Long(customerId, serviceId).toString(10)
  }

  /**
   * 根据消息体里面的音频URL，获取音频数据。从服务器取回来的消息如果是音频消息，SDK不会立刻对其下载
   * 音频数据。如果用户要展示或使用音频数据，则调用此接口来下载，然后再展示和播放
   * @param url
   */
  public async weila_fetchAudioData(url: string): Promise<WL_IDbAudioData | undefined> {
    const audioData = {} as WL_IDbAudioData
    // let matchResult = url.match(/(http|https):\/\/([^\/]+)\/(.+)/i);
    // const newUrl = '/audio/' + matchResult[3];
    const newUrl = url
    try {
      const result = await fetchWithTimeout(newUrl, { method: 'GET', mode: 'cors' }, 5000)
      if (result.ok) {
        const data = await result.arrayBuffer()
        audioData.data = new Uint8Array(data.slice(10))
        audioData.frameCount = calculateOpusDataFrame(audioData.data)
        return audioData
      }
    } catch (e) {
      wlerr('获取数据异常', e)
    }

    return undefined
  }

  /**
   * 设置websock地址，尽早调用，最好在weilaCore创建之后调用
   * @param webSock
   */
  public weila_setWebSock(webSock: string) {
    this.sendNetworkEvent(WL_NetworkEventID.NET_WEBSOCK_ADDR_SET_EVT, webSock)
  }

  /**
   * 设置appid和appkey，尽早调用，最好在登录前调用
   * @param appId
   * @param appKey
   */
  public weila_setAuthInfo(appId: string, appKey: string) {
    WeilaDB.setAppAuthInfo(appId, appKey)
  }

  /**
   * 获取当前登录用户的token
   * @returns token
   */
  public async weila_get_token(): Promise<string> {
    const tokenItem = await WeilaDB.getInstance().getSettingItem(
      WL_IDbSettingID.SETTING_LOGIN_TOKEN,
    )
    return tokenItem.data
  }
}

export { WeilaCore }
