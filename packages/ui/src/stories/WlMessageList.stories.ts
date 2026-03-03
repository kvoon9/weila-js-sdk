import type { Meta, StoryObj } from '@storybook/vue3'
import { WlMessageList } from '../index'
import type { WL_IDbMsgData, WL_IDbUserInfo } from '@weilasdk/core'
import { WL_IDbMsgDataType, WL_IDbMsgDataStatus } from '@weilasdk/core'

const currentUserId = 1001

const mockSenderInfos = new Map<number, WL_IDbUserInfo>([
  [
    1001,
    {
      userId: 1001,
      weilaNum: 'W1001',
      sex: 1,
      nick: 'Me',
      pinyinName: 'me',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me',
      status: 0,
      userType: 0,
      created: Date.now(),
    },
  ],
  [
    2001,
    {
      userId: 2001,
      weilaNum: 'W2001',
      sex: 2,
      nick: 'Alice',
      pinyinName: 'alice',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      status: 0,
      userType: 0,
      created: Date.now(),
    },
  ],
  [
    2002,
    {
      userId: 2002,
      weilaNum: 'W2002',
      sex: 1,
      nick: 'Bob',
      pinyinName: 'bob',
      avatar: '',
      status: 0,
      userType: 0,
      created: Date.now(),
    },
  ],
])

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

const mockMessages: WL_IDbMsgData[] = [
  makeMsgBase({
    combo_id: 'msg-1',
    senderId: 2001,
    msgId: 1,
    msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
    textData: '你好！最近怎么样？',
    created: Date.now() / 1000 - 300,
  }),
  makeMsgBase({
    combo_id: 'msg-2',
    senderId: currentUserId,
    msgId: 2,
    msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
    textData: '还不错，在忙一个新项目。你呢？',
    created: Date.now() / 1000 - 240,
  }),
  makeMsgBase({
    combo_id: 'msg-3',
    senderId: 2001,
    msgId: 3,
    msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_AUDIO_TYPE,
    audioData: { frameCount: 120 },
    created: Date.now() / 1000 - 180,
  }),
  makeMsgBase({
    combo_id: 'msg-4',
    senderId: 2001,
    msgId: 4,
    msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE,
    fileInfo: {
      fileSize: 102400,
      fileName: 'photo.jpg',
      fileUrl: 'https://picsum.photos/seed/wl-msg/400/300',
      fileThumbnail: 'https://picsum.photos/seed/wl-msg/200/150',
    },
    created: Date.now() / 1000 - 120,
  }),
  makeMsgBase({
    combo_id: 'msg-5',
    senderId: currentUserId,
    msgId: 5,
    msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE,
    fileInfo: {
      fileSize: 2048576,
      fileName: '项目方案.pdf',
      fileUrl: 'https://example.com/file.pdf',
    },
    created: Date.now() / 1000 - 60,
  }),
  makeMsgBase({
    combo_id: 'msg-6',
    senderId: 2001,
    msgId: 6,
    msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE,
    location: {
      locationType: 'gcj02',
      latitude: 22.5431,
      longitude: 114.0579,
      name: '深圳湾公园',
      address: '广东省深圳市南山区',
      mapUrl: 'https://picsum.photos/seed/wl-map/240/120',
    },
    created: Date.now() / 1000 - 30,
  }),
  makeMsgBase({
    combo_id: 'msg-7',
    senderId: currentUserId,
    msgId: 7,
    msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_PTT_TYPE,
    pttData: {
      seq: 1,
      seqInPackage: 1,
      sourceType: 0,
      frameCount: 60,
      mark: 0,
      data: new Uint8Array(0),
    },
    created: Date.now() / 1000 - 15,
  }),
  makeMsgBase({
    combo_id: 'msg-8',
    senderId: 2002,
    msgId: 8,
    msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE,
    textData: '大家好，我是 Bob 👋',
    created: Date.now() / 1000 - 10,
  }),
  makeMsgBase({
    combo_id: 'msg-9',
    senderId: 2001,
    msgId: 9,
    msgType: WL_IDbMsgDataType.WL_DB_MSG_DATA_WITHDRAW_TYPE,
    withdrawMsgId: 3,
    created: Date.now() / 1000 - 5,
  }),
]

const meta: Meta<typeof WlMessageList> = {
  title: 'Components/WlMessageList',
  component: WlMessageList,
  tags: ['autodocs'],
  decorators: [
    () => ({
      template:
        '<div class="h-[600px] w-[480px] border border-gray-200 rounded-lg overflow-hidden"><story /></div>',
    }),
  ],
  argTypes: {
    loading: {
      control: 'boolean',
    },
  },
  args: {
    messages: mockMessages,
    currentUserId,
    senderInfos: mockSenderInfos,
    loading: false,
    error: null,
  },
}

export default meta
type Story = StoryObj<typeof WlMessageList>

export const Default: Story = {}

export const TextOnly: Story = {
  args: {
    messages: mockMessages.filter((m) => m.msgType === WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE),
  },
}

export const Loading: Story = {
  args: {
    messages: [],
    loading: true,
  },
}

export const Error: Story = {
  args: {
    messages: [],
    error: new globalThis.Error('网络连接失败，请检查网络设置'),
  },
}

export const Empty: Story = {
  args: {
    messages: [],
  },
}
