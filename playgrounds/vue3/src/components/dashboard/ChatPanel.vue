<script setup lang="ts">
import { ref, computed, watch, triggerRef, toRaw, nextTick, useTemplateRef } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { Dropdown } from 'floating-vue'

import {
  SessionList,
  WlMsgList,
  WlPttButton,
  WLEmojiPicker,
  WlImagePreview,
  WlVideoPreview,
} from '@weilasdk/ui'
import type { WL_IDbMsgData, WL_IDbSession } from '@weilasdk/core'
import { WL_ExtEventID, WL_PttAudioPlayState } from '@weilasdk/core'
import type { WL_ExtEventCallback, WL_PttPlayInd } from '@weilasdk/core'
import { useWeilaStore } from '../../stores/weila'
import { useSessions } from '../../queries/sessions'
import { useMessageHistory } from '../../composables/useMessageHistory'
import { storeToRefs } from 'pinia'

const weila = useWeilaStore()
const { core: weilaCore, userInfo } = storeToRefs(weila)
const { data: sessions, refetch: refetchSessions } = useSessions()

const selectedSessionId = useRouteQuery<string>('sessionId')

const messageInput = ref('')
const pttStatus = ref<'idle' | 'recording' | 'processing'>('idle')
const playingAudioId = ref<string | null>(null)
const imageInputRef = useTemplateRef<HTMLInputElement>('imageInput')
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInput')
const videoInputRef = useTemplateRef<HTMLInputElement>('videoInput')
const previewImage = ref<string | null>(null)
const previewOpen = ref(false)
const previewVideo = ref<string | null>(null)
const previewVideoOpen = ref(false)

// ---- 音频播放控制 ----
async function handleAudioPlay(msg: WL_IDbMsgData) {
  console.log('[Audio] Playing:', msg.combo_id)

  try {
    // 先停止当前正在播放的语音，等待完全停止后再播放新的
    console.log('[Audio] Stopping current playback...')
    await weilaCore.value?.weila_stopSingle()

    // 将 Vue 响应式对象转换为普通对象，否则无法存入 IndexedDB
    const plainMsg = toRaw(msg)
    console.log('[Audio] Calling playSingle...')
    await weilaCore.value?.weila_playSingle(plainMsg)
    console.log('[Audio] playSingle completed')
    // 只有在音频真正开始播放后才设置 playingAudioId
    playingAudioId.value = msg.combo_id
  } catch (err) {
    console.error('[Audio] Play failed:', err)
  }
}

function handleAudioPause() {
  console.log('[Audio] Paused')
  playingAudioId.value = null
  weilaCore.value?.weila_stopSingle()
}

const selectedSession = computed(() => {
  if (!selectedSessionId.value) return null
  return sessions.value?.find((s) => s.sessionId === selectedSessionId.value) ?? null
})

const wlMsgListRef = ref<InstanceType<typeof WlMsgList>>()

// 切换 session 时重置滚动状态
watch(selectedSession, () => {
  wlMsgListRef.value?.resetScrollState()
})

const { messages, senderInfos, hasMore, loading, ensureSenderInfo, loadMore } = useMessageHistory(
  weilaCore,
  selectedSession,
)

// ---- 消息事件监听 ----
const handleMessageEvent: WL_ExtEventCallback = (eventId, eventData) => {
  if (
    eventId !== WL_ExtEventID.WL_EXT_NEW_MSG_RECV_IND &&
    eventId !== WL_ExtEventID.WL_EXT_MSG_SEND_IND
  )
    return

  const msgData = eventData as WL_IDbMsgData
  const session = selectedSession.value
  if (
    !session ||
    msgData.sessionId !== session.sessionId ||
    msgData.sessionType !== session.sessionType
  )
    return

  // 同一个 combo_id 的后续 PTT chunks 应该更新现有消息（frameCount 等）
  const existingIdx = messages.value.findIndex((m) => m.combo_id === msgData.combo_id)
  if (existingIdx !== -1) {
    const existing = messages.value[existingIdx]
    if (msgData.pttData) {
      existing.pttData = { ...existing.pttData, ...msgData.pttData }
    }
    if (msgData.audioData) {
      existing.audioData = { ...existing.audioData, ...msgData.audioData }
    }
    messages.value[existingIdx] = { ...existing }
  } else {
    messages.value = [...messages.value, msgData]
  }
  void ensureSenderInfo(msgData.senderId)

  // Auto-mark as read to prevent unread count increment
  if (eventId === WL_ExtEventID.WL_EXT_NEW_MSG_RECV_IND) {
    weilaCore.value?.weila_setSessionMsgRead(
      msgData.sessionId,
      msgData.sessionType,
      msgData.msgId,
    ).catch(console.error)
  }
}

// ---- 音频播放结束监听 ----
const handleAudioPlayEnd = (indData: { state: WL_PttAudioPlayState }) => {
  if (indData.state === WL_PttAudioPlayState.PTT_AUDIO_PLAYING_END) {
    playingAudioId.value = null
  }
}

// 注册全局事件监听（消息追加 + 音频播放结束）
watch(
  weilaCore,
  (core, _oldCore) => {
    if (!core) return
    core.weila_onEvent(handleMessageEvent)
    core.weila_onEvent((eventId, eventData) => {
      if (eventId === WL_ExtEventID.WL_EXT_PTT_PLAY_IND) {
        handleAudioPlayEnd((eventData as WL_PttPlayInd).indData)
      }
    })
    // weila_onEvent 是 additive 的，目前 SDK 没有 offEvent API
    // 所以这里不需要手动 cleanup（组件销毁后 handler 引用的 ref 不再被 UI 消费）
  },
  { immediate: true },
)

function openUrl(url: string) {
  window.open(url)
}

function handleImageClick(url: string) {
  previewImage.value = url
  previewOpen.value = true
}

function handleVideoClick(url: string) {
  previewVideo.value = url
  previewVideoOpen.value = true
}

function openLocation(location: { latitude: number; longitude: number }) {
  window.open(`https://maps.google.com/?q=${location.latitude},${location.longitude}`)
}

async function handleSelectSession(session: WL_IDbSession) {
  console.log('session', session)
  selectedSessionId.value = session.sessionId
  triggerRef(selectedSessionId)

  // 借助用户点击会话的手势提前解锁音频系统，避免实时语音首播时再被浏览器拦截。
  await weilaCore.value?.weila_audioInit().catch((err) => {
    console.warn('[Audio] Init on session select failed:', err)
  })

  // Mark session as read to clear unread count
  if (weilaCore.value && session.lastMsgId > 0) {
    await weilaCore.value.weila_setSessionMsgRead(
      session.sessionId,
      session.sessionType,
      session.lastMsgId,
    )
    // Refetch sessions to update unread count in UI
    await refetchSessions()
  }
}

async function sendMessage() {
  if (!weilaCore.value || !selectedSession.value || !messageInput.value.trim()) return

  const text = messageInput.value.trim()
  messageInput.value = ''

  try {
    await weilaCore.value.weila_sendTextMsg(
      selectedSession.value.sessionId,
      selectedSession.value.sessionType,
      text,
    )
    nextTick(() => wlMsgListRef.value?.scrollToBottom())
  } catch (err) {
    console.error('[Playground] Failed to send message:', err)
  }
}

function triggerImagePicker() {
  imageInputRef.value?.click()
}

function triggerFilePicker() {
  fileInputRef.value?.click()
}

function triggerVideoPicker() {
  videoInputRef.value?.click()
}

function handleEmojiSelect(emoji: string) {
  messageInput.value += emoji
}

async function handleImageSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !selectedSession.value) return
  try {
    await weilaCore.value?.weila_sendImage(
      selectedSession.value.sessionId,
      selectedSession.value.sessionType,
      file.name,
      file,
    )
    nextTick(() => wlMsgListRef.value?.scrollToBottom())
  } catch (err) {
    console.error('[Playground] Failed to send image:', err)
  }
}

async function handleFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !selectedSession.value) return
  try {
    console.log('file', file)
    await weilaCore.value?.weila_sendFile(
      selectedSession.value.sessionId,
      selectedSession.value.sessionType,
      file.name,
      file,
    )
    nextTick(() => wlMsgListRef.value?.scrollToBottom())
  } catch (err) {
    console.error('[Playground] Failed to send file:', err)
  }
}

async function handleVideoSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !selectedSession.value) return
  try {
    console.log('video', file)
    await weilaCore.value?.weila_sendVideo(
      selectedSession.value.sessionId,
      selectedSession.value.sessionType,
      file.name,
      file,
    )
    nextTick(() => wlMsgListRef.value?.scrollToBottom())
  } catch (err) {
    console.error('[Playground] Failed to send video:', err)
  }
}

// ---- PTT 对讲控制 ----
async function handlePttStart() {
  if (!weilaCore.value || !selectedSession.value) {
    console.warn('[PTT] No session selected')
    return
  }

  pttStatus.value = 'processing'

  try {
    // 申请话权（SDK 内部会自动确保音频系统已初始化）
    const success = await weilaCore.value.weila_requestTalk(
      selectedSession.value.sessionId,
      selectedSession.value.sessionType,
    )

    if (success) {
      pttStatus.value = 'recording'
      console.log('[PTT] Recording started')
    } else {
      pttStatus.value = 'idle'
      console.warn('[PTT] Failed to start recording')
    }
  } catch (err) {
    pttStatus.value = 'idle'
    console.error('[PTT] Error:', err)
  }
}

async function handlePttStop() {
  if (!weilaCore.value || pttStatus.value !== 'recording') return

  pttStatus.value = 'processing'

  try {
    await weilaCore.value.weila_releaseTalk()
    console.log('[PTT] Recording stopped, data sent')
  } catch (err) {
    console.error('[PTT] Error stopping:', err)
  } finally {
    pttStatus.value = 'idle'
  }
}
</script>

<template>
  <div class="flex flex-1 h-full overflow-hidden">
    <!-- Session List Sidebar -->
    <div class="w-80 border-r border-neutral-200 overflow-hidden flex flex-col bg-white">
      <SessionList v-if="weilaCore" :sessions="sessions ?? []" :active-session-id="selectedSessionId"
        @select="handleSelectSession" @refresh="refetchSessions" />
      <div v-else class="flex items-center justify-center h-full text-neutral-500">Loading SDK...</div>
    </div>

    <!-- Chat Content -->
    <div class="flex-1 p-4 overflow-y-auto">
      <div v-if="selectedSession">
        <h2 class="text-lg font-semibold mb-4">
          Session: {{ selectedSession.sessionName || selectedSession.sessionId }}
        </h2>

        <div class="relative">
          <WlMsgList ref="wlMsgListRef" style="height: 400px" class="bg-neutral-100" :messages="messages"
            :current-user-id="userInfo?.userId ?? 0" :sender-infos="senderInfos" :has-more="hasMore"
            :loading="loading" :playing-audio-id="playingAudioId" @audio-play="handleAudioPlay"
            @audio-pause="handleAudioPause" @load-more="loadMore(messages[0]?.msgId - 1)"
            @image-click="handleImageClick" @file-click="openUrl" @video-click="handleVideoClick"
            @location-click="openLocation" />
        </div>

        <!-- Message Input -->
        <div class="mt-4 flex gap-2 items-center">
          <!-- Media Dropdown -->
          <Dropdown class="media-dropdown" :distance="8" placement="top-start">
            <button class="p-2 rounded-lg hover:bg-neutral-100">
              <span class="icon-[carbon--add] text-xl"></span>
            </button>
            <template #popper="{ hide }">
              <div class="py-1 min-w-36">
                <button @click="triggerImagePicker(); hide()"
                  class="w-full px-4 py-2 text-left hover:bg-neutral-50 flex items-center gap-2">
                  <span class="icon-[carbon--image]"></span> Send Image
                </button>
                <button @click="triggerFilePicker(); hide()"
                  class="w-full px-4 py-2 text-left hover:bg-neutral-50 flex items-center gap-2">
                  <span class="icon-[carbon--document]"></span> Send File
                </button>
                <button @click="triggerVideoPicker(); hide()"
                  class="w-full px-4 py-2 text-left hover:bg-neutral-50 flex items-center gap-2">
                  <span class="icon-[carbon--video]"></span> Send Video
                </button>
              </div>
            </template>
          </Dropdown>
          <!-- Emoji Picker -->
          <WLEmojiPicker @select="handleEmojiSelect" />
          <input v-model="messageInput" type="text" placeholder="Type a message..."
            class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="sendMessage" />
          <button @click="sendMessage"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none">
            Send
          </button>
          <!-- PTT Button -->
          <WlPttButton v-if="selectedSession" :status="pttStatus" size="md" :disabled="!selectedSession"
            @start="handlePttStart" @stop="handlePttStop" />
          <!-- Hidden file inputs -->
          <input ref="imageInput" type="file" accept="image/*" class="hidden" @change="handleImageSelected" />
          <input ref="fileInput" type="file" class="hidden" @change="handleFileSelected" />
          <input ref="videoInput" type="file" accept="video/*" class="hidden" @change="handleVideoSelected" />
        </div>
      </div>
      <div v-else class="flex items-center justify-center h-full text-neutral-400">
        <p>Select a session to start chatting</p>
      </div>
    </div>
    <WlImagePreview v-if="previewImage" v-model:open="previewOpen" :src="previewImage" />
    <WlVideoPreview v-if="previewVideo" v-model:open="previewVideoOpen" :src="previewVideo" />
  </div>
</template>

<style>
/* Hide arrows for dropdowns */
.media-dropdown .v-popper__arrow-inner,
.media-dropdown .v-popper__arrow-outer {
  display: none;
}
</style>
