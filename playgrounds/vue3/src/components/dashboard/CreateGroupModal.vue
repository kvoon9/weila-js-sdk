<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  visible: boolean
}

interface Emits {
  close: []
  created: [groupName: string, isPublic: boolean]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const groupName = ref('')
const isPublic = ref(false)
const creating = ref(false)
const error = ref('')

function handleClose() {
  groupName.value = ''
  isPublic.value = false
  creating.value = false
  error.value = ''
  emit('close')
}

function handleCreate() {
  if (!groupName.value.trim()) {
    error.value = '请输入群组名称'
    return
  }
  emit('created', groupName.value.trim(), isPublic.value)
}

function handleCreated() {
  handleClose()
}

function handleCreateFailed(errMessage: string) {
  error.value = errMessage
  creating.value = false
}

function setCreating(value: boolean) {
  creating.value = value
  if (value) {
    error.value = ''
  }
}

defineExpose({
  handleCreated,
  handleCreateFailed,
  setCreating,
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="handleClose">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-neutral-900">创建群组</h2>
          <button @click="handleClose" class="p-1 rounded hover:bg-neutral-100 text-neutral-500">
            <span class="icon-[carbon--close] text-xl"></span>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4">
          <!-- Group Name -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1.5">群组名称</label>
            <input v-model="groupName" type="text" placeholder="请输入群组名称"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              @keyup.enter="handleCreate" />
          </div>

          <!-- Public Type -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1.5">群组类型</label>
            <div class="flex gap-3">
              <button @click="isPublic = false" :class="[
                'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border',
                !isPublic
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              ]">
                私有群
              </button>
              <button @click="isPublic = true" :class="[
                'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border',
                isPublic
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              ]">
                公开群
              </button>
            </div>
            <p class="mt-1.5 text-xs text-neutral-500">
              {{ isPublic ? '任何人都可以加入公开群' : '需要群主审核才能加入私有群' }}
            </p>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="text-sm text-red-600">
            {{ error }}
          </div>
        </div>

        <!-- Actions -->
        <div class="px-6 py-4 border-t border-neutral-200 flex gap-3">
          <button @click="handleClose"
            class="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 text-sm font-medium">
            取消
          </button>
          <button @click="handleCreate" :disabled="creating || !groupName.trim()"
            class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {{ creating ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
