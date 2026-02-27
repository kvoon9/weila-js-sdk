<script setup lang="ts">
import { ref, computed, onMounted, watch, watchEffect } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { SessionList, WlMessage, WlMessageAvatar, WlMessageContent } from '@weilasdk/ui'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataType } from '@weilasdk/core'
import { weilaCore, userInfo, ensureWeilaCore } from './weilaCore'

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function openUrl(url?: string) {
  if (url) window.open(url)
}

function openLocation(location?: { latitude?: number; longitude?: number }) {
  if (location?.latitude && location?.longitude) {
    window.open(`https://maps.google.com/?q=${location.latitude},${location.longitude}`)
  }
}

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
              <template v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE">
                <img 
                  v-if="msg.fileInfo?.fileUrl" 
                  :src="msg.fileInfo.fileUrl" 
                  class="max-w-[200px] max-h-[200px] rounded object-cover cursor-pointer"
                  alt="image"
                  @click="openUrl(msg.fileInfo?.fileUrl)"
                />
              </template>
              <template v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE">
                <div 
                  v-if="msg.fileInfo?.fileUrl" 
                  class="flex items-center gap-2 p-2 rounded bg-white border border-gray-200 cursor-pointer min-w-[180px]"
                  @click="openUrl(msg.fileInfo?.fileUrl)"
                >
                  <img 
                    v-if="msg.fileInfo?.fileThumbnail" 
                    :src="msg.fileInfo.fileThumbnail" 
                    class="w-10 h-10 object-contain"
                    alt="file"
                  />
                  <div v-else class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 truncate">{{ msg.fileInfo?.fileName || 'File' }}</div>
                    <div class="text-xs text-gray-500">{{ formatFileSize(msg.fileInfo?.fileSize) }}</div>
                  </div>
                </div>
              </template>
              <template v-else-if="msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE">
                <div 
                  v-if="msg.location?.mapUrl" 
                  class="max-w-[240px] cursor-pointer"
                  @click="openLocation(msg.location)"
                >
                  <img 
                    :src="msg.location.mapUrl" 
                    class="w-full h-[120px] object-cover rounded-t"
                    alt="location"
                  />
                  <div class="p-2 bg-white border border-t-0 border-gray-200 rounded-b">
                    <div v-if="msg.location?.name" class="text-sm font-medium text-gray-900">{{ msg.location.name }}</div>
                    <div v-if="msg.location?.address" class="text-xs text-gray-500 truncate">{{ msg.location.address }}</div>
                  </div>
                </div>
              </template>
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
