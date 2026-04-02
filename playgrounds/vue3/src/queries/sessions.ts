import { defineQuery, useQuery } from '@pinia/colada'
import { useWeilaStore } from '../stores/weila'
import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import type { WL_IDbSession } from '@weilasdk/core'
import { WL_ExtEventID } from '@weilasdk/core'
import type { WL_ExtEventCallback } from '@weilasdk/core'

export const useSessions = defineQuery(() => {
  const { core } = storeToRefs(useWeilaStore())

  const queryReturn = useQuery({
    key: ['sessions'],
    query: async () => {
      if (!core.value) return [] as WL_IDbSession[]
      return core.value.weila_getSessionsFromDb()
    },
    enabled: () => core.value !== null,
  })

  // Refetch sessions when session data changes
  watch(
    core,
    (coreInstance) => {
      if (!coreInstance) return
      const handler: WL_ExtEventCallback = (eventId) => {
        // Refetch on: initial sync complete, new message, message sent, new session
        if (
          eventId === WL_ExtEventID.WL_EXT_DATA_PREPARE_IND ||
          eventId === WL_ExtEventID.WL_EXT_NEW_MSG_RECV_IND ||
          eventId === WL_ExtEventID.WL_EXT_MSG_SEND_IND ||
          eventId === WL_ExtEventID.WL_EXT_NEW_SESSION_OPEN_IND
        ) {
          queryReturn.refetch().catch(console.error)
        }
      }
      coreInstance.weila_onEvent(handler)
    },
    { immediate: true },
  )

  return queryReturn
})
