<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWeilaStore } from './stores/weila'
import ConfirmModal from './components/ui/ConfirmModal.vue'

const router = useRouter()
const route = useRoute()
const weila = useWeilaStore()
const initialized = ref(false)
const reLoginLoading = ref(false)

const showKickoutModal = computed(() => weila.kickoutReason !== '')

function handleKickoutCancel() {
  weila.clearKickoutState()
  weila.storedCredentials = null
  router.push('/')
}

async function handleKickoutReLogin() {
  const creds = weila.storedCredentials
  if (!creds) return

  reLoginLoading.value = true
  try {
    await weila.login(creds.account, creds.password, creds.countryCode)
    weila.clearKickoutState()
    router.push('/chat')
  } catch {
    weila.clearKickoutState()
    weila.storedCredentials = null
    router.push('/')
  } finally {
    reLoginLoading.value = false
  }
}

onMounted(async () => {
  // Try auto-login with stored credentials
  const creds = weila.storedCredentials
  if (creds?.account && creds?.password) {
    try {
      await weila.autoLogin()
      if (route.path === '/') {
        router.push('/chat')
      }
    } catch {
      // Auto-login failed, stay on login page
    }
  }
  initialized.value = true
})
</script>

<template>
  <div v-if="!initialized" class="flex items-center justify-center h-screen bg-neutral-50">
    <p class="text-neutral-500">Initializing...</p>
  </div>
  <RouterView v-else />

  <ConfirmModal :visible="showKickoutModal" @cancel="handleKickoutCancel">
    <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-100">
      <span class="icon-[carbon--warning] text-yellow-600 text-2xl"></span>
    </div>
    <h3 class="text-lg font-medium text-gray-900 text-center mb-2">
      Logged Out Unexpectedly
    </h3>
    <p class="text-sm text-gray-500 text-center mb-2">
      {{ weila.kickoutReasonText }}
    </p>
    <p class="text-xs text-gray-400 text-center mb-4">
      Reason code: {{ weila.kickoutReason }}
    </p>

    <template #actions>
      <button
        v-if="weila.storedCredentials"
        @click="handleKickoutReLogin"
        :disabled="reLoginLoading"
        class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors disabled:opacity-50"
      >
        {{ reLoginLoading ? 'Retrying...' : 'Try Again' }}
      </button>
      <button
        @click="handleKickoutCancel"
        class="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
      >
        Cancel
      </button>
    </template>
  </ConfirmModal>
</template>
