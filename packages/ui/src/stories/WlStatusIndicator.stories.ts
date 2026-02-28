import type { Meta, StoryObj } from '@storybook/vue3'
import { WlStatusIndicator } from '../index'

const meta: Meta<typeof WlStatusIndicator> = {
  title: 'Components/WlStatusIndicator',
  component: WlStatusIndicator,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'connecting', 'connected', 'error'],
    },
    label: {
      control: 'text',
    },
  },
  args: {
    status: 'idle',
    label: '',
  },
}

export default meta
type Story = StoryObj<typeof WlStatusIndicator>

export const Idle: Story = {
  args: {
    status: 'idle',
  },
}

export const Connecting: Story = {
  args: {
    status: 'connecting',
  },
}

export const Connected: Story = {
  args: {
    status: 'connected',
  },
}

export const Error: Story = {
  args: {
    status: 'error',
  },
}

export const CustomLabel: Story = {
  args: {
    status: 'connected',
    label: '在线',
  },
}
