import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WeilaPbDispatcher from 'main/weila_pb_dispatcher'
import type { WLBuildMsgRet } from 'proto/weilapb_wrapper_data'

function buildMsg(seq: number): WLBuildMsgRet {
  return {
    resultCode: 0,
    weilaMsgHeader: {
      length: 0,
      version: 1,
      flag: 0,
      serviceID: 1,
      commandID: 1,
      seqNum: seq,
      reserved: 0,
    },
    reqData: new Uint8Array([seq]),
  }
}

/** Captures a pending promise's outcome with the handler attached up front. */
function outcome(promise: Promise<any>): Promise<string> {
  return promise.then(
    (value) => `resolved:${JSON.stringify(value)}`,
    (error: Error) => error.message,
  )
}

describe('WeilaPbDispatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends through the injected poster and resolves on the matching rsp', async () => {
    const poster = vi.fn()
    const dispatcher = new WeilaPbDispatcher(poster)

    const pending = dispatcher.sendPbMsg(buildMsg(7))
    await vi.advanceTimersByTimeAsync(0)

    expect(poster).toHaveBeenCalledTimes(1)

    dispatcher.rspPbMsg(7, 0, { value: 42 })

    await expect(pending).resolves.toEqual({ value: 42 })
  })

  it('rejects with the RET_CODE message shape on a non-zero result code', async () => {
    const dispatcher = new WeilaPbDispatcher(vi.fn())

    const settled = outcome(dispatcher.sendPbMsg(buildMsg(3)))
    await vi.advanceTimersByTimeAsync(0)

    dispatcher.rspPbMsg(3, 105, null)

    expect(await settled).toBe('RET_CODE:105-MESSAGE:账号或密码错误(设备不再自动登录):END')
  })

  it('ignores a response for an unknown seq', async () => {
    const dispatcher = new WeilaPbDispatcher(vi.fn())

    const settled = outcome(dispatcher.sendPbMsg(buildMsg(5)))
    await vi.advanceTimersByTimeAsync(0)

    dispatcher.rspPbMsg(999, 0, null)
    dispatcher.rspPbMsg(5, 0, 'mine')

    expect(await settled).toBe('resolved:"mine"')
  })

  it('rejects expired waits on checkTimeouts and keeps fresh ones', async () => {
    const dispatcher = new WeilaPbDispatcher(vi.fn())

    const shortWait = outcome(dispatcher.sendPbMsg(buildMsg(1), 20))
    const longWait = outcome(dispatcher.sendPbMsg(buildMsg(2), 60000))
    await vi.advanceTimersByTimeAsync(100)

    dispatcher.checkTimeouts()

    dispatcher.rspPbMsg(2, 0, 'still waiting')

    expect(await shortWait).toBe('消息超时')
    expect(await longWait).toBe('resolved:"still waiting"')
  })

  it('rejects every wait when the network drops', async () => {
    const dispatcher = new WeilaPbDispatcher(vi.fn())

    const first = outcome(dispatcher.sendPbMsg(buildMsg(1)))
    const second = outcome(dispatcher.sendPbMsg(buildMsg(2)))
    await vi.advanceTimersByTimeAsync(0)

    dispatcher.rejectAll('网络失去连接')

    expect(await first).toBe('网络失去连接')
    expect(await second).toBe('网络失去连接')
  })
})
