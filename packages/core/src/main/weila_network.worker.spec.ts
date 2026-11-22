import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WL_NetworkEvent, WL_NetworkEventID } from 'main/weila_internal_data'

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  static instances: FakeWebSocket[] = []

  binaryType = ''
  readyState = FakeWebSocket.CONNECTING
  sent: Uint8Array[] = []
  private listeners = new Map<string, ((event: Event) => void)[]>()

  constructor(public url: string) {
    FakeWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    const list = this.listeners.get(type) ?? []
    list.push(listener)
    this.listeners.set(type, list)
  }

  send(data: Uint8Array): void {
    this.sent.push(data)
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN
    this.fire('open')
  }

  fire(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new Event(type))
    }
  }
}

function postToWorker(netEvent: WL_NetworkEvent): void {
  self.dispatchEvent(new MessageEvent('message', { data: netEvent }))
}

async function importWorker(): Promise<void> {
  await import('main/weila_network.worker')
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 10))
}

function connectWorker(): FakeWebSocket {
  postToWorker({ eventId: WL_NetworkEventID.NET_WEBSOCK_ADDR_SET_EVT, eventData: 'wss://test' })
  postToWorker({ eventId: WL_NetworkEventID.NET_CONNECT_EVT, eventData: null })

  const socket = FakeWebSocket.instances.at(-1)

  if (!socket) throw new Error('connect did not create a socket')

  return socket
}

describe('network worker send queue', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.stubGlobal('postMessage', vi.fn())
    FakeWebSocket.instances.length = 0
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps frames queued while the socket is not open and flushes them on open', async () => {
    await importWorker()

    const socket = connectWorker()
    const frame = new Uint8Array([1, 2, 3])

    postToWorker({ eventId: WL_NetworkEventID.NET_SEND_DATA_EVT, eventData: frame })
    await settle()

    // Still connecting: nothing sent yet, and the frame must not be dropped.
    expect(socket.readyState).toBe(FakeWebSocket.CONNECTING)
    expect(socket.sent).toEqual([])

    socket.open()
    await settle()

    expect(socket.sent).toEqual([frame])
  })

  it('sends queued frames in order once the socket opens', async () => {
    await importWorker()

    const socket = connectWorker()
    const first = new Uint8Array([1])
    const second = new Uint8Array([2])

    postToWorker({ eventId: WL_NetworkEventID.NET_SEND_DATA_EVT, eventData: first })
    postToWorker({ eventId: WL_NetworkEventID.NET_SEND_DATA_EVT, eventData: second })
    socket.open()
    await settle()

    expect(socket.sent).toEqual([first, second])
  })

  it('drops queued frames on an explicit disconnect', async () => {
    await importWorker()

    connectWorker()

    postToWorker({ eventId: WL_NetworkEventID.NET_SEND_DATA_EVT, eventData: new Uint8Array([9]) })
    await settle()

    postToWorker({ eventId: WL_NetworkEventID.NET_DISCONNECT_EVT, eventData: null })
    await settle()

    const nextSocket = connectWorker()
    nextSocket.open()
    await settle()

    expect(nextSocket.sent).toEqual([])
  })
})
