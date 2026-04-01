<script setup lang="ts">
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'

export interface WlVideoBubbleProps {
  /** 消息数据 */
  msg: WL_IDbMsgData
  /** 是否为自己发送的消息 */
  isSelf?: boolean
  /** 发送者信息 */
  sender?: WL_IDbUserInfo
}

withDefaults(defineProps<WlVideoBubbleProps>(), {
  isSelf: false,
})

const emit = defineEmits<{
  (e: 'click', url: string): void
}>()
</script>

<template>
  <div
    v-if="msg.fileInfo?.fileUrl"
    class="max-w-[70%] rounded-xl overflow-hidden cursor-pointer"
    :class="isSelf ? 'bg-blue-500' : 'bg-white'"
    @click="emit('click', msg.fileInfo!.fileUrl)"
  >
    <!-- Video Thumbnail -->
    <div class="relative max-w-[200px]">
      <img
        v-if="msg.fileInfo.fileThumbnail"
        :src="msg.fileInfo.fileThumbnail"
        class="w-full h-full object-cover"
        alt="video thumbnail"
      />
      <div
        v-else
        class="w-[200px] h-[150px] bg-neutral-300 flex items-center justify-center"
      >
        <span class="icon-[carbon--video] size-12 text-neutral-500" />
      </div>

      <!-- Play Button Overlay -->
      <div
        class="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
      >
        <div class="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
          <span class="icon-[carbon--play-filled] size-6 text-neutral-800 ml-1" />
        </div>
      </div>

      <!-- Video Name (if exists) -->
      <div
        v-if="msg.fileInfo.fileName"
        class="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent"
      >
        <div class="text-xs text-white truncate">
          {{ msg.fileInfo.fileName }}
        </div>
      </div>
    </div>
  </div>
</template>
