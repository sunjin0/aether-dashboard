import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

export type WorkflowQuestion = { key?: string; question?: string; label?: string; required?: boolean; options?: string[] }
export type WorkflowNode = { id: string; type: 'start' | 'agent' | 'tool' | 'human' | 'approval' | 'rule' | 'transform' | 'http' | 'notification' | 'subflow' | 'parallel' | 'join' | 'wait_event' | 'delay' | 'end'; name?: string; resourceId?: string; prompt?: string; question?: string; toolName?: string; argumentsTemplate?: string; outputKey?: string; internalKey?: string; stateMapping?: string; questions?: WorkflowQuestion[]; eventType?: string; correlationKeyTemplate?: string; timeoutMillis?: number; timeoutTargetId?: string; approverServiceAccountId?: string; approvalMode?: 'ANY' | 'ALL'; position?: { x: number; y: number }; [key: string]: unknown }
export type WorkflowEdge = { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string; condition?: string; label?: string; isDefault?: boolean; maxIterations?: number }
export type AgentWorkflow = { id?: string; applicationId?: string; code?: string; name?: string; description?: string; nodes?: string; edges?: string; inputSchema?: string; outputSchema?: string; publishedInputSchema?: string; publishedOutputSchema?: string; status?: number; publishedVersion?: number; maxConcurrentInstances?: number; current?: number; pageSize?: number }
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
