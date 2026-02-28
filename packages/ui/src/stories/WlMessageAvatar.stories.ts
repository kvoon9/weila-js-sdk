import type { Meta, StoryObj } from '@storybook/vue3'
import { WlMessageAvatar } from '../index'

const meta: Meta<typeof WlMessageAvatar> = {
  title: 'Components/WlMessageAvatar',
  component: WlMessageAvatar,
  tags: ['autodocs'],
  argTypes: {
    src: {
      control: 'text',
    },
    name: {
      control: 'text',
    },
  },
  args: {
    src: undefined,
    name: undefined,
  },
}

export default meta
type Story = StoryObj<typeof WlMessageAvatar>

export const WithImage: Story = {
  args: {
    src: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    name: 'Felix',
  },
}

export const WithNameFallback: Story = {
  args: {
    src: undefined,
    name: 'John Doe',
  },
}

export const DefaultFallback: Story = {
  args: {
    src: undefined,
    name: undefined,
  },
}
