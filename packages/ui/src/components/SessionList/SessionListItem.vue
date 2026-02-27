<script setup lang="ts">
import { computed } from 'vue';
import type { WL_IDbSession } from '@weilasdk/core';

interface Props {
  session: WL_IDbSession;
  active?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
});

const emit = defineEmits<{
  click: [session: WL_IDbSession];
}>();

const sessionName = computed(() => {
  return props.session.sessionName || 'Unknown';
});

const lastMessageTime = computed(() => {
  const time = props.session.latestUpdate;
  if (!time) return '';
  
  const date = new Date(time);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
});

const unreadCount = computed(() => {
  const readMsgId = props.session.readMsgId || 0;
  const lastMsgId = props.session.lastMsgId || 0;
  return Math.max(0, lastMsgId - readMsgId);
});

const sessionTypeLabel = computed(() => {
  switch (props.session.sessionType) {
    case 0x01:
      return 'Personal';
    case 0x02:
      return 'Group';
    case 0x08:
      return 'Service';
    default:
      return '';
  }
});

function handleClick() {
  emit('click', props.session);
}
</script>

<template>
  <div
    class="session-list-item flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 transition-colors"
    :class="{ 'bg-blue-50': active }"
    @click="handleClick"
  >
    <!-- Avatar -->
    <div class="avatar flex-shrink-0 w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
      <img
        v-if="session.sessionAvatar"
        :src="session.sessionAvatar"
        :alt="sessionName"
        class="w-full h-full object-cover"
      />
      <span v-else class="text-lg font-medium text-gray-500">
        {{ sessionName.charAt(0).toUpperCase() }}
      </span>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <span class="font-medium text-gray-900 truncate">
          {{ sessionName }}
        </span>
        <span class="text-xs text-gray-500 flex-shrink-0 ml-2">
          {{ lastMessageTime }}
        </span>
      </div>
      
      <div class="flex items-center justify-between mt-0.5">
        <span class="text-sm text-gray-500 truncate">
          {{ sessionTypeLabel }}
        </span>
        <span
          v-if="unreadCount > 0"
          class="flex-shrink-0 min-w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full px-1.5"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-list-item {
  user-select: none;
}
</style>
