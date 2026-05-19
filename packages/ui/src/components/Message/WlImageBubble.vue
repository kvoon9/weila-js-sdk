<script setup lang="ts">
import { computed } from 'vue'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataStatus } from '@weilasdk/core'
import { formatMsgTime } from '@/utils'

export interface WlImageBubbleProps {
  /** 消息数据 */
  msg: WL_IDbMsgData
  /** 是否为自己发送的消息 */
  isSelf?: boolean
  /** 发送者信息 */
  sender?: WL_IDbUserInfo
}

const props = withDefaults(defineProps<WlImageBubbleProps>(), {
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
  <div class="max-w-[70%] rounded-xl overflow-hidden" :class="isSelf ? 'bg-blue-500' : 'bg-white'">
    <img v-if="msg.fileInfo?.fileUrl" :src="msg.fileInfo.fileUrl"
      class="max-w-[200px] max-h-[200px] rounded-xl object-cover cursor-pointer" alt="image"
      @click="emit('click', msg.fileInfo!.fileUrl)" />
    <div v-else class="w-[160px] h-[120px] flex flex-col items-center justify-center gap-2">
      <span class="icon-[carbon--image] size-8" :class="isSelf ? 'text-blue-100' : 'text-neutral-400'" />
      <span class="text-xs" :class="isSelf ? 'text-blue-100' : 'text-neutral-500'">上传中...</span>
    </div>
    <div class="flex items-center justify-end gap-1 p-1.5">
      <span class="text-xs opacity-60" :class="isSelf ? 'text-white' : 'text-neutral-600'">{{ formattedTime }}</span>
      <span v-if="statusIcon === 'sending'" class="icon-[carbon--rotate] size-3 animate-spin [animation-direction:reverse] opacity-60" :class="isSelf ? 'text-white' : 'text-neutral-600'" />
      <span v-else-if="statusIcon === 'unsent' || statusIcon === 'error'" class="icon-[carbon--warning] size-3 text-orange-300" />
      <span v-else-if="statusIcon === 'read'" class="icon-[carbon--checkmark] size-3 text-green-300" />
      <span v-else-if="statusIcon === 'sent'" class="icon-[carbon--checkmark] size-3 opacity-60" :class="isSelf ? 'text-white' : 'text-neutral-600'" />
    </div>
  </div>
</template>
