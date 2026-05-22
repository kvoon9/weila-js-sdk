<script setup lang="ts">
interface WlAvatarProps {
  src?: string
  name?: string
  sizeClass?: string
  roundedClass?: string
  bgClass?: string
  fallbackClass?: string
}

withDefaults(defineProps<WlAvatarProps>(), {
  src: '',
  name: '',
  sizeClass: 'size-9',
  roundedClass: 'rounded-lg',
  bgClass: 'bg-neutral-300',
  fallbackClass: 'text-sm font-medium text-neutral-500',
})

function getFallback(name: string) {
  return (name || '?').charAt(0).toUpperCase()
}

function handleImageError(event: Event) {
  (event.currentTarget as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div
    class="relative shrink-0 overflow-hidden flex items-center justify-center"
    :class="[sizeClass, roundedClass, bgClass]"
  >
    <span :class="fallbackClass">
      {{ getFallback(name) }}
    </span>
    <img
      v-if="src"
      :key="src"
      :src="src"
      :alt="name"
      class="absolute inset-0 size-full object-cover"
      @error="handleImageError"
    />
  </div>
</template>
