<template>
  <img v-if="src" :src="src" :alt="name" :width="size" :height="size" style="display: inline; vertical-align: middle" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Emoji 名称，如 '[微笑]' */
    name: string
    /** 图片尺寸，默认 32 */
    size?: string | number
  }>(),
  {
    size: 32,
  },
)

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

const src = computed(() => {
  const index = emojiList.indexOf(props.name)
  if (index === -1) return ''
  return new URL(`./assets/face_${index + 1}.png`, import.meta.url).href
})
</script>
