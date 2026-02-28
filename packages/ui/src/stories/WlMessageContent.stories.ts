import type { Meta, StoryObj } from '@storybook/vue3'
import { WlMessageContent } from '../index'

const meta: Meta<typeof WlMessageContent> = {
  title: 'Components/WlMessageContent',
  component: WlMessageContent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['contained', 'flat'],
    },
  },
  args: {
    variant: 'contained',
  },
}

export default meta
type Story = StoryObj<typeof WlMessageContent>

export const Contained: Story = {
  args: {
    variant: 'contained',
  },
  render: (args) => ({
    components: { WlMessageContent },
    setup() {
      return { args }
    },
    template: `
      <WlMessageContent v-bind="args">
        <span>This is a message with contained variant</span>
      </WlMessageContent>
    `,
  }),
}

export const Flat: Story = {
  args: {
    variant: 'flat',
  },
  render: (args) => ({
    components: { WlMessageContent },
    setup() {
      return { args }
    },
    template: `
      <WlMessageContent v-bind="args">
        <span>This is a message with flat variant</span>
      </WlMessageContent>
    `,
  }),
}
