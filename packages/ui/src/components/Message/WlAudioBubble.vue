<script setup lang="ts">
import { computed } from 'vue'

export interface WlAudioBubbleProps {
  /** 音频时长（秒） */
  duration: number
  /** 是否为自己发送的消息 */
  isSelf?: boolean
  /** 是否正在播放 */
  playing?: boolean
}

const props = withDefaults(defineProps<WlAudioBubbleProps>(), {
  isSelf: false,
  playing: false,
})

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'pause'): void
}>()

const handleClick = () => {
  if (props.playing) {
    emit('pause')
  } else {
    emit('play')
  }
}

const formattedDuration = computed(() => `${Math.floor(props.duration || 0)}"`)

const bubbleStyle = computed(() => {
  const clampedDuration = Math.min(Math.max(props.duration, 1), 60)
  const percentage = (clampedDuration / 60) * 100
  return {
    width: `clamp(5rem, ${percentage}%, 16rem)`,
  }
})
</script>

<template>
  <div
    class="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm cursor-pointer select-none transition-colors group overflow-hidden"
    :class="[
      isSelf ? 'bg-blue-500 text-white flex-row-reverse' : 'bg-white text-neutral-900 flex-row',
    ]"
    :style="bubbleStyle"
    @click="handleClick"
  >
    <!-- Play/Pause Icon -->
    <div class="shrink-0 flex items-center justify-center">
      <span v-if="playing" class="icon-[carbon--pause-filled] size-5"></span>
      <span v-else class="icon-[carbon--play-filled] size-5"></span>
    </div>

    <!-- Wave Animation -->
    <div
      class="flex items-center gap-0.75 grow h-4"
      :class="isSelf ? 'justify-end' : 'justify-start'"
    >
      <div
        class="wl-audio-bar"
        :class="{ 'wl-audio-bar-playing': playing, 'bg-white': isSelf, 'bg-neutral-900': !isSelf }"
        style="--wl-delay: 0s"
      ></div>
      <div
        class="wl-audio-bar"
        :class="{ 'wl-audio-bar-playing': playing, 'bg-white': isSelf, 'bg-neutral-900': !isSelf }"
        style="--wl-delay: -0.2s"
      ></div>
      <div
        class="wl-audio-bar"
        :class="{ 'wl-audio-bar-playing': playing, 'bg-white': isSelf, 'bg-neutral-900': !isSelf }"
        style="--wl-delay: -0.4s"
      ></div>
      <div
        class="wl-audio-bar"
        :class="{ 'wl-audio-bar-playing': playing, 'bg-white': isSelf, 'bg-neutral-900': !isSelf }"
        style="--wl-delay: -0.6s"
      ></div>
    </div>

    <!-- Duration -->
    <div class="shrink-0 font-medium pl-1">
      {{ formattedDuration }}
    </div>
  </div>
</template>

<style>
.wl-audio-bar {
  width: 2px;
  height: 4px;
  border-radius: 2px;
  transition: height 0.2s ease;
}

.wl-audio-bar-playing {
  animation: wl-audio-wave 0.8s ease-in-out infinite;
  animation-delay: var(--wl-delay);
}

@keyframes wl-audio-wave {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 14px;
  }
}
</style>
