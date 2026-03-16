<script setup lang="ts">
import { ref } from 'vue'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataType } from '@weilasdk/core'
import WlAudioBubble from '../Message/WlAudioBubble.vue'
import { framesToDuration } from '../../composables/useAudio'

export interface WlMsgListProps {
  /** 消息列表 */
  messages: WL_IDbMsgData[]
  /** 当前登录用户 ID，用于判断消息方向 */
  currentUserId: number
  /** 发送者信息 Map，key 为 userId */
  senderInfos?: Map<number, WL_IDbUserInfo>
}

const props = withDefaults(defineProps<WlMsgListProps>(), {
  senderInfos: () => new Map(),
})

const emit = defineEmits<{
  /** 点击图片 */
  'image-click': [url: string]
  /** 点击位置 */
  'location-click': [location: { latitude: number; longitude: number }]
  /** 点击文件 */
  'file-click': [url: string]
  /** 播放音频消息 */
  'audio-play': [msg: WL_IDbMsgData]
  /** 暂停音频消息 */
  'audio-pause': [msg: WL_IDbMsgData]
}>()

/** 当前正在播放的音频消息 combo_id */
const playingAudioId = ref<string | null>(null)

function getSender(msg: WL_IDbMsgData) {
  return props.senderInfos.get(msg.senderId)
}

function isSelf(msg: WL_IDbMsgData) {
  return msg.senderId === props.currentUserId
}

const isText = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE
const isAudio = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
const isImage = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE
const isLocation = (msg: WL_IDbMsgData) =>
  msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE
const isFile = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE

function getAudioDuration(msg: WL_IDbMsgData): number {
  return framesToDuration(msg.audioData?.frameCount ?? 0)
}

function handleAudioPlay(msg: WL_IDbMsgData) {
  playingAudioId.value = msg.combo_id
}

function handleAudioPause() {
  playingAudioId.value = null
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="flex flex-col h-full bg-neutral-100 overflow-y-auto px-4 py-3">
    <div
      v-for="msg in messages"
      :key="msg.combo_id"
      class="flex items-start gap-2 py-1.5"
      :class="isSelf(msg) ? 'flex-row-reverse' : ''"
    >
      <!-- Avatar -->
      <div
        class="shrink-0 size-9 rounded-lg overflow-hidden bg-neutral-300 flex items-center justify-center"
      >
        <img
          v-if="getSender(msg)?.avatar"
          :src="getSender(msg)!.avatar"
          class="size-full object-cover"
          alt=""
        />
        <span v-else class="icon-[carbon--user-avatar-filled] size-6 text-neutral-500" />
      </div>

      <!-- Text Message -->
      <div
        v-if="isText(msg)"
        class="max-w-[70%] rounded-xl px-3 py-2 text-sm break-all whitespace-pre-wrap overflow-hidden"
        :class="isSelf(msg) ? 'bg-blue-500 text-white' : 'bg-white text-neutral-900'"
      >
        {{ msg.textData || '' }}
      </div>

      <!-- Audio Message -->
      <WlAudioBubble
        v-else-if="isAudio(msg)"
        :duration="getAudioDuration(msg)"
        :is-self="isSelf(msg)"
        :playing="playingAudioId === msg.combo_id"
        @play="
          () => {
            handleAudioPlay(msg)
            $emit('audio-play', msg)
          }
        "
        @pause="
          () => {
            handleAudioPause()
            $emit('audio-pause', msg)
          }
        "
      />

      <!-- Image Message -->
      <div
        v-else-if="isImage(msg) && msg.fileInfo?.fileUrl"
        class="max-w-[70%] rounded-xl overflow-hidden"
        :class="isSelf(msg) ? 'bg-blue-500' : 'bg-white'"
      >
        <img
          :src="msg.fileInfo.fileThumbnail || msg.fileInfo.fileUrl"
          class="max-w-[200px] max-h-[200px] rounded-xl object-cover cursor-pointer"
          alt="image"
          @click="emit('image-click', msg.fileInfo.fileUrl)"
        />
      </div>

      <!-- Location Message -->
      <div
        v-else-if="isLocation(msg) && msg.location"
        class="max-w-[240px] rounded-xl overflow-hidden cursor-pointer"
        :class="isSelf(msg) ? 'bg-blue-500' : 'bg-white'"
        @click="
          () =>
            emit('location-click', {
              latitude: msg.location!.latitude,
              longitude: msg.location!.longitude,
            })
        "
      >
        <img
          v-if="msg.location.mapUrl"
          :src="msg.location.mapUrl"
          class="w-full h-[120px] object-cover"
          alt="location"
        />
        <div class="px-3 py-2">
          <div
            v-if="msg.location.name"
            class="text-sm font-medium truncate"
            :class="isSelf(msg) ? 'text-white' : 'text-neutral-900'"
          >
            {{ msg.location.name }}
          </div>
          <div
            v-if="msg.location.address"
            class="text-xs truncate"
            :class="isSelf(msg) ? 'text-blue-100' : 'text-neutral-500'"
          >
            {{ msg.location.address }}
          </div>
        </div>
      </div>

      <!-- File Message -->
      <div
        v-else-if="isFile(msg) && msg.fileInfo?.fileUrl"
        class="max-w-[70%] rounded-xl overflow-hidden cursor-pointer"
        :class="isSelf(msg) ? 'bg-blue-500' : 'bg-white'"
        @click="emit('file-click', msg.fileInfo.fileUrl)"
      >
        <div class="flex items-center gap-2.5 px-3 py-2.5">
          <img
            v-if="msg.fileInfo.fileThumbnail"
            :src="msg.fileInfo.fileThumbnail"
            class="size-10 object-contain shrink-0"
            alt=""
          />
          <div
            v-else
            class="size-10 shrink-0 rounded bg-neutral-100 flex items-center justify-center"
          >
            <span class="icon-[carbon--document] size-5 text-neutral-400" />
          </div>
          <div class="min-w-0 flex-1">
            <div
              class="text-sm font-medium truncate"
              :class="isSelf(msg) ? 'text-white' : 'text-neutral-900'"
            >
              {{ msg.fileInfo.fileName || '文件' }}
            </div>
            <div class="text-xs mt-0.5" :class="isSelf(msg) ? 'text-blue-200' : 'text-neutral-400'">
              {{ formatFileSize(msg.fileInfo.fileSize) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Unsupported Message Type -->
      <div
        v-else
        class="max-w-[70%] rounded-xl px-3 py-2 text-sm overflow-hidden break-all"
        :class="isSelf(msg) ? 'bg-blue-500 text-blue-200' : 'bg-white text-neutral-400'"
      >
        [不支持的消息类型] {{ msg }}
      </div>
    </div>
  </div>
</template>
