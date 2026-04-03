<script setup lang="ts">
import { useGroups, type GroupItem } from '../../queries/groups'

interface Emits {
  select: [group: GroupItem]
  create: []
  refresh: []
}

const emit = defineEmits<Emits>()

const { data: groups, isLoading, error, refetch } = useGroups()

function handleSelect(group: GroupItem) {
  emit('select', group)
}

function handleCreate() {
  emit('create')
}

function handleRefresh() {
  refetch()
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
      <h2 class="text-base font-semibold text-neutral-900">群组</h2>
      <div class="flex items-center gap-1">
        <button @click="handleRefresh"
          class="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors"
          title="刷新">
          <span class="icon-[carbon--refresh] text-lg"></span>
        </button>
        <button @click="handleCreate"
          class="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors"
          title="创建群组">
          <span class="icon-[carbon--add] text-lg"></span>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center h-full">
        <div class="text-neutral-500">加载中...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center h-full">
        <div class="text-red-500 text-center px-4">
          <p class="mb-2">加载失败</p>
          <button @click="handleRefresh" class="text-sm text-blue-500 hover:underline">重试</button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!groups || groups.length === 0" class="flex flex-col items-center justify-center h-full text-neutral-400">
        <span class="icon-[carbon--group] text-4xl mb-2"></span>
        <p class="text-sm">暂无群组</p>
        <button @click="handleCreate" class="mt-3 text-sm text-blue-500 hover:underline">
          创建第一个群组
        </button>
      </div>

      <!-- Group List -->
      <div v-else class="p-2 space-y-1">
        <button v-for="group in groups" :key="group.groupId"
          @click="handleSelect(group)"
          class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors text-left">
          <!-- Avatar -->
          <div class="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden shrink-0">
            <img v-if="group.avatar" :src="group.avatar" :alt="group.name" class="w-full h-full object-cover" />
            <span v-else class="icon-[carbon--group] text-xl text-neutral-400"></span>
          </div>
          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-neutral-900 truncate">{{ group.name }}</span>
              <span v-if="group.isPublic" class="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs shrink-0">公开</span>
            </div>
            <p class="text-xs text-neutral-500 mt-0.5">{{ group.memberCount }} 位成员</p>
          </div>
          <!-- Arrow -->
          <span class="icon-[carbon--chevron-right] text-neutral-400 shrink-0"></span>
        </button>
      </div>
    </div>
  </div>
</template>
