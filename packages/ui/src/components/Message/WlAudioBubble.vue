<script setup lang="ts">
import { computed } from "vue";
import type { WL_IDbMsgData } from "@weilasdk/core";
import { WL_IDbMsgDataStatus } from "@weilasdk/core";
import { framesToDuration } from "../../composables/useAudio";
import { formatMsgTime } from "@/utils";

export interface WlAudioBubbleProps {
  /** 消息数据 */
  msg: WL_IDbMsgData;
  /** 是否为自己发送的消息 */
  isSelf?: boolean;
  /** 是否正在播放 */
  playing?: boolean;
}

const props = withDefaults(defineProps<WlAudioBubbleProps>(), {
  isSelf: false,
  playing: false,
});

const emit = defineEmits<{
  (e: "play"): void;
  (e: "pause"): void;
}>();

const duration = computed(() =>
  framesToDuration(props.msg.audioData?.frameCount ?? 0),
);

const handleClick = () => {
  if (props.playing) {
    emit("pause");
  } else {
    emit("play");
  }
};

const formattedDuration = computed(() => `${Math.floor(duration.value || 0)}"`);

// const bubbleStyle = computed(() => {
//   const clampedDuration = Math.min(Math.max(duration.value, 1), 60);
//   const percentage = (clampedDuration / 60) * 100;
//   return {
//     width: `clamp(6rem, ${percentage}%, 16rem)`,
//   };
// });

const formattedTime = computed(() => formatMsgTime(props.msg.created));

const statusIcon = computed(() => {
  if (!props.isSelf) return null;
  const status = props.msg.status;
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENDING)
    return "sending";
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT)
    return "unsent";
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR) return "error";
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ) return "read";
  if (
    status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT ||
    status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW
  )
    return "sent";
  return null;
});
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
      :class="
        isSelf ? 'text-white flex-row-reverse' : 'text-neutral-900 flex-row'
      "
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
          :class="{
            'wl-audio-bar-playing': playing,
            'bg-white': isSelf,
            'bg-neutral-900': !isSelf,
          }"
          style="--wl-delay: 0s"
        ></div>
        <div
          class="wl-audio-bar"
          :class="{
            'wl-audio-bar-playing': playing,
            'bg-white': isSelf,
            'bg-neutral-900': !isSelf,
          }"
          style="--wl-delay: -0.2s"
        ></div>
        <div
          class="wl-audio-bar"
          :class="{
            'wl-audio-bar-playing': playing,
            'bg-white': isSelf,
            'bg-neutral-900': !isSelf,
          }"
          style="--wl-delay: -0.4s"
        ></div>
        <div
          class="wl-audio-bar"
          :class="{
            'wl-audio-bar-playing': playing,
            'bg-white': isSelf,
            'bg-neutral-900': !isSelf,
          }"
          style="--wl-delay: -0.6s"
        ></div>
      </div>

      <!-- Duration -->
      <div class="shrink-0 font-medium pl-1">
        {{ formattedDuration }}
      </div>
    </div>

    <!-- Time and Status row -->
    <div
      class="flex items-center gap-1 px-3 pb-1.5 -mt-1"
      :class="isSelf ? 'justify-end' : 'justify-start'"
    >
      <span
        class="text-xs"
        :class="isSelf ? 'text-blue-200 opacity-80' : 'text-neutral-500'"
      >
        {{ formattedTime }}
      </span>
      <!-- Status icons only for self messages -->
      <template v-if="isSelf">
        <span
          v-if="statusIcon === 'sending'"
          class="icon-[carbon--rotate] size-3 animate-spin text-blue-200 opacity-80"
        />
        <span
          v-else-if="statusIcon === 'unsent' || statusIcon === 'error'"
          class="icon-[carbon--warning] size-3 text-orange-300"
        />
        <span
          v-else-if="statusIcon === 'read'"
          class="icon-[carbon--checkmark] size-3 text-green-300"
        />
        <span
          v-else-if="statusIcon === 'sent'"
          class="icon-[carbon--checkmark] size-3 text-blue-200 opacity-80"
        />
      </template>
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
