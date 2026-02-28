import type { Meta, StoryObj } from '@storybook/vue3'
import { SessionListItem } from '../index'
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

const meta: Meta<typeof SessionListItem> = {
  title: 'Components/SessionListItem',
  component: SessionListItem,
  tags: ['autodocs'],
  argTypes: {
    active: {
      control: 'boolean',
    },
  },
  args: {
    session: mockSessions[0],
    active: false,
  },
}

export default meta
type Story = StoryObj<typeof SessionListItem>

export const Default: Story = {
  args: {
    session: mockSessions[0],
  },
}

export const Active: Story = {
  args: {
    session: mockSessions[0],
    active: true,
  },
}

export const GroupChat: Story = {
  args: {
    session: mockSessions[1],
  },
}

export const WithUnread: Story = {
  args: {
    session: mockSessions[1],
    active: false,
  },
}

export const NoUnread: Story = {
  args: {
    session: mockSessions[2],
  },
}

export const LongName: Story = {
  args: {
    session: {
      ...mockSessions[0],
      sessionName: 'This is a very long session name that should be truncated',
    },
  },
}
