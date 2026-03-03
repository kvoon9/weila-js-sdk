import type { Meta, StoryObj } from '@storybook/vue3'
import { SessionList } from '../index'
import type { WL_IDbSession } from '@weilasdk/core'

const mockSessions: WL_IDbSession[] = [
  {
    combo_id_type: '1001_1',
    sessionId: '1001',
    sessionType: 0x01,
    sessionName: 'Alice',
    sessionAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    lastMsgId: 105,
    readMsgId: 100,
    latestUpdate: Date.now() - 1000 * 60 * 5,
    status: 0,
  },
  {
    combo_id_type: '1002_2',
    sessionId: '1002',
    sessionType: 0x02,
    sessionName: 'Team Chat',
    sessionAvatar: '',
    lastMsgId: 50,
    readMsgId: 30,
    latestUpdate: Date.now() - 1000 * 60 * 60 * 2,
    status: 0,
  },
  {
    combo_id_type: '1003_8',
    sessionId: '1003',
    sessionType: 0x08,
    sessionName: 'Support',
    sessionAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Support',
    lastMsgId: 10,
    readMsgId: 10,
    latestUpdate: Date.now() - 1000 * 60 * 60 * 24,
    status: 0,
  },
]

const meta: Meta<typeof SessionList> = {
  title: 'Components/SessionList',
  component: SessionList,
  tags: ['autodocs'],
  decorators: [
    () => ({
      template:
        '<div class="h-96 border border-gray-200 rounded-lg overflow-hidden"><story /></div>',
    }),
  ],
  argTypes: {
    filter: {
      control: 'select',
      options: ['all', 'personal', 'group'],
    },
    loading: {
      control: 'boolean',
    },
  },
  args: {
    sessions: mockSessions,
    filter: 'all',
    loading: false,
    error: null,
  },
}

export default meta
type Story = StoryObj<typeof SessionList>

export const Default: Story = {}

export const FilterPersonal: Story = {
  args: {
    filter: 'personal',
  },
}

export const FilterGroup: Story = {
  args: {
    filter: 'group',
  },
}

export const Loading: Story = {
  args: {
    sessions: [],
    loading: true,
  },
}

export const Error: Story = {
  args: {
    sessions: [],
    error: new globalThis.Error('Network connection failed'),
  },
}

export const Empty: Story = {
  args: {
    sessions: [],
  },
}
