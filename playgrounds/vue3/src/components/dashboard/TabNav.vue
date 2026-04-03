<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/chat', label: 'Chat', icon: 'icon-[carbon--chat]' },
  { path: '/chat/contacts', label: 'Contacts', icon: 'icon-[carbon--user-multiple]' },
  { path: '/chat/groups', label: 'Groups', icon: 'icon-[carbon--group]' },
]

function isActive(path: string) {
  return route.path === path
}

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <nav class="w-48 border-r border-gray-100 bg-gray-50/50 flex flex-col">
    <div class="flex flex-col gap-1 p-2">
      <button v-for="tab in tabs" :key="tab.path" @click="navigate(tab.path)" :class="[
        'flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200, opacity-75',
        isActive(tab.path)
          ? 'bg-neutral-100 text-neutral-900 font-medium'
          : 'text-neutral-500 hover:text-neutral-700 hover:opacity-100'
      ]">
        <span :class="[tab.icon]"></span>
        <span>{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>
