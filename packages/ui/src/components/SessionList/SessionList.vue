<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { WeilaCore } from '@weilasdk/core';
import type { WL_IDbSession } from '@weilasdk/core';
import { useSessions } from '../../composables/useSessions';
import SessionListItem from './SessionListItem.vue';

interface Props {
  weilaCore: WeilaCore;
  filter?: 'all' | 'personal' | 'group';
}

const props = withDefaults(defineProps<Props>(), {
  filter: 'all',
});

const emit = defineEmits<{
  select: [session: WL_IDbSession];
}>();

const weilaCoreRef = ref(props.weilaCore);

watch(() => props.weilaCore, (newVal) => {
  weilaCoreRef.value = newVal;
});

const { 
  sessions, 
  personalSessions, 
  groupSessions, 
  loading, 
  error, 
  refresh 
} = useSessions(weilaCoreRef);

const filteredSessions = computed(() => {
  switch (props.filter) {
    case 'personal':
      return personalSessions.value;
    case 'group':
      return groupSessions.value;
    default:
      return sessions.value;
  }
});

function handleSelect(session: WL_IDbSession) {
  emit('select', session);
}
</script>

<template>
  <div class="session-list flex flex-col h-full">
    <!-- Header -->
    <div class="header flex items-center justify-between px-4 py-3 border-b border-gray-200">
      <h3 class="font-semibold text-gray-900">Sessions</h3>
      <button 
        @click="refresh"
        class="p-1.5 rounded hover:bg-gray-200 transition-colors"
        title="Refresh"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center py-8 px-4">
      <p class="text-red-500 mb-2">Failed to load sessions</p>
      <p class="text-sm text-gray-500">{{ error.message }}</p>
      <button 
        @click="refresh"
        class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Retry
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredSessions.length === 0" class="flex-1 flex items-center justify-center py-8">
      <p class="text-gray-500">No sessions found</p>
    </div>

    <!-- Session List -->
    <div v-else class="flex-1 overflow-y-auto">
      <SessionListItem
        v-for="session in filteredSessions"
        :key="`${session.sessionId}-${session.sessionType}`"
        :session="session"
        @click="handleSelect"
      />
    </div>
  </div>
</template>

<style scoped>
.session-list {
  background-color: white;
}
</style>
