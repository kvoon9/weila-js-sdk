<script setup lang="ts">
import { computed } from 'vue'

export interface WlPttButtonProps {
  /** 当前状态 */
  status?: 'idle' | 'recording' | 'processing'
  /** 是否禁用 */
  disabled?: boolean
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<WlPttButtonProps>(), {
  status: 'idle',
  disabled: false,
  size: 'md',
})

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'stop'): void
  (e: 'error'): void
}>()

const sizeMap = {
  sm: 'wl-ptt-button--sm',
  md: 'wl-ptt-button--md',
  lg: 'wl-ptt-button--lg',
}

const buttonClass = computed(() => [
  'wl-ptt-button',
  sizeMap[props.size],
  {
    'wl-ptt-button--disabled': props.disabled,
    'wl-ptt-button--recording': props.status === 'recording',
    'wl-ptt-button--processing': props.status === 'processing',
  },
])

const handleMouseDown = () => {
  if (props.disabled || props.status !== 'idle') return
  emit('start')
}

const handleMouseUp = () => {
  if (props.disabled || props.status !== 'recording') return
  emit('stop')
}

const handleMouseLeave = () => {
  if (props.disabled || props.status !== 'recording') return
  emit('stop')
}

const handleTouchStart = (e: TouchEvent) => {
  e.preventDefault()
  if (props.disabled || props.status !== 'idle') return
  emit('start')
}

const handleTouchEnd = (e: TouchEvent) => {
  e.preventDefault()
  if (props.disabled || props.status !== 'recording') return
  emit('stop')
}

const handleContextMenu = (e: Event) => {
  e.preventDefault()
}
</script>

<template>
  <button
    :class="buttonClass"
    :disabled="disabled"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @contextmenu="handleContextMenu"
  >
    <!-- Idle: Microphone Icon -->
    <span v-if="status === 'idle'" class="wl-ptt-button__icon icon-[carbon--microphone]"></span>

    <!-- Recording: Record Icon with pulse -->
    <span
      v-else-if="status === 'recording'"
      class="wl-ptt-button__icon wl-ptt-button__icon--recording icon-[carbon--recording-filled]"
    ></span>

    <!-- Processing: Loading indicator -->
    <span
      v-else-if="status === 'processing'"
      class="wl-ptt-button__icon wl-ptt-button__icon--processing icon-[carbon--renew]"
    ></span>
  </button>
</template>

<style scoped>
.wl-ptt-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #f3f4f6;
  color: #6b7280;
}

.wl-ptt-button:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.wl-ptt-button:active:not(:disabled) {
  transform: scale(0.95);
}

/* Sizes */
.wl-ptt-button--sm {
  width: 32px;
  height: 32px;
}

.wl-ptt-button--sm .wl-ptt-button__icon {
  font-size: 14px;
}

.wl-ptt-button--md {
  width: 48px;
  height: 48px;
}

.wl-ptt-button--md .wl-ptt-button__icon {
  font-size: 20px;
}

.wl-ptt-button--lg {
  width: 64px;
  height: 64px;
}

.wl-ptt-button--lg .wl-ptt-button__icon {
  font-size: 28px;
}

/* Disabled state */
.wl-ptt-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Recording state */
.wl-ptt-button--recording {
  background-color: #fef2f2;
  color: #ef4444;
  animation: wl-ptt-pulse 1s ease-in-out infinite;
}

.wl-ptt-button__icon--recording {
  animation: wl-ptt-icon-pulse 1s ease-in-out infinite;
}

/* Processing state */
.wl-ptt-button--processing {
  background-color: #fef3c7;
  color: #f59e0b;
}

.wl-ptt-button__icon--processing {
  animation: spin 1s linear infinite;
}

@keyframes wl-ptt-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
}

@keyframes wl-ptt-icon-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
