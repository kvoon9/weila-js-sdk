import { defineQuery, useQuery } from '@pinia/colada'
import { useWeilaStore } from '../stores/weila'
import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import type { WL_IDbFriend } from '@weilasdk/core'
import { WL_ExtEventID } from '@weilasdk/core'
import type { WL_ExtEventCallback } from '@weilasdk/core'

export const useFriends = defineQuery(() => {
  const { core } = storeToRefs(useWeilaStore())

  const queryReturn = useQuery({
    key: ['friends'],
    query: async () => {
      if (!core.value) return [] as WL_IDbFriend[]
      return core.value.weila_getFriends()
    },
    enabled: () => core.value !== null,
  })

  // Refetch friends when friend data changes
  watch(
    core,
    (coreInstance) => {
      if (!coreInstance) return
      const handler: WL_ExtEventCallback = (eventId) => {
        if (
          eventId === WL_ExtEventID.WL_EXT_FRIEND_NEW_IND ||
          eventId === WL_ExtEventID.WL_EXT_FRIEND_DELETED_IND ||
          eventId === WL_ExtEventID.WL_EXT_FRIEND_MODIFIED_IND
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
