<script setup lang="ts">
import { triggerRef } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { storeToRefs } from 'pinia'
import { WlChatPanel } from '@weilasdk/ui'
import { useWeilaStore } from '../../stores/weila'

const weila = useWeilaStore()
const { core: weilaCore, userInfo } = storeToRefs(weila)
const selectedSessionId = useRouteQuery<string>('sessionId')

function handleSelectedSessionIdUpdate(sessionId: string) {
  selectedSessionId.value = sessionId
  triggerRef(selectedSessionId)
}
</script>

<template>
  <WlChatPanel
    :core="weilaCore"
    :current-user-id="userInfo?.userId ?? 0"
    :selected-session-id="selectedSessionId"
    @update:selected-session-id="handleSelectedSessionIdUpdate"
  />
</template>
