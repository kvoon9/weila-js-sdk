import type { Meta, StoryObj } from '@storybook/vue3'
import WlAudioBubble from '../components/Message/WlAudioBubble.vue'

const meta: Meta<typeof WlAudioBubble> = {
  title: 'Components/WlAudioBubble',
  component: WlAudioBubble,
  tags: ['autodocs'],
  decorators: [
    () => ({
      template:
        '<div class="p-6 bg-neutral-100 flex items-center justify-center min-h-[120px]"><story /></div>',
    }),
  ],
  argTypes: {
    duration: {
      control: { type: 'range', min: 1, max: 60, step: 1 },
    },
    isSelf: { control: 'boolean' },
    playing: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof WlAudioBubble>

/** 接收方音频消息（左侧） */
export const Received: Story = {
  args: {
    duration: 3,
    isSelf: false,
    playing: false,
  },
}

/** 发送方音频消息（右侧） */
export const Sent: Story = {
  args: {
    duration: 8,
    isSelf: true,
    playing: false,
  },
}

/** 正在播放 */
export const Playing: Story = {
  args: {
    duration: 15,
    isSelf: false,
    playing: true,
  },
}

/** 长语音消息（接近最大宽度） */
export const LongDuration: Story = {
  args: {
    duration: 55,
    isSelf: true,
    playing: false,
  },
}

/** 短语音消息（最小宽度） */
export const ShortDuration: Story = {
  args: {
    duration: 1,
    isSelf: false,
    playing: false,
  },
}

/** 多条音频消息在聊天列表中的效果 */
export const InChatContext: Story = {
  render: () => ({
    components: { WlAudioBubble },
    template: `
      <div class="flex flex-col gap-3 w-[400px]">
        <div class="flex justify-start">
          <WlAudioBubble :duration="3" :is-self="false" />
        </div>
        <div class="flex justify-end">
          <WlAudioBubble :duration="12" :is-self="true" />
        </div>
        <div class="flex justify-start">
          <WlAudioBubble :duration="25" :is-self="false" :playing="true" />
        </div>
        <div class="flex justify-end">
          <WlAudioBubble :duration="1" :is-self="true" />
        </div>
      </div>
    `,
  }),
}
