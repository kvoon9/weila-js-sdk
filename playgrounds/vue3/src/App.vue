<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWeilaStore } from './stores/weila'

const router = useRouter()
const route = useRoute()
const weila = useWeilaStore()
const initialized = ref(false)

onMounted(async () => {
  // Try auto-login with stored credentials
  const creds = weila.storedCredentials
  if (creds?.account && creds?.password) {
    try {
      await weila.autoLogin()
      // Only redirect if currently on login page
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
</template>
