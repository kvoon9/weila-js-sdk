import type { Meta, StoryObj } from '@storybook/vue3'
import { ref } from 'vue'
import WlImagePreview from './WlImagePreview.vue'

const meta: Meta<typeof WlImagePreview> = {
  title: 'Components/WlImagePreview',
  component: WlImagePreview,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof WlImagePreview>

export const Default: Story = {
  args: {
    src: 'https://picsum.photos/800/600',
  },
  render: (args) => ({
    components: { WlImagePreview },
    setup() {
      const visible = ref(false)
      return { args, visible }
    },
    template: `
      <div style="padding: 20px;">
        <button @click="visible = true" style="padding: 8px 16px; cursor: pointer;">
          点击预览图片
        </button>
        <WlImagePreview v-model:open="visible" v-bind="args" />
      </div>
    `,
  }),
}
