<script setup lang="ts">
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@vois/weila-sdk-core'
import { useWeilaUiI18n } from '../../i18n'

export interface WlUnknownBubbleProps {
  /** 消息数据 */
  msg: WL_IDbMsgData
  /** 是否为自己发送的消息 */
  isSelf?: boolean
  /** 发送者信息 */
  sender?: WL_IDbUserInfo
}

const props = withDefaults(defineProps<WlUnknownBubbleProps>(), {
  isSelf: false,
})

const { t } = useWeilaUiI18n()
</script>

<template>
  <div
    class="max-w-[70%] rounded-xl px-3 py-2 text-sm overflow-hidden break-all"
    :class="isSelf ? 'bg-blue-500 text-blue-200' : 'bg-white text-neutral-400'"
  >
    <div>{{ t('message.unsupported') }}</div>
  </div>
</template>
