<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

export interface WlVideoPreviewProps {
  src: string
}

const props = defineProps<WlVideoPreviewProps>()
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
    <div v-if="open" class="wl-video-preview" @click="handleClose">
      <div class="wl-video-preview__container" @click.stop>
        <video
          :src="props.src"
          class="wl-video-preview__video"
          controls
          playsinline
          autoplay
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.wl-video-preview {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.9);
  cursor: pointer;
}

.wl-video-preview__container {
  max-width: 90vw;
  max-height: 90vh;
  cursor: default;
}

.wl-video-preview__video {
  max-width: 90vw;
  max-height: 90vh;
  outline: none;
}
</style>
