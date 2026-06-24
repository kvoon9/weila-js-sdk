<script setup lang="ts">
import { computed } from 'vue'
import type { WL_IDbSession } from '@weilasdk/core'
import { isGroupSessionType, isIndividualSessionType, WL_IDbMsgDataType } from '@weilasdk/core'
import WlAvatar from '../Avatar/WlAvatar.vue'
import { useWeilaUiI18n } from '../../i18n'

interface Props {
  session: WL_IDbSession
  active?: boolean
  deleting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  deleting: false,
})

const emit = defineEmits<{
  click: [session: WL_IDbSession]
  delete: [session: WL_IDbSession]
}>()

const { t } = useWeilaUiI18n()

const sessionName = computed(() => {
  return props.session.sessionName || t('session.unknown')
})

const lastMessageTime = computed(() => {
  const time = props.session.latestUpdate
  if (!time) return ''

  // latestUpdate is stored as Unix timestamp in seconds, convert to milliseconds
  const date = new Date(time * 1000)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  } else if (diffDays === 1) {
    return t('session.yesterday')
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
})

const unreadCount = computed(() => {
  return Math.max(0, props.session.unreadCount || 0)
})

const sessionTypeLabel = computed(() => {
  switch (props.session.sessionType) {
    case 0x01:
      return t('session.type.personal')
    case 0x02:
      return t('session.type.group')
    case 0x08:
      return t('session.type.service')
    case 0x11:
      return t('session.type.corpPersonal')
    case 0x12:
      return t('session.type.corpGroup')
    case 0x13:
      return t('session.type.corpTempGroup')
    default:
      return ''
  }
})

const isIndividual = computed(() => isIndividualSessionType(props.session.sessionType))
const isGroup = computed(() => isGroupSessionType(props.session.sessionType))
const memberCount = computed(() => {
  const extra = props.session.extra
  if (extra && typeof extra === 'object' && 'memberCount' in extra) {
    const count = Number(extra.memberCount)
    return Number.isFinite(count) ? count : 0
  }
  return 0
})

const messagePreview = computed(() => {
  const msg = props.session.lastMsgData
  if (!msg) return sessionTypeLabel.value

  switch (msg.msgType) {
    case WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE:
      return msg.textData || ''
    case WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE:
      return t('session.preview.image')
    case WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE:
      return t('session.preview.voice')
    case WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE:
      return t('session.preview.video')
    case WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE:
      return `${t('session.preview.file')} ${msg.fileInfo?.fileName || ''}`.trim()
    case WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE:
      return t('session.preview.location')
    case WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE:
      return t('session.preview.ptt')
    default:
      return sessionTypeLabel.value
  }
})

function handleClick() {
  emit('click', props.session)
}

function handleDelete() {
  if (props.deleting) return
  emit('delete', props.session)
}
</script>

<template>
  <div
    class="session-list-item group flex items-center gap-3 p-3 cursor-pointer rounded-lg transition-colors"
    :class="[
      active ? 'bg-neutral-100' : 'hover:bg-neutral-50'
    ]"
    @click="handleClick"
  >
    <WlAvatar
      :src="session.sessionAvatar"
      :name="sessionName"
      size-class="w-12 h-12"
      rounded-class="rounded-full"
      bg-class="bg-neutral-200"
      fallback-class="text-lg font-medium text-neutral-400"
    />

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-1 min-w-0">
          <span class="text-sm font-medium text-neutral-900 truncate">
            {{ sessionName }}
          </span>
          <span
            class="text-xs text-neutral-400 flex-shrink-0"
            :class="isIndividual ? 'icon-[carbon--user]' : isGroup ? 'icon-[carbon--group]' : ''"
          />
          <span v-if="isGroup" class="text-xs text-neutral-400 flex-shrink-0">({{ memberCount }})</span>
        </span>
        <span class="text-xs text-neutral-500 flex-shrink-0 ml-2">
          {{ lastMessageTime }}
        </span>
      </div>

      <div class="flex items-center justify-between mt-0.5">
        <span class="text-xs text-neutral-500 truncate">
          {{ messagePreview }}
        </span>
        <span
          v-if="unreadCount > 0"
          class="flex-shrink-0 min-w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full px-1.5"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </div>
    </div>

    <button
      type="button"
      class="delete-button flex-shrink-0 w-8 h-8 inline-flex items-center justify-center rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="deleting"
      :title="deleting ? t('session.deleting') : t('session.deleteSession')"
      @click.stop="handleDelete"
    >
      <svg
        v-if="!deleting"
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-8 0h10"
        />
      </svg>
      <span
        v-else
        class="h-4 w-4 rounded-full border-2 border-neutral-300 border-t-red-500 animate-spin"
        aria-hidden="true"
      ></span>
    </button>
  </div>
</template>

<style scoped>
.session-list-item {
  user-select: none;
}

.delete-button {
  opacity: 0;
}

.session-list-item:hover .delete-button,
.session-list-item:focus-within .delete-button {
  opacity: 1;
}
</style>
