import type { Meta, StoryObj } from '@storybook/vue3'
import { WLEmoji } from '../../index'

const meta: Meta<typeof WLEmoji> = {
  title: 'Components/WLEmoji',
  component: WLEmoji,
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'select',
      options: [
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
      ],
      description: 'Emoji 名称',
    },
    size: {
      control: 'number',
      description: '图片尺寸',
    },
  },
  args: {
    name: '[微笑]',
    size: 32,
  },
}

export default meta
type Story = StoryObj<typeof WLEmoji>

export const Default: Story = {
  args: {
    name: '[微笑]',
  },
}

export const All: Story = {
  render: () => ({
    components: { WLEmoji },
    setup() {
      const emojis = [
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
      return { emojis }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; padding: 16px;">
        <div v-for="emoji in emojis" :key="emoji" style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <WLEmoji :name="emoji" :size="32" />
          <span style="font-size: 10px; color: #666;">{{ emoji }}</span>
        </div>
      </div>
    `,
  }),
}

export const Large: Story = {
  args: {
    name: '[微笑]',
    size: 64,
  },
}
