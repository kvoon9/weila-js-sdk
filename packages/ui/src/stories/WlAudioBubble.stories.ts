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
    isSelf: { control: 'boolean' },
    playing: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof WlAudioBubble>

// Helper to create audio message as core returns it.
const createAudioMsg = (seconds: number, extra = {}) => ({
  audioData: { frameCount: seconds * 50 },
  created: Date.now() / 1000,
  ...extra,
})

/** 接收方音频消息（左侧） */
export const Received: Story = {
  args: {
    msg: createAudioMsg(3),
    isSelf: false,
    playing: false,
  },
}

/** 发送方音频消息（右侧） */
export const Sent: Story = {
  args: {
    msg: createAudioMsg(8, { status: 2 }),
    isSelf: true,
    playing: false,
  },
}

/** 正在播放 */
export const Playing: Story = {
  args: {
    msg: createAudioMsg(15),
    isSelf: false,
    playing: true,
  },
}

/** 长语音消息（接近最大宽度） */
export const LongDuration: Story = {
  args: {
    msg: createAudioMsg(55, { status: 2 }),
    isSelf: true,
    playing: false,
  },
}

/** 短语音消息（最小宽度） */
export const ShortDuration: Story = {
  args: {
    msg: createAudioMsg(1),
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
          <WlAudioBubble :msg="msg1" :is-self="false" />
        </div>
        <div class="flex justify-end">
          <WlAudioBubble :msg="msg2" :is-self="true" />
        </div>
        <div class="flex justify-start">
          <WlAudioBubble :msg="msg3" :is-self="false" :playing="true" />
        </div>
        <div class="flex justify-end">
          <WlAudioBubble :msg="msg4" :is-self="true" />
        </div>
      </div>
    `,
    data() {
      return {
        msg1: createAudioMsg(3),
        msg2: createAudioMsg(12, { status: 2 }),
        msg3: createAudioMsg(25),
        msg4: createAudioMsg(1, { status: 2 }),
      }
    },
  }),
}
