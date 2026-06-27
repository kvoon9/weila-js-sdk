import { computed, reactive, ref, watch } from 'vue'
import type { WeilaCore } from '@weilasdk/core'
import type { WL_IDbMsgData, WL_IDbSession, WL_ExtEventCallback } from '@weilasdk/core'
import {
  WL_DataPrepareState,
  WL_ExtEventID,
  WL_IDbMsgDataType,
  isGroupSessionType,
  isIndividualSessionType,
} from '@weilasdk/core'

const BACKGROUND_REFRESH_DEBOUNCE_MS = 200

export interface BatchSessionProfileResult {
  sessionName?: string
  sessionAvatar?: string
  memberCount?: number
  invalid?: boolean
}

export type BatchSessionProfileResolver = (
  sessions: WL_IDbSession[],
) => Promise<Map<string, BatchSessionProfileResult>>

/**
 * Session List Composable
 * Provides reactive session list from WeilaCore
 */
export function useSessions(
  getCore: () => WeilaCore | null,
  batchResolveProfiles?: BatchSessionProfileResolver,
) {
  const sessions = ref<WL_IDbSession[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const invalidSessionKeys = reactive(new Set<string>())
  let backgroundRefreshTimer: ReturnType<typeof setTimeout> | null = null
  let fetchPromise: Promise<void> | null = null // ponytail: serialize fetches to avoid stale invalidSessionKeys

  const sortedSessions = computed(() => {
    return sessions.value.toSorted((a, b) => {
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

  async function applyBatchProfiles(core: WeilaCore, fetchedSessions: WL_IDbSession[]) {
    if (!batchResolveProfiles)
      return

    try {
      const profileMap = await batchResolveProfiles(fetchedSessions)
      invalidSessionKeys.clear()

      for (const session of fetchedSessions) {
        const key = `${session.sessionId}_${session.sessionType}`
        const result = profileMap.get(key)

        if (result?.invalid) {
          invalidSessionKeys.add(key)
          continue
        }

        if (result?.sessionName) {
          await core.weila_updateSessionProfile(session.sessionId, session.sessionType, {
            sessionName: result.sessionName,
            sessionAvatar: result.sessionAvatar,
            memberCount: result.memberCount,
          })
        }
      }
    }
    catch (e) {
      console.warn('[Weila:UI:useSessions] batch resolve profiles failed:', e)
    }
  }

  async function fetchSessions(showLoading = sessions.value.length === 0) {
    if (fetchPromise)
      return fetchPromise // ponytail: serialise overlapping calls

    const core = getCore()
    if (!core) {
      error.value = new Error('WeilaCore is not provided')
      return
    }

    if (showLoading) loading.value = true
    error.value = null

    fetchPromise = (async () => {
      try {
        sessions.value = await core.weila_getSessionsFromDb()
        await applyBatchProfiles(core, sessions.value)
      }
      catch (e) {
        error.value = e instanceof Error ? e : new Error(String(e))
        console.log('[Weila:UI:useSessions] fetchSessions error:', e)
      }
      finally {
        if (showLoading) loading.value = false
        fetchPromise = null
      }
    })()

    return fetchPromise
  }

  function scheduleBackgroundRefresh() {
    if (backgroundRefreshTimer) clearTimeout(backgroundRefreshTimer)

    backgroundRefreshTimer = setTimeout(() => {
      backgroundRefreshTimer = null
      void fetchSessions(false)
    }, BACKGROUND_REFRESH_DEBOUNCE_MS)
  }

  function isRealtimePttData(data: unknown) {
    const msg = (data as WL_IDbSession | undefined)?.lastMsgData ?? data as WL_IDbMsgData | undefined
    return Boolean(
      msg?.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE
      || (msg?.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE && msg?.pttData),
    )
  }

  const handleEvent: WL_ExtEventCallback = (eventId, eventData) => {
    // WL_EXT_DATA_PREPARE_IND: initial data loaded - 登录后数据同步完成
    if (eventId === WL_ExtEventID.WL_EXT_DATA_PREPARE_IND) {
      if (eventData?.state !== WL_DataPrepareState.PREPARE_SUCC_END) return
      void fetchSessions(sessions.value.length === 0)
    }
    // WL_EXT_NEW_SESSION_OPEN_IND: new session created
    else if (eventId === WL_ExtEventID.WL_EXT_NEW_SESSION_OPEN_IND) {
      scheduleBackgroundRefresh()
    }
    else if (eventId === WL_ExtEventID.WL_EXT_NEW_MSG_RECV_IND) {
      if (isRealtimePttData(eventData)) return
      scheduleBackgroundRefresh()
    }
    else if (eventId === WL_ExtEventID.WL_EXT_MSG_SEND_IND) {
      scheduleBackgroundRefresh()
    }
    else if (eventId === WL_ExtEventID.WL_EXT_SESSION_UPDATED_IND) {
      if (isRealtimePttData(eventData)) return
      scheduleBackgroundRefresh()
    }
    else if (eventId === WL_ExtEventID.WL_EXT_GROUP_MODIFIED_IND) {
      // 群资料变更后清空了 session 缓存，需要重新拉取让 resolver 刷新
      scheduleBackgroundRefresh()
    }
  }

  // Watch for weilaCore changes
  watch(
    getCore,
    (newCore, _oldCore, onCleanup) => {
      if (newCore) {
        newCore.weila_onEvent(handleEvent)
        onCleanup(() => {
          newCore.weila_offEvent(handleEvent)
          if (backgroundRefreshTimer) {
            clearTimeout(backgroundRefreshTimer)
            backgroundRefreshTimer = null
          }
        })
        const currentSessions = newCore.weila_getSessions()
        if (currentSessions.length > 0) {
          void fetchSessions(true)
        }
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
    invalidSessionKeys,
    refresh: () => fetchSessions(true),
    refreshSilently: () => fetchSessions(false),
  }
}
