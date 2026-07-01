<script setup lang="ts">
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@vois/weila-sdk-core'
import { useWeilaUiI18n } from '../../i18n'

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

const { t } = useWeilaUiI18n()

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
          {{ msg.fileInfo.fileName || t('message.file') }}
        </div>
        <div class="text-xs mt-0.5" :class="isSelf ? 'text-blue-200' : 'text-neutral-400'">
          {{ msg.fileInfo?.fileUrl ? formatFileSize(msg.fileInfo.fileSize) : t('message.uploading') }}
        </div>
      </div>
    </div>
  </div>
</template>
