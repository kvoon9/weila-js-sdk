<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <slot />
        <slot name="actions">
          <button
            @click="emit('cancel')"
            class="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            Cancel
          </button>
        </slot>
      </div>
    </div>
  </Teleport>
</template>
