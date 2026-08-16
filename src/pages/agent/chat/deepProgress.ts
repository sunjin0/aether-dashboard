import { AgentRunTask, AgentStreamRunStepData } from '@/services/entity/Agent'
import { ResponseStructure } from '@/services/entity/Common'

export const AGENT_RUN_EVENT_MESSAGE_IDS: Record<string, string> = {
  'run.started': 'pages.agent.run.steps.event.runStarted',
  'plan.updated': 'pages.agent.run.steps.event.planUpdated',
  'plan.approval.required': 'pages.agent.run.steps.event.planApprovalRequired',
  'ask_user.required': 'pages.agent.run.steps.event.askUserRequired',
  'step.started': 'pages.agent.run.steps.event.stepStarted',
  'step.completed': 'pages.agent.run.steps.event.stepCompleted',
  'step.verified': 'pages.agent.run.steps.event.stepVerified',
  'tool.started': 'pages.agent.run.steps.event.toolStarted',
  'tool.approval.required': 'pages.agent.run.steps.event.toolApprovalRequired',
  'tool.completed': 'pages.agent.run.steps.event.toolCompleted',
  'tool.failed': 'pages.agent.run.steps.event.toolFailed',
  'run.completed': 'pages.agent.run.steps.event.runCompleted',
  'run.failed': 'pages.agent.run.steps.event.runFailed',
  'run.cancelled': 'pages.agent.run.steps.event.runCancelled',
}

type FormatMessage = (descriptor: { id: string }, values?: Record<string, string>) => string

export type DeepTaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface DeepTask {
  id: string
  title: string
  status: DeepTaskStatus
}

const getToolName = (step: AgentStreamRunStepData) => {
  if (typeof step.data?.toolName === 'string') {
    return step.data.toolName
  }
  const firstAction = step.data?.actions?.[0]
  return typeof firstAction?.name === 'string' ? firstAction.name : '-'
}

export const cancelDeepRun = async (
  runId: string,
  cancel: (id: string) => Promise<ResponseStructure<void>>,
): Promise<void> => {
  try {
    const response = await cancel(runId)
    if (response.code !== 200) {
      return
    }
  } catch {
    // Cancellation is best-effort; the local stream must still stop immediately.
  }
}

export const mergeDeepRunSteps = (
  steps: AgentStreamRunStepData[],
  nextStep: AgentStreamRunStepData,
) => {
  if (nextStep.eventId && steps.some((step) => step.eventId === nextStep.eventId)) {
    return steps
  }

  return [...steps, nextStep].sort((left, right) => (left.occurredAt || 0) - (right.occurredAt || 0))
}

const normalizeTaskStatus = (status?: string): DeepTaskStatus => {
  switch (status?.toLowerCase()) {
    case 'in_progress':
    case 'running':
      return 'running'
    case 'completed':
    case 'success':
      return 'completed'
    case 'failed':
    case 'blocked':
      return 'failed'
    default:
      return 'pending'
  }
}

const getPlanTasks = (step: AgentStreamRunStepData): AgentRunTask[] => {
  if (step.eventType !== 'plan.updated') {
    return []
  }
  const { tasks, plan, steps } = step.data || {}
  if (Array.isArray(tasks)) {
    return tasks
  }
  if (Array.isArray(plan)) {
    return plan
  }
  if (Array.isArray(plan?.tasks)) {
    return plan.tasks
  }
  return Array.isArray(steps) ? steps : []
}

/** 从最新计划事件提取任务，并兼容服务端的 tasks / plan / steps 三种载荷。 */
export const getDeepRunTasks = (steps: AgentStreamRunStepData[]): DeepTask[] => {
  const taskMap = new Map<string, DeepTask>()
  steps.forEach((step) => {
    getPlanTasks(step).forEach((task, index) => {
      const title = task.title || task.name || task.task || task.description || task.content
      if (!title) {
        return
      }
      const id = task.id || task.taskId || `${title}-${index}`
      taskMap.set(id, { id, title, status: normalizeTaskStatus(task.status) })
    })
  })
  return Array.from(taskMap.values())
}

export const getDeepStepDisplayText = (
  step: AgentStreamRunStepData,
  formatMessage?: FormatMessage,
) => {
  if (step.eventType === 'message.delta') {
    return undefined
  }
  const eventMessageId = step.eventType ? AGENT_RUN_EVENT_MESSAGE_IDS[step.eventType] : undefined
  if (eventMessageId && formatMessage) {
    return formatMessage(
      { id: eventMessageId },
      { toolName: getToolName(step) },
    )
  }
  if (typeof step.data?.message === 'string') {
    return step.data.message
  }
  if (typeof step.eventType === 'string') {
    return step.eventType
  }
  return undefined
}
