import type { Meta, StoryObj } from '@storybook/vue3'
import { WLEmojiPicker } from '../../index'

const meta: Meta<typeof WLEmojiPicker> = {
  title: 'Components/WLEmojiPicker',
  component: WLEmojiPicker,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof WLEmojiPicker>

function handleSelect(emoji: string) {
  console.log('Selected emoji:', emoji)
}

export const Default: Story = {
  args: {},
  render: () => ({
    components: { WLEmojiPicker },
    setup() {
      return { handleSelect }
    },
    template: `
      <div class="p-8">
        <WLEmojiPicker @select="handleSelect" />
      </div>
    `,
  }),
}
