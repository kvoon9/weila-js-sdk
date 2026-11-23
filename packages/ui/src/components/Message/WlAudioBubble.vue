<script setup lang="ts">
import { computed } from 'vue'
import type { WL_IDbMsgData } from '@vois/weila-sdk-core'
import { calculateAudioDuration } from '@vois/weila-sdk-core'

export interface WlAudioBubbleProps {
  /** 消息数据 */
  msg: WL_IDbMsgData
  /** 是否为自己发送的消息 */
  isSelf?: boolean
  /** 是否正在播放 */
  playing?: boolean
  /** 播放已暂停，位置保留 */
  paused?: boolean
  /** 当前播放到的毫秒数，播放或暂停时显示为进度 */
  progressMs?: number | null
}

const props = withDefaults(defineProps<WlAudioBubbleProps>(), {
  isSelf: false,
  playing: false,
  paused: false,
  progressMs: null,
})

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'pause'): void
}>()

const duration = computed(() => calculateAudioDuration(props.msg.audioData?.frameCount ?? 0))

const handleClick = () => {
  if (props.playing) {
    emit('pause')
  } else {
    emit('play')
  }
}

const hasDuration = computed(() => duration.value > 0)
const formattedDuration = computed(() => `${Math.floor(duration.value)}"`)

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Playing (or paused) shows a live position; idle keeps the plain duration. */
const timeLabel = computed(() => {
  if (props.playing || props.paused) {
    if (props.progressMs === null || !hasDuration.value) return ''

    return `${formatClock(props.progressMs)} / ${formatClock(duration.value * 1000)}`
  }

  return hasDuration.value ? formattedDuration.value : ''
})

/** The wave animates only while actually playing, not while paused. */
const animating = computed(() => props.playing && !props.paused)

// const bubbleStyle = computed(() => {
//   const clampedDuration = Math.min(Math.max(duration.value, 1), 60);
//   const percentage = (clampedDuration / 60) * 100;
//   return {
//     width: `clamp(6rem, ${percentage}%, 16rem)`,
//   };
// });
</script>

<template>
  <!-- Outer wrapper handles bubble shape and click -->
  <div
    class="rounded-xl overflow-hidden cursor-pointer"
    :class="isSelf ? 'bg-blue-500' : 'bg-white'"
    @click="handleClick"
  >
    <!-- Main audio row: icon + wave + duration -->
    <div
      class="flex items-center gap-2 px-3 py-2 text-sm select-none transition-colors group w-fit"
      :class="isSelf ? 'text-white flex-row-reverse' : 'text-neutral-900 flex-row'"
    >
      <!-- Play/Pause Icon -->
      <div class="shrink-0 flex items-center justify-center">
        <span v-if="animating" class="icon-[carbon--pause-filled] size-5"></span>
        <span v-else class="icon-[carbon--play-filled] size-5"></span>
      </div>

      <!-- Wave Animation -->
      <div
        class="flex items-center gap-0.75 grow h-4"
        :class="isSelf ? 'justify-end' : 'justify-start'"
      >
        <div
          class="wl-audio-bar"
          :class="{
            'wl-audio-bar-playing': animating,
            'bg-white': isSelf,
            'bg-neutral-900': !isSelf,
          }"
          style="--wl-delay: 0s"
        ></div>
        <div
          class="wl-audio-bar"
          :class="{
            'wl-audio-bar-playing': animating,
            'bg-white': isSelf,
            'bg-neutral-900': !isSelf,
          }"
          style="--wl-delay: -0.2s"
        ></div>
        <div
          class="wl-audio-bar"
          :class="{
            'wl-audio-bar-playing': animating,
            'bg-white': isSelf,
            'bg-neutral-900': !isSelf,
          }"
          style="--wl-delay: -0.4s"
        ></div>
        <div
          class="wl-audio-bar"
          :class="{
            'wl-audio-bar-playing': animating,
            'bg-white': isSelf,
            'bg-neutral-900': !isSelf,
          }"
          style="--wl-delay: -0.6s"
        ></div>
      </div>

      <!-- Duration / progress -->
      <div v-if="timeLabel" class="shrink-0 font-medium pl-1">
        {{ timeLabel }}
      </div>
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
