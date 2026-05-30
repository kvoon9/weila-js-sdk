import { shallowRef, watch } from 'vue'
import type {
  WeilaCore,
  WL_ExtEventCallback,
  WL_IDbMsgData,
  WL_IDbSession,
  WL_IDbUserInfo,
} from '@weilasdk/core'
import { WL_ExtEventID, isGroupSessionType } from '@weilasdk/core'

const PAGE_SIZE = 20

interface UseMessageHistoryOptions {
  shouldAppendMessage?: (message: WL_IDbMsgData) => boolean
}

/**
 * Message history composable for the active session.
 */
export function useMessageHistory(
  getCore: () => WeilaCore | null,
  getSession: () => WL_IDbSession | undefined,
  options: UseMessageHistoryOptions = {},
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

    let info = await core.weila_getUserInfo(senderId)
    const session = getSession()
    if (!info && session && isGroupSessionType(session.sessionType)) {
      const groupMembers = await core.weila_getGroupMembers(session.sessionId)
      info = groupMembers.find((member) => member.memberInfo.userId === senderId)?.userInfo
    }

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

  function mergeMessage(existing: WL_IDbMsgData, next: WL_IDbMsgData): WL_IDbMsgData {
    const base = next.audioData || !existing.audioData ? next : existing
    const fallback = base === next ? existing : next
    const audioData = base.audioData || fallback.audioData

    return {
      ...fallback,
      ...base,
      audioData,
      pttData: audioData
        ? undefined
        : base.pttData ? { ...fallback.pttData, ...base.pttData } : fallback.pttData,
    }
  }

  function dedupeMessages(nextMessages: WL_IDbMsgData[]): WL_IDbMsgData[] {
    const byId = new Map<string, WL_IDbMsgData>()

    for (const msg of nextMessages) {
      const id = msg.combo_id || `${msg.sessionId}_${msg.sessionType}_${msg.msgId}`
      const existing = byId.get(id)
      byId.set(id, existing ? mergeMessage(existing, msg) : msg)
    }

    return [...byId.values()]
  }

  async function appendRealtimeMessage(msg: WL_IDbMsgData) {
    if (!isCurrentSessionMessage(msg)) return

    const existingIdx = messages.value.findIndex((m) => m.combo_id === msg.combo_id)
    if (existingIdx !== -1) {
      const existing = messages.value[existingIdx]
      const updated = mergeMessage(existing, msg)
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

      const dedupedResult = dedupeMessages(result)

      if (cursor === 0) {
        messages.value = dedupedResult
      } else {
        const existingIds = new Set(messages.value.map((m) => m.combo_id))
        messages.value = dedupeMessages([
          ...dedupedResult.filter((m) => !existingIds.has(m.combo_id)),
          ...messages.value,
        ])
      }

      await ensureSenderInfos(dedupedResult)
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

    const msg = eventData as WL_IDbMsgData
    if (options.shouldAppendMessage?.(msg) === false) return

    void appendRealtimeMessage(msg)
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
