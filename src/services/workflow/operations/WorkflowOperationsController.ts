import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

export type WorkflowOperationsMetrics = {
  totalInstances?: number
  completedInstances?: number
  failedInstances?: number
  waitingUserInstances?: number
  completionRate?: number
  averageCompletedDurationMs?: number
  averageNodeDurationMs?: number
  averageWaitingUserDurationMs?: number
  callbackFailedCount?: number
  mcpFailedCount?: number
  executionDeadLetterCount?: number
}
export type WorkflowDeadLetter = {
  type: string
  id: string
  instanceId?: string
  status?: string
  attemptCount?: number
  errorMessage?: string
  occurredAt?: number
}
export const getWorkflowOperationsMetrics = () => request<ResponseStructure<WorkflowOperationsMetrics>>('/api/agent/workflow/operations/metrics')
export const getWorkflowDeadLetters = (limit = 50) => request<ResponseStructure<WorkflowDeadLetter[]>>('/api/agent/workflow/operations/dead-letters', { params: { limit } })
