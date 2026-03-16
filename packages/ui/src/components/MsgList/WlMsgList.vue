<script setup lang="ts">
import { ref } from 'vue'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataType } from '@weilasdk/core'
import WlAudioBubble from '../Message/WlAudioBubble.vue'
import WlTextBubble from '../Message/WlTextBubble.vue'
import WlImageBubble from '../Message/WlImageBubble.vue'
import WlLocationBubble from '../Message/WlLocationBubble.vue'
import WlFileBubble from '../Message/WlFileBubble.vue'
import WlUnknownBubble from '../Message/WlUnknownBubble.vue'
import { framesToDuration } from '../../composables/useAudio'

export interface WlMsgListProps {
  /** 消息列表 */
  messages: WL_IDbMsgData[]
  /** 当前登录用户 ID，用于判断消息方向 */
  currentUserId: number
  /** 发送者信息 Map，key 为 userId */
  senderInfos?: Map<number, WL_IDbUserInfo>
}

const props = withDefaults(defineProps<WlMsgListProps>(), {
  senderInfos: () => new Map(),
})

const emit = defineEmits<{
  /** 播放音频消息 */
  'audio-play': [msg: WL_IDbMsgData]
  /** 暂停音频消息 */
  'audio-pause': [msg: WL_IDbMsgData]
}>()

/** 当前正在播放的音频消息 combo_id */
const playingAudioId = ref<string | null>(null)

function getSender(msg: WL_IDbMsgData) {
  return props.senderInfos.get(msg.senderId)
}

function isSelf(msg: WL_IDbMsgData) {
  return msg.senderId === props.currentUserId
}

const isText = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE
const isAudio = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE
const isImage = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE
const isLocation = (msg: WL_IDbMsgData) =>
  msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE
const isFile = (msg: WL_IDbMsgData) => msg.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE

function getAudioDuration(msg: WL_IDbMsgData): number {
  return framesToDuration(msg.audioData?.frameCount ?? 0)
}

function handleAudioPlay(msg: WL_IDbMsgData) {
  playingAudioId.value = msg.combo_id
}

function handleAudioPause() {
  playingAudioId.value = null
}
</script>

<template>
  <div class="flex flex-col h-full bg-neutral-100 overflow-y-auto px-4 py-3">
    <div
      v-for="msg in messages"
      :key="msg.combo_id"
      class="flex items-start gap-2 py-1.5"
      :class="isSelf(msg) ? 'flex-row-reverse' : ''"
    >
      <!-- Avatar -->
      <div
        class="shrink-0 size-9 rounded-lg overflow-hidden bg-neutral-300 flex items-center justify-center"
      >
        <img
          v-if="getSender(msg)?.avatar"
          :src="getSender(msg)!.avatar"
          class="size-full object-cover"
          alt=""
        />
        <span v-else class="icon-[carbon--user-avatar-filled] size-6 text-neutral-500" />
      </div>

      <!-- Text Message -->
      <template v-if="isText(msg)">
        <slot name="text" :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)">
          <WlTextBubble :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)" />
        </slot>
      </template>

      <!-- Audio Message -->
      <template v-else-if="isAudio(msg)">
        <slot
          name="audio"
          :msg="msg"
          :is-self="isSelf(msg)"
          :sender="getSender(msg)"
          :playing="playingAudioId === msg.combo_id"
          :on-play="
            () => {
              handleAudioPlay(msg)
              $emit('audio-play', msg)
            }
          "
          :on-pause="
            () => {
              handleAudioPause()
              $emit('audio-pause', msg)
            }
          "
        >
          <WlAudioBubble
            :duration="getAudioDuration(msg)"
            :is-self="isSelf(msg)"
            :playing="playingAudioId === msg.combo_id"
            @play="
              () => {
                handleAudioPlay(msg)
                $emit('audio-play', msg)
              }
            "
            @pause="
              () => {
                handleAudioPause()
                $emit('audio-pause', msg)
              }
            "
          />
        </slot>
      </template>

      <!-- Image Message -->
      <template v-else-if="isImage(msg) && msg.fileInfo?.fileUrl">
        <slot name="image" :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)">
          <WlImageBubble :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)" />
        </slot>
      </template>

      <!-- Location Message -->
      <template v-else-if="isLocation(msg) && msg.location">
        <slot name="location" :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)">
          <WlLocationBubble :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)" />
        </slot>
      </template>

      <!-- File Message -->
      <template v-else-if="isFile(msg) && msg.fileInfo?.fileUrl">
        <slot name="file" :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)">
          <WlFileBubble :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)" />
        </slot>
      </template>

      <!-- Unsupported Message Type -->
      <template v-else>
        <slot name="unknown" :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)">
          <WlUnknownBubble :msg="msg" :is-self="isSelf(msg)" :sender="getSender(msg)" />
        </slot>
      </template>
    </div>
  </div>
</template>
