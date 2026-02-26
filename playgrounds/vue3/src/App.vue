<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { SessionList } from '@weilasdk/ui';
import type { WeilaCore } from '@weilasdk/core';

const weilaCore = ref<any>(null);
const selectedSession = ref('');
const account = '2012679166';
const password = '123456';

onMounted(async () => {
  console.log('[Playground] Starting SDK load...');
  
  // 动态导入 SDK (UMD 会挂在 window.weilasdk 上)
  await import('@weilasdk/core');
  console.log('[Playground] SDK module loaded');
  
  // 等待一下让 UMD 加载完成
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 从全局变量获取 WeilaCore
  const WeilaCore = (window as any).weilasdk?.WeilaCore;
  console.log('[Playground] WeilaCore:', WeilaCore);
  
  if (!WeilaCore) {
    console.error('Failed to load WeilaCore from global');
    return;
  }
  
  // 创建实例
  const core: WeilaCore = new WeilaCore();
  console.log('[Playground] Core instance created');
  
  // 设置服务器地址
  core.weila_setWebSock('wss://api.weila.hk/ws');
  core.weila_setWebSock('wss://api.weila.online/ws');
  core.weila_setAuthInfo('10006', '123456');
  console.log('[Playground] Server configured');
  
  // 注册事件监听 (必须在 init 和 login 之前)
  core.weila_onEvent((eventId: string, eventData: any) => {
    console.log('[Playground] Event:', eventId, eventData);
  });
  console.log('[Playground] Event listener registered');
  
  // 初始化 SDK
  core.weila_init();
  console.log('[Playground] SDK init called');
  
  // 登录
  core.weila_login(account, password, '0')
  
  .then((res) => {
    console.log('res',res)
  })
  .catch(console.error)
  console.log('[Playground] Login called')
  
  // 保存引用用于传递给组件
  weilaCore.value = core;
});

function handleSelectSession(session: any) {
  selectedSession.value = session.sessionId;
  console.log('[Playground] Selected session:', session);
}
</script>

<template>
  <div class="app-container">
    <div class="sidebar">
      <SessionList 
        v-if="weilaCore"
        :weila-core="weilaCore" 
        @select="handleSelectSession"
      />
      <div v-else class="loading">
        Loading SDK...
      </div>
    </div>
    <div class="main-content">
      <div v-if="selectedSession">
        <h2>Selected Session: {{ selectedSession }}</h2>
      </div>
      <div v-else class="placeholder">
        <p>Select a session to start chatting</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 320px;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
}

.main-content {
  flex: 1;
  padding: 1rem;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
}
</style>
