<script setup lang="ts">
export interface WlMessageAvatarProps {
  /** 头像图片 URL */
  src?: string
  /** 用户名称，用于生成 fallback 文字 */
  name?: string
}

const props = withDefaults(defineProps<WlMessageAvatarProps>(), {
  src: undefined,
  name: undefined,
})

const fallbackText = () => {
  if (props.name) return props.name.slice(0, 2)
  return 'ME'
}
</script>

<template>
  <div class="wl-message-avatar size-8 flex-shrink-0 rounded-full bg-gray-200 ring-1 ring-gray-200 flex items-center justify-center overflow-hidden">
    <img
      v-if="src"
      :src="src"
      alt=""
      class="size-full object-cover"
    />
    <span v-else class="text-xs font-medium text-gray-500">
      {{ fallbackText() }}
    </span>
  </div>
</template>
