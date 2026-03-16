<script setup lang="ts">
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'

export interface WlTextBubbleProps {
  /** 消息数据 */
  msg: WL_IDbMsgData
  /** 是否为自己发送的消息 */
  isSelf?: boolean
  /** 发送者信息 */
  sender?: WL_IDbUserInfo
}

withDefaults(defineProps<WlTextBubbleProps>(), {
  isSelf: false,
})
</script>

<template>
  <div
    class="max-w-[70%] rounded-xl px-3 py-2 text-sm break-all whitespace-pre-wrap overflow-hidden"
    :class="isSelf ? 'bg-blue-500 text-white' : 'bg-white text-neutral-900'"
  >
    {{ msg.textData || '' }}
  </div>
</template>
