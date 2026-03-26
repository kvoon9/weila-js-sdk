import { ref, watch, watchEffect } from 'vue'
import type { Ref } from 'vue'
import type { WL_IDbMsgData, WL_IDbSession, WL_IDbUserInfo } from '@weilasdk/core'
import type { WeilaCore } from '@weilasdk/core'

export function useMessageHistory(
  weilaCore: Ref<WeilaCore | null>,
  selectedSession: Ref<WL_IDbSession | null>,
) {
  const messages = ref<WL_IDbMsgData[]>([])

  watchEffect(() => {
    console.log('messages.value',messages.value)
  })

  const senderInfos = ref<Map<number, WL_IDbUserInfo>>(new Map())
  const hasMore = ref(false)
  const loading = ref(false)

  async function ensureSenderInfo(senderId: number) {
    if (senderInfos.value.has(senderId) || !weilaCore.value) return
    const info = await weilaCore.value.weila_getUserInfo(senderId)
    if (info) {
      const updated = new Map(senderInfos.value)
      updated.set(senderId, info)
      senderInfos.value = updated
    }
  }

  async function loadMore(cursorMsgId = 0) {
    const session = selectedSession.value
    if (!session || !weilaCore.value) return

    loading.value = true
    try {
      const result = await weilaCore.value.weila_getMsgDatas(
        session.sessionId,
        session.sessionType,
        cursorMsgId,
        20,
      )

      hasMore.value = result.length === 20
      console.log('result.length',result.length)

      if (cursorMsgId === 0) {
        messages.value = result
      } else {
        messages.value.unshift(...result)
      }

      const senderIds = [...new Set(result.map((m) => m.senderId))]
      await Promise.all(senderIds.map(ensureSenderInfo))
    } finally {
      loading.value = false
    }
  }

  watch(
    selectedSession,
    async (session) => {
      if (!session) return
      messages.value = []
      await loadMore(0)
    },
    { immediate: true },
  )

  return { messages, senderInfos, hasMore, loading, ensureSenderInfo, loadMore }
}
