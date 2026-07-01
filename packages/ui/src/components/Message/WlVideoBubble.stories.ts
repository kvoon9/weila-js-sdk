import type { Meta, StoryObj } from '@storybook/vue3'
import WlVideoBubble from './WlVideoBubble.vue'
import WlTextBubble from './WlTextBubble.vue'
import type { WL_IDbMsgData } from '@vois/weila-sdk-core'
import { WL_IDbMsgDataType } from '@vois/weila-sdk-core'

const createVideoMsg = (overrides?: Partial<WL_IDbMsgData>): WL_IDbMsgData => ({
  created: 1772600000,
  msgId: 173623491,
  senderId: 1600000,
  sessionId: '396588',
  sessionType: 2,
  autoReply: 0,
  tag: '',
  status: 1,
  msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE,
  combo_id: '396588_2_173623491_0',
  fileInfo: {
    fileUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    fileName: 'butterfly.mp4',
    fileSize: 1234567,
    fileThumbnail: 'https://picsum.photos/200/150',
  },
  ...overrides,
})

const msg = (textData: string, senderId: number = 1600000) => ({
  textData,
  msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
  senderId,
  combo_id: `test_${Date.now()}`,
} as unknown as WL_IDbMsgData)

const meta: Meta<typeof WlVideoBubble> = {
  title: 'Components/WlVideoBubble',
  component: WlVideoBubble,
  tags: ['autodocs'],
  decorators: [
    () => ({
      template: '<div class="p-6 bg-neutral-100"><story /></div>',
    }),
  ],
}

export default meta
type Story = StoryObj<typeof WlVideoBubble>

export const Default: Story = {
  args: {
    msg: createVideoMsg(),
  },
}

export const Self: Story = {
  args: {
    msg: createVideoMsg({ senderId: 1541034 }),
    isSelf: true,
  },
}

export const NoThumbnail: Story = {
  args: {
    msg: createVideoMsg({
      fileInfo: {
        fileUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        fileName: 'video.mp4',
        fileSize: 987654,
      },
    }),
  },
}

export const WithoutFileName: Story = {
  args: {
    msg: createVideoMsg({
      fileInfo: {
        fileUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        fileSize: 1234567,
        fileThumbnail: 'https://picsum.photos/200/150',
      },
    }),
  },
}

/** 聊天上下文效果 */
export const InChatContext: Story = {
  render: () => ({
    components: { WlVideoBubble, WlTextBubble },
    template: `
      <div class="flex flex-col gap-3 w-[400px]">
        <div class="flex justify-start">
          <WlTextBubble :msg="msg1" :is-self="false" />
        </div>
        <div class="flex justify-start">
          <WlVideoBubble :msg="videoMsg1" />
        </div>
        <div class="flex justify-end">
          <WlTextBubble :msg="msg2" :is-self="true" />
        </div>
        <div class="flex justify-start">
          <WlVideoBubble :msg="videoMsg2" />
        </div>
        <div class="flex justify-end">
          <WlTextBubble :msg="msg3" :is-self="true" />
        </div>
      </div>
    `,
    data() {
      return {
        msg1: msg('你好，这个视频很有意思！', 1600000),
        msg2: msg('确实很有意思！', 1541034),
        msg3: msg('我也觉得', 1541034),
        videoMsg1: createVideoMsg({ senderId: 1600000 }),
        videoMsg2: createVideoMsg({ senderId: 1600000 }),
      }
    },
  }),
}
