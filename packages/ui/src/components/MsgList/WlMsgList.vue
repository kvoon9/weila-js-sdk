<script setup lang="ts">
import { ref, useTemplateRef, watch, nextTick } from 'vue'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@vois/weila-sdk-core'
import { WL_IDbMsgDataStatus, WL_IDbMsgDataType } from '@vois/weila-sdk-core'
import WlAudioBubble from '../Message/WlAudioBubble.vue'
import WlTextBubble from '../Message/WlTextBubble.vue'
import WlImageBubble from '../Message/WlImageBubble.vue'
import WlVideoBubble from '../Message/WlVideoBubble.vue'
import WlLocationBubble from '../Message/WlLocationBubble.vue'
import WlFileBubble from '../Message/WlFileBubble.vue'
import WlUnknownBubble from '../Message/WlUnknownBubble.vue'
import WlAvatar from '../Avatar/WlAvatar.vue'
import { useWeilaUiI18n } from '../../i18n'
import { formatMsgTime } from '../../utils'

const showScrollButton = ref(false)
const hasLoadedMessages = ref(false)
const { t } = useWeilaUiI18n()

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
  /** 置顶警告文案 */
  warning?: string
  /** 是否显示转发按钮 */
  showForward?: boolean
  /** 自定义是否允许转发的判断 */
  canForward?: (msg: WL_IDbMsgData) => boolean
  /** 是否显示撤回按钮（仅自己发送的消息） */
  showWithdraw?: boolean
  /** 自定义是否允许撤回的判断 */
  canWithdraw?: (msg: WL_IDbMsgData) => boolean
}

const props = withDefaults(defineProps<WlMsgListProps>(), {
  senderInfos: () => new Map(),
  hasMore: false,
  loading: false,
  playingAudioId: null,
  warning: '',
  showForward: false,
  canForward: undefined,
  showWithdraw: false,
  canWithdraw: undefined,
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
  'location-click': [location: { latitude: number; longitude: number; name: string; address: string }]
  /** 转发消息 */
  'forward': [msg: WL_IDbMsgData]
  /** 撤回消息 */
  'withdraw': [msg: WL_IDbMsgData]
}>()

/** 列表容器 ref */
const listRef = useTemplateRef<HTMLElement>('listRef')

function getSender(msg: WL_IDbMsgData) {
  return props.senderInfos.get(msg.senderId)
}

function getSenderName(msg: WL_IDbMsgData) {
  const sender = getSender(msg)
  return sender?.nick || sender?.weilaNum || String(msg.senderId)
}

function getSenderAvatar(msg: WL_IDbMsgData) {
  return getSender(msg)?.avatar || ''
}

function getSenderLabel(msg: WL_IDbMsgData) {
  const sender = getSender(msg)
  const name = getSenderName(msg)
  const senderId = String(msg.senderId)
  const weilaNum = sender?.weilaNum && sender.weilaNum !== senderId ? sender.weilaNum : ''

  return weilaNum ? `${name} (${weilaNum})` : name
}

function isSelf(msg: WL_IDbMsgData) {
  return msg.senderId === props.currentUserId
}

function getMsgTime(msg: WL_IDbMsgData) {
  return formatMsgTime(msg.created, t)
}

function getStatusIcon(msg: WL_IDbMsgData) {
  if (!isSelf(msg)) return null
  const status = msg.status
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENDING) return 'sending'
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT) return 'unsent'
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR) return 'error'
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ) return 'read'
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT || status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW) return 'sent'
  return null
}

const isText = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE
const isAudio = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
const isImage = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE
const isLocation = (msg: WL_IDbMsgData) =>
  msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE
const isFile = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE
const isVideo = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE

const isSupportedForwardType = (msg: WL_IDbMsgData) =>
  isText(msg) || isAudio(msg) || isImage(msg) || isVideo(msg) || isLocation(msg) || isFile(msg)

const isSupportedCopyType = (msg: WL_IDbMsgData) => isText(msg)

const isWithdrawMsg = (msg: WL_IDbMsgData) =>
  msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE
  || msg.status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_WITHDRAW

function canShowForward(msg: WL_IDbMsgData) {
  if (!props.showForward) return false
  if (!isSupportedForwardType(msg) || isWithdrawMsg(msg)) return false
  if (props.canForward) return props.canForward(msg)
  return true
}

function canShowCopy(msg: WL_IDbMsgData) {
  return isSupportedCopyType(msg) && !!msg.textData && !isWithdrawMsg(msg)
}

function canShowWithdraw(msg: WL_IDbMsgData) {
  if (!props.showWithdraw || !isSelf(msg)) return false
  if (isWithdrawMsg(msg)) return false
  if (props.canWithdraw) return props.canWithdraw(msg)
  return true
}

const copiedMsgIds = ref<Set<string>>(new Set())

const COPY_FEEDBACK_DURATION = 1500

async function handleCopyText(msg: WL_IDbMsgData) {
  if (!msg.textData || copiedMsgIds.value.has(msg.combo_id))
    return

  try {
    await navigator.clipboard.writeText(msg.textData)
    copiedMsgIds.value.add(msg.combo_id)
    setTimeout(() => {
      copiedMsgIds.value.delete(msg.combo_id)
    }, COPY_FEEDBACK_DURATION)
  }
  catch (err) {
    console.error('[WlMsgList] Failed to copy text:', err)
  }
}

function isCopied(msg: WL_IDbMsgData) {
  return copiedMsgIds.value.has(msg.combo_id)
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

function handleLocationClick(location: { latitude: number; longitude: number; name: string; address: string }) {
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
    <div
      v-if="warning"
      class="sticky top-0 z-10 mb-2 w-full flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-orange-700 shadow-sm"
    >
      <span class="icon-[carbon--warning-filled] size-5 shrink-0" />
      <span class="text-sm">{{ warning }}</span>
    </div>

    <!-- Load more banner -->
    <div v-if="hasMore || loading" class="flex justify-center py-2 cursor-pointer" @click="emit('load-more')">
      <span v-if="loading" class="icon-[carbon--rotate] size-5 text-neutral-400 animate-spin [animation-direction:reverse]" />
      <span v-else class="text-sm text-blue-500 hover:text-blue-600">{{ t('message.loadMore') }}</span>
    </div>

    <div v-for="msg in messages" :key="msg.combo_id" class="group flex items-start gap-2 py-3"
      :class="isSelf(msg) ? 'justify-end' : 'justify-start'">
      <WlAvatar v-if="!isSelf(msg)" :src="getSenderAvatar(msg)" :name="getSenderName(msg)" />

      <div class="flex items-start gap-1 min-w-0" :class="isSelf(msg) ? 'flex-row-reverse' : 'flex-row'">
        <!-- bubble column + actions -->
        <div class="min-w-0 flex flex-col gap-1" :class="isSelf(msg) ? 'items-end' : 'items-start'">
          <div
            class="max-w-full truncate text-xs text-neutral-500 px-1 flex items-center gap-2"
            :class="isSelf(msg) ? 'justify-end' : 'justify-start'"
          >
            <span v-if="!isSelf(msg)" class="truncate">{{ getSenderLabel(msg) }}</span>
            <span class="shrink-0 text-neutral-400">{{ getMsgTime(msg) }}</span>
            <span v-if="getStatusIcon(msg) === 'sending'" class="icon-[carbon--rotate] size-3 shrink-0 animate-spin [animation-direction:reverse] text-neutral-400" />
            <span v-else-if="getStatusIcon(msg) === 'unsent' || getStatusIcon(msg) === 'error'" class="icon-[carbon--warning] size-3 shrink-0 text-orange-400" />
            <span v-else-if="getStatusIcon(msg) === 'read'" class="icon-[carbon--checkmark] size-3 shrink-0 text-green-500" />
            <span v-else-if="getStatusIcon(msg) === 'sent'" class="icon-[carbon--checkmark] size-3 shrink-0 text-neutral-400" />
          </div>

          <!-- Withdrawn Message -->
          <div
            v-if="isWithdrawMsg(msg)"
            class="max-w-[70%] rounded-xl px-3 py-2 text-sm overflow-hidden break-all italic"
            :class="isSelf(msg) ? 'bg-blue-500 text-blue-100' : 'bg-white text-neutral-400'"
          >
            <div>{{ isSelf(msg) ? t('message.withdrawnByMe') : t('message.withdrawnByOther') }}</div>
          </div>

          <!-- Text Message -->
          <WlTextBubble v-else-if="isText(msg)" :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)" />

          <!-- Audio Message -->
          <WlAudioBubble v-else-if="isAudio(msg)" :msg="msg" :is-self="isSelf(msg)"
            :playing="playingAudioId === msg.combo_id" @play="emit('audio-play', msg)" @pause="emit('audio-pause', msg)" />

          <!-- Image Message -->
          <WlImageBubble v-else-if="isImage(msg)" :msg="msg" :is-self="isSelf(msg)"
            :sender="getSender(msg)" @click="handleImageClick" />

          <!-- Location Message -->
          <WlLocationBubble v-else-if="isLocation(msg) && msg.location" :msg="msg" :is-self="isSelf(msg)"
            :sender="getSender(msg)" @click="handleLocationClick" />

          <!-- File Message -->
          <WlFileBubble v-else-if="isFile(msg)" :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)"
            @click="handleFileClick" />

          <!-- Video Message -->
          <WlVideoBubble v-else-if="isVideo(msg)" :msg="msg" :is-self="isSelf(msg)"
            :sender="getSender(msg)" @click="handleVideoClick" />

          <!-- Unsupported Message Type -->
          <WlUnknownBubble v-else :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)" />

          <div
            class="flex items-center gap-2"
            :class="isSelf(msg) ? 'flex-row-reverse' : 'flex-row'"
          >
            <button
              v-if="canShowWithdraw(msg)"
              type="button"
              class="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 transition-colors"
              :title="t('message.withdraw')"
              @click.stop="emit('withdraw', msg)"
            >
              <span class="icon-[carbon--undo] size-4" />
            </button>
            <button
              v-if="canShowForward(msg)"
              type="button"
              class="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 transition-colors"
              :title="t('message.forward')"
              @click.stop="emit('forward', msg)"
            >
              <span class="icon-[carbon--share] size-4" />
            </button>
            <button
              v-if="canShowCopy(msg)"
              type="button"
              class="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 transition-colors"
              :class="{ 'text-green-500': isCopied(msg) }"
              :title="t('message.copy')"
              @click.stop="handleCopyText(msg)"
            >
              <span :class="isCopied(msg) ? 'icon-[carbon--checkmark] size-4' : 'icon-[carbon--copy] size-4'" />
            </button>
          </div>
        </div>
      </div>

      <WlAvatar v-if="isSelf(msg)" :src="getSenderAvatar(msg)" :name="getSenderName(msg)" />
    </div>

    <button v-if="showScrollButton"
      class="absolute bottom-4 right-4 w-10 h-10 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600"
      @click="() => scrollToBottom()">
      ↓
    </button>
  </div>
</template>
