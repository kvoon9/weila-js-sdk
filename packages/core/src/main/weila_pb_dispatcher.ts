import { getLogger } from 'log/weila_log'
import { getPbResultCodeMassage } from 'main/weila_utils'
import { dbEnum } from 'db/db_enum'
import { WL } from 'proto/weilapb'
import type { WLBuildMsgRet } from 'proto/weilapb_wrapper_data'
import { WL_PbMsgData } from 'main/weila_internal_data'

const wllog = getLogger('CORE:info')

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

/**
 * PB 消息调度层：把请求按队列发往网络，按 seq 匹配应答，并负责超时与
 * 断连时的清理。只依赖注入的发送函数，不持有 worker 或业务模块。
 */
export default class WeilaPbDispatcher {
  private readonly waitingRspMap = new Map<number, WL_WaitingRspPbMsgInfo>()
  private readonly sendingPbMsgList: WL_SendingPbMsgInfo[] = []

  constructor(private readonly sendNetworkData: (reqData: WLBuildMsgRet['reqData']) => void) {}

  /**
   * 发送一条 PB 请求，应答到达（或超时/断连）时兑现
   * @param buildPbMsg 构建好的请求
   * @param timeout 超时毫秒数，缺省 6000
   * @returns 应答数据
   */
  sendPbMsg(buildPbMsg: WLBuildMsgRet, timeout?: number): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const sendingItem: WL_SendingPbMsgInfo = {
        resolve,
        reject,
        buildPbMsg,
        timeout: timeout ? timeout : 6000,
      }

      this.sendingPbMsgList.push(sendingItem)
      setTimeout(this.processSendingPbMsg.bind(this), 0)
    })
  }

  /** 按序号匹配并兑现一条等待中的请求；未知序号忽略。 */
  rspPbMsg(seq: number, resultCode: number, data: any): void {
    if (this.waitingRspMap.has(seq)) {
      const sendingItem = this.waitingRspMap.get(seq)
      this.waitingRspMap.delete(seq)

      if (sendingItem) {
        if (resultCode === 0) {
          sendingItem.resolve(data)
        } else {
          let errorMessage = 'RET_CODE:' + resultCode + '-MESSAGE:'
          const msg = getPbResultCodeMassage(dbEnum<WL.Service.ResultCode>(resultCode))
          errorMessage += msg ? msg : '未知错误码'
          errorMessage += ':END'
          sendingItem.reject(new Error(errorMessage))
        }
      }
    }
  }

  /** 网络断开时拒绝所有等待中的请求。 */
  rejectAll(reason: string): void {
    for (const key of this.waitingRspMap.keys()) {
      const waitingRsp = this.waitingRspMap.get(key)

      if (waitingRsp) {
        waitingRsp.reject(new Error(reason))
        this.waitingRspMap.delete(key)
      }
    }
  }

  /** 扫描超时截止时间，拒绝已过期的等待。 */
  checkTimeouts(): void {
    if (this.waitingRspMap.size === 0) return

    wllog('--------->onSysTimeChecking', this.waitingRspMap.size)

    const timeoutKeyList: number[] = []

    const now = new Date().getTime()

    this.waitingRspMap.forEach((value, key) => {
      wllog('checkSendingMsgItemTimeout:', value.timeout, now)

      if (value.timeout <= now) {
        timeoutKeyList.push(key)
      }
    })

    timeoutKeyList.forEach((key) => {
      const waitingPbMsg = this.waitingRspMap.get(key)

      if (waitingPbMsg) {
        waitingPbMsg.reject(new Error('消息超时'))
        this.waitingRspMap.delete(key)
      }
    })
  }

  private processSendingPbMsg(): void {
    wllog('处理PB消息，队列有%d个等待发送消息', this.sendingPbMsgList.length)

    if (this.sendingPbMsgList.length > 0) {
      const sendingItem = this.sendingPbMsgList.shift()!
      const weilaMsgHeader = sendingItem.buildPbMsg.weilaMsgHeader

      if (!weilaMsgHeader) return

      const waitingItem: WL_WaitingRspPbMsgInfo = {
        resolve: (value: any) => sendingItem.resolve(value),
        reject: (reason: any) => sendingItem.reject(reason),
        pbMsgData: {
          header: weilaMsgHeader,
          pbMsgData: sendingItem.buildPbMsg.reqData,
        },
        timeout: new Date().getTime() + (sendingItem.timeout ?? 0),
      }

      this.waitingRspMap.set(weilaMsgHeader.seqNum, waitingItem)
      this.sendNetworkData(sendingItem.buildPbMsg.reqData)
    }

    if (this.sendingPbMsgList.length > 0) {
      setTimeout(this.processSendingPbMsg.bind(this), 0)
    }
  }
}
