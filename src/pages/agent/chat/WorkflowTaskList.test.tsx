// 与 src/pages/agent/conversation/index.test.tsx 一致：这套 jest 配置用的是经典 JSX 运行时。
const React = require('react')
import { fireEvent, render } from '@testing-library/react'
import WorkflowTaskList from './WorkflowTaskList'

// 行类型在这里就地声明，不用 import type：这套 jest 配置不给 .tsx 做 TS 转换，
// 类型位置上一旦出现导入绑定就直接语法报错。字段仍会被 tsc 按 WorkflowTask 结构校验。
type TaskRow = {
  invocationId: string
  workflowName?: string
  capabilityName?: string
  currentNodeName?: string
  startedAt?: number
  status:
    | 'RUNNING'
    | 'WAITING_MCP_APPROVAL'
    | 'WAITING_USER_INPUT'
    | 'COMPLETED'
    | 'FAILED'
    | 'TERMINATED'
    | 'TIMED_OUT'
}

jest.mock('antd', () => ({
  Tag: ({ children }: any) => <span>{children}</span>,
  Tooltip: ({ children }: any) => <>{children}</>,
  Button: ({ onClick }: any) => <button type="button" data-testid="refresh" onClick={onClick} />,
  // 筛选与分页只断言「在不在场、参数对不对」，桩成能渲染出可辨识文本的最小实现即可。
  Segmented: ({ options }: any) => (
    <span>{options.map((option: any) => option.label).join('|')}</span>
  ),
  Pagination: ({ current, total }: any) => <span>{`pagination:${current}/${total}`}</span>,
}))

jest.mock('@ant-design/icons', () => ({
  LoadingOutlined: () => null,
  ReloadOutlined: () => null,
}))

jest.mock('@@/exports', () => ({
  getLocale: () => 'zh-CN',
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }, values?: Record<string, unknown>) =>
      values ? `${id}:${JSON.stringify(values)}` : id,
  }),
}))

const task = (overrides: Partial<TaskRow>): TaskRow =>
  ({
    invocationId: 'inv-1',
    workflowName: '请假审批',
    status: 'RUNNING',
    startedAt: Date.now(),
    ...overrides,
  }) as TaskRow

describe('WorkflowTaskList', () => {
  it('renders nothing when the conversation has no workflow tasks', () => {
    const { container } = render(<WorkflowTaskList tasks={[]} />)
    expect(container.textContent).toBe('')
  })

  it('shows the workflow name, the localized status and the current node', () => {
    const { container } = render(
      <WorkflowTaskList tasks={[task({ currentNodeName: '主管审批' })]} total={1} />,
    )

    expect(container.textContent).toContain('请假审批')
    expect(container.textContent).toContain('pages.agent.workflow.run.status.RUNNING')
    expect(container.textContent).toContain('主管审批')
  })

  it('distinguishes an MCP approval wait from a plain user wait in the row', () => {
    const { container } = render(
      <WorkflowTaskList
        tasks={[
          task({ invocationId: 'inv-1', status: 'WAITING_MCP_APPROVAL' }),
          task({ invocationId: 'inv-2', status: 'WAITING_USER_INPUT' }),
        ]}
      />,
    )

    expect(container.textContent).toContain('pages.agent.workflow.run.status.WAITING_MCP_APPROVAL')
    expect(container.textContent).toContain('pages.agent.workflow.run.status.WAITING_USER')
  })

  it('surfaces the full count when the page is only a slice of the conversation', () => {
    const { container } = render(
      <WorkflowTaskList tasks={[task({}), task({ invocationId: 'inv-2' })]} total={7} />,
    )

    expect(container.textContent).toContain('"count":7')
  })

  it('falls back to the capability name when the workflow has been renamed away', () => {
    const { container } = render(
      <WorkflowTaskList tasks={[task({ workflowName: undefined, capabilityName: '工单流' })]} />,
    )

    expect(container.textContent).toContain('工单流')
  })

  it('keeps the filter reachable when the selected filter matches nothing', () => {
    // 筛选控件就在这个块里。空列表时若整块 return null，用户切到「已结束」一旦为空就再也切不回来。
    const { container } = render(
      <WorkflowTaskList tasks={[]} state="finished" onStateChange={() => {}} />,
    )

    expect(container.textContent).toContain('pages.agent.chat.workflowTasks.filter.all')
    expect(container.textContent).toContain('pages.agent.chat.workflowTasks.filter.finished')
    expect(container.textContent).toContain('pages.agent.chat.workflowTasks.filter.empty')
  })

  it('hides itself when the default filter has nothing to show', () => {
    const { container } = render(
      <WorkflowTaskList tasks={[]} state="all" onStateChange={() => {}} />,
    )

    expect(container.textContent).toBe('')
  })

  it('offers paging only when the conversation spills over one page', () => {
    const { container } = render(
      <WorkflowTaskList
        tasks={[task({})]}
        total={30}
        pageSize={10}
        current={2}
        onPageChange={() => {}}
      />,
    )

    expect(container.textContent).toContain('pagination:2/30')

    const single = render(
      <WorkflowTaskList tasks={[task({})]} total={3} pageSize={10} onPageChange={() => {}} />,
    )
    expect(single.container.textContent).not.toContain('pagination')
  })

  it('keeps the page number controlled by the caller instead of flipping it itself', () => {
    const onPageChange = jest.fn()
    const { container } = render(
      <WorkflowTaskList
        tasks={[task({})]}
        total={30}
        pageSize={10}
        current={1}
        onPageChange={onPageChange}
      />,
    )

    // 组件不持有页码，翻页只上报；由 useWorkflowTasks 决定重新取哪一页。
    expect(onPageChange).not.toHaveBeenCalled()
    expect(container.textContent).toContain('pagination:1/30')
  })

  it('exposes a manual refresh', () => {
    const onRefresh = jest.fn()
    const { container } = render(
      <WorkflowTaskList tasks={[task({})]} total={1} onRefresh={onRefresh} loading={false} />,
    )

    fireEvent.click(container.querySelector('[data-testid="refresh"]') as Element)

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
