<script setup lang="ts">
import { ref, useTemplateRef, watch, nextTick } from 'vue'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataType } from '@weilasdk/core'
import WlAudioBubble from '../Message/WlAudioBubble.vue'
import WlTextBubble from '../Message/WlTextBubble.vue'
import WlImageBubble from '../Message/WlImageBubble.vue'
import WlVideoBubble from '../Message/WlVideoBubble.vue'
import WlLocationBubble from '../Message/WlLocationBubble.vue'
import WlFileBubble from '../Message/WlFileBubble.vue'
import WlUnknownBubble from '../Message/WlUnknownBubble.vue'
import { framesToDuration } from '../../composables/useAudio'

const showScrollButton = ref(false)
const hasLoadedMessages = ref(false)

export interface WlMsgListProps {
  /** 消息列表 */
  messages: WL_IDbMsgData[]
  /** 当前登录用户 ID，用于判断消息方向 */
  currentUserId: number
  /** 发送者信息 Map，key 为 userId */
  senderInfos?: Map<number, WL_IDbUserInfo>
  /** 是否有更多消息可加载 */
  hasMore?: boolean
  /** 加载状态 */
  loading?: boolean
  /** 当前正在播放的音频消息 combo_id */
  playingAudioId?: string | null
}

const props = withDefaults(defineProps<WlMsgListProps>(), {
  senderInfos: () => new Map(),
  hasMore: false,
  loading: false,
  playingAudioId: null,
})

const emit = defineEmits<{
  /** 播放音频消息 */
  'audio-play': [msg: WL_IDbMsgData]
  /** 暂停音频消息 */
  'audio-pause': [msg: WL_IDbMsgData]
  /** 加载更多消息 */
  'load-more': []
  /** 图片点击 */
  'image-click': [url: string]
  /** 文件点击 */
  'file-click': [url: string]
  /** 视频点击 */
  'video-click': [url: string]
  /** 位置点击 */
  'location-click': [location: { latitude: number; longitude: number }]
}>()

/** 列表容器 ref */
const listRef = useTemplateRef<HTMLElement>('listRef')

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
const isVideo = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE

function getAudioDuration(msg: WL_IDbMsgData): number {
  return framesToDuration(msg.audioData?.frameCount ?? 0)
}

defineExpose({
  scrollToBottom,
  resetScrollState: () => {
    hasLoadedMessages.value = false
  },
})

function handleImageClick(url: string) {
  emit('image-click', url)
}

function handleFileClick(url: string) {
  emit('file-click', url)
}

function handleVideoClick(url: string) {
  emit('video-click', url)
}

function handleLocationClick(location: { latitude: number; longitude: number }) {
  emit('location-click', location)
}

function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
  if (!listRef.value) return
  listRef.value.scrollTo({
    top: listRef.value.scrollHeight,
    behavior
  })
}

function onScroll() {
  if (!listRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = listRef.value
  // Show button when user has scrolled up (not at bottom)
  showScrollButton.value = scrollHeight - scrollTop - clientHeight > 100
}

// 首次加载完 messages 后滚动到底部
watch(
  () => props.messages.length,
  (newLen, oldLen) => {
    if (oldLen === 0 && newLen > 0 && !hasLoadedMessages.value) {
      hasLoadedMessages.value = true
      nextTick(() => scrollToBottom('instant'))
    }
  },
)</script>

<template>
  <div ref="listRef" class="flex flex-col h-full bg-neutral-100 overflow-y-auto px-4 py-3" @scroll="onScroll">
    <!-- Load more banner -->
    <div v-if="hasMore || loading" class="flex justify-center py-2 cursor-pointer" @click="emit('load-more')">
      <span v-if="loading" class="icon-[carbon--rotate] size-5 text-neutral-400 animate-spin" />
      <span v-else class="text-sm text-blue-500 hover:text-blue-600">加载更多</span>
    </div>

    <div v-for="msg in messages" :key="msg.combo_id" class="flex items-start gap-2 py-1.5"
      :class="isSelf(msg) ? 'flex-row-reverse' : ''">
      <!-- Avatar -->
      <div class="shrink-0 size-9 rounded-lg overflow-hidden bg-neutral-300 flex items-center justify-center">
        <img v-if="getSender(msg)?.avatar" :src="getSender(msg)!.avatar" class="size-full object-cover" alt="" />
        <span v-else class="icon-[carbon--user-avatar-filled] size-6 text-neutral-500" />
      </div>

      <!-- Text Message -->
      <WlTextBubble v-if="isText(msg)" :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)" />

      <!-- Audio Message -->
      <WlAudioBubble v-else-if="isAudio(msg)" :duration="getAudioDuration(msg)" :is-self="isSelf(msg)"
        :playing="playingAudioId === msg.combo_id" @play="emit('audio-play', msg)" @pause="emit('audio-pause', msg)" />

      <!-- Image Message -->
      <WlImageBubble v-else-if="isImage(msg) && msg.fileInfo?.fileUrl" :msg="msg" :is-self="isSelf(msg)"
        :sender="getSender(msg)" @click="handleImageClick" />

      <!-- Location Message -->
      <WlLocationBubble v-else-if="isLocation(msg) && msg.location" :msg="msg" :is-self="isSelf(msg)"
        :sender="getSender(msg)" @click="handleLocationClick" />

      <!-- File Message -->
      <WlFileBubble v-else-if="isFile(msg)" :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)"
        @click="handleFileClick" />

      <!-- Video Message -->
      <WlVideoBubble v-else-if="isVideo(msg) && msg.fileInfo?.fileUrl" :msg="msg" :is-self="isSelf(msg)"
        :sender="getSender(msg)" @click="handleVideoClick" />

      <!-- Unsupported Message Type -->
      <WlUnknownBubble v-else :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)" />
    </div>

    <button v-if="showScrollButton"
      class="absolute bottom-4 right-4 w-10 h-10 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600"
      @click="() => scrollToBottom()">
      ↓
    </button>
  </div>
</template>
