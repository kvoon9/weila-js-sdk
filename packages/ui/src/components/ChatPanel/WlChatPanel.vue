<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  toRaw,
  useTemplateRef,
  watch,
} from 'vue'
import { Dropdown } from 'floating-vue'

import type {
  WeilaCore,
  WL_ExtEventCallback,
  WL_IDbMsgData,
  WL_IDbSession,
  WL_PttPlayInd,
} from '@weilasdk/core'
import { WL_ExtEventID, WL_PttAudioPlayState } from '@weilasdk/core'
import SessionList from '../SessionList/SessionList.vue'
import WlMsgList from '../MsgList/WlMsgList.vue'
import WlPttButton from '../PttButton/WlPttButton.vue'
import WLEmojiPicker from '../Emoji/WLEmojiPicker.vue'
import WlImagePreview from '../ImagePreview/WlImagePreview.vue'
import WlVideoPreview from '../VideoPreview/WlVideoPreview.vue'
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
}>()

const {
  sessions,
  loading: sessionsLoading,
  error: sessionsError,
  refresh: refreshSessions,
} = useSessions(() => props.core)

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
const wlMsgListRef = ref<InstanceType<typeof WlMsgList>>()
const deletingSessionKey = ref('')

const selectedSession = computed(() => {
  if (!props.selectedSessionId) return null
  return sessions.value.find((s) => {
    if (s.sessionId !== props.selectedSessionId) return false
    return props.selectedSessionType === undefined || s.sessionType === props.selectedSessionType
  }) ?? null
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
)

const handleAudioPlayEnd = (indData: { state: WL_PttAudioPlayState }) => {
  if (indData.state === WL_PttAudioPlayState.PTT_AUDIO_PLAYING_END) {
    playingAudioId.value = null
  }
}

watch(
  () => props.core,
  (core, _oldCore, onCleanup) => {
    if (!core) return
    const handlePttPlayEvent: WL_ExtEventCallback = (eventId, eventData) => {
      if (eventId === WL_ExtEventID.WL_EXT_PTT_PLAY_IND) {
        handleAudioPlayEnd((eventData as WL_PttPlayInd).indData)
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
    await props.core?.weila_stopSingle()
    await props.core?.weila_playSingle(toRaw(msg))
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
})

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
      <SessionList
        v-if="core"
        :sessions="sessions"
        :active-session-id="selectedSessionId"
        :active-session-type="selectedSessionType"
        :loading="sessionsLoading"
        :error="sessionsError"
        :deleting-session-key="deletingSessionKey"
        @select="handleSelectSession"
        @delete="handleDeleteSession"
        @refresh="refreshSessions"
      />
      <div v-else class="flex items-center justify-center h-full text-neutral-500">{{ t('chat.loadingSdk') }}</div>
    </div>

    <div class="flex-1 p-4 overflow-y-auto">
      <div v-if="selectedSession">
        <h2 class="text-lg font-semibold mb-4">
          {{ selectedSession.sessionName || selectedSession.sessionId }}
        </h2>

        <div class="relative">
          <WlMsgList
            ref="wlMsgListRef"
            :style="{ height: messageListHeight }"
            class="bg-neutral-100"
            :messages="messages"
            :current-user-id="currentUserId"
            :sender-infos="senderInfos"
            :has-more="hasMore"
            :loading="messagesLoading"
            :playing-audio-id="playingAudioId"
            @audio-play="handleAudioPlay"
            @audio-pause="handleAudioPause"
            @load-more="loadMore()"
            @image-click="handleImageClick"
            @file-click="openUrl"
            @video-click="handleVideoClick"
            @location-click="openLocation"
          />
        </div>

        <div class="mt-4 flex gap-2 items-center">
          <Dropdown class="media-dropdown" :distance="8" placement="top-start">
            <button class="p-2 rounded-lg hover:bg-neutral-100" type="button">
              <span class="icon-[carbon--add] text-xl"></span>
            </button>
            <template #popper="{ hide }">
              <div class="py-1 min-w-36">
                <button
                  type="button"
                  class="w-full px-4 py-2 text-left hover:bg-neutral-50 flex items-center gap-2"
                  @click="triggerImagePicker(); hide()"
                >
                  <span class="icon-[carbon--image]"></span> {{ t('chat.sendImage') }}
                </button>
                <button
                  type="button"
                  class="w-full px-4 py-2 text-left hover:bg-neutral-50 flex items-center gap-2"
                  @click="triggerFilePicker(); hide()"
                >
                  <span class="icon-[carbon--document]"></span> {{ t('chat.sendFile') }}
                </button>
                <button
                  type="button"
                  class="w-full px-4 py-2 text-left hover:bg-neutral-50 flex items-center gap-2"
                  @click="triggerVideoPicker(); hide()"
                >
                  <span class="icon-[carbon--video]"></span> {{ t('chat.sendVideo') }}
                </button>
              </div>
            </template>
          </Dropdown>

          <WLEmojiPicker @select="handleEmojiSelect" />
          <input
            v-model="messageInput"
            type="text"
            :placeholder="t('chat.inputPlaceholder')"
            class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="sendMessage"
          />
          <button
            type="button"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
            @click="sendMessage"
          >
            {{ t('chat.send') }}
          </button>
          <WlPttButton
            :status="pttStatus"
            size="md"
            :disabled="!selectedSession"
            @start="handlePttStart"
            @stop="handlePttStop"
          />
          <input ref="imageInput" type="file" accept="image/*" class="hidden" @change="handleImageSelected" />
          <input ref="fileInput" type="file" class="hidden" @change="handleFileSelected" />
          <input ref="videoInput" type="file" accept="video/*" class="hidden" @change="handleVideoSelected" />
        </div>
      </div>
      <div v-else class="flex items-center justify-center h-full text-neutral-400">
        <p>{{ t('chat.selectSession') }}</p>
      </div>
    </div>

    <WlImagePreview v-if="previewImage" v-model:open="previewOpen" :src="previewImage" />
    <WlVideoPreview v-if="previewVideo" v-model:open="previewVideoOpen" :src="previewVideo" />
  </div>
</template>

<style>
.media-dropdown .v-popper__arrow-inner,
.media-dropdown .v-popper__arrow-outer {
  display: none;
}
</style>
