<script setup lang="ts">
import { computed } from 'vue'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataStatus } from '@weilasdk/core'
import { isValidLocation, formatMsgTime } from '../../utils'
import { useWeilaUiI18n } from '../../i18n'

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

const { t } = useWeilaUiI18n()

const emit = defineEmits<{
  (e: 'click', location: { latitude: number; longitude: number; name: string; address: string }): void
}>()

function handleClick() {
  if (!props.msg.location) return

  const location = {
    latitude: props.msg.location.latitude,
    longitude: props.msg.location.longitude,
    name: props.msg.location.name || '',
    address: props.msg.location.address || '',
  }
  if (isValidLocation(location)) {
    emit('click', location)
  }
}

const formattedTime = computed(() => formatMsgTime(props.msg.created, t))

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
    <div class="flex items-center justify-end gap-1 px-2 pb-1.5 -mt-1">
      <span class="text-xs opacity-60" :class="isSelf ? 'text-blue-200' : 'text-neutral-400'">{{ formattedTime }}</span>
      <span v-if="statusIcon === 'sending'" class="icon-[carbon--rotate] size-3 animate-spin [animation-direction:reverse] opacity-60" :class="isSelf ? 'text-blue-200' : 'text-neutral-400'" />
      <span v-else-if="statusIcon === 'unsent' || statusIcon === 'error'" class="icon-[carbon--warning] size-3 text-orange-300" />
      <span v-else-if="statusIcon === 'read'" class="icon-[carbon--checkmark] size-3 text-green-300" />
      <span v-else-if="statusIcon === 'sent'" class="icon-[carbon--checkmark] size-3 opacity-60" :class="isSelf ? 'text-blue-200' : 'text-neutral-400'" />
    </div>
  </div>
</template>
