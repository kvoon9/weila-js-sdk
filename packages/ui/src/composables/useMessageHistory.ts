import { shallowRef, watch } from 'vue'
import type {
  WeilaCore,
  WL_ExtEventCallback,
  WL_IDbMsgData,
  WL_IDbSession,
  WL_IDbUserInfo,
} from '@weilasdk/core'
import { WL_ExtEventID } from '@weilasdk/core'

const PAGE_SIZE = 20

/**
 * Message history composable for the active session.
 */
export function useMessageHistory(
  getCore: () => WeilaCore | null,
  getSession: () => WL_IDbSession | undefined,
) {
  const messages = shallowRef<WL_IDbMsgData[]>([])
  const senderInfos = shallowRef<Map<number, WL_IDbUserInfo>>(new Map())
  const hasMore = shallowRef(false)
  const loading = shallowRef(false)
  const error = shallowRef<Error | null>(null)

  function reset() {
    messages.value = []
    senderInfos.value = new Map()
    hasMore.value = false
    loading.value = false
    error.value = null
  }

  async function ensureSenderInfo(senderId: number) {
    const core = getCore()
    if (senderInfos.value.has(senderId) || !core) return

    const info = await core.weila_getUserInfo(senderId)
    if (!info) return

    const updated = new Map(senderInfos.value)
    updated.set(senderId, info)
    senderInfos.value = updated
  }

  async function ensureSenderInfos(nextMessages: WL_IDbMsgData[]) {
    const senderIds = [...new Set(nextMessages.map((m) => m.senderId))]
    await Promise.all(senderIds.map(ensureSenderInfo))
  }

  function isCurrentSessionMessage(msg: WL_IDbMsgData) {
    const session = getSession()
    return Boolean(
      session && msg.sessionId === session.sessionId && msg.sessionType === session.sessionType,
    )
  }

  async function appendRealtimeMessage(msg: WL_IDbMsgData) {
    if (!isCurrentSessionMessage(msg)) return

    const existingIdx = messages.value.findIndex((m) => m.combo_id === msg.combo_id)
    if (existingIdx !== -1) {
      const existing = messages.value[existingIdx]
      const updated = {
        ...existing,
        ...msg,
        pttData: msg.pttData ? { ...existing.pttData, ...msg.pttData } : existing.pttData,
        audioData: msg.audioData ? { ...existing.audioData, ...msg.audioData } : existing.audioData,
      }
      messages.value = [
        ...messages.value.slice(0, existingIdx),
        updated,
        ...messages.value.slice(existingIdx + 1),
      ]
      await ensureSenderInfo(msg.senderId)
      return
    }

    messages.value = [...messages.value, msg]
    await ensureSenderInfo(msg.senderId)
  }

  async function loadMore(cursorMsgId?: number) {
    const core = getCore()
    const session = getSession()
    if (!core || !session) return

    const cursor = cursorMsgId ?? (messages.value[0]?.msgId ? messages.value[0].msgId - 1 : 0)

    loading.value = true
    error.value = null

    try {
      const result = await core.weila_getMsgDatas(
        session.sessionId,
        session.sessionType,
        cursor,
        PAGE_SIZE,
      )

      hasMore.value = result.length === PAGE_SIZE

      if (cursor === 0) {
        messages.value = result
      } else {
        const existingIds = new Set(messages.value.map((m) => m.combo_id))
        messages.value = [...result.filter((m) => !existingIds.has(m.combo_id)), ...messages.value]
      }

      await ensureSenderInfos(result)
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      loading.value = false
    }
  }

  const handleEvent: WL_ExtEventCallback = (eventId, eventData) => {
    if (
      eventId !== WL_ExtEventID.WL_EXT_NEW_MSG_RECV_IND &&
      eventId !== WL_ExtEventID.WL_EXT_MSG_SEND_IND
    ) {
      return
    }

    void appendRealtimeMessage(eventData as WL_IDbMsgData)
  }

  watch(
    getCore,
    (core, _oldCore, onCleanup) => {
      if (!core) return

      core.weila_onEvent(handleEvent)
      onCleanup(() => core.weila_offEvent(handleEvent))
      if (getSession()) void loadMore(0)
    },
    { immediate: true },
  )

  watch(
    getSession,
    (session) => {
      reset()
      if (session) void loadMore(0)
    },
    { immediate: true },
  )

  return {
    messages,
    senderInfos,
    hasMore,
    loading,
    error,
    ensureSenderInfo,
    loadMore,
    reset,
  }
}
