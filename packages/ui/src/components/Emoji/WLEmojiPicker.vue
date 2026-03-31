<script setup lang="ts">
import { Dropdown } from 'floating-vue'
import WLEmoji from './WLEmoji.vue'

const emit = defineEmits<{
  select: [emoji: string]
}>()

const emojiList = [
  '[微笑]', '[呲牙]', '[傲慢]', '[酷]', '[白眼]', '[不高兴]', '[笑哭]', '[闭嘴]',
  '[持刀]', '[大汗]', '[发怒]', '[感冒]', '[鬼脸]', '[害羞]', '[汗]', '[花痴]',
  '[滑稽]', '[坏笑]', '[机智]', '[惊吓]', '[可怜]', '[抠鼻]', '[哭]', '[左哼哼]',
  '[右哼哼]', '[苦笑]', '[困]', '[懒]', '[流鼻血]', '[亲亲]', '[糗]', '[热泪]',
  '[认真]', '[伤心]', '[衰]', '[委屈]', '[疑问]', '[邪恶]', '[斜眼]', '[中指]',
  '[加好友]', '[再见]', '[皱眉]', '[吐舌]', '[赞]', '[弱]', '[OK]', '[晕]',
  '[吐]', '[紫薇别走]', '[大刀]', '[鬼魂]', '[骷髅]', '[魔鬼]', '[玫瑰]', '[枯萎]',
  '[心]', '[心碎]', '[药丸]', '[咖啡]', '[棒球]', '[橙汁]', '[篮球]', '[礼物]',
  '[啤酒]', '[气球]', '[眼镜]', '[桌球]', '[足球]', '[0]', '[1]', '[2]',
  '[3]', '[4]', '[5]', '[6]', '[7]', '[8]', '[9]',
]

function handleSelect(emoji: string) {
  emit('select', emoji)
}
</script>

<template>
  <Dropdown class="emoji-picker-dropdown" :distance="8" placement="top-start">
    <button class="emoji-trigger" type="button">
      <span class="icon-[carbon--face-neutral] text-xl"></span>
    </button>

    <template #popper="{ hide }">
      <div class="emoji-grid">
        <button v-for="emoji in emojiList" :key="emoji" class="emoji-item" type="button"
          @click="handleSelect(emoji); hide()">
          <WLEmoji :name="emoji" :size="28" />
        </button>
      </div>
    </template>
  </Dropdown>
</template>

<style scoped>
.emoji-trigger {
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
}

.emoji-trigger:hover {
  background-color: rgb(243 244 246);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  padding: 8px;
  max-width: 280px;
}

.emoji-item {
  padding: 0.25rem;
  border-radius: 0.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.emoji-item:hover {
  background-color: rgb(243 244 246);
}
</style>

<style>
/* Hide arrow for emoji picker dropdown */
.emoji-picker-dropdown .v-popper__arrow-inner,
.emoji-picker-dropdown .v-popper__arrow-outer {
  display: none;
}
</style>
