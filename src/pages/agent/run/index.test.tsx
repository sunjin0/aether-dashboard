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
  Button: ({ children }: any) => <button>{children}</button>,
  Card: ({ children, extra }: any) => (
    <>
      {extra}
      {children}
    </>
  ),
  // 抽屉里的「标识信息」等分组折叠：测试中直接展开，等价于未折叠的旧行为。
  Collapse: ({ items }: any) => (
    <>
      {(items || []).map((item: any) => (
        <div key={item.key}>
          {item.label}
          {item.children}
        </div>
      ))}
    </>
  ),
  DatePicker: { RangePicker: () => null },
  Drawer: ({ children, open }: any) => (open ? <>{children}</> : null),
  Empty: () => null,
  message: { error: jest.fn(), success: jest.fn() },
  Spin: ({ children }: any) => <>{children}</>,
  Statistic: ({ title, value, suffix }: any) => <div>{`${title}: ${value}${suffix || ''}`}</div>,
  Tag: ({ children }: any) => <>{children}</>,
  Typography: { Text: ({ children }: any) => <>{children}</> },
}))

jest.mock('@/components/TableActionMenu', () => ({ items }: any) => (
  <button onClick={items[0].onClick}>{items[0].label}</button>
))
jest.mock('@/components/JsonDisplay', () => ({ content }: any) => <div>{content}</div>)
jest.mock('@/components/MarkdownText', () => () => null)
jest.mock('./AgentRunInputModules', () => () => null)
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
    // 不锁定渲染次数：抽屉里的详情块数量属于布局细节，这里只关心数据到达/被清空。
    await waitFor(() => expect(screen.getAllByText('run-a').length).toBeGreaterThan(0))

    fireEvent.click(screen.getAllByRole('button')[1])

    expect(screen.queryByText('run-a')).toBeNull()

    await act(async () => {
      resolveRunB({ code: 200, data: { id: 'run-b' } })
    })
    await waitFor(() => expect(screen.getAllByText('run-b').length).toBeGreaterThan(0))
  })

  it('shows the provider raw response in run detail', async () => {
    mockedGetAgentRunInfo.mockResolvedValue({
      code: 200,
      data: { id: 'run-a', rawResponse: '{"usage":{"prompt_tokens":100,"prompt_tokens_details":{"cached_tokens":75}}}' },
    })

    render(<AgentRunPage />)
    fireEvent.click(screen.getAllByRole('button')[0])

    await waitFor(() => expect(screen.getByText(/cached_tokens/)).toBeTruthy())
  })

  it('shows aggregate prompt cache statistics', async () => {
    mockedGetAgentRunStatistics.mockResolvedValue({
      code: 200,
      data: { totalCachedPromptTokens: 896, promptCacheHitRate: 8.63 },
    })

    render(<AgentRunPage />)

    await waitFor(() => expect(screen.getByText('pages.agent.run.cachedPromptTokens: 896')).toBeTruthy())
    expect(screen.getByText('pages.agent.run.promptCacheHitRate: 8.63%')).toBeTruthy()
  })
})
