import type { Meta, StoryObj } from '@storybook/vue3'
import { ref } from 'vue'
import WlChatComposer from '../components/ChatPanel/WlChatComposer.vue'

const meta: Meta<typeof WlChatComposer> = {
  title: 'Components/WlChatComposer',
  component: WlChatComposer,
  tags: ['autodocs'],
  decorators: [
    () => ({
      template:
        '<div class="p-6 bg-neutral-100 min-h-[160px]"><div class="bg-white p-4 rounded-lg"><story /></div></div>',
    }),
  ],
  argTypes: {
    modelValue: { control: 'text' },
    pttStatus: {
      control: 'select',
      options: ['idle', 'recording', 'processing'],
    },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof WlChatComposer>

export const Default: Story = {
  args: {
    modelValue: 'hello',
    pttStatus: 'idle',
    disabled: false,
  },
}

export const Disabled: Story = {
  args: {
    modelValue: '',
    pttStatus: 'idle',
    disabled: true,
  },
}

export const Recording: Story = {
  args: {
    modelValue: '',
    pttStatus: 'recording',
    disabled: false,
  },
}

export const Interactive: Story = {
  render: (args) => ({
    components: { WlChatComposer },
    setup() {
      const value = ref(args.modelValue)
      return { args, value }
    },
    template: `
      <WlChatComposer
        v-model="value"
        :ptt-status="args.pttStatus"
        :disabled="args.disabled"
      />
    `,
  }),
  args: {
    modelValue: '',
    pttStatus: 'idle',
    disabled: false,
  },
}
