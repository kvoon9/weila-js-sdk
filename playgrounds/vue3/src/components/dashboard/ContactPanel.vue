<script setup lang="ts">
import { storeToRefs } from 'pinia'
import ContactList from './ContactList.vue'
import { useRouter } from 'vue-router'
import { useWeilaStore } from '../../stores/weila'
import { WL_IDbSessionType } from '@weilasdk/core'

const router = useRouter()
const weila = useWeilaStore()
const { core: weilaCore } = storeToRefs(weila)

async function handleSelectChat(userId: string) {
  if (!weilaCore.value) return

  try {
    await weilaCore.value.weila_startNewSession(userId, WL_IDbSessionType.SESSION_INDIVIDUAL_TYPE)
    console.log('[ContactPanel] Opening chat with user:', userId)
    router.push({ name: 'chat-index', query: { sessionId: userId } })
  } catch (err) {
    console.error('[ContactPanel] Failed to open chat:', err)
  }
}
</script>

<template>
  <ContactList @select-chat="handleSelectChat" />
</template>
