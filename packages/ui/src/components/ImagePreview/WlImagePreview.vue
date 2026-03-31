<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

export interface WlImagePreviewProps {
  src: string
}

const props = defineProps<WlImagePreviewProps>()
const open = defineModel<boolean>('open')

function handleClose() {
  open.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="wl-image-preview" @click="handleClose">
      <img :src="props.src" class="wl-image-preview__img" @click.stop />
    </div>
  </Teleport>
</template>

<style scoped>
.wl-image-preview {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.85);
  cursor: pointer;
}

.wl-image-preview__img {
  max-width: 95vw;
  max-height: 95vh;
  object-fit: contain;
  cursor: default;
}
</style>
