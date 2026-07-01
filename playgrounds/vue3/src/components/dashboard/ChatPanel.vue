<script setup lang="ts">
import { computed, ref, triggerRef } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { storeToRefs } from 'pinia'
import type { WL_IDbSession } from '@vois/weila-sdk-core'
import { WlChatPanel } from '@vois/weila-sdk-ui'
import { useWeilaStore } from '../../stores/weila'
import ConfirmModal from '../ui/ConfirmModal.vue'

const weila = useWeilaStore()
const { core: weilaCore, userInfo } = storeToRefs(weila)
const selectedSessionId = useRouteQuery<string>('sessionId')
const chatPanelRef = ref<InstanceType<typeof WlChatPanel>>()
const pendingDeleteSession = ref<WL_IDbSession>()
const isDeleteSessionModalVisible = ref(false)
const isDeletingSession = ref(false)

const pendingDeleteSessionName = computed(() => {
  return pendingDeleteSession.value?.sessionName || pendingDeleteSession.value?.sessionId || ''
})

function handleSelectedSessionIdUpdate(sessionId: string) {
  selectedSessionId.value = sessionId
  triggerRef(selectedSessionId)
}

function handleDeleteSessionRequest(session: WL_IDbSession) {
  pendingDeleteSession.value = session
  isDeleteSessionModalVisible.value = true
}

function handleDeleteSessionCancel() {
  if (isDeletingSession.value) return

  isDeleteSessionModalVisible.value = false
  pendingDeleteSession.value = undefined
}

async function handleDeleteSessionConfirm() {
  if (!pendingDeleteSession.value || isDeletingSession.value) return

  isDeletingSession.value = true

  try {
    const success = await chatPanelRef.value?.deleteSession(pendingDeleteSession.value)
    if (!success) return

    isDeleteSessionModalVisible.value = false
    pendingDeleteSession.value = undefined
  } finally {
    isDeletingSession.value = false
  }
}

function handleLocationClick(location: { latitude: number; longitude: number; name: string; address: string }) {
  // eslint-disable-next-line no-console
  console.log('[Playground] Location clicked:', location)
}
</script>

<template>
  <WlChatPanel
    ref="chatPanelRef"
    :core="weilaCore"
    :current-user-id="userInfo?.userId ?? 0"
    :selected-session-id="selectedSessionId"
    @update:selected-session-id="handleSelectedSessionIdUpdate"
    @delete-session="handleDeleteSessionRequest"
    @location-click="handleLocationClick"
  />
  <ConfirmModal :visible="isDeleteSessionModalVisible" @cancel="handleDeleteSessionCancel">
    <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete session</h3>
    <p class="text-sm text-gray-600 mb-6">
      Delete session {{ pendingDeleteSessionName }}?
    </p>
    <template #actions>
      <div class="flex justify-end gap-3">
        <button
          class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-60"
          :disabled="isDeletingSession"
          @click="handleDeleteSessionCancel"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-60"
          :disabled="isDeletingSession"
          @click="handleDeleteSessionConfirm"
        >
          {{ isDeletingSession ? 'Deleting...' : 'Delete' }}
        </button>
      </div>
    </template>
  </ConfirmModal>
</template>
