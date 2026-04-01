import type { Meta, StoryObj } from '@storybook/vue3'
import { ref } from 'vue'
import WlVideoPreview from './WlVideoPreview.vue'

const meta: Meta<typeof WlVideoPreview> = {
  title: 'Components/WlVideoPreview',
  component: WlVideoPreview,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof WlVideoPreview>

export const Default: Story = {
  args: {
    src: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  render: (args) => ({
    components: { WlVideoPreview },
    setup() {
      const visible = ref(false)
      return { args, visible }
    },
    template: `
      <div style="padding: 20px;">
        <button @click="visible = true" style="padding: 8px 16px; cursor: pointer;">
          点击预览视频
        </button>
        <WlVideoPreview v-model:open="visible" v-bind="args" />
      </div>
    `,
  }),
}
