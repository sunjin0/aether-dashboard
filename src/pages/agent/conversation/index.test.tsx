const React = require('react')
import { render } from '@testing-library/react'
import AgentConversationPage from '.'
import { getAgentConversationList } from '@/services/agent/ConversationController'

const mockProTable = jest.fn((_props: any) => null)

jest.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: any) => <>{children}</>,
  ProDescriptions: () => null,
  ProTable: (props: any) => mockProTable(props),
}))

jest.mock('antd', () => ({
  Button: () => null,
  Card: () => null,
  Col: () => null,
  Descriptions: { Item: () => null },
  Drawer: () => null,
  Empty: () => null,
  Popconfirm: () => null,
  Row: () => null,
  Spin: () => null,
  Statistic: () => null,
  Tag: () => null,
  message: { error: jest.fn(), success: jest.fn() },
}))

jest.mock('@@/exports', () => ({
  history: { location: { pathname: '/agent/conversation' } },
  useAccess: () => ({}),
  useIntl: () => ({
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) =>
      defaultMessage || id,
  }),
}))

jest.mock('@/services/agent/ConversationController', () => ({
  getAgentConversationList: jest.fn(() => Promise.resolve({ code: 200, data: [], total: 0 })),
}))
jest.mock('@/services/sys/DictController', () => ({}))
jest.mock('@/components/AgentMessageBubble', () => () => null)

describe('AgentConversationPage', () => {
  it('uses localized page-specific status column metadata', () => {
    render(<AgentConversationPage />)

    const statusColumn = mockProTable.mock.calls[0][0].columns.find(
      (column: any) => column.dataIndex === 'status',
    )

    expect(statusColumn.key).toBe('agent-conversation-status')
    expect(statusColumn.title).toBe('pages.common.status')
  })

  it('labels workflow sessions and asks the list API to include them', async () => {
    render(<AgentConversationPage />)

    const props = mockProTable.mock.calls[0][0]
    const sourceColumn = props.columns.find((column: any) => column.dataIndex === 'source')

    expect(Object.keys(sourceColumn.valueEnum)).toEqual(['CONSOLE', 'EXTERNAL', 'WORKFLOW'])

    await props.request({ current: 1, pageSize: 20 })

    expect(getAgentConversationList).toHaveBeenCalledWith(
      expect.objectContaining({ includeWorkflow: true }),
    )
  })
})
