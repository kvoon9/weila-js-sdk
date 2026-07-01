<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import ContactList from './ContactList.vue'
import { useRouter } from 'vue-router'
import { useWeilaStore } from '../../stores/weila'
import { WL_IDbSessionType } from '@vois/weila-sdk-core'

interface ContactItem {
  userId: string
  name: string
  avatar?: string
  remark?: string
  isOnline: boolean
  lastMsgTime?: number
}

const router = useRouter()
const weila = useWeilaStore()
const { core: weilaCore } = storeToRefs(weila)

const selectedContact = ref<ContactItem | null>(null)

function handleSelectContact(contact: ContactItem) {
  selectedContact.value = contact
}

function handleCloseDetail() {
  selectedContact.value = null
}

async function handleSendMessage() {
  if (!weilaCore.value || !selectedContact.value) return
  try {
    await weilaCore.value.weila_startNewSession(
      selectedContact.value.userId,
      WL_IDbSessionType.SESSION_INDIVIDUAL_TYPE,
    )
    router.push({ name: 'chat-index', query: { sessionId: selectedContact.value.userId } })
  } catch (err) {
    console.error('[ContactPanel] Failed to send message:', err)
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<template>
  <div class="h-full flex">
    <!-- Contact List (left sidebar) -->
    <div class="w-80 border-r border-neutral-200 bg-white overflow-hidden flex flex-col">
      <ContactList @select-chat="handleSelectContact" />
    </div>

    <!-- Right Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Empty State -->
      <div v-if="!selectedContact" class="flex-1 flex items-center justify-center text-neutral-400">
        <div class="text-center">
          <span class="icon-[carbon--user] text-5xl mb-3 block"></span>
          <p class="text-sm">选择一个联系人查看详情</p>
        </div>
      </div>

      <!-- Contact Detail -->
      <div v-else class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
              <img v-if="selectedContact.avatar" :src="selectedContact.avatar" :alt="selectedContact.name"
                class="w-full h-full object-cover" />
              <span v-else class="text-lg font-medium text-neutral-500">{{ getInitials(selectedContact.name) }}</span>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-neutral-900">{{ selectedContact.remark || selectedContact.name }}</h2>
              <p class="text-sm text-neutral-500">
                <span v-if="selectedContact.remark" class="mr-2">{{ selectedContact.name }}</span>
                <span
                  :class="[
                    'px-2 py-0.5 rounded text-xs',
                    selectedContact.isOnline ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500',
                  ]"
                >
                  {{ selectedContact.isOnline ? '在线' : '离线' }}
                </span>
              </p>
            </div>
          </div>
          <button @click="handleCloseDetail" class="p-1.5 rounded hover:bg-neutral-100 text-neutral-500">
            <span class="icon-[carbon--close] text-xl"></span>
          </button>
        </div>

        <!-- Info Section -->
        <div class="flex-1 overflow-y-auto p-6">
          <h3 class="text-sm font-medium text-neutral-700 mb-3">联系人信息</h3>
          <div class="space-y-3">
            <div class="flex items-center gap-3 p-3 rounded-lg bg-neutral-50">
              <span class="text-sm font-medium text-neutral-500 w-16">用户ID</span>
              <span class="text-sm text-neutral-900">{{ selectedContact.userId }}</span>
            </div>
            <div v-if="selectedContact.remark" class="flex items-center gap-3 p-3 rounded-lg bg-neutral-50">
              <span class="text-sm font-medium text-neutral-500 w-16">备注</span>
              <span class="text-sm text-neutral-900">{{ selectedContact.remark }}</span>
            </div>
          </div>
        </div>

        <!-- Bottom Actions -->
        <div class="px-6 py-4 border-t border-neutral-200 bg-white shrink-0">
          <button
            @click="handleSendMessage"
            class="w-full px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium flex items-center justify-center gap-2"
          >
            <span class="icon-[carbon--chat]"></span>
            发送消息
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
