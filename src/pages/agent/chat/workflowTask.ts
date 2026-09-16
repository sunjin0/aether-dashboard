import type { WorkflowTask } from '@/services/workflow/invocation/WorkflowInvocationController'

/** 终态与后端 AgentWorkflowTaskQueryServiceImpl 的 TERMINAL_STATUSES 一一对应。 */
const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'TERMINATED', 'TIMED_OUT']

// 与 src/pages/workflow/instance/index.tsx 的 statusColor 同源，仅补上聊天页特有的两个等待态。
const STATUS_COLORS: Record<string, string> = {
  RUNNING: 'processing',
  WAITING_MCP_APPROVAL: 'warning',
  WAITING_USER_INPUT: 'warning',
  FAILED: 'error',
  COMPLETED: 'success',
  TERMINATED: 'default',
  TIMED_OUT: 'error',
}

// WAITING_USER_INPUT 复用「等待用户操作」：两者对用户是同一件事，再添一个近义词只会让文案漂移。
const STATUS_MESSAGE_IDS: Record<string, string> = {
  RUNNING: 'pages.agent.workflow.run.status.RUNNING',
  WAITING_MCP_APPROVAL: 'pages.agent.workflow.run.status.WAITING_MCP_APPROVAL',
  WAITING_USER_INPUT: 'pages.agent.workflow.run.status.WAITING_USER',
  FAILED: 'pages.agent.workflow.run.status.FAILED',
  COMPLETED: 'pages.agent.workflow.run.status.COMPLETED',
  TERMINATED: 'pages.agent.workflow.run.status.TERMINATED',
  TIMED_OUT: 'pages.agent.workflow.run.status.TIMED_OUT',
}

export const isWorkflowTaskTerminal = (status?: string) =>
  TERMINAL_STATUSES.includes(String(status || ''))

export const workflowTaskStatusColor = (status?: string) => STATUS_COLORS[String(status)] || 'default'

export const workflowTaskStatusMessageId = (status?: string) =>
  STATUS_MESSAGE_IDS[String(status)] || 'pages.agent.workflow.run.status.RUNNING'

/** 空列表算不上「全部结束」：一件都还没出现时不该停止轮询。 */
export const allWorkflowTasksTerminal = (tasks: WorkflowTask[]) =>
  tasks.length > 0 && tasks.every((task) => isWorkflowTaskTerminal(task.status))

/**
 * 时间格式化，规则与 AgentMessageBubble 的 formatTime 一致：今天给时间、昨天给「昨天 HH:mm」、更早给日期。
 * 这里不引 dayjs 插件 —— 仓内没有相对时间工具，为一段列表文案引入插件不划算。
 */
export const formatWorkflowTaskTime = (
  time: number | undefined,
  locale: string,
  formatYesterday: (descriptor: { id: string }, values: { time: string }) => string,
) => {
  if (time === undefined || time === null) return ''
  try {
    const date = new Date(Number(time))
    if (Number.isNaN(date.getTime())) return ''
    const now = new Date()
    if (date.toDateString() === now.toDateString())
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const clock = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    if (date.toDateString() === yesterday.toDateString())
      return formatYesterday({ id: 'components.agentMessageBubble.yesterday' }, { time: clock })
    return date.toLocaleDateString(locale, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
