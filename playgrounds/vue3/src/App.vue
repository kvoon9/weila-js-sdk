<script setup lang="ts">
import { ref } from 'vue';

const sdkStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
const statusMessage = ref('');

async function initSDK() {
  sdkStatus.value = 'loading';
  statusMessage.value = '正在加载 SDK...';

  try {
    // 动态导入 SDK，使用 markRaw 避免 Vue Proxy 包裹
    const { markRaw } = await import('vue');
    const weilaModule = await import('@weilasdk/core');

    statusMessage.value = 'SDK 模块加载成功 ✓';
    sdkStatus.value = 'ready';

    console.log('[Playground] SDK module loaded:', weilaModule);
  } catch (e) {
    sdkStatus.value = 'error';
    statusMessage.value = `SDK 加载失败: ${e}`;
    console.error('[Playground] SDK load error:', e);
  }
}
</script>

<template>
  <div class="container">
    <h1>🔧 Weila SDK Playground</h1>
    <p class="subtitle">Vue 3 + Vite</p>

    <div class="card">
      <button @click="initSDK" :disabled="sdkStatus === 'loading'">
        {{ sdkStatus === 'idle' ? '初始化 SDK' : '重新加载' }}
      </button>

      <p v-if="statusMessage" :class="['status', sdkStatus]">
        {{ statusMessage }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #888;
  margin-bottom: 2rem;
}

.card {
  padding: 2rem;
  border-radius: 8px;
  background: #f9f9f9;
}

button {
  padding: 0.6rem 1.2rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  background: #fff;
  transition: border-color 0.2s;
}

button:hover {
  border-color: #42b883;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  margin-top: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.status.ready {
  color: #42b883;
}

.status.error {
  color: #e74c3c;
}

.status.loading {
  color: #f39c12;
}
</style>
