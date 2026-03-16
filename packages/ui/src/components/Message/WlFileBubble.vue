<script setup lang="ts">
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'

export interface WlFileBubbleProps {
  /** 消息数据 */
  msg: WL_IDbMsgData
  /** 是否为自己发送的消息 */
  isSelf?: boolean
  /** 发送者信息 */
  sender?: WL_IDbUserInfo
}

withDefaults(defineProps<WlFileBubbleProps>(), {
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
</script>

<template>
  <div
    v-if="msg.fileInfo?.fileUrl"
    class="max-w-[70%] rounded-xl overflow-hidden cursor-pointer"
    :class="isSelf ? 'bg-blue-500' : 'bg-white'"
    @click="emit('click', msg.fileInfo!.fileUrl)"
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
          {{ formatFileSize(msg.fileInfo.fileSize) }}
        </div>
      </div>
    </div>
  </div>
</template>
