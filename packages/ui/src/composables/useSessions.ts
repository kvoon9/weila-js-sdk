import { computed, ref, watch } from 'vue'
import type { WeilaCore } from '@weilasdk/core'
import type { WL_IDbSession, WL_ExtEventCallback } from '@weilasdk/core'
import { WL_ExtEventID, isGroupSessionType, isIndividualSessionType } from '@weilasdk/core'

/**
 * Session List Composable
 * Provides reactive session list from WeilaCore
 */
export function useSessions(getCore: () => WeilaCore | null) {
  const sessions = ref<WL_IDbSession[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const dataPrepared = ref(false)

  const sortedSessions = computed(() => {
    return [...sessions.value].toSorted((a, b) => {
      const aTime = a.latestUpdate || 0
      const bTime = b.latestUpdate || 0
      return bTime - aTime
    })
  })

  const personalSessions = computed(() =>
    sortedSessions.value.filter((s) => isIndividualSessionType(s.sessionType)),
  )

  const groupSessions = computed(() =>
    sortedSessions.value.filter((s) => isGroupSessionType(s.sessionType)),
  )

  async function fetchSessions() {
    const core = getCore()
    if (!core) {
      error.value = new Error('WeilaCore is not provided')
      return
    }

    loading.value = true
    error.value = null

    try {
      sessions.value = await core.weila_getSessionsFromDb()
      console.log(`[Weila:UI:useSessions] fetchSessions completed, count=${sessions.value.length}`, sessions.value.map(s => ({
        sessionId: s.sessionId,
        sessionName: s.sessionName,
        sessionType: s.sessionType,
        lastMsgId: s.lastMsgId,
        readMsgId: s.readMsgId,
        unreadCount: s.unreadCount,
        latestUpdate: s.latestUpdate,
        lastMsg: s.lastMsgData ? {
          msgId: s.lastMsgData.msgId,
          msgType: s.lastMsgData.msgType,
          text: s.lastMsgData.textData?.substring(0, 50),
          created: s.lastMsgData.created,
        } : null,
      })))
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      console.log('[Weila:UI:useSessions] fetchSessions error:', e)
    } finally {
      loading.value = false
    }
  }

  const handleEvent: WL_ExtEventCallback = (eventId, _eventData) => {
    // WL_EXT_DATA_PREPARE_IND: initial data loaded - 登录后数据同步完成
    if (eventId === WL_ExtEventID.WL_EXT_DATA_PREPARE_IND) {
      console.log('[Weila:UI:useSessions] event: WL_EXT_DATA_PREPARE_IND -> fetching sessions')
      dataPrepared.value = true
      void fetchSessions()
    }
    // WL_EXT_NEW_SESSION_OPEN_IND: new session created
    else if (eventId === WL_ExtEventID.WL_EXT_NEW_SESSION_OPEN_IND) {
      console.log('[Weila:UI:useSessions] event: WL_EXT_NEW_SESSION_OPEN_IND -> fetching sessions')
      void fetchSessions()
    }
    else if (eventId === WL_ExtEventID.WL_EXT_NEW_MSG_RECV_IND) {
      console.log('[Weila:UI:useSessions] event: WL_EXT_NEW_MSG_RECV_IND -> fetching sessions')
      void fetchSessions()
    }
    else if (eventId === WL_ExtEventID.WL_EXT_MSG_SEND_IND) {
      console.log('[Weila:UI:useSessions] event: WL_EXT_MSG_SEND_IND -> fetching sessions')
      void fetchSessions()
    }
    else if (eventId === WL_ExtEventID.WL_EXT_SESSION_UPDATED_IND) {
      console.log('[Weila:UI:useSessions] event: WL_EXT_SESSION_UPDATED_IND -> fetching sessions')
      void fetchSessions()
    }
  }

  // Watch for weilaCore changes
  watch(
    getCore,
    (newCore, _oldCore, onCleanup) => {
      if (newCore) {
        newCore.weila_onEvent(handleEvent)
        onCleanup(() => newCore.weila_offEvent(handleEvent))
        void fetchSessions()
      }
    },
    { immediate: true },
  )

  return {
    sessions: sortedSessions,
    personalSessions,
    groupSessions,
    loading,
    error,
    dataPrepared,
    refresh: fetchSessions,
  }
}
