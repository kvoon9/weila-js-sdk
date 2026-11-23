import { describe, expect, it, vi } from 'vitest'
import { WL } from 'proto/weilapb'
import WeilaNetworkGateway from 'main/weila_network_gateway'
import WeilaPbDispatcher from 'main/weila_pb_dispatcher'
import { WL_NetworkEventID, WL_NetworkState } from 'main/weila_internal_data'
import type { WL_PbMsgHandler } from 'main/weila_internal_data'

function makeGateway() {
  const sendToFsm = vi.fn()
  const poster = vi.fn()
  const dispatcher = new WeilaPbDispatcher(poster)
  const pbMsgHandlers = new Map<number, WL_PbMsgHandler>()
  const gateway = new WeilaNetworkGateway({ sendToFsm, dispatcher, pbMsgHandlers })

  return { sendToFsm, poster, dispatcher, pbMsgHandlers, gateway }
}

function stateEvent(netState: WL_NetworkState) {
  return { data: { eventId: WL_NetworkEventID.NET_STATE_IND_EVT, eventData: netState } }
}

/** Encodes a real ServiceMessage so the gateway decodes it back. */
function recvEvent(serviceId: number) {
  const serverMessage = WL.Service.ServiceMessage.create({
    serviceHead: WL.Service.ServiceHead.create({
      seq: 1,
      serviceId,
      commandType: WL.Service.CommandType.COMMAND_RESPONSE,
      commandId: 1,
    }),
  })

  return {
    data: {
      eventId: WL_NetworkEventID.NET_MSG_RECV_IND_EVT,
      eventData: {
        header: undefined,
        pbMsgData: WL.Service.ServiceMessage.encode(serverMessage).finish(),
      },
    },
  }
}

describe('WeilaNetworkGateway', () => {
  it('forwards connection states to the main machine', () => {
    const { sendToFsm, gateway } = makeGateway()

    gateway.onNetworkMessage(stateEvent(WL_NetworkState.NET_CONNECTED_STATE))
    gateway.onNetworkMessage(stateEvent(WL_NetworkState.NET_CONNECTING_STATE))

    expect(sendToFsm.mock.calls.map((call) => call[0].type)).toEqual([
      'FSM_NET_CONNECTED_IND_EVT',
      'FSM_NET_CONNECTING_IND_EVT',
    ])
  })

  it('rejects every pending wait when the network drops', async () => {
    const { dispatcher, gateway, poster } = makeGateway()

    const settled = dispatcher
      .sendPbMsg({
        resultCode: 0,
        weilaMsgHeader: {
          length: 0,
          version: 1,
          flag: 0,
          serviceID: 1,
          commandID: 1,
          seqNum: 9,
          reserved: 0,
        },
        reqData: new Uint8Array([1]),
      })
      .then(
        () => 'resolved',
        (error: Error) => error.message,
      )

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(poster).toHaveBeenCalledTimes(1)

    gateway.onNetworkMessage(stateEvent(WL_NetworkState.NET_DISCONNECTED_STATE))

    expect(await settled).toBe('网络失去连接')
  })

  it('decodes incoming messages and dispatches to the registered handler', () => {
    const { pbMsgHandlers, gateway } = makeGateway()
    const handler = vi.fn()
    pbMsgHandlers.set(7, handler)

    gateway.onNetworkMessage(recvEvent(7))

    expect(handler).toHaveBeenCalledTimes(1)

    const decoded = handler.mock.calls[0][0]

    expect(decoded.serviceHead.serviceId).toBe(7)
  })

  it('stays silent for an unregistered service', () => {
    const { pbMsgHandlers, gateway } = makeGateway()
    const handler = vi.fn()
    pbMsgHandlers.set(7, handler)

    gateway.onNetworkMessage(recvEvent(8))

    expect(handler).not.toHaveBeenCalled()
  })

  it('reports exceptions to the main machine', () => {
    const { sendToFsm, gateway } = makeGateway()

    gateway.onNetworkMessage({
      data: { eventId: WL_NetworkEventID.NET_EXCEPTION_IND_EVT, eventData: null },
    })

    expect(sendToFsm).toHaveBeenCalledWith({ type: 'FSM_NET_EXCEPTION_IND_EVT' })
  })
})
