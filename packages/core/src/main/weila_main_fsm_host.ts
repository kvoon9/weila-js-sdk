import { fromPromise } from 'xstate'
import { fsmEvents, mainFsm, systemWatchdogActor } from 'fsm/weila_fsmScript'
import type { MainFsmUserEvent } from 'fsm/weila_fsmScript'
import { WLConfig } from 'main/weila_config'
import { getLogger } from 'log/weila_log'
import { WL_LoginParam, WL_LoginResult, WL_NetworkEventID } from 'main/weila_internal_data'
import { WL_DataPrepareInd, WL_DataPrepareState, WL_ExtEventID } from 'main/weila_external_data'
import { isServiceSessionType } from 'db/weila_db_data'
import type WLLoginModule from 'main/weila_login_module'
import type WLFriendModule from 'main/weila_friend_module'
import type WLGroupModule from 'main/weila_group_module'
import type WLBusinessModule from 'main/weila_business_module'
import type WLSessionModule from 'main/weila_session_module'

const wllog = getLogger('CORE:info')
const wlerr = getLogger('CORE:err')

/** The core capabilities the FSM host drives; the orchestration layer seam. */
export interface WeilaMainFsmHostDeps {
  sendNetworkEvent(event: WL_NetworkEventID, data: any): void
  sendExtEvent(event: WL_ExtEventID, data: any): void
  sendToFsm(event: MainFsmUserEvent): void
  setLoginUserInfo(userInfo: any): void
  setLoginReady(ready: boolean): void
  requestLogout(): Promise<boolean>
  checkWaitingTimeouts(): void
  readonly maxRetryLoginTimes: number
  readonly loginModule: WLLoginModule
  readonly friendModule: WLFriendModule
  readonly groupModule: WLGroupModule
  readonly businessModule: WLBusinessModule
  readonly sessionModule: WLSessionModule
}

/**
 * 主状态机宿主：提供机器的全部动作、actor 与守卫实现。只通过
 * WeilaMainFsmHostDeps 驱动核心能力，不持有 worker、调度器或门面。
 */
export default class WeilaMainFsmHost {
  private heartbeatTimerId: any = null
  private refreshTokenTimerId: any = null

  constructor(private readonly deps: WeilaMainFsmHostDeps) {}

  /** 绑定好实现的主状态机。 */
  buildMachine(): typeof mainFsm {
    return mainFsm.provide({
      actors: {
        loadResource: fromPromise(({ input }) => this.loadResource(input.context, input.event)),
        prepareData: fromPromise(({ input }) => this.prepareData(input.context, input.event)),
        loginServer: fromPromise(({ input }) => this.loginServer(input.context, input.event)),
        logout: fromPromise(({ input }) => this.logout(input.context, input.event)),
        systemWatchdog: systemWatchdogActor,
      },
      actions: {
        onResourceLoadFail: ({ context, event }) => {
          if ('error' in event) this.onResourceLoadFail(context, event)
        },
        onLoadingResource: this.onLoadingResource.bind(this),
        onException: ({ context, event }) => {
          if ('error' in event) this.onException(context, event)
        },
        onReadyEntry: this.onReadyEntry.bind(this),
        onReadyExit: this.onReadyExit.bind(this),
        onSysTimeChecking: this.onSysTimeChecking.bind(this),
        onDataInit: this.onDataInit.bind(this),
        onDataInited: this.onDataInited.bind(this),
        onDataPrepareFail: this.onDataPrepareFail.bind(this),
        onLoginServerSucc: ({ context, event }) => {
          if ('output' in event) this.onLoginSucc(context, event)
        },
        onLoginServerFail: ({ context, event }) => {
          if ('error' in event) this.onLoginFail(context, event)
        },
        connectServer: this.connectServer.bind(this),
        onConnecting: this.onConnecting.bind(this),
        onDisconnectInReadyState: this.onDisconnectInReadyState.bind(this),
        onLoginRetryFail: this.onLoginRetryFail.bind(this),
      },
      guards: {
        canRetry: ({ context, event }) => this.canRetry(context, event),
        isDefinitiveRejection: ({ event }) => this.isDefinitiveRejection(event),
      },
    })
  }

  private async loadResource(_context: any, event: any): Promise<any> {
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

  private async prepareData(_context: any, _event: any): Promise<boolean> {
    const ind: WL_DataPrepareInd = {
      state: WL_DataPrepareState.PREPARE_PROGRESS_IND,
      msg: 'SDK.FriendInit',
    }

    this.deps.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
    await this.deps.friendModule.initFriends()
    ind.msg = 'SDK.GroupInit'
    this.deps.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
    await this.deps.groupModule.initGroups()
    ind.msg = 'SDK.SessionInit'
    this.deps.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
    await this.deps.sessionModule.initSessions()
    ind.msg = 'SDK.ExtensionInit'
    this.deps.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
    await this.deps.loginModule.initExtension()

    ind.msg = 'SDK.Services'
    this.deps.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
    const sessionList = this.deps.sessionModule.getSessionList()

    try {
      await this.deps.businessModule.initService(
        sessionList.filter((value) => {
          return isServiceSessionType(value.sessionType)
        }),
      )
    } catch (e) {
      wlerr('初始化服务失败:', e)
    }

    return true
  }

  private async logout(_context: any, _event: any): Promise<boolean> {
    return this.deps.loginModule.logoutReq()
  }

  private async loginServer(context: any, _event: any): Promise<WL_LoginResult> {
    const loginParam: WL_LoginParam = context.loginParam
    const loginResult: WL_LoginResult = { callback: loginParam.callback }

    loginParam.retryCount++

    try {
      wllog('开始登陆')
      loginResult.loginUserInfo = await this.deps.loginModule.loginReq(
        loginParam.account,
        loginParam.password,
        loginParam.countryCode,
        loginParam.md5,
      )
      wllog('loginServer succ', loginResult)

      return loginResult
    } catch (e) {
      loginResult.error = e
      wllog('loginServer error', loginResult, e)

      return Promise.reject(loginResult)
    }
  }

  private onResourceLoadFail(_context: any, event: { error?: unknown }) {
    wlerr('初始加载数据出错', event.error)
  }

  private onLoadingResource(_context: any, _event: any) {
    wllog('加载数据成功')
  }

  private onException(_context: any, event: { error?: unknown }) {
    this.deps.sendExtEvent(WL_ExtEventID.WL_EXT_SYSTEM_EXCEPTION_IND, event.error)
  }

  private onDataInit(_context: any, _event: any) {
    // 对外发出正在准备数据中.
    const ind: WL_DataPrepareInd = {
      state: WL_DataPrepareState.START_PREPARING,
      msg: 'Commons.startPrepare',
    }

    this.deps.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
  }

  private onDataInited(_context: any, _event: any) {
    // 对外通知数据已经准备好
    const ind: WL_DataPrepareInd = {
      state: WL_DataPrepareState.PREPARE_SUCC_END,
      msg: 'Commons.prepareFinishSucc',
    }

    this.deps.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
  }

  private onDataPrepareFail(_context: any, _event: any) {
    // 因为数据准备失败，登出系统
    void this.deps.requestLogout().then((_value) => {})

    //通知外部，出现异常，并告知异常信息
    const ind: WL_DataPrepareInd = {
      state: WL_DataPrepareState.PREPARE_FAIL_END,
      msg: 'Commons.prepareFinishFail',
    }

    this.deps.sendExtEvent(WL_ExtEventID.WL_EXT_DATA_PREPARE_IND, ind)
  }

  private onLoginFail(_context: any, event: { error?: unknown }) {
    wllog('onLoginFail:', event)
    this.deps.sendNetworkEvent(WL_NetworkEventID.NET_DISCONNECT_EVT, null)
    this.deps.sendToFsm({
      type: fsmEvents.FSM_LOGIN_PROCEDURE_FAIL_EVT,
      data: event.error,
    })
  }

  private onLoginSucc(_context: any, event: { output?: any }) {
    const loginResult: WL_LoginResult = event.output
    wllog('onLogin:', event)
    this.deps.setLoginUserInfo(loginResult.loginUserInfo)

    if (loginResult.callback) {
      loginResult.callback.resolve(loginResult.loginUserInfo)
    }

    this.deps.sendToFsm({
      type: fsmEvents.FSM_LOGIN_PROCEDURE_SUCC_EVT,
      data: event.output,
    })
  }

  private onSysTimeChecking(_context: any, _event: any) {
    this.deps.checkWaitingTimeouts()
  }

  private onReadyEntry(_context: any, _event: any) {
    wllog('系统已经准备好，可以接受任何消息')
    this.deps.setLoginReady(true)
    this.heartbeatTimerId = setInterval(() => {
      this.deps.loginModule
        .sendHeartbeat()
        .then((_value) => {
          wllog('发送心跳成功')
        })
        .catch((reason) => {
          wlerr('发送心跳失败', reason)
        })
    }, 59000)

    this.refreshTokenTimerId = setInterval(() => {
      this.deps.loginModule
        .refreshToken()
        .then((_value) => {
          wllog('刷新token成功')
        })
        .catch((reason) => {
          wlerr('刷新token失败:', reason)
        })
    }, 3600000)
  }

  private onReadyExit(_context: any, _event: any) {
    wllog('系统没有准备好')
    this.deps.setLoginReady(false)

    clearInterval(this.heartbeatTimerId)
    this.heartbeatTimerId = null

    clearInterval(this.refreshTokenTimerId)
    this.refreshTokenTimerId = null
  }

  /** 服务器明确拒绝（错误消息带 RET_CODE...MESSAGE...END 结构）的失败不再重试 */
  private isDefinitiveRejection(event: any): boolean {
    const message = `${event?.data?.error?.message ?? ''}`

    return message.search(/.*-MESSAGE:.*:END/) !== -1
  }

  private canRetry(context: any, _event: any): boolean {
    const loginParam: WL_LoginParam = context.loginParam
    wllog('canRetry', loginParam)

    return loginParam.retryCount < this.deps.maxRetryLoginTimes
  }

  private connectServer(_context: any, _event: any) {
    this.deps.sendNetworkEvent(WL_NetworkEventID.NET_CONNECT_EVT, null)
  }

  private onConnecting({ context, event }: { context: any; event: any }) {
    wllog('onConnecting:', context, event)
  }

  private onDisconnectInReadyState(_context: any, _event: any) {
    // const loginParam = _context.loginParam as WL_LoginParam
  }

  private onLoginRetryFail({ context, event }: { context: any; event: any }) {
    wllog('onLoginRetryFail', event)

    const loginParam: WL_LoginParam | null = context.loginParam

    if (!loginParam) {
      context.loginParam = null

      return
    }

    if (event.data && event.data.error) {
      loginParam.callback.reject(event.data.error)
    } else {
      loginParam.callback.reject(new Error('登陆尝试多次失败'))
    }

    context.loginParam = null
  }
}
