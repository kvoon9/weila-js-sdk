import { ref, computed, onMounted, onUnmounted, watch, type Ref } from 'vue';
import type { WeilaCore } from '@weilasdk/core';
import type { WL_IDbSession, WL_ExtEventCallback } from '@weilasdk/core';

/**
 * Session List Composable
 * Provides reactive session list from WeilaCore
 */
export function useSessions(weilaCore: Ref<WeilaCore | undefined>) {
  const sessions = ref<WL_IDbSession[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const dataPrepared = ref(false);

  const sortedSessions = computed(() => {
    return [...sessions.value].toSorted((a, b) => {
      const aTime = a.lastMsgTime || a.updated || 0;
      const bTime = b.lastMsgTime || b.updated || 0;
      return bTime - aTime;
    });
  });

  const personalSessions = computed(() => 
    sortedSessions.value.filter(s => s.sessionType === 0x01)
  );

  const groupSessions = computed(() => 
    sortedSessions.value.filter(s => s.sessionType === 0x02)
  );

  async function fetchSessions() {
    if (!weilaCore.value) {
      error.value = new Error('WeilaCore is not provided');
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      sessions.value = await weilaCore.value.weila_getSessionsFromDb();
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
    } finally {
      loading.value = false;
    }
  }

  const handleEvent: WL_ExtEventCallback = (eventId, _eventData) => {
    // WL_EXT_DATA_PREPARE_IND: initial data loaded - 登录后数据同步完成
    if (eventId === 'WL_EXT_DATA_PREPARE_IND') {
      dataPrepared.value = true;
      void fetchSessions();
    }
    // WL_EXT_NEW_SESSION_OPEN_IND: new session created
    else if (eventId === 'WL_EXT_NEW_SESSION_OPEN_IND') {
      void fetchSessions();
    }
  };

  // Watch for weilaCore changes
  watch(weilaCore, (newCore) => {
    if (newCore) {
      newCore.weila_onEvent(handleEvent);
    }
  }, { immediate: true });

  onMounted(() => {
    if (weilaCore.value) {
      // 注册事件监听
      weilaCore.value.weila_onEvent(handleEvent);
      
      // 如果数据已经准备好，直接获取
      if (dataPrepared.value) {
        void fetchSessions();
      }
    }
  });

  onUnmounted(() => {
    // Note: We cannot easily remove the listener without storing the callback reference
  });

  return {
    sessions: sortedSessions,
    personalSessions,
    groupSessions,
    loading,
    error,
    dataPrepared,
    refresh: fetchSessions,
  };
}
