const React = require('react')
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AgentRunPage from '.'
import { getAgentRunInfo, getAgentRunStatistics } from '@/services/agent/RunController'

const mockProTable = jest.fn((props: any) => (
  <>
    {props.columns
      .find((column: any) => column.key === 'option')
      .render(null, { id: 'run-a' })}
    {props.columns
      .find((column: any) => column.key === 'option')
      .render(null, { id: 'run-b' })}
  </>
))

const mockIntl = {
  formatMessage: ({ id }: { id: string }) => id,
}

jest.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: any) => <>{children}</>,
  ProDescriptions: ({ dataSource }: any) => <div>{dataSource?.id}</div>,
  ProTable: (props: any) => mockProTable(props),
}))

jest.mock('@umijs/max', () => ({
  useIntl: () => mockIntl,
}))

jest.mock('antd', () => ({
  Alert: () => null,
  Card: ({ children }: any) => <>{children}</>,
  DatePicker: { RangePicker: () => null },
  Drawer: ({ children, open }: any) => (open ? <>{children}</> : null),
  Empty: () => null,
  message: { error: jest.fn() },
  Spin: ({ children }: any) => <>{children}</>,
  Statistic: () => null,
  Tag: ({ children }: any) => <>{children}</>,
  Typography: { Text: ({ children }: any) => <>{children}</> },
}))

jest.mock('@/components/TableActionMenu', () => ({ items }: any) => (
  <button onClick={items[0].onClick}>{items[0].label}</button>
))
jest.mock('@/components/JsonDisplay', () => () => null)
jest.mock('@/components/MarkdownText', () => () => null)
jest.mock('./AgentRunStepsTimeline', () => () => null)
jest.mock('@/services/sys/DictController', () => ({ getOptionList: jest.fn() }))
jest.mock('@/services/agent/RunController', () => ({
  getAgentRunInfo: jest.fn(),
  getAgentRunList: jest.fn(),
  getAgentRunStatistics: jest.fn(),
}))

const mockedGetAgentRunInfo = getAgentRunInfo as jest.Mock
const mockedGetAgentRunStatistics = getAgentRunStatistics as jest.Mock

describe('AgentRunPage', () => {
  beforeEach(() => {
    mockProTable.mockClear()
    mockedGetAgentRunInfo.mockReset()
    mockedGetAgentRunStatistics.mockReset()
    mockedGetAgentRunStatistics.mockResolvedValue({ code: 200, data: {} })
  })

  it('clears the previous run while a newer detail request is pending', async () => {
    let resolveRunB: (value: any) => void = () => undefined
    mockedGetAgentRunInfo
      .mockResolvedValueOnce({ code: 200, data: { id: 'run-a' } })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRunB = resolve
          }),
      )

    render(<AgentRunPage />)

    fireEvent.click(screen.getAllByRole('button')[0])
    await waitFor(() => expect(screen.getAllByText('run-a')).toHaveLength(2))

    fireEvent.click(screen.getAllByRole('button')[1])

    expect(screen.queryByText('run-a')).toBeNull()

    await act(async () => {
      resolveRunB({ code: 200, data: { id: 'run-b' } })
    })
    await waitFor(() => expect(screen.getAllByText('run-b')).toHaveLength(2))
  })
})
