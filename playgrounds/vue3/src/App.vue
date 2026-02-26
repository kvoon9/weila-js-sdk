<script setup lang="ts">
import { ref, onMounted, shallowRef } from 'vue'
import { SessionList } from '@weilasdk/ui'
import { WeilaCore, initLogger } from '@weilasdk/core'
import { WL_ExtEventID } from '@weilasdk/core'

const weilaCore = shallowRef<any>(null)
const selectedSession = ref('')
const sessions = ref<any[]>([])
const account = '12679166'
const password = '30215594'

onMounted(async () => {
  console.log('[Playground] Starting SDK...')

  // 初始化日志
  initLogger('MOD:*, CORE:*, AUDIO:*, DB:, NET:*')

  // 直接创建实例
  const core = new WeilaCore()

  core.weila_setWebSock('wss://wss.weila.hk:8999')
  core.weila_setAuthInfo('102053', '968cd0664d239c02bafb214d16fea415')

  // 注册事件监听 (必须在 init 和 login 之前)
  core.weila_onEvent((eventId: WL_ExtEventID, eventData: any) => {
    console.log('Event:', eventId, eventData)
    
    // 监听会话列表加载完成
    if (eventId === WL_ExtEventID.WL_EXT_DATA_PREPARE_IND && eventData?.msg === 'SDK.SessionInit') {
      const sessionList = core.weila_getSessions()
      console.log('会话列表已加载:', sessionList)
      sessions.value = sessionList
    }
  })

  await core.weila_init()
  console.log('init done')

  await core.weila_login(account, password, '0')
  console.log('login done')

  weilaCore.value = core
})

function handleSelectSession(session: any) {
  selectedSession.value = session.sessionId
  console.log('[Playground] Selected session:', session)
}
</script>

<template>
  <div class="flex h-screen">
    <div class="w-80 border-r border-gray-200 overflow-hidden flex flex-col">
      <div v-if="sessions.length > 0" class="flex-1 overflow-y-auto">
        <div v-for="session in sessions" :key="session.sessionId" 
             class="p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
             :class="{ 'bg-blue-50': selectedSession === session.sessionId }"
             @click="handleSelectSession(session)">
          <div class="font-medium">{{ session.sessionName || session.sessionId }}</div>
          <div class="text-sm text-gray-500">{{ session.sessionId }}</div>
        </div>
      </div>
      <SessionList v-else-if="weilaCore" :weila-core="weilaCore" @select="handleSelectSession" />
      <div v-else class="flex items-center justify-center h-full text-gray-500">Loading SDK...</div>
    </div>
    <div class="flex-1 p-4">
      <div v-if="selectedSession">
        <h2 class="text-lg font-semibold">Selected Session: {{ selectedSession }}</h2>
      </div>
      <div v-else class="flex items-center justify-center h-full text-gray-400">
        <p>Select a session to start chatting</p>
      </div>
    </div>
  </div>
</template>
