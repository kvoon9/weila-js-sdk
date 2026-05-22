<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  toRaw,
  watch,
  watchEffect,
} from 'vue'

import type {
  WeilaCore,
  WL_ExtEventCallback,
  WL_IDbLocationShared,
  WL_IDbMsgData,
  WL_IDbSession,
  WL_PttPlayInd,
} from '@weilasdk/core'
import {
  WL_ExtEventID,
  WL_IDbMsgDataType,
  WL_PttAudioPlaySource,
  WL_PttAudioPlayState,
  isIndividualSessionType,
} from '@weilasdk/core'
import SessionList from '../SessionList/SessionList.vue'
import WlMsgList from '../MsgList/WlMsgList.vue'
import WlImagePreview from '../ImagePreview/WlImagePreview.vue'
import WlVideoPreview from '../VideoPreview/WlVideoPreview.vue'
import WlChatComposer from './WlChatComposer.vue'
import { useMessageHistory } from '../../composables/useMessageHistory'
import { useSessions } from '../../composables/useSessions'
import { useWeilaUiI18n } from '../../i18n'

export interface WlChatPanelProps {
  core: WeilaCore | null
  currentUserId?: number
  selectedSessionId?: string
  selectedSessionType?: number
  messageListHeight?: string
}

const props = withDefaults(defineProps<WlChatPanelProps>(), {
  currentUserId: 0,
  selectedSessionId: '',
  selectedSessionType: undefined,
  messageListHeight: '400px',
})

const { t } = useWeilaUiI18n()

const emit = defineEmits<{
  'update:selectedSessionId': [sessionId: string]
  'update:selectedSessionType': [sessionType: number | undefined]
  'delete-session': [session: WL_IDbSession]
  'trigger-map-picker': []
}>()

const messageInput = ref('')
const pttStatus = ref<'idle' | 'recording' | 'processing'>('idle')
const playingAudioId = ref<string | null>(null)
const realtimePttMessage = ref<WL_IDbMsgData | null>(null)
const realtimePttPlaying = ref(false)
const previewImage = ref<string | null>(null)
const previewOpen = ref(false)
const previewVideo = ref<string | null>(null)
const previewVideoOpen = ref(false)
const wlMsgListRef = ref<InstanceType<typeof WlMsgList>>()
const deletingSessionKey = ref('')
const realtimePttMessageIds = new Set<string>()

function isRealtimePttMessage(msg: WL_IDbMsgData | undefined) {
  return Boolean(
    msg && (
      msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE
      || (msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE && msg.pttData)
      || realtimePttMessageIds.has(msg.combo_id)
    ),
  )
}

const {
  sessions,
  loading: sessionsLoading,
  error: sessionsError,
  refresh: refreshSessions,
  refreshSilently: refreshSessionsSilently,
} = useSessions(() => props.core)

const selectedSession = computed(() => {
  if (!props.selectedSessionId) return null
  return sessions.value.find((s) => {
    if (s.sessionId !== props.selectedSessionId) return false
    return props.selectedSessionType === undefined || s.sessionType === props.selectedSessionType
  }) ?? null
})

const realtimePttTitle = computed(() => {
  const msg = realtimePttMessage.value
  const realtimeSession = msg
    ? sessions.value.find((s) => s.sessionId === msg.sessionId && s.sessionType === msg.sessionType)
    : null

  return realtimeSession?.sessionName
    || selectedSession.value?.sessionName
    || realtimePttMessage.value?.sessionId
    || t('session.unknown')
})

const messageSenderInfos = computed(() => {
  const merged = new Map(senderInfos.value)
  const selected = selectedSession.value
  const loginUser = props.core?.getLoginUserInfo?.()

  if (loginUser?.userId && !merged.has(loginUser.userId)) {
    merged.set(loginUser.userId, loginUser)
  }

  if (!selected) {
    return merged
  }

  if (isIndividualSessionType(selected.sessionType)) {
    const sessionUserId = Number(selected.sessionId)
    if (!Number.isFinite(sessionUserId) || merged.has(sessionUserId)) {
      return merged
    }

    merged.set(sessionUserId, {
      userId: sessionUserId,
      weilaNum: selected.sessionId,
      sex: 0,
      nick: selected.sessionName || selected.sessionId,
      pinyinName: '',
      avatar: selected.sessionAvatar || '',
      status: 0,
      userType: 0,
      created: 0,
    })
  }

  return merged
})

watch(selectedSession, () => {
  wlMsgListRef.value?.resetScrollState()
})

const {
  messages,
  senderInfos,
  hasMore,
  loading: messagesLoading,
  loadMore,
} = useMessageHistory(
  () => props.core,
  () => selectedSession.value ?? undefined,
  {
    shouldAppendMessage: (msg) => !isRealtimePttMessage(msg),
  },
)

watchEffect(() => {
  console.log('messages.value', messages.value)
})

async function finishRealtimePttPlayback() {
  const completedMessageId = realtimePttMessage.value?.combo_id
  realtimePttPlaying.value = false

  if (realtimePttMessage.value) {
    await loadMore(0)
    await refreshSessionsSilently()
  }

  if (completedMessageId) {
    realtimePttMessageIds.delete(completedMessageId)
  }
  if (!completedMessageId || realtimePttMessage.value?.combo_id === completedMessageId) {
    realtimePttMessage.value = null
  }
}

const handleAudioPlayInd = (event: WL_PttPlayInd) => {
  const { indData, msgData } = event

  if (indData.source === WL_PttAudioPlaySource.PTT_AUDIO_SRC_STREAM && msgData) {
    realtimePttMessage.value = msgData
    realtimePttMessageIds.add(msgData.combo_id)
    realtimePttPlaying.value = indData.state !== WL_PttAudioPlayState.PTT_AUDIO_PLAYING_END
  }

  if (indData.state === WL_PttAudioPlayState.PTT_AUDIO_PLAYING_END) {
    playingAudioId.value = null
    void finishRealtimePttPlayback()
  }
}

watch(
  () => props.core,
  (core, _oldCore, onCleanup) => {
    if (!core) return
    const handlePttPlayEvent: WL_ExtEventCallback = (eventId, eventData) => {
      if (eventId === WL_ExtEventID.WL_EXT_PTT_PLAY_IND) {
        handleAudioPlayInd(eventData as WL_PttPlayInd)
      }
    }

    core.weila_onEvent(handlePttPlayEvent)
    onCleanup(() => {
      core.weila_offEvent(handlePttPlayEvent)
    })
  },
  { immediate: true },
)

watch(
  [() => props.core, () => selectedSession.value?.sessionId, () => selectedSession.value?.sessionType],
  ([core, sessionId, sessionType]) => {
    if (!core) return

    if (!sessionId || sessionType === undefined) {
      core.weila_clearActiveSession()
      return
    }

    core.weila_setActiveSession(sessionId, sessionType).catch(console.error)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  props.core?.weila_clearActiveSession()
})

async function handleAudioPlay(msg: WL_IDbMsgData) {
  try {
    const audioMsg = toRaw(msg)
    await props.core?.weila_stopSingle()
    await props.core?.weila_playSingle(audioMsg)
    if (audioMsg.audioData) {
      msg.audioData = { ...audioMsg.audioData }
    }
    playingAudioId.value = msg.combo_id
  } catch (err) {
    console.error('[WlChatPanel] Failed to play audio:', err)
  }
}

function handleAudioPause() {
  playingAudioId.value = null
  props.core?.weila_stopSingle()
}

function openUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
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
  window.open(
    `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
    '_blank',
    'noopener,noreferrer',
  )
}

async function deleteSession(session: WL_IDbSession): Promise<boolean> {
  if (!props.core || deletingSessionKey.value) return false
  const deletingSessionId = session.sessionId
  const deletingSessionType = session.sessionType

  deletingSessionKey.value = `${session.sessionId}-${session.sessionType}`

  try {
    await props.core.weila_deleteSession(deletingSessionId, deletingSessionType)

    if (
      selectedSession.value?.sessionId === deletingSessionId
      && selectedSession.value?.sessionType === deletingSessionType
    ) {
      emit('update:selectedSessionId', '')
      emit('update:selectedSessionType', undefined)
    }

    await refreshSessions()
    return true
  } catch (err) {
    console.error('[WlChatPanel] Failed to delete session:', err)
    return false
  } finally {
    deletingSessionKey.value = ''
  }
}

function handleSelectSession(session: WL_IDbSession) {
  emit('update:selectedSessionId', session.sessionId)
  emit('update:selectedSessionType', session.sessionType)
}

function handleDeleteSession(session: WL_IDbSession) {
  emit('delete-session', session)
}

defineExpose({
  deleteSession,
  sendLocation,
})

function normalizeLocation(location: WL_IDbLocationShared): WL_IDbLocationShared {
  const mapUrl = location.mapUrl?.trim()
  const hasImageMapUrl = !!mapUrl && (
    /\.(?:apng|avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(mapUrl)
    || /^https:\/\/restapi\.amap\.com\/v3\/staticmap(?:\?|$)/i.test(mapUrl)
    || /^https:\/\/maps\.googleapis\.com\/maps\/api\/staticmap(?:\?|$)/i.test(mapUrl)
  )

  return {
    ...location,
    locationType: location.locationType || 'gcj02',
    name: location.name || location.title || '',
    address: location.address || '',
    mapUrl: hasImageMapUrl ? mapUrl : '',
  }
}

async function sendMessage() {
  if (!props.core || !selectedSession.value || !messageInput.value.trim()) return

  const text = messageInput.value.trim()
  messageInput.value = ''

  try {
    await props.core.weila_sendTextMsg(
      selectedSession.value.sessionId,
      selectedSession.value.sessionType,
      text,
    )
    nextTick(() => wlMsgListRef.value?.scrollToBottom())
  } catch (err) {
    console.error('[WlChatPanel] Failed to send message:', err)
  }
}

async function sendLocation(location: WL_IDbLocationShared): Promise<boolean> {
  if (!props.core || !selectedSession.value) return false
  const normalizedLocation = normalizeLocation(location)

  try {
    const result = await props.core.weila_sendPosition(
      selectedSession.value.sessionId,
      selectedSession.value.sessionType,
      normalizedLocation,
    )
    nextTick(() => wlMsgListRef.value?.scrollToBottom())
    return result
  } catch (err) {
    console.error('[WlChatPanel] Failed to send location:', err)
    return false
  }
}

function triggerMapPicker() {
  if (!selectedSession.value) return
  emit('trigger-map-picker')
}

function handleEmojiSelect(emoji: string) {
  messageInput.value += emoji
}

async function handleImageSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !selectedSession.value) return

  try {
    await props.core?.weila_sendImage(
      selectedSession.value.sessionId,
      selectedSession.value.sessionType,
      file.name,
      file,
    )
    nextTick(() => wlMsgListRef.value?.scrollToBottom())
  } catch (err) {
    console.error('[WlChatPanel] Failed to send image:', err)
  }
}

async function handleFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !selectedSession.value) return

  try {
    await props.core?.weila_sendFile(
      selectedSession.value.sessionId,
      selectedSession.value.sessionType,
      file.name,
      file,
    )
    nextTick(() => wlMsgListRef.value?.scrollToBottom())
  } catch (err) {
    console.error('[WlChatPanel] Failed to send file:', err)
  }
}

async function handleVideoSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !selectedSession.value) return

  try {
    await props.core?.weila_sendVideo(
      selectedSession.value.sessionId,
      selectedSession.value.sessionType,
      file.name,
      file,
    )
    nextTick(() => wlMsgListRef.value?.scrollToBottom())
  } catch (err) {
    console.error('[WlChatPanel] Failed to send video:', err)
  }
}

async function handlePttStart() {
  if (!props.core || !selectedSession.value) {
    console.warn('[WlChatPanel] No session selected')
    return
  }

  pttStatus.value = 'processing'

  try {
    const success = await props.core.weila_requestTalk(
      selectedSession.value.sessionId,
      selectedSession.value.sessionType,
    )

    pttStatus.value = success ? 'recording' : 'idle'
  } catch (err) {
    pttStatus.value = 'idle'
    console.error('[WlChatPanel] Failed to start PTT:', err)
  }
}

async function handlePttStop() {
  if (!props.core || pttStatus.value !== 'recording') return

  pttStatus.value = 'processing'

  try {
    await props.core.weila_releaseTalk()
  } catch (err) {
    console.error('[WlChatPanel] Failed to stop PTT:', err)
  } finally {
    pttStatus.value = 'idle'
  }
}
</script>

<template>
  <div class="wl-chat-panel flex flex-1 h-full overflow-hidden">
    <div class="w-80 border-r border-neutral-200 overflow-hidden flex flex-col bg-white">
      <SessionList v-if="core" :sessions="sessions" :active-session-id="selectedSessionId"
        :active-session-type="selectedSessionType" :loading="sessionsLoading" :error="sessionsError"
        :deleting-session-key="deletingSessionKey" @select="handleSelectSession" @delete="handleDeleteSession"
        @refresh="refreshSessions" />
      <div v-else class="flex items-center justify-center h-full text-neutral-500">{{ t('chat.loadingSdk') }}</div>
    </div>

    <div class="flex-1 p-4 overflow-y-auto">
      <div v-if="selectedSession">
        <h2 class="text-lg font-semibold mb-4">
          {{ selectedSession.sessionName || selectedSession.sessionId }}
        </h2>

        <div class="relative">
          <div v-if="realtimePttMessage"
            class="absolute left-3 right-3 top-3 z-10 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/95 px-3 py-2 text-blue-700 shadow-sm backdrop-blur">
            <span class="icon-[carbon--volume-up-filled] size-5 shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ realtimePttTitle }}</p>
              <p class="text-xs text-blue-600">
                {{ realtimePttPlaying ? t('chat.realtimePttPlaying') : t('chat.realtimePttFinishing') }}
              </p>
            </div>
            <div class="flex h-6 items-center gap-1">
              <span v-for="index in 5" :key="index"
                class="wl-realtime-ptt-bar h-2.5 w-1 rounded-full bg-blue-500"
                :class="{ 'wl-realtime-ptt-bar-paused': !realtimePttPlaying }"
                :style="{ animationDelay: `${index * 90}ms` }" />
            </div>
          </div>

          <WlMsgList ref="wlMsgListRef" :style="{ height: messageListHeight }" class="bg-neutral-100"
            :messages="messages" :current-user-id="currentUserId" :sender-infos="messageSenderInfos" :has-more="hasMore"
            :loading="messagesLoading" :playing-audio-id="playingAudioId" @audio-play="handleAudioPlay"
            @audio-pause="handleAudioPause" @load-more="loadMore()" @image-click="handleImageClick"
            @file-click="openUrl" @video-click="handleVideoClick" @location-click="openLocation" />
        </div>

        <WlChatComposer v-model="messageInput" :ptt-status="pttStatus" :disabled="!selectedSession"
          @send="sendMessage" @emoji-select="handleEmojiSelect" @image-selected="handleImageSelected"
          @file-selected="handleFileSelected" @video-selected="handleVideoSelected"
          @trigger-map-picker="triggerMapPicker" @ptt-start="handlePttStart" @ptt-stop="handlePttStop" />
      </div>
      <div v-else class="flex items-center justify-center h-full text-neutral-400">
        <p>{{ t('chat.selectSession') }}</p>
      </div>
    </div>

    <WlImagePreview v-if="previewImage" v-model:open="previewOpen" :src="previewImage" />
    <WlVideoPreview v-if="previewVideo" v-model:open="previewVideoOpen" :src="previewVideo" />
  </div>
</template>

<style scoped>
.wl-realtime-ptt-bar {
  animation: wl-realtime-ptt-wave 0.9s ease-in-out infinite;
}

.wl-realtime-ptt-bar-paused {
  animation-play-state: paused;
  opacity: 0.45;
}

@keyframes wl-realtime-ptt-wave {
  0%,
  100% {
    transform: scaleY(0.45);
  }

  50% {
    transform: scaleY(1.8);
  }
}
</style>
