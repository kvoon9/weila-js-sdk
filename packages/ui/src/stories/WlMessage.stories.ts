import type { Meta, StoryObj } from '@storybook/vue3'
import { WlMessage } from '../index'

const meta: Meta<typeof WlMessage> = {
  title: 'Components/WlMessage',
  component: WlMessage,
  tags: ['autodocs'],
  argTypes: {
    from: {
      control: 'select',
      options: ['self', 'other'],
    },
  },
  args: {
    from: 'other',
  },
}

export default meta
type Story = StoryObj<typeof WlMessage>

export const Other: Story = {
  args: {
    from: 'other',
  },
  render: (args) => ({
    components: { WlMessage },
    setup() {
      return { args }
    },
    template: `
      <WlMessage v-bind="args">
        <span>Hello! How are you?</span>
      </WlMessage>
    `,
  }),
}

export const Self: Story = {
  args: {
    from: 'self',
  },
  render: (args) => ({
    components: { WlMessage },
    setup() {
      return { args }
    },
    template: `
      <WlMessage v-bind="args">
        <span>I'm doing great, thanks!</span>
      </WlMessage>
    `,
  }),
}
