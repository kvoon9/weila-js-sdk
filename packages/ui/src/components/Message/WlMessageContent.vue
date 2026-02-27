<script setup lang="ts">
export interface WlMessageContentProps {
  /** 气泡样式变体 */
  variant?: 'contained' | 'flat'
}

withDefaults(defineProps<WlMessageContentProps>(), {
  variant: 'contained',
})
</script>

<template>
  <div
    class="wl-message-content self-start flex flex-col gap-2 overflow-hidden rounded-lg text-sm"
    :class="[
      variant === 'contained'
        ? [
            'max-w-[80%] px-4 py-3',
            'group-[.is-self]:bg-blue-500 group-[.is-self]:text-white',
            'group-[.is-other]:bg-neutral-100 group-[.is-other]:text-gray-900',
          ]
        : [
            'group-[.is-self]:max-w-[80%] group-[.is-self]:bg-neutral-100 group-[.is-self]:px-4 group-[.is-self]:py-3 group-[.is-self]:text-gray-900',
            'group-[.is-other]:text-gray-900',
          ],
    ]"
  >
    <slot />
  </div>
</template>
