import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'
import { AgentWorkflow } from '@/services/workflow/WorkflowController'

export type WorkbenchItem = {
  type: 'workflow-instance' | 'knowledge-review' | 'workflow-dead-letter'
  id: string
  title?: string
  status?: string
  description?: string
  workflowId?: string
  createdAt?: number
  deadlineAt?: number
  overdue?: boolean
  completedNodeCount?: number
  totalNodeCount?: number
}

export type WorkbenchOverview = {
  waitingWorkflowInstances: number
  reviewTasks: number
  runningWorkflowInstances: number
  failedCallbacks: number
  executionDeadLetters: number
  pending: WorkbenchItem[]
  running: WorkbenchItem[]
  attention: WorkbenchItem[]
  quickStartWorkflows: AgentWorkflow[]
}

export const getWorkbenchOverview = () =>
  request<ResponseStructure<WorkbenchOverview>>('/api/workbench/overview')
