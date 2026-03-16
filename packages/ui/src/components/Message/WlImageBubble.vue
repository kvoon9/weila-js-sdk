<script setup lang="ts">
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'

export interface WlImageBubbleProps {
  /** 消息数据 */
  msg: WL_IDbMsgData
  /** 是否为自己发送的消息 */
  isSelf?: boolean
  /** 发送者信息 */
  sender?: WL_IDbUserInfo
}

withDefaults(defineProps<WlImageBubbleProps>(), {
  isSelf: false,
})

const emit = defineEmits<{
  (e: 'click', url: string): void
}>()
</script>

<template>
  <div class="max-w-[70%] rounded-xl overflow-hidden" :class="isSelf ? 'bg-blue-500' : 'bg-white'">
    <img
      v-if="msg.fileInfo?.fileUrl"
      :src="msg.fileInfo.fileThumbnail || msg.fileInfo.fileUrl"
      class="max-w-[200px] max-h-[200px] rounded-xl object-cover cursor-pointer"
      alt="image"
      @click="emit('click', msg.fileInfo!.fileUrl)"
    />
  </div>
</template>
