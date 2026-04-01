import type { Meta, StoryObj } from '@storybook/vue3'
import WlTextBubble from '../components/Message/WlTextBubble.vue'

const meta: Meta<typeof WlTextBubble> = {
  title: 'Components/WlTextBubble',
  component: WlTextBubble,
  tags: ['autodocs'],
  decorators: [
    () => ({
      template: '<div class="p-6 bg-neutral-100 flex flex-col gap-4"><story /></div>',
    }),
  ],
  argTypes: {
    isSelf: { control: 'boolean' },
    'msg.textData': { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof WlTextBubble>

const msg = (textData: string) => ({ textData }) as any

/** 普通文本消息 */
export const PlainText: Story = {
  args: {
    msg: msg('Hello, World!'),
    isSelf: false,
  },
}

/** 发送方普通文本 */
export const PlainTextSelf: Story = {
  args: {
    msg: msg('这是一条我发送的消息'),
    isSelf: true,
  },
}

/** 带单个 emoji 的消息 */
export const SingleEmoji: Story = {
  args: {
    msg: msg('Hello [微笑] World'),
    isSelf: false,
  },
}

/** 多个 emoji 混排 */
export const MultipleEmoji: Story = {
  args: {
    msg: msg('[微笑][呲牙][酷]'),
    isSelf: false,
  },
}

/** 发送方带 emoji */
export const SelfWithEmoji: Story = {
  args: {
    msg: msg('收到！[微笑][赞]'),
    isSelf: true,
  },
}

/** emoji 在开头 */
export const EmojiAtStart: Story = {
  args: {
    msg: msg('[微笑] 早上好！'),
    isSelf: false,
  },
}

/** emoji 在末尾 */
export const EmojiAtEnd: Story = {
  args: {
    msg: msg('明天见[再见]'),
    isSelf: false,
  },
}

/** 多行文本带 emoji */
export const MultiLineWithEmoji: Story = {
  args: {
    msg: msg('第一行\n第二行 [微笑]\n第三行'),
    isSelf: false,
  },
}

/** 聊天上下文效果 */
export const InChatContext: Story = {
  render: () => ({
    components: { WlTextBubble },
    template: `
      <div class="flex flex-col gap-3 w-[400px]">
        <div class="flex justify-start">
          <WlTextBubble :msg="msg1" :is-self="false" />
        </div>
        <div class="flex justify-end">
          <WlTextBubble :msg="msg2" :is-self="true" />
        </div>
        <div class="flex justify-start">
          <WlTextBubble :msg="msg3" :is-self="false" />
        </div>
        <div class="flex justify-end">
          <WlTextBubble :msg="msg4" :is-self="true" />
        </div>
      </div>
    `,
    data() {
      return {
        msg1: msg('你好！'),
        msg2: msg('嗨，你好吗？[微笑]'),
        msg3: msg('挺好的，谢谢！[赞][微笑]'),
        msg4: msg('[呲牙]'),
      }
    },
  }),
}
