<script setup lang="ts">
export interface WlMessageProps {
  /** 消息方向：self=自己发的（右对齐），other=对方发的（左对齐） */
  from: 'self' | 'other'
}

defineProps<WlMessageProps>()
</script>

<template>
  <div
    class="wl-message group flex w-full items-start gap-2 py-2"
    :class="from === 'self' ? 'justify-end' : 'flex-row-reverse justify-end'"
  >
    <slot />
  </div>
</template>
