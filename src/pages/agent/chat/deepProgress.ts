import { AgentStreamRunStepData } from '@/services/entity/Agent'
import { ResponseStructure } from '@/services/entity/Common'

export const AGENT_RUN_EVENT_MESSAGE_IDS: Record<string, string> = {
  'run.started': 'pages.agent.run.steps.event.runStarted',
  'plan.updated': 'pages.agent.run.steps.event.planUpdated',
  'step.started': 'pages.agent.run.steps.event.stepStarted',
  'step.completed': 'pages.agent.run.steps.event.stepCompleted',
  'tool.started': 'pages.agent.run.steps.event.toolStarted',
  'tool.approval.required': 'pages.agent.run.steps.event.toolApprovalRequired',
  'tool.completed': 'pages.agent.run.steps.event.toolCompleted',
  'tool.failed': 'pages.agent.run.steps.event.toolFailed',
  'run.completed': 'pages.agent.run.steps.event.runCompleted',
  'run.failed': 'pages.agent.run.steps.event.runFailed',
  'run.cancelled': 'pages.agent.run.steps.event.runCancelled',
}

type FormatMessage = (descriptor: { id: string }, values?: Record<string, string>) => string

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

export const getDeepStepDisplayText = (
  step: AgentStreamRunStepData,
  formatMessage?: FormatMessage,
) => {
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
