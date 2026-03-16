import type { Meta, StoryObj } from '@storybook/vue3'
import WlPttButton from '../components/PttButton/WlPttButton.vue'

const meta: Meta<typeof WlPttButton> = {
  title: 'Components/WlPttButton',
  component: WlPttButton,
  tags: ['autodocs'],
  decorators: [
    () => ({
      template:
        '<div class="p-6 bg-neutral-100 flex items-center justify-center min-h-[120px] gap-8"><story /></div>',
    }),
  ],
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'recording', 'processing'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof WlPttButton>

/** 默认状态 - 空闲 */
export const Idle: Story = {
  args: {
    status: 'idle',
    size: 'md',
    disabled: false,
  },
}

/** 录音中 */
export const Recording: Story = {
  args: {
    status: 'recording',
    size: 'md',
    disabled: false,
  },
}

/** 处理中 */
export const Processing: Story = {
  args: {
    status: 'processing',
    size: 'md',
    disabled: false,
  },
}

/** 禁用状态 */
export const Disabled: Story = {
  args: {
    status: 'idle',
    size: 'md',
    disabled: true,
  },
}

/** 小尺寸 */
export const SmallSize: Story = {
  args: {
    status: 'idle',
    size: 'sm',
    disabled: false,
  },
}

/** 大尺寸 */
export const LargeSize: Story = {
  args: {
    status: 'idle',
    size: 'lg',
    disabled: false,
  },
}

/** 不同状态对比 */
export const AllStates: Story = {
  render: () => ({
    components: { WlPttButton },
    template: `
      <div class="flex flex-col gap-6">
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-500 w-20">Idle</span>
          <WlPttButton status="idle" />
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-500 w-20">Recording</span>
          <WlPttButton status="recording" />
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-500 w-20">Processing</span>
          <WlPttButton status="processing" />
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-500 w-20">Disabled</span>
          <WlPttButton status="idle" disabled />
        </div>
      </div>
    `,
  }),
}

/** 不同尺寸对比 */
export const AllSizes: Story = {
  render: () => ({
    components: { WlPttButton },
    template: `
      <div class="flex items-end gap-6">
        <div class="flex flex-col items-center gap-2">
          <WlPttButton size="sm" />
          <span class="text-xs text-gray-500">sm (32px)</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <WlPttButton size="md" />
          <span class="text-xs text-gray-500">md (48px)</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <WlPttButton size="lg" />
          <span class="text-xs text-gray-500">lg (64px)</span>
        </div>
      </div>
    `,
  }),
}
