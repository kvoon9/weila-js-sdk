<script setup lang="ts">
import { computed } from 'vue'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataStatus } from '@weilasdk/core'
import { formatMsgTime } from '@/utils'

export interface WlFileBubbleProps {
  /** 消息数据 */
  msg: WL_IDbMsgData
  /** 是否为自己发送的消息 */
  isSelf?: boolean
  /** 发送者信息 */
  sender?: WL_IDbUserInfo
}

const props = withDefaults(defineProps<WlFileBubbleProps>(), {
  isSelf: false,
})

const emit = defineEmits<{
  (e: 'click', url: string): void
}>()

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

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
    v-if="msg.fileInfo?.fileName"
    class="max-w-[70%] rounded-xl overflow-hidden"
    :class="[
      isSelf ? 'bg-blue-500' : 'bg-white',
      msg.fileInfo?.fileUrl ? 'cursor-pointer' : 'opacity-60'
    ]"
    @click="msg.fileInfo?.fileUrl && emit('click', msg.fileInfo!.fileUrl)"
  >
    <div class="flex items-center gap-2.5 px-3 py-2.5">
      <img
        v-if="msg.fileInfo.fileThumbnail"
        :src="msg.fileInfo.fileThumbnail"
        class="size-10 object-contain shrink-0"
        alt=""
      />
      <div v-else class="size-10 shrink-0 rounded bg-neutral-100 flex items-center justify-center">
        <span class="icon-[carbon--document] size-5 text-neutral-400" />
      </div>
      <div class="min-w-0 flex-1">
        <div
          class="text-sm font-medium truncate"
          :class="isSelf ? 'text-white' : 'text-neutral-900'"
        >
          {{ msg.fileInfo.fileName || '文件' }}
        </div>
        <div class="text-xs mt-0.5" :class="isSelf ? 'text-blue-200' : 'text-neutral-400'">
          {{ msg.fileInfo?.fileUrl ? formatFileSize(msg.fileInfo.fileSize) : '上传中...' }}
        </div>
      </div>
    </div>
    <div class="flex items-center justify-end gap-1 px-2 pb-1.5 -mt-1">
      <span class="text-xs opacity-60" :class="isSelf ? 'text-blue-200' : 'text-neutral-400'">{{ formattedTime }}</span>
      <span v-if="statusIcon === 'sending'" class="icon-[carbon--rotate] size-3 animate-spin [animation-direction:reverse] opacity-60" :class="isSelf ? 'text-blue-200' : 'text-neutral-400'" />
      <span v-else-if="statusIcon === 'unsent' || statusIcon === 'error'" class="icon-[carbon--warning] size-3 text-orange-300" />
      <span v-else-if="statusIcon === 'read'" class="icon-[carbon--checkmark] size-3 text-green-300" />
      <span v-else-if="statusIcon === 'sent'" class="icon-[carbon--checkmark] size-3 opacity-60" :class="isSelf ? 'text-blue-200' : 'text-neutral-400'" />
    </div>
  </div>
</template>
