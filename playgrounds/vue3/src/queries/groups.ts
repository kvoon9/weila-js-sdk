import { defineQuery, useQuery } from '@pinia/colada'
import { useWeilaStore } from '../stores/weila'
import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import type { WL_IDbGroup } from '@weilasdk/core'
import { WL_ExtEventID } from '@weilasdk/core'
import type { WL_ExtEventCallback } from '@weilasdk/core'

export interface GroupItem {
  groupId: string
  name: string
  avatar?: string
  memberCount: number
  isPublic: boolean
  role?: 'owner' | 'admin' | 'member'
}

export function mapGroupToItem(group: WL_IDbGroup): GroupItem {
  return {
    groupId: group.groupId,
    name: group.name,
    avatar: group.avatar || undefined,
    memberCount: group.memberCount,
    isPublic: group.publicType === 0x02, // GROUP_PUBLIC_OPEN
  }
}

export const useGroups = defineQuery(() => {
  const { core } = storeToRefs(useWeilaStore())

  const queryReturn = useQuery({
    key: ['groups'],
    query: async () => {
      if (!core.value) return [] as GroupItem[]
      const groups = await core.value.weila_getAllGroups()
      return groups.map(mapGroupToItem)
    },
    enabled: () => core.value !== null,
  })

  // Refetch groups when group data changes
  watch(
    core,
    (coreInstance) => {
      if (!coreInstance) return
      const handler: WL_ExtEventCallback = (eventId) => {
        if (
          eventId === WL_ExtEventID.WL_EXT_GROUP_NEW_MEMBER_JOINED_IND ||
          eventId === WL_ExtEventID.WL_EXT_GROUP_DELETED_IND ||
          eventId === WL_ExtEventID.WL_EXT_GROUP_MEMBERS_MODIFIED_IND ||
          eventId === WL_ExtEventID.WL_EXT_GROUP_MODIFIED_IND
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
