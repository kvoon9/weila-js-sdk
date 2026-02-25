<script setup lang="ts">
import { ref, computed } from 'vue';

export interface WlStatusIndicatorProps {
  /** 当前状态 */
  status: 'idle' | 'connecting' | 'connected' | 'error';
  /** 显示的标签文本 */
  label?: string;
}

const props = withDefaults(defineProps<WlStatusIndicatorProps>(), {
  label: '',
});

const statusText = computed(() => {
  const map: Record<string, string> = {
    idle: '未连接',
    connecting: '连接中...',
    connected: '已连接',
    error: '连接错误',
  };
  return props.label || map[props.status] || props.status;
});

const statusClass = computed(() => `wl-status--${props.status}`);
</script>

<template>
  <span class="wl-status-indicator" :class="statusClass">
    <span class="wl-status-indicator__dot" />
    <span class="wl-status-indicator__text">{{ statusText }}</span>
  </span>
</template>

<style scoped>
.wl-status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.wl-status-indicator__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #999;
}

.wl-status--connecting .wl-status-indicator__dot {
  background-color: #f59e0b;
  animation: pulse 1.5s infinite;
}

.wl-status--connected .wl-status-indicator__dot {
  background-color: #22c55e;
}

.wl-status--error .wl-status-indicator__dot {
  background-color: #ef4444;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
