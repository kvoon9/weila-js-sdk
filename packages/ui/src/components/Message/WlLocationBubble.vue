<script setup lang="ts">
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { isValidLocation } from '../../utils'

export interface WlLocationBubbleProps {
  /** 消息数据 */
  msg: WL_IDbMsgData
  /** 是否为自己发送的消息 */
  isSelf?: boolean
  /** 发送者信息 */
  sender?: WL_IDbUserInfo
}

const props = withDefaults(defineProps<WlLocationBubbleProps>(), {
  isSelf: false,
})

const emit = defineEmits<{
  (e: 'click', location: { latitude: number; longitude: number }): void
}>()

function handleClick() {
  if (!props.msg.location) return

  const location = {
    latitude: props.msg.location.latitude,
    longitude: props.msg.location.longitude,
  }
  if (isValidLocation(location)) {
    emit('click', location)
  }
}
</script>

<template>
  <div
    v-if="msg.location"
    class="max-w-[240px] rounded-xl overflow-hidden cursor-pointer"
    :class="isSelf ? 'bg-blue-500' : 'bg-white'"
    @click="handleClick"
  >
    <img
      v-if="msg.location.mapUrl"
      :src="msg.location.mapUrl"
      class="w-full h-[120px] object-cover"
      alt="location"
    />
    <div class="px-3 py-2">
      <div
        v-if="msg.location.name"
        class="text-sm font-medium truncate"
        :class="isSelf ? 'text-white' : 'text-neutral-900'"
      >
        {{ msg.location.name }}
      </div>
      <div
        v-if="msg.location.address"
        class="text-xs truncate"
        :class="isSelf ? 'text-blue-100' : 'text-neutral-500'"
      >
        {{ msg.location.address }}
      </div>
    </div>
  </div>
</template>
