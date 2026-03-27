<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="flex items-center justify-center h-screen bg-gray-50">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-gray-800 mb-4">Weila SDK Playground</h1>
      <button @click="router.push('/chat')"
        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
        Go to Chat
      </button>
    </div>
  </div>
</template>
