import {
  WL_NetworkEvent,
  WL_NetworkEventID,
  WL_NetworkState,
  WL_PbMsgData,
} from 'main/weila_internal_data';
import WeilaMsgHeader from 'proto/weilapb_msg_header';
import { getWebsocketAddr } from 'main/weila_utils';

function getLogger(tagName: string) {
  return (...args: any[]) => {
    console.log(tagName + ':', ...args);
  };
}

const wllog = getLogger('NET:info');
const wlerr = getLogger('NET:err');

class Network {
  private readonly ctx: Worker = self as any;
  private readonly maxRecvBufSize = 1024 * 1024;
  private socket?: WebSocket;
  private recvBuffer: Uint8Array;
  private currentRecv: number;
  private isConnected: boolean;
  private sendingPbMsgList: Uint8Array[];
  private webSockAddr?: string;

  constructor() {
    this.recvBuffer = new Uint8Array(this.maxRecvBufSize);
    this.currentRecv = 0;
    this.isConnected = false;
    this.sendingPbMsgList = [];
  }

  public start() {
    this.ctx.onmessage = this.onMessage.bind(this);
  }

  private onSocketOpen(event: Event): void {
    wllog('SOCKET打开处理:', JSON.stringify(event));
    if (this.socket) {
      const netEvent = {} as WL_NetworkEvent;
      netEvent.eventId = WL_NetworkEventID.NET_STATE_IND_EVT;

      if (this.socket.readyState === WebSocket.CONNECTING) {
        wllog('SOCKET连接中...');
        netEvent.eventData = WL_NetworkState.NET_CONNECTING_STATE;
      } else if (this.socket.readyState === WebSocket.OPEN) {
        wllog('SOCKET已连接');
        netEvent.eventData = WL_NetworkState.NET_CONNECTED_STATE;
        this.isConnected = true;
      }

      this.ctx.postMessage(netEvent);
    }
  }

  private onSocketRecv(event: Event): void {
    if (this.currentRecv < this.maxRecvBufSize) {
      const recvData = new Uint8Array((event as MessageEvent).data);
      if (recvData.length > 0) {
        this.recvBuffer.set(recvData, this.currentRecv);
        this.currentRecv += recvData.length;
        while (this.currentRecv >= WeilaMsgHeader.msgHeaderLen) {
          const weilaHeader = WeilaMsgHeader.parseFromBuffer(this.recvBuffer);
          if (weilaHeader) {
            const headerValue = weilaHeader.getValue();
            if (this.currentRecv >= headerValue.length) {
              const wlMsgData = {} as WL_PbMsgData;
              wlMsgData.header = headerValue;
              wlMsgData.pbMsgData = this.recvBuffer.slice(
                WeilaMsgHeader.msgHeaderLen,
                headerValue.length,
              );
              this.recvBuffer.copyWithin(0, headerValue.length, this.currentRecv);
              this.currentRecv -= headerValue.length;

              const netEvent = {} as WL_NetworkEvent;
              netEvent.eventId = WL_NetworkEventID.NET_MSG_RECV_IND_EVT;
              netEvent.eventData = wlMsgData;
              this.ctx.postMessage(netEvent);
            } else {
              break;
            }
          } else {
            wlerr('!!!!!!!!!!!!!!!严重错误，收到错误的数据!!!!!!!!!!!!!!!!!!!!');
            let buf = this.recvBuffer.reduce((previousValue, currentValue) => {
              return previousValue + currentValue.toString(16).padStart(2, '0');
            }, '');
            wllog(buf);
          }
        }
      }
    }
  }

  private onSocketClose(event: Event): void {
    wllog('SOCKET关闭:', JSON.stringify(event));
    if (this.socket) {
      const closeEvent = event as CloseEvent;
      this.socket = undefined;
      wllog('错误码:', closeEvent.code, closeEvent.reason);
    }

    const netEvent = {} as WL_NetworkEvent;
    netEvent.eventId = WL_NetworkEventID.NET_STATE_IND_EVT;
    netEvent.eventData = WL_NetworkState.NET_DISCONNECTED_STATE;
    this.isConnected = false;
    this.ctx.postMessage(netEvent);
  }

  private disconnect(code: number, reason?: string) {
    wllog('disconnect ', code, reason);
    if (this.socket) {
      const netEvent = {} as WL_NetworkEvent;
      netEvent.eventId = WL_NetworkEventID.NET_STATE_IND_EVT;
      netEvent.eventData = WL_NetworkState.NET_DISCONNECTING_STATE;
      this.ctx.postMessage(netEvent);

      this.socket.close(code, reason || 'normal close');
      this.socket = undefined;
      this.isConnected = false;
    }
  }

  private onSocketError(event: Event): void {
    wlerr('SOCKET错误:' + event);
    this.disconnect(3000, JSON.stringify(event));

    const netEvent = {} as WL_NetworkEvent;
    netEvent.eventId = WL_NetworkEventID.NET_EXCEPTION_IND_EVT;
    netEvent.eventData = JSON.stringify(event);
    this.isConnected = false;
    this.ctx.postMessage(netEvent);
  }

  private connect() {
    try {
      if (this.socket === undefined) {
        this.socket = new WebSocket(this.webSockAddr ? this.webSockAddr : getWebsocketAddr());
        wllog('服务器连接中...');

        this.socket.binaryType = 'arraybuffer';
        this.socket.onopen = this.onSocketOpen.bind(this);
        this.socket.onmessage = this.onSocketRecv.bind(this);
        this.socket.onclose = this.onSocketClose.bind(this);
        this.socket.onerror = this.onSocketError.bind(this);
      }
    } catch (e) {
      wlerr('连接WS Socket 出异常', e);
      this.socket = undefined;
      const netEvent = {} as WL_NetworkEvent;
      netEvent.eventId = WL_NetworkEventID.NET_EXCEPTION_IND_EVT;
      netEvent.eventData = e;
      this.isConnected = false;
      this.ctx.postMessage(netEvent);
    }
  }

  private processSending(): void {
    if (this.sendingPbMsgList.length > 0) {
      const data = this.sendingPbMsgList.shift()!;
      if (this.isConnected) {
        if (this.socket.readyState === WebSocket.OPEN) {
          wllog('发送了数据');
          this.socket.send(data);
          setTimeout(this.processSending.bind(this), 0);
        }
      }
    }
  }

  private onMessage(event: any): void {
    const netEvent = event.data as WL_NetworkEvent;
    switch (netEvent.eventId) {
      case WL_NetworkEventID.NET_WEBSOCK_ADDR_SET_EVT:
        {
          this.webSockAddr = netEvent.eventData;
        }
        break;

      case WL_NetworkEventID.NET_CONNECT_EVT:
        {
          this.connect();
        }
        break;

      case WL_NetworkEventID.NET_DISCONNECT_EVT:
        {
          this.disconnect(1000, '正常断网');
        }
        break;

      case WL_NetworkEventID.NET_SEND_DATA_EVT:
        {
          this.sendingPbMsgList.push(netEvent.eventData);
          setTimeout(this.processSending.bind(this), 0);
        }
        break;
    }
  }
}

const network = new Network();
network.start();
