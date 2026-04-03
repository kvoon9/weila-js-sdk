<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'

const router = useRouter()

onMounted(() => {
  router.replace('/chat')
})
</script>

<template>
  <div class="flex items-center justify-center h-full">
    <p class="text-gray-500">Redirecting...</p>
  </div>
</template>
