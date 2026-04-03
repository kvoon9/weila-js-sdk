<script setup lang="ts">
import { useRouter, RouterView } from 'vue-router'
import { Dropdown } from 'floating-vue'
import { useWeilaStore } from '../stores/weila'
import { storeToRefs } from 'pinia'
import TabNav from '../components/dashboard/TabNav.vue'

const router = useRouter()
const weila = useWeilaStore()
const { userInfo } = storeToRefs(weila)

async function handleLogout() {
  await weila.logout()
  router.push('/')
}
</script>

<template>
  <div class="flex flex-col h-screen">
    <!-- Header Bar -->
    <div class="h-14 border-b border-neutral-200 flex items-center justify-between px-4 bg-white shrink-0">
      <div class="flex items-center gap-3">
        <!-- User Avatar Dropdown -->
        <Dropdown class="user-menu-dropdown" :distance="8" placement="bottom-start">
          <button class="focus:outline-none">
            <img v-if="userInfo?.avatar" :src="userInfo.avatar" class="w-8 h-8 rounded-full" />
            <div v-else class="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center">
              <span class="text-sm text-neutral-600">{{ userInfo?.nick?.[0] || 'U' }}</span>
            </div>
          </button>
          <template #popper="{ hide }">
            <div class="p-4 w-64">
              <div class="flex items-center gap-3 mb-3">
                <img v-if="userInfo?.avatar" :src="userInfo.avatar" class="w-12 h-12 rounded-full" />
                <div v-else class="w-12 h-12 rounded-full bg-neutral-300 flex items-center justify-center">
                  <span class="text-lg text-neutral-600">{{ userInfo?.nick?.[0] || 'U' }}</span>
                </div>
                <div>
                  <div class="font-medium text-neutral-800">{{ userInfo?.nick || 'User' }}</div>
                  <div class="text-sm text-neutral-500">{{ userInfo?.weilaNum || 'N/A' }}</div>
                </div>
              </div>
              <div class="text-sm text-neutral-600 space-y-1 mb-3">
                <div v-if="userInfo?.phone">Phone: {{ userInfo.phone }}</div>
                <div v-if="userInfo?.email">Email: {{ userInfo.email }}</div>
                <div>User ID: {{ userInfo?.userId }}</div>
              </div>
              <button @click="handleLogout(); hide()"
                class="w-full px-3 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors">
                Logout
              </button>
            </div>
          </template>
        </Dropdown>
        <span class="font-medium text-neutral-800">{{ userInfo?.nick || 'User' }}</span>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar: Tab Navigation -->
      <TabNav />

      <!-- Content Area: RouterView -->
      <div class="flex-1 overflow-hidden">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style>
/* Hide arrows for dropdowns */
.user-menu-dropdown .v-popper__arrow-inner,
.user-menu-dropdown .v-popper__arrow-outer {
  display: none;
}
</style>
