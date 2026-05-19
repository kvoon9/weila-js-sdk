<script setup lang="ts">
import { computed } from 'vue'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataStatus } from '@weilasdk/core'
import WLEmoji from '@/components/Emoji/WLEmoji.vue'
import { parseTextWithEmoji, formatMsgTime } from '@/utils'

export interface WlTextBubbleProps {
  /** 消息数据 */
  msg: WL_IDbMsgData
  /** 是否为自己发送的消息 */
  isSelf?: boolean
  /** 发送者信息 */
  sender?: WL_IDbUserInfo
}

const props = withDefaults(defineProps<WlTextBubbleProps>(), {
  isSelf: false,
})

const parsedText = computed(() => parseTextWithEmoji(props.msg.textData || ''))

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
    class="max-w-[70%] rounded-xl px-3 py-2 text-sm break-all whitespace-pre-wrap overflow-hidden"
    :class="isSelf ? 'bg-blue-500 text-white' : 'bg-white text-neutral-900'"
  >
    <span v-for="(token, index) in parsedText" :key="index">
      <WLEmoji v-if="token.type === 'emoji'" :name="token.value" :size="24" />
      <template v-else>{{ token.value }}</template>
    </span>
    <div class="flex items-center justify-end gap-1 mt-1 -mb-1 -mr-1">
      <span class="text-xs opacity-60">{{ formattedTime }}</span>
      <span v-if="statusIcon === 'sending'" class="icon-[carbon--rotate] size-3 animate-spin [animation-direction:reverse] opacity-60" />
      <span v-else-if="statusIcon === 'unsent' || statusIcon === 'error'" class="icon-[carbon--warning] size-3 text-orange-300" />
      <span v-else-if="statusIcon === 'read'" class="icon-[carbon--checkmark] size-3 text-green-300" />
      <span v-else-if="statusIcon === 'sent'" class="icon-[carbon--checkmark] size-3 opacity-60" />
    </div>
  </div>
</template>
