<script setup lang="ts">
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataType } from '@weilasdk/core'
import WlMessage from '../Message/WlMessage.vue'
import WlMessageAvatar from '../Message/WlMessageAvatar.vue'
import WlMessageContent from '../Message/WlMessageContent.vue'

export interface WlMessageListItemProps {
  /** 消息数据 */
  message: WL_IDbMsgData
  /** 消息方向 */
  from: 'self' | 'other'
  /** 发送者信息 */
  senderInfo?: WL_IDbUserInfo
}

const props = withDefaults(defineProps<WlMessageListItemProps>(), {
  senderInfo: undefined,
})

const emit = defineEmits<{
  'image-click': [url: string]
  'file-click': [url: string]
  'location-click': [location: { latitude: number; longitude: number }]
  'audio-click': [message: WL_IDbMsgData]
}>()

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function handleImageClick(url?: string) {
  if (url) emit('image-click', url)
}

function handleFileClick(url?: string) {
  if (url) emit('file-click', url)
}

function handleLocationClick() {
  const loc = props.message.location
  if (loc?.latitude && loc?.longitude) {
    emit('location-click', { latitude: loc.latitude, longitude: loc.longitude })
  }
}

function handleAudioClick() {
  emit('audio-click', props.message)
}

const isText = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE
const isAudio = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
const isPtt = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE
const isImage = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE
const isVideo = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE
const isFile = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE
const isLocation = (msg: WL_IDbMsgData) =>
  msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE
const isWithdraw = (msg: WL_IDbMsgData) =>
  msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE
</script>

<template>
  <!-- 撤回消息 — 居中系统提示样式 -->
  <div v-if="isWithdraw(message)" class="wl-message-list-item--system flex justify-center py-1">
    <span class="text-xs text-gray-400">消息已撤回</span>
  </div>

  <!-- 普通消息 -->
  <WlMessage v-else :from="from">
    <WlMessageAvatar :src="senderInfo?.avatar" :name="senderInfo?.nick || senderInfo?.weilaNum" />
    <WlMessageContent>
      <!-- 文本消息 -->
      <template v-if="isText(message)">
        {{ message.textData || '' }}
      </template>

      <!-- 语音消息 -->
      <span
        v-else-if="isAudio(message)"
        class="inline-flex items-center gap-1 text-blue-600 cursor-pointer"
        @click="handleAudioClick"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.8v6.4a.8.8 0 00.8.8h2.4l3.5 3.5V5.3L9.7 8.8H7.3a.8.8 0 00-.8.8z"
          />
        </svg>
        语音消息
      </span>

      <!-- PTT 消息 -->
      <span
        v-else-if="isPtt(message)"
        class="inline-flex items-center gap-1 text-blue-600 cursor-pointer"
        @click="handleAudioClick"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8M12 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3z"
          />
        </svg>
        对讲消息
      </span>

      <!-- 图片消息 -->
      <template v-else-if="isImage(message)">
        <img
          v-if="message.fileInfo?.fileUrl"
          :src="message.fileInfo.fileThumbnail || message.fileInfo.fileUrl"
          class="max-w-[200px] max-h-[200px] rounded object-cover cursor-pointer"
          alt="image"
          @click="handleImageClick(message.fileInfo?.fileUrl)"
        />
      </template>

      <!-- 视频消息 -->
      <template v-else-if="isVideo(message)">
        <div
          v-if="message.fileInfo?.fileUrl"
          class="relative max-w-[200px] cursor-pointer"
          @click="handleFileClick(message.fileInfo?.fileUrl)"
        >
          <img
            v-if="message.fileInfo?.fileThumbnail"
            :src="message.fileInfo.fileThumbnail"
            class="w-full rounded object-cover"
            alt="video"
          />
          <div
            v-else
            class="w-[200px] h-[120px] bg-gray-200 rounded flex items-center justify-center"
          >
            <svg
              class="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <!-- Play overlay -->
          <div class="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
            <svg class="w-10 h-10 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </template>

      <!-- 文件消息 -->
      <template v-else-if="isFile(message)">
        <div
          v-if="message.fileInfo?.fileUrl"
          class="flex items-center gap-2 p-2 rounded bg-white border border-gray-200 cursor-pointer min-w-[180px]"
          @click="handleFileClick(message.fileInfo?.fileUrl)"
        >
          <img
            v-if="message.fileInfo?.fileThumbnail"
            :src="message.fileInfo.fileThumbnail"
            class="w-10 h-10 object-contain"
            alt="file"
          />
          <div
            v-else
            class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 truncate">
              {{ message.fileInfo?.fileName || 'File' }}
            </div>
            <div class="text-xs text-gray-500">
              {{ formatFileSize(message.fileInfo?.fileSize) }}
            </div>
          </div>
        </div>
      </template>

      <!-- 位置消息 -->
      <template v-else-if="isLocation(message)">
        <div
          v-if="message.location"
          class="max-w-[240px] cursor-pointer"
          @click="handleLocationClick"
        >
          <img
            v-if="message.location.mapUrl"
            :src="message.location.mapUrl"
            class="w-full h-[120px] object-cover rounded-t"
            alt="location"
          />
          <div
            class="p-2 bg-white border border-gray-200 rounded-b"
            :class="{ 'rounded-t': !message.location.mapUrl }"
          >
            <div v-if="message.location.name" class="text-sm font-medium text-gray-900">
              {{ message.location.name }}
            </div>
            <div v-if="message.location.address" class="text-xs text-gray-500 truncate">
              {{ message.location.address }}
            </div>
          </div>
        </div>
      </template>

      <!-- 未知类型 -->
      <span v-else class="text-gray-400 text-xs">[不支持的消息类型]</span>
    </WlMessageContent>
  </WlMessage>
</template>
