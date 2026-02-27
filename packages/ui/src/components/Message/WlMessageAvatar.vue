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
  <div class="rounded-lg size-8 border inline-block bg-neutral-300 relative">
    <img
      v-if="src"
      :src="src"
      alt=""
      class="size-full object-cover"
    />
    <span v-else class="text-xs text-center font-bold">
      {{ fallbackText() }}
    </span>
  </div>
</template>
