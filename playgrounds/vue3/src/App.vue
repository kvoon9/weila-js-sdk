<script setup lang="ts">
import { ref, computed, watch, triggerRef, watchEffect, toRaw } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { SessionList, WlMsgList } from '@weilasdk/ui'
import type { WL_IDbMsgData, WL_IDbUserInfo, WL_IDbSession } from '@weilasdk/core'
import { WL_ExtEventID } from '@weilasdk/core'
import type { WL_ExtEventCallback } from '@weilasdk/core'
import { useWeilaStore } from './stores/weila'
import { useSessions } from './queries/sessions'
import { storeToRefs } from 'pinia'

const weila = useWeilaStore()
const { core: weilaCore, userInfo } = storeToRefs(weila)
const { data: sessions, refetch: refetchSessions } = useSessions()

const selectedSessionId = useRouteQuery<string>('sessionId')

const messages = ref<WL_IDbMsgData[]>([])

watchEffect(() => {
  console.log('messages.value', messages.value)
})

const senderInfos = ref<Map<number, WL_IDbUserInfo>>(new Map())
const messageInput = ref('')

weila.init().then(() => {
  console.log('inited')
  console.log('userInfo.value?.userId', userInfo.value?.userId)
})

// ---- 音频播放控制 ----
async function handleAudioPlay(msg: WL_IDbMsgData) {
  console.log('[Audio] Playing:', msg.combo_id)

  // 确保音频系统已初始化（必须在用户交互事件中调用）
  if (weilaCore.value) {
    try {
      await weilaCore.value.weila_audioInit()
      console.log('[Audio] audioInit completed')
    } catch (e) {
      console.warn('[Audio] audioInit failed (may already be inited):', e)
    }
  }

  try {
    // 将 Vue 响应式对象转换为普通对象，否则无法存入 IndexedDB
    const plainMsg = toRaw(msg)
    console.log('[Audio] Calling playSingle...')
    await weilaCore.value?.weila_playSingle(plainMsg)
    console.log('[Audio] playSingle completed')
  } catch (err) {
    console.error('[Audio] Play failed:', err)
  }
}

function handleAudioPause() {
  console.log('[Audio] Paused')
  weilaCore.value?.weila_stopSingle()
}

const selectedSession = computed(() => {
  if (!selectedSessionId.value) return null
  return sessions.value?.find((s) => s.sessionId === selectedSessionId.value) ?? null
})

// ---- 消息辅助：加载 sender 信息 ----
async function ensureSenderInfo(senderId: number) {
  if (senderInfos.value.has(senderId) || !weilaCore.value) return
  const info = await weilaCore.value.weila_getUserInfo(senderId)
  if (info) {
    const updated = new Map(senderInfos.value)
    updated.set(senderId, info)
    senderInfos.value = updated
  }
}

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

  // 去重：避免 immediately 加载的消息与事件重复
  if (messages.value.some((m) => m.combo_id === msgData.combo_id)) return

  messages.value = [...messages.value, msgData]
  void ensureSenderInfo(msgData.senderId)
}

// ---- 切换 session 时加载消息 ----
watch(
  selectedSession,
  async (session) => {
    messages.value = []
    senderInfos.value = new Map()

    if (!session || !weilaCore.value) return

    // 从 DB 拉取历史消息
    const history = await weilaCore.value.weila_getMsgDatas(
      session.sessionId,
      session.sessionType,
      0,
      20,
    )
    messages.value = history

    // 预加载所有 sender 信息
    const senderIds = [...new Set(history.map((m) => m.senderId))]
    await Promise.all(senderIds.map(ensureSenderInfo))
  },
  { immediate: true },
)

// 注册全局事件监听（消息追加）
watch(
  weilaCore,
  (core, _oldCore, onCleanup) => {
    if (!core) return
    core.weila_onEvent(handleMessageEvent)
    // weila_onEvent 是 additive 的，目前 SDK 没有 offEvent API
    // 所以这里不需要手动 cleanup（组件销毁后 handler 引用的 ref 不再被 UI 消费）
  },
  { immediate: true },
)

function openUrl(url: string) {
  window.open(url)
}

function openLocation(location: { latitude: number; longitude: number }) {
  window.open(`https://maps.google.com/?q=${location.latitude},${location.longitude}`)
}

function handleSelectSession(session: WL_IDbSession) {
  console.log('session', session)
  selectedSessionId.value = session.sessionId
  triggerRef(selectedSessionId)
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
    // 消息会通过 onEvent → handleMessageEvent 自动追加到列表
  } catch (err) {
    console.error('[Playground] Failed to send message:', err)
  }
}
</script>

<template>
  <div class="flex h-screen">
    <div class="w-80 border-r border-gray-200 overflow-hidden flex flex-col">
      <div v-if="sessions?.length" class="flex-1 overflow-y-auto">
        <div
          v-for="session in sessions"
          :key="session.sessionId"
          class="p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
          :class="{ 'bg-blue-50': selectedSession?.sessionId === session.sessionId }"
          @click="handleSelectSession(session)"
        >
          <div class="font-medium">{{ session.sessionName || session.sessionId }}</div>
          <div class="text-sm text-gray-500">{{ session.sessionId }}</div>
        </div>
      </div>
      <SessionList
        v-else-if="weilaCore"
        :sessions="sessions ?? []"
        @select="handleSelectSession"
        @refresh="refetchSessions"
      />
      <div v-else class="flex items-center justify-center h-full text-gray-500">Loading SDK...</div>
    </div>
    <div class="flex-1 p-4 overflow-y-auto">
      <div v-if="selectedSession">
        <h2 class="text-lg font-semibold mb-4">
          Session: {{ selectedSession.sessionName || selectedSession.sessionId }}
        </h2>

        <WlMsgList
          class="bg-neutral-100"
          :messages="messages"
          :current-user-id="userInfo?.userId ?? 0"
          :sender-infos="senderInfos"
          @image-click="openUrl"
          @file-click="openUrl"
          @location-click="openLocation"
          @audio-play="handleAudioPlay"
          @audio-pause="handleAudioPause"
        />

        <!-- Message Input -->
        <div class="mt-4 flex gap-2">
          <input
            v-model="messageInput"
            type="text"
            placeholder="Type a message..."
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="sendMessage"
          />
          <button
            @click="sendMessage"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
          >
            Send
          </button>
        </div>
      </div>
      <div v-else class="flex items-center justify-center h-full text-gray-400">
        <p>Select a session to start chatting</p>
      </div>
    </div>
  </div>
</template>

<style></style>
