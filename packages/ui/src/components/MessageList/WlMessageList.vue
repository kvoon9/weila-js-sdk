<script setup lang="ts">
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import WlMessageListItem from './WlMessageListItem.vue'

export interface WlMessageListProps {
  /** 消息列表（按时间倒序，最新消息在前） */
  messages: WL_IDbMsgData[]
  /** 当前登录用户 ID，用于判断消息方向 */
  currentUserId: number
  /** 发送者信息 Map，key 为 userId */
  senderInfos?: Map<number, WL_IDbUserInfo>
  /** 是否正在加载 */
  loading?: boolean
  /** 加载错误 */
  error?: Error | null
}

const props = withDefaults(defineProps<WlMessageListProps>(), {
  senderInfos: () => new Map(),
  loading: false,
  error: null,
})

const emit = defineEmits<{
  /** 加载更多（上拉加载历史消息） */
  'load-more': []
  /** 重试加载 */
  retry: []
  /** 点击图片 */
  'image-click': [url: string]
  /** 点击文件 */
  'file-click': [url: string]
  /** 点击位置 */
  'location-click': [location: { latitude: number; longitude: number }]
  /** 点击音频 */
  'audio-click': [message: WL_IDbMsgData]
}>()

function handleRetry() {
  emit('retry')
}

function handleImageClick(url: string) {
  emit('image-click', url)
}

function handleFileClick(url: string) {
  emit('file-click', url)
}

function handleLocationClick(location: { latitude: number; longitude: number }) {
  emit('location-click', location)
}

function handleAudioClick(message: WL_IDbMsgData) {
  emit('audio-click', message)
}
</script>

<template>
  <div class="wl-message-list flex flex-col h-full">
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center py-8 px-4">
      <p class="text-red-500 mb-2">消息加载失败</p>
      <p class="text-sm text-gray-500">{{ error.message }}</p>
      <button
        @click="handleRetry"
        class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        重试
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="messages.length === 0" class="flex-1 flex items-center justify-center py-8">
      <p class="text-gray-400">暂无消息</p>
    </div>

    <!-- Message List -->
    <div v-else class="wl-message-list__body flex-1 overflow-y-auto px-4 py-2">
      <WlMessageListItem
        v-for="msg in messages"
        :key="msg.combo_id"
        :message="msg"
        :from="msg.senderId === currentUserId ? 'self' : 'other'"
        :sender-info="senderInfos.get(msg.senderId)"
        @image-click="handleImageClick"
        @file-click="handleFileClick"
        @location-click="handleLocationClick"
        @audio-click="handleAudioClick"
      />
    </div>
  </div>
</template>

<style scoped>
.wl-message-list {
  background-color: white;
}
</style>
