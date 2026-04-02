<script setup lang="ts">
import { computed } from 'vue'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataStatus } from '@weilasdk/core'
import { formatMsgTime } from '@/utils'

export interface WlVideoBubbleProps {
  /** 消息数据 */
  msg: WL_IDbMsgData
  /** 是否为自己发送的消息 */
  isSelf?: boolean
  /** 发送者信息 */
  sender?: WL_IDbUserInfo
}

const props = withDefaults(defineProps<WlVideoBubbleProps>(), {
  isSelf: false,
})

const emit = defineEmits<{
  (e: 'click', url: string): void
}>()

const formattedTime = computed(() => formatMsgTime(props.msg.created))

const statusIcon = computed(() => {
  if (!props.isSelf) return null
  const status = props.msg.status
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENDING) return 'sending'
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT) return 'unsent'
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR) return 'error'
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_READ) return 'read'
  if (status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT || status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_NEW) return 'sent'
  return null
})
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

      <!-- Time and Status -->
      <div class="absolute top-1 right-1 flex items-center gap-1 bg-black/40 rounded px-1.5 py-0.5">
        <span class="text-xs text-white opacity-80">{{ formattedTime }}</span>
        <span v-if="statusIcon === 'sending'" class="icon-[carbon--rotate] size-3 animate-spin text-white opacity-80" />
        <span v-else-if="statusIcon === 'unsent' || statusIcon === 'error'" class="icon-[carbon--warning] size-3 text-orange-300" />
        <span v-else-if="statusIcon === 'read'" class="icon-[carbon--checkmark] size-3 text-green-300" />
        <span v-else-if="statusIcon === 'sent'" class="icon-[carbon--checkmark] size-3 text-white opacity-80" />
      </div>
    </div>
  </div>
</template>
