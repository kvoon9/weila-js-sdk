import { ref, watch, type Ref } from 'vue'
import type { WeilaCore, WL_IDbSession, WL_IDbMsgData } from '@weilasdk/core'

/**
 * Composable for fetching and caching last messages for sessions
 * Use this with useSessions to get message previews for each session
 */
export function useSessionLastMessages(
  sessions: Ref<WL_IDbSession[]>,
  getWeilaCore: () => WeilaCore | undefined,
) {
  const lastMessages = ref<Record<string, WL_IDbMsgData | null>>({})
  const loading = ref(false)

  async function fetchLastMessage(session: WL_IDbSession): Promise<WL_IDbMsgData | null> {
    const core = getWeilaCore()
    if (!core) return null

    const key = `${session.sessionId}_${session.sessionType}`
    if (lastMessages.value[key]) {
      return lastMessages.value[key]
    }

    try {
      const msgs = await core.weila_getMsgDatas(
        session.sessionId,
        session.sessionType,
        0,
        1,
      )
      lastMessages.value[key] = msgs[0] || null
      return lastMessages.value[key]
    } catch {
      lastMessages.value[key] = null
      return null
    }
  }

  async function fetchAllLastMessages(): Promise<void> {
    const core = getWeilaCore()
    if (!core || !sessions.value.length) return

    loading.value = true
    try {
      await Promise.all(sessions.value.map(fetchLastMessage))
    } finally {
      loading.value = false
    }
  }

  function getLastMessage(session: WL_IDbSession): WL_IDbMsgData | null {
    const key = `${session.sessionId}_${session.sessionType}`
    return lastMessages.value[key] || null
  }

  // Watch for sessions changes and fetch last messages
  watch(
    sessions,
    async (newSessions) => {
      if (newSessions.length > 0) {
        await fetchAllLastMessages()
      }
    },
    { immediate: true },
  )

  return {
    lastMessages,
    loading,
    getLastMessage,
    refresh: fetchAllLastMessages,
  }
}
