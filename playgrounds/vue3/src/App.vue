<script setup lang="ts">
import { ref, computed, onMounted, watch, watchEffect } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { SessionList, WlMessage, WlMessageAvatar, WlMessageContent } from '@weilasdk/ui'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataType } from '@weilasdk/core'
import { weilaCore, userInfo, ensureWeilaCore } from './weilaCore'

const selectedSessionId = useRouteQuery<string>('sessionId')
const sessions = ref<any[]>([])
const messages = ref<WL_IDbMsgData[]>([])
const senderInfos = ref<Map<number, WL_IDbUserInfo>>(new Map())
const messageInput = ref('')

watchEffect(() => {
  console.log('userInfo.value',userInfo.value)
  console.log('messages.value',messages.value)
})

const selectedSession = computed(() => {
  if (!selectedSessionId.value) return null
  return sessions.value?.find(s => s.sessionId === selectedSessionId.value) ?? null
})

// Auto-load messages when selectedSession changes
watch(selectedSession, (session) => {
  if (session) {
    loadMessages(session)
  } else {
    messages.value = []
  }
})

onMounted(() => {
  ensureWeilaCore((sessionList) => {
    sessions.value = sessionList
  })
})

function handleSelectSession(session: any) {
  selectedSessionId.value = session.sessionId
}

async function loadMessages(session: any) {
  if (!weilaCore.value) return
  
  try {
    // 从最新消息往后取20条
    const msgs = await weilaCore.value.weila_getMsgDatas(
      session.sessionId,
      session.sessionType,
      0,
      20
    )
    messages.value = msgs

    // Load sender infos
    const senderIds = [...new Set(msgs.map(m => m.senderId))]
    const newSenderInfos = new Map(senderInfos.value)
    for (const senderId of senderIds) {
      if (!newSenderInfos.has(senderId)) {
        const userInfo = await weilaCore.value.weila_getUserInfo(senderId)
        if (userInfo) {
          newSenderInfos.set(senderId, userInfo)
        }
      }
    }
    senderInfos.value = newSenderInfos
  } catch (err) {
    console.error('[Playground] Failed to load messages:', err)
    messages.value = []
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
      text
    )
    // Reload messages after sending
    loadMessages(selectedSession.value)
  } catch (err) {
    console.error('[Playground] Failed to send message:', err)
  }
}
</script>

<template>
  <div class="flex h-screen">
    <div class="w-80 border-r border-gray-200 overflow-hidden flex flex-col">
      <div v-if="sessions?.length" class="flex-1 overflow-y-auto">
        <div v-for="session in sessions" :key="session.sessionId" 
             class="p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
             :class="{ 'bg-blue-50': selectedSession?.sessionId === session.sessionId }"
             @click="handleSelectSession(session)">
          <div class="font-medium">{{ session.sessionName || session.sessionId }}</div>
          <div class="text-sm text-gray-500">{{ session.sessionId }}</div>
        </div>
      </div>
      <SessionList v-else-if="weilaCore" :weila-core="weilaCore" @select="handleSelectSession" />
      <div v-else class="flex items-center justify-center h-full text-gray-500">Loading SDK...</div>
    </div>
    <div class="flex-1 p-4 overflow-y-auto">
      <div v-if="selectedSession">
        <h2 class="text-lg font-semibold mb-4">Session: {{ selectedSession.sessionName || selectedSession.sessionId }}</h2>
        
        <div v-if="messages.length > 0" class="space-y-3">
          <WlMessage
            v-for="msg in messages"
            :key="msg.combo_id"
            :from="msg.senderId === userInfo.userId ? 'self' : 'other'"
          >
            <WlMessageAvatar
              :src="senderInfos.get(msg.senderId)?.avatar"
              :name="senderInfos.get(msg.senderId)?.nick || senderInfos.get(msg.senderId)?.weilaNum"
            />
            <WlMessageContent class="bg-neutral-100">
              <template v-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE">
                {{ msg.textData || '' }}
              </template>
              <span v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE" class="text-blue-600">[Voice]</span>
              <span v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE" class="text-blue-600">[PTT]</span>
              <span v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE" class="text-green-600">[Image]</span>
              <span v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE" class="text-green-600">[Video]</span>
              <span v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE" class="text-orange-600">[File]</span>
              <span v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE" class="text-purple-600">[Location]</span>
              <span v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_COMMAND_TYPE" class="text-red-600">[Command]</span>
              <span v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_SERVICE_TYPE" class="text-gray-600">[Service]</span>
              <span v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_SWITCH_TYPE" class="text-gray-600">[Switch]</span>
              <span v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE" class="text-gray-400">[Withdrawn]</span>
              <span v-else class="text-gray-400">[Unknown: {{ msg.msgType }}]</span>
            </WlMessageContent>
          </WlMessage>
        </div>
        <div v-else class="text-gray-400">No messages in this session</div>
        
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
