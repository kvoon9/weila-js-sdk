import type { Meta, StoryObj } from '@storybook/vue3'
import { WlMessageListItem } from '../index'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataType, WL_IDbMsgDataStatus } from '@weilasdk/core'

const mockSender: WL_IDbUserInfo = {
  userId: 2001,
  weilaNum: 'W2001',
  sex: 2,
  nick: 'Alice',
  pinyinName: 'alice',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
  status: 0,
  userType: 0,
  created: Date.now(),
}

function makeMsgBase(overrides: Partial<WL_IDbMsgData> & { combo_id: string }): WL_IDbMsgData {
  return {
    senderId: 2001,
    sessionId: 'S100',
    sessionType: 0x01,
    msgId: 1,
    msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
    created: Date.now() / 1000,
    autoReply: 0,
    status: WL_IDbMsgDataStatus.WL_DB_MSG_DATA_STATUS_SENT,
    ...overrides,
  }
}

const meta: Meta<typeof WlMessageListItem> = {
  title: 'Components/WlMessageListItem',
  component: WlMessageListItem,
  tags: ['autodocs'],
  decorators: [
    () => ({
      template: '<div class="w-[400px] p-4 border border-gray-200 rounded-lg"><story /></div>',
    }),
  ],
  args: {
    from: 'other',
    senderInfo: mockSender,
  },
}

export default meta
type Story = StoryObj<typeof WlMessageListItem>

export const Text: Story = {
  args: {
    message: makeMsgBase({
      combo_id: 'msg-text',
      msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
      textData: '你好！这是一条文本消息 😊',
    }),
  },
}

export const TextSelf: Story = {
  args: {
    from: 'self',
    message: makeMsgBase({
      combo_id: 'msg-text-self',
      senderId: 1001,
      msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
      textData: '好的，收到了！',
    }),
    senderInfo: {
      ...mockSender,
      userId: 1001,
      nick: 'Me',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me',
    },
  },
}

export const Audio: Story = {
  args: {
    message: makeMsgBase({
      combo_id: 'msg-audio',
      msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE,
      audioData: { frameCount: 120 },
    }),
  },
}

export const PTT: Story = {
  args: {
    message: makeMsgBase({
      combo_id: 'msg-ptt',
      msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE,
      pttData: {
        seq: 1,
        seqInPackage: 1,
        sourceType: 0,
        frameCount: 60,
        mark: 0,
        data: new Uint8Array(0),
      },
    }),
  },
}

export const Image: Story = {
  args: {
    message: makeMsgBase({
      combo_id: 'msg-image',
      msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE,
      fileInfo: {
        fileSize: 102400,
        fileName: 'photo.jpg',
        fileUrl: 'https://picsum.photos/seed/wl-item/400/300',
        fileThumbnail: 'https://picsum.photos/seed/wl-item/200/150',
      },
    }),
  },
}

export const File: Story = {
  args: {
    message: makeMsgBase({
      combo_id: 'msg-file',
      msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE,
      fileInfo: {
        fileSize: 2048576,
        fileName: '项目方案.pdf',
        fileUrl: 'https://example.com/file.pdf',
      },
    }),
  },
}

export const FileWithThumbnail: Story = {
  args: {
    message: makeMsgBase({
      combo_id: 'msg-file-thumb',
      msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE,
      fileInfo: {
        fileSize: 512000,
        fileName: 'design-mockup.png',
        fileUrl: 'https://example.com/file.png',
        fileThumbnail: 'https://picsum.photos/seed/wl-file/40/40',
      },
    }),
  },
}

export const Location: Story = {
  args: {
    message: makeMsgBase({
      combo_id: 'msg-location',
      msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE,
      location: {
        locationType: 'gcj02',
        latitude: 22.5431,
        longitude: 114.0579,
        name: '深圳湾公园',
        address: '广东省深圳市南山区',
        mapUrl: 'https://picsum.photos/seed/wl-loc/240/120',
      },
    }),
  },
}

export const Withdraw: Story = {
  args: {
    message: makeMsgBase({
      combo_id: 'msg-withdraw',
      msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE,
      withdrawMsgId: 3,
    }),
  },
}

export const NoAvatar: Story = {
  args: {
    message: makeMsgBase({
      combo_id: 'msg-no-avatar',
      msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
      textData: '这个发送者没有头像',
    }),
    senderInfo: {
      ...mockSender,
      avatar: '',
    },
  },
}
