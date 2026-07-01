<script setup lang="ts">
import { computed } from 'vue'
import type { WL_IDbSession } from '@vois/weila-sdk-core'
import { isGroupSessionType, isIndividualSessionType } from '@vois/weila-sdk-core'
import SessionListItem from './SessionListItem.vue'
import { useWeilaUiI18n } from '../../i18n'

interface Props {
  sessions: WL_IDbSession[]
  activeSessionId?: string
  activeSessionType?: number
  deletingSessionKey?: string
  loading?: boolean
  error?: Error | null
  filter?: 'all' | 'personal' | 'group'
  disabledSessionKeys?: Set<string>
}

const props = withDefaults(defineProps<Props>(), {
  activeSessionId: '',
  deletingSessionKey: '',
  loading: false,
  error: null,
  filter: 'all',
})

const emit = defineEmits<{
  select: [session: WL_IDbSession]
  delete: [session: WL_IDbSession]
  refresh: []
}>()

const { t } = useWeilaUiI18n()

const filteredSessions = computed(() => {
  switch (props.filter) {
    case 'personal':
      return props.sessions.filter((s) => isIndividualSessionType(s.sessionType))
    case 'group':
      return props.sessions.filter((s) => isGroupSessionType(s.sessionType))
    default:
      return props.sessions
  }
})

function handleSelect(session: WL_IDbSession) {
  emit('select', session)
}

function handleDelete(session: WL_IDbSession) {
  emit('delete', session)
}

function handleRefresh() {
  emit('refresh')
}
</script>

<template>
  <div class="session-list flex flex-col h-full">
    <!-- Header -->
    <div class="header flex items-center justify-between px-4 py-3 border-b border-neutral-100">
      <h3 class="font-semibold text-neutral-900">{{ t('session.title') }}</h3>
      <div class="flex items-center gap-1">
        <slot name="header-actions" />
        <button @click="handleRefresh" class="p-1.5 rounded hover:bg-neutral-100 transition-colors" :title="t('session.refresh')">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center py-8 px-4">
      <p class="text-red-500 mb-2">{{ t('session.failedToLoad') }}</p>
      <p class="text-sm text-neutral-500">{{ error.message }}</p>
      <button @click="handleRefresh"
        class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
        {{ t('session.retry') }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredSessions.length === 0" class="flex-1 flex items-center justify-center py-8">
      <p class="text-neutral-500">{{ t('session.empty') }}</p>
    </div>

    <!-- Session List -->
    <div v-else class="flex-1 overflow-y-auto">
      <SessionListItem v-for="session in filteredSessions" :key="`${session.sessionId}-${session.sessionType}`"
        :session="session"
        :active="session.sessionId === activeSessionId && (activeSessionType === undefined || session.sessionType === activeSessionType)"
        :deleting="`${session.sessionId}-${session.sessionType}` === deletingSessionKey"
        :disabled="disabledSessionKeys?.has(`${session.sessionId}_${session.sessionType}`) ?? false" @click="handleSelect"
        @delete="handleDelete" />
    </div>

    <div v-if="$slots.footer" class="border-t border-neutral-100 p-3">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.session-list {
  background-color: white;
}
</style>
