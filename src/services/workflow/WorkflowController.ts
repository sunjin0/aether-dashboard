import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

export type WorkflowQuestion = { key?: string; question?: string; label?: string; required?: boolean; options?: string[] }
export type WorkflowNode = { id: string; type: 'start' | 'agent' | 'mcp' | 'human' | 'end'; name?: string; resourceId?: string; prompt?: string; question?: string; toolName?: string; argumentsTemplate?: string; outputKey?: string; internalKey?: string; stateMapping?: string; questions?: WorkflowQuestion[]; position?: { x: number; y: number } }
export type WorkflowEdge = { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string; condition?: string; label?: string; isDefault?: boolean; maxIterations?: number }
export type AgentWorkflow = { id?: string; name?: string; description?: string; nodes?: string; edges?: string; inputSchema?: string; outputSchema?: string; publishedInputSchema?: string; publishedOutputSchema?: string; status?: number; publishedVersion?: number; maxConcurrentInstances?: number; current?: number; pageSize?: number }
export type WorkflowNodeInstance = { id: string; nodeId: string; nodeType: string; status: string; outputData?: string; errorMessage?: string; interactionConfig?: string; retryCount?: number }
export type WorkflowInstance = { id: string; workflowId: string; workflowName?: string; status: string; variables?: string; currentNodeId?: string; errorMessage?: string; versionNodes?: string; versionEdges?: string; nodes?: WorkflowNodeInstance[]; businessType?: string; businessId?: string; idempotencyKey?: string; deadlineAt?: number; current?: number; pageSize?: number }
export type WorkflowInstanceQuery = Partial<Pick<WorkflowInstance, 'workflowId' | 'status' | 'businessType' | 'businessId' | 'current' | 'pageSize'>>
export type WorkflowBusinessStart = { variables: Record<string, unknown>; businessType: string; businessId: string; idempotencyKey: string; callbackUrl?: string; deadlineAt?: number }
export type WorkflowCallbackDelivery = { id: string; instanceId: string; eventType: string; status: string; attemptCount?: number; responseStatus?: number; errorMessage?: string; deliveredAt?: number }
export type WorkflowTemplate = {
  id: string
  name: string
  description?: string
  nodes?: string
  edges?: string
  inputSchema?: string
  outputSchema?: string
  createdAt?: number
}
export type WorkflowWebhook = {
  id?: string
  workflowId: string
  serviceAccountId: string
  name: string
  businessType?: string
  businessIdExpression?: string
  idempotencyKeyExpression?: string
  variableMapping?: Record<string, string>
  enabled?: boolean
  current?: number
  pageSize?: number
}
export type WorkflowWebhookSecret = WorkflowWebhook & { signingSecret: string; webhookUrl?: string }
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
export type WorkflowVersion = {
  id: string
  versionNo: number
  nodes?: string
  edges?: string
  inputSchema?: string
  outputSchema?: string
  publishedAt?: number
}
export type WorkflowVersionDiff = {
  fromVersion: number
  toVersion: number
  addedNodeIds: string[]
  removedNodeIds: string[]
  changedNodeIds: string[]
  addedEdgeIds: string[]
  removedEdgeIds: string[]
  inputSchemaChanged: boolean
  outputSchemaChanged: boolean
}
export type WorkflowSchedule = {
  id?: string
  workflowId: string
  serviceAccountId: string
  name: string
  cronExpression: string
  businessType: string
  businessIdTemplate: string
  variables?: Record<string, unknown>
  enabled?: boolean
  nextFireAt?: number
  lastTriggeredAt?: number
  lastErrorMessage?: string
  current?: number
  pageSize?: number
}
export const getWorkflowList = (data: AgentWorkflow) => request<ResponseStructure<AgentWorkflow[]>>('/api/agent/workflow/list', { method: 'POST', data })
export const getWorkflow = (id: string) => request<ResponseStructure<AgentWorkflow>>(`/api/agent/workflow/${id}`)
export const createWorkflow = (data: AgentWorkflow) => request<ResponseStructure<string>>('/api/agent/workflow', { method: 'POST', data })
export const updateWorkflow = (id: string, data: AgentWorkflow, options?: { skipSuccessMessage?: boolean }) => request<ResponseStructure<void>>(`/api/agent/workflow/${id}`, { method: 'PUT', data, ...options })
export const publishWorkflow = (id: string) => request<ResponseStructure<number>>(`/api/agent/workflow/${id}/publish`, { method: 'POST' })
export const offlineWorkflow = (id: string) => request<ResponseStructure<void>>(`/api/agent/workflow/${id}/offline`, { method: 'POST' })
export const deleteWorkflow = (id: string) => request<ResponseStructure<void>>(`/api/agent/workflow/${id}`, { method: 'DELETE' })
export const getWorkflowVersions = (id: string) => request<ResponseStructure<WorkflowVersion[]>>(`/api/agent/workflow/${id}/versions`)
export const getWorkflowVersionDiff = (id: string, from: number, to: number) => request<ResponseStructure<WorkflowVersionDiff>>(`/api/agent/workflow/${id}/versions/diff`, { params: { from, to } })
export const exportWorkflow = (id: string) => request<ResponseStructure<AgentWorkflow>>(`/api/agent/workflow/${id}/export`)
export const importWorkflow = (data: AgentWorkflow) => request<ResponseStructure<string>>('/api/agent/workflow/import', { method: 'POST', data })
export const validateWorkflowDraft = (id: string, options?: { skipSuccessMessage?: boolean }) => request<ResponseStructure<void>>(`/api/agent/workflow/${id}/draft/validate`, { method: 'POST', ...options })
export const createWorkflowTemplate = (id: string, data: Pick<WorkflowTemplate, 'name' | 'description'>) => request<ResponseStructure<WorkflowTemplate>>(`/api/agent/workflow/${id}/templates`, { method: 'POST', data })
export const getWorkflowTemplates = (data: Partial<Pick<WorkflowTemplate, 'name'>> = {}) => request<ResponseStructure<WorkflowTemplate[]>>('/api/agent/workflow/templates/list', { method: 'POST', data })
export const instantiateWorkflowTemplate = (id: string, data: Pick<WorkflowTemplate, 'name' | 'description'>) => request<ResponseStructure<string>>(`/api/agent/workflow/templates/${id}/instantiate`, { method: 'POST', data })
export const createWorkflowWebhook = (data: WorkflowWebhook) => request<ResponseStructure<WorkflowWebhookSecret>>('/api/agent/workflow/webhooks', { method: 'POST', data })
export const getWorkflowWebhooks = (data: Partial<WorkflowWebhook>) => request<ResponseStructure<WorkflowWebhook[]>>('/api/agent/workflow/webhooks/list', { method: 'POST', data })
export const rotateWorkflowWebhookSecret = (id: string) => request<ResponseStructure<WorkflowWebhookSecret>>(`/api/agent/workflow/webhooks/${id}/rotate-secret`, { method: 'POST' })
export const setWorkflowWebhookEnabled = (id: string, enabled: boolean) => request<ResponseStructure<void>>(`/api/agent/workflow/webhooks/${id}/enabled`, { method: 'POST', params: { enabled } })
export const createWorkflowSchedule = (data: WorkflowSchedule) => request<ResponseStructure<WorkflowSchedule>>('/api/agent/workflow/schedules', { method: 'POST', data })
export const getWorkflowSchedules = (data: Partial<WorkflowSchedule> = {}) => request<ResponseStructure<WorkflowSchedule[]>>('/api/agent/workflow/schedules/list', { method: 'POST', data })
export const updateWorkflowSchedule = (id: string, data: WorkflowSchedule) => request<ResponseStructure<void>>(`/api/agent/workflow/schedules/${id}`, { method: 'PUT', data })
export const setWorkflowScheduleEnabled = (id: string, enabled: boolean) => request<ResponseStructure<void>>(`/api/agent/workflow/schedules/${id}/enabled`, { method: 'POST', params: { enabled } })
export const deleteWorkflowSchedule = (id: string) => request<ResponseStructure<void>>(`/api/agent/workflow/schedules/${id}`, { method: 'DELETE' })
export const getWorkflowOperationsMetrics = () => request<ResponseStructure<WorkflowOperationsMetrics>>('/api/agent/workflow/operations/metrics')
export const getWorkflowDeadLetters = (limit = 50) => request<ResponseStructure<WorkflowDeadLetter[]>>('/api/agent/workflow/operations/dead-letters', { params: { limit } })
export const startWorkflow = (id: string, variables: Record<string, unknown>) => request<ResponseStructure<string>>(`/api/agent/workflow/${id}/instances`, { method: 'POST', data: { variables } })
export const startBusinessWorkflow = (id: string, data: WorkflowBusinessStart, headers?: Record<string, string>) => request<ResponseStructure<string>>(`/api/agent/workflow/${id}/business-instances`, { method: 'POST', data, headers })
export const getWorkflowInstances = (data: WorkflowInstanceQuery) => request<ResponseStructure<WorkflowInstance[]>>('/api/agent/workflow/instances/list', { method: 'POST', data })
export const getWorkflowInstance = (id: string) => request<ResponseStructure<WorkflowInstance>>(`/api/agent/workflow/instances/${id}`)
export const getWorkflowCallbacks = (id: string) => request<ResponseStructure<WorkflowCallbackDelivery[]>>(`/api/agent/workflow/instances/${id}/callbacks`)
export const retryWorkflowCallback = (instanceId: string, deliveryId: string) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${instanceId}/callbacks/${deliveryId}/retry`, { method: 'POST' })
export const answerWorkflow = (id: string, answer: Record<string, unknown>) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${id}/answer`, { method: 'POST', data: { answer } })
export const updateWorkflowVariables = (id: string, variables: Record<string, unknown>) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${id}/variables`, { method: 'PUT', data: { variables } })
export const retryWorkflow = (id: string) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${id}/retry`, { method: 'POST' })
export const replayWorkflow = (id: string) => request<ResponseStructure<string>>(`/api/agent/workflow/instances/${id}/replay`, { method: 'POST' })
export const terminateWorkflow = (id: string) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${id}/terminate`, { method: 'POST' })
