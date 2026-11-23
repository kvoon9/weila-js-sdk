import { WL } from 'proto/weilapb'
import { fsmEvents } from 'fsm/weila_fsmScript'
import type { MainFsmUserEvent } from 'fsm/weila_fsmScript'
import type WeilaPbDispatcher from 'main/weila_pb_dispatcher'
import {
  WL_NetworkEvent,
  WL_NetworkEventID,
  WL_NetworkState,
  WL_PbMsgData,
  WL_PbMsgHandler,
} from 'main/weila_internal_data'

/** The orchestration seams one network event drives. */
interface WeilaNetworkGatewayDeps {
  sendToFsm(event: MainFsmUserEvent): void
  dispatcher: WeilaPbDispatcher
  pbMsgHandlers: Map<number, WL_PbMsgHandler>
}

/**
 * 网络事件网关：把网络 worker 的事件分派到主状态机、PB 调度器或
 * 已注册的业务处理器。只依赖注入的三条缝隙，不持有 worker 或模块。
 */
export default class WeilaNetworkGateway {
  constructor(private readonly deps: WeilaNetworkGatewayDeps) {}

  /** 处理一条来自网络 worker 的事件。 */
  onNetworkMessage(event: { data: WL_NetworkEvent }): void {
    const netEvent = event.data

    switch (netEvent.eventId) {
      case WL_NetworkEventID.NET_STATE_IND_EVT:
        {
          const netState: WL_NetworkState = netEvent.eventData

          if (netState === WL_NetworkState.NET_CONNECTED_STATE) {
            this.deps.sendToFsm({ type: fsmEvents.FSM_NET_CONNECTED_IND_EVT })
          } else if (netState === WL_NetworkState.NET_CONNECTING_STATE) {
            this.deps.sendToFsm({ type: fsmEvents.FSM_NET_CONNECTING_IND_EVT })
          } else if (netState === WL_NetworkState.NET_DISCONNECTED_STATE) {
            this.deps.sendToFsm({ type: fsmEvents.FSM_NET_DISCONNECT_IND_EVT })
            this.deps.dispatcher.rejectAll('网络失去连接')
          }
        }

        break

      case WL_NetworkEventID.NET_MSG_RECV_IND_EVT:
        {
          const msgData: WL_PbMsgData = netEvent.eventData
          const serverMessage = WL.Service.ServiceMessage.decode(msgData.pbMsgData)

          const serviceHead = serverMessage.serviceHead
          const serviceId = serviceHead?.serviceId ?? 0

          if (serviceHead && this.deps.pbMsgHandlers.has(serviceId)) {
            const handler = this.deps.pbMsgHandlers.get(serviceId)

            if (handler) handler(serverMessage)
          }
        }

        break

      case WL_NetworkEventID.NET_EXCEPTION_IND_EVT:
        {
          this.deps.sendToFsm({ type: fsmEvents.FSM_NET_EXCEPTION_IND_EVT })
        }

        break
    }
  }
}
