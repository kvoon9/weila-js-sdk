<script setup lang="ts">
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@vois/weila-sdk-core'
import { WL_IDbMsgDataStatus } from '@vois/weila-sdk-core'
import { useWeilaUiI18n } from '../../i18n'

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

const { t } = useWeilaUiI18n()

const emit = defineEmits<{
  (e: 'click', url: string): void
}>()

function isUploadFailed() {
  return props.msg.status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_UNSENT
    || props.msg.status === WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_ERR
}
</script>

<template>
  <div class="max-w-[70%] rounded-xl overflow-hidden" :class="isSelf ? 'bg-blue-500' : 'bg-white'">
    <img v-if="msg.fileInfo?.fileUrl" :src="msg.fileInfo.fileUrl"
      class="max-w-[200px] max-h-[200px] rounded-xl object-cover cursor-pointer" alt="image"
      @click="emit('click', msg.fileInfo!.fileUrl)" />
    <div v-else class="w-[160px] h-[120px] flex flex-col items-center justify-center gap-2">
      <span class="size-8"
        :class="[isUploadFailed() ? 'icon-[carbon--warning]' : 'icon-[carbon--image]', isSelf ? 'text-blue-100' : 'text-neutral-400']" />
      <span class="text-xs" :class="isSelf ? 'text-blue-100' : 'text-neutral-500'">
        {{ isUploadFailed() ? t('message.uploadFailed') : t('message.uploading') }}
      </span>
    </div>
  </div>
</template>
