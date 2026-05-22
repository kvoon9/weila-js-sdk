<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { Dropdown } from 'floating-vue'

import WLEmojiPicker from '../Emoji/WLEmojiPicker.vue'
import WlPttButton from '../PttButton/WlPttButton.vue'
import { useWeilaUiI18n } from '../../i18n'

export interface WlChatComposerProps {
  modelValue?: string
  pttStatus?: 'idle' | 'recording' | 'processing'
  disabled?: boolean
}

const props = withDefaults(defineProps<WlChatComposerProps>(), {
  modelValue: '',
  pttStatus: 'idle',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send': []
  'emoji-select': [emoji: string]
  'image-selected': [event: Event]
  'file-selected': [event: Event]
  'video-selected': [event: Event]
  'trigger-map-picker': []
  'ptt-start': []
  'ptt-stop': []
}>()

const { t } = useWeilaUiI18n()

const imageInputRef = useTemplateRef<HTMLInputElement>('imageInput')
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInput')
const videoInputRef = useTemplateRef<HTMLInputElement>('videoInput')

function triggerImagePicker() {
  if (props.disabled) return
  imageInputRef.value?.click()
}

function triggerFilePicker() {
  if (props.disabled) return
  fileInputRef.value?.click()
}

function triggerVideoPicker() {
  if (props.disabled) return
  videoInputRef.value?.click()
}
</script>

<template>
  <div class="mt-4 flex gap-2 items-center">
    <Dropdown class="media-dropdown" :distance="8" placement="top-start">
      <button class="p-2 border-0 bg-transparent rounded-lg hover:bg-neutral-100 disabled:opacity-50" type="button"
        :disabled="disabled">
        <span class="icon-[carbon--add] text-xl"></span>
      </button>
      <template #popper="{ hide }">
        <div class="py-1 min-w-36">
          <button type="button"
            class="w-full px-4 py-2 border-0 bg-transparent text-left hover:bg-neutral-50 flex items-center gap-2"
            @click="triggerImagePicker(); hide()">
            <span class="icon-[carbon--image]"></span> {{ t('chat.sendImage') }}
          </button>
          <button type="button"
            class="w-full px-4 py-2 border-0 bg-transparent text-left hover:bg-neutral-50 flex items-center gap-2"
            @click="triggerFilePicker(); hide()">
            <span class="icon-[carbon--document]"></span> {{ t('chat.sendFile') }}
          </button>
          <button type="button"
            class="w-full px-4 py-2 border-0 bg-transparent text-left hover:bg-neutral-50 flex items-center gap-2"
            @click="triggerVideoPicker(); hide()">
            <span class="icon-[carbon--video]"></span> {{ t('chat.sendVideo') }}
          </button>
          <button type="button"
            class="w-full px-4 py-2 border-0 bg-transparent text-left hover:bg-neutral-50 flex items-center gap-2"
            @click="emit('trigger-map-picker'); hide()">
            <span class="icon-[carbon--location]"></span> {{ t('chat.sendLocation') }}
          </button>
        </div>
      </template>
    </Dropdown>

    <WLEmojiPicker @select="emit('emoji-select', $event)" />
    <input :value="modelValue" type="text" :placeholder="t('chat.inputPlaceholder')"
      class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      :disabled="disabled" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="emit('send')" />
    <button type="button" class="wl-chat-composer__send-button" :disabled="disabled" @click="emit('send')">
      {{ t('chat.send') }}
    </button>
    <WlPttButton :status="pttStatus" size="md" :disabled="disabled" @start="emit('ptt-start')"
      @stop="emit('ptt-stop')" />
    <input ref="imageInput" type="file" accept="image/*" class="hidden" @change="emit('image-selected', $event)" />
    <input ref="fileInput" type="file" class="hidden" @change="emit('file-selected', $event)" />
    <input ref="videoInput" type="file" accept="video/*" class="hidden" @change="emit('video-selected', $event)" />
  </div>
</template>

<style>
.media-dropdown .v-popper__arrow-inner,
.media-dropdown .v-popper__arrow-outer {
  display: none;
}
</style>

<style scoped>
.wl-chat-composer__send-button {
  padding: 0.5rem 1rem;
  border: 0;
  border-radius: 0.5rem;
  background-color: #3b82f6;
  color: #fff;
  cursor: pointer;
  font: inherit;
  line-height: 1.5;
}

.wl-chat-composer__send-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.wl-chat-composer__send-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.wl-chat-composer__send-button:focus {
  outline: none;
}
</style>
