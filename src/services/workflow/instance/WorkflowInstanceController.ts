import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

export type WorkflowNodeInstance = { id: string; nodeId: string; nodeType: string; status: string; outputData?: string; errorMessage?: string; interactionConfig?: string; retryCount?: number }
export type WorkflowInstance = { id: string; workflowId: string; workflowName?: string; status: string; variables?: string; currentNodeId?: string; errorMessage?: string; versionNodes?: string; versionEdges?: string; nodes?: WorkflowNodeInstance[]; businessType?: string; businessId?: string; idempotencyKey?: string; deadlineAt?: number; current?: number; pageSize?: number }
export type WorkflowInstanceQuery = Partial<Pick<WorkflowInstance, 'workflowId' | 'status' | 'businessType' | 'businessId' | 'current' | 'pageSize'>>
export type WorkflowBusinessStart = { variables: Record<string, unknown>; businessType: string; businessId: string; idempotencyKey: string; callbackUrl?: string; deadlineAt?: number }
export type WorkflowCallbackDelivery = { id: string; instanceId: string; eventType: string; status: string; attemptCount?: number; responseStatus?: number; errorMessage?: string; deliveredAt?: number }
export type WorkflowExternalInvocation = { id: string; nodeId: string; invocationType: string; status: string; idempotencyKey: string; url?: string; errorMessage?: string; requestData?: string; responseData?: string; createdAt?: number }
export const startWorkflow = (id: string, variables: Record<string, unknown>) => request<ResponseStructure<string>>(`/api/agent/workflow/${id}/instances`, { method: 'POST', data: { variables } })
export const startBusinessWorkflow = (id: string, data: WorkflowBusinessStart, headers?: Record<string, string>) => request<ResponseStructure<string>>(`/api/agent/workflow/${id}/business-instances`, { method: 'POST', data, headers })
export const startExternalBusinessWorkflow = (id: string, data: WorkflowBusinessStart, headers?: Record<string, string>) => request<ResponseStructure<string>>(`/api/business/workflows/${id}/instances`, { method: 'POST', data, headers })
export const getWorkflowInstances = (data: WorkflowInstanceQuery) => request<ResponseStructure<WorkflowInstance[]>>('/api/agent/workflow/instances/list', { method: 'POST', data })
export const getWorkflowInstance = (id: string) => request<ResponseStructure<WorkflowInstance>>(`/api/agent/workflow/instances/${id}`)
export const getWorkflowCallbacks = (id: string) => request<ResponseStructure<WorkflowCallbackDelivery[]>>(`/api/agent/workflow/instances/${id}/callbacks`)
export const getWorkflowExternalInvocations = (id: string) => request<ResponseStructure<WorkflowExternalInvocation[]>>(`/api/agent/workflow/instances/${id}/external-invocations`)
export const confirmWorkflowExternalInvocation = (instanceId: string, invocationId: string, responseData?: string) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${instanceId}/external-invocations/${invocationId}/confirm`, { method: 'POST', data: { responseData } })
export const retryWorkflowExternalInvocation = (instanceId: string, invocationId: string) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${instanceId}/external-invocations/${invocationId}/retry`, { method: 'POST' })
export const retryWorkflowCallback = (instanceId: string, deliveryId: string) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${instanceId}/callbacks/${deliveryId}/retry`, { method: 'POST' })
export const answerWorkflow = (id: string, answer: Record<string, unknown>) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${id}/answer`, { method: 'POST', data: { answer } })
export const updateWorkflowVariables = (id: string, variables: Record<string, unknown>) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${id}/variables`, { method: 'PUT', data: { variables } })
export const retryWorkflow = (id: string) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${id}/retry`, { method: 'POST' })
export const replayWorkflow = (id: string) => request<ResponseStructure<string>>(`/api/agent/workflow/instances/${id}/replay`, { method: 'POST' })
export const terminateWorkflow = (id: string) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${id}/terminate`, { method: 'POST' })
