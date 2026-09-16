import {
  allWorkflowTasksTerminal,
  formatWorkflowTaskTime,
  isWorkflowTaskTerminal,
  workflowTaskStatusColor,
  workflowTaskStatusMessageId,
} from './workflowTask'
import type { WorkflowTask } from '@/services/workflow/invocation/WorkflowInvocationController'

const task = (status: string): WorkflowTask => ({ invocationId: `inv-${status}`, status }) as WorkflowTask

describe('workflow task helpers', () => {
  it('treats the four terminal statuses as finished and the waiting ones as live', () => {
    expect(['COMPLETED', 'FAILED', 'TERMINATED', 'TIMED_OUT'].every(isWorkflowTaskTerminal)).toBe(true)
    expect(['RUNNING', 'WAITING_MCP_APPROVAL', 'WAITING_USER_INPUT'].some(isWorkflowTaskTerminal)).toBe(
      false,
    )
    expect(isWorkflowTaskTerminal(undefined)).toBe(false)
  })

  it('does not stop polling on an empty list', () => {
    // 一件都还没出现时停轮询，agent 之后启动的工作流就再也不会被看到。
    expect(allWorkflowTasksTerminal([])).toBe(false)
    expect(allWorkflowTasksTerminal([task('COMPLETED')])).toBe(true)
    expect(allWorkflowTasksTerminal([task('COMPLETED'), task('RUNNING')])).toBe(false)
  })

  it('distinguishes an MCP approval wait from a plain user wait', () => {
    expect(workflowTaskStatusMessageId('WAITING_MCP_APPROVAL')).toBe(
      'pages.agent.workflow.run.status.WAITING_MCP_APPROVAL',
    )
    expect(workflowTaskStatusMessageId('WAITING_USER_INPUT')).toBe(
      'pages.agent.workflow.run.status.WAITING_USER',
    )
  })

  it('falls back to a running look for an unknown status instead of rendering nothing', () => {
    expect(workflowTaskStatusMessageId('SOMETHING_NEW')).toBe('pages.agent.workflow.run.status.RUNNING')
    expect(workflowTaskStatusColor('SOMETHING_NEW')).toBe('default')
    expect(workflowTaskStatusColor('FAILED')).toBe('error')
    expect(workflowTaskStatusColor('COMPLETED')).toBe('success')
  })

  it('formats today as a clock time and an older day with its date', () => {
    const formatYesterday = jest.fn(({ id }: { id: string }) => id)
    const now = Date.now()

    expect(formatWorkflowTaskTime(now, 'zh-CN', formatYesterday)).toMatch(/\d{2}:\d{2}/)
    expect(formatWorkflowTaskTime(now - 3 * 24 * 3600 * 1000, 'zh-CN', formatYesterday)).toMatch(
      /\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日/,
    )
    expect(formatWorkflowTaskTime(undefined, 'zh-CN', formatYesterday)).toBe('')
  })
})
