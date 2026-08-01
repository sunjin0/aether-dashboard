import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

export type WorkflowQuestion = { key?: string; question?: string; label?: string; required?: boolean; options?: string[] }
export type WorkflowNode = { id: string; type: 'start' | 'agent' | 'mcp' | 'human' | 'end'; name?: string; resourceId?: string; prompt?: string; question?: string; toolName?: string; argumentsTemplate?: string; outputKey?: string; internalKey?: string; stateMapping?: string; questions?: WorkflowQuestion[]; position?: { x: number; y: number } }
export type WorkflowEdge = { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string; condition?: string; label?: string; isDefault?: boolean; maxIterations?: number }
export type AgentWorkflow = { id?: string; name?: string; description?: string; nodes?: string; edges?: string; inputSchema?: string; publishedInputSchema?: string; status?: number; publishedVersion?: number; current?: number; pageSize?: number }
export type WorkflowNodeInstance = { id: string; nodeId: string; nodeType: string; status: string; outputData?: string; errorMessage?: string; interactionConfig?: string; retryCount?: number }
export type WorkflowInstance = { id: string; workflowId: string; workflowName?: string; status: string; variables?: string; currentNodeId?: string; errorMessage?: string; versionNodes?: string; versionEdges?: string; nodes?: WorkflowNodeInstance[]; current?: number; pageSize?: number }
export type WorkflowInstanceQuery = Partial<Pick<WorkflowInstance, 'workflowId' | 'status' | 'current' | 'pageSize'>>
export const getWorkflowList = (data: AgentWorkflow) => request<ResponseStructure<AgentWorkflow[]>>('/api/agent/workflow/list', { method: 'POST', data })
export const getWorkflow = (id: string) => request<ResponseStructure<AgentWorkflow>>(`/api/agent/workflow/${id}`)
export const createWorkflow = (data: AgentWorkflow) => request<ResponseStructure<string>>('/api/agent/workflow', { method: 'POST', data })
export const updateWorkflow = (id: string, data: AgentWorkflow) => request<ResponseStructure<void>>(`/api/agent/workflow/${id}`, { method: 'PUT', data })
export const publishWorkflow = (id: string) => request<ResponseStructure<number>>(`/api/agent/workflow/${id}/publish`, { method: 'POST' })
export const offlineWorkflow = (id: string) => request<ResponseStructure<void>>(`/api/agent/workflow/${id}/offline`, { method: 'POST' })
export const deleteWorkflow = (id: string) => request<ResponseStructure<void>>(`/api/agent/workflow/${id}`, { method: 'DELETE' })
export const startWorkflow = (id: string, variables: Record<string, unknown>) => request<ResponseStructure<string>>(`/api/agent/workflow/${id}/instances`, { method: 'POST', data: { variables } })
export const getWorkflowInstances = (data: WorkflowInstanceQuery) => request<ResponseStructure<WorkflowInstance[]>>('/api/agent/workflow/instances/list', { method: 'POST', data })
export const getWorkflowInstance = (id: string) => request<ResponseStructure<WorkflowInstance>>(`/api/agent/workflow/instances/${id}`)
export const answerWorkflow = (id: string, answer: Record<string, unknown>) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${id}/answer`, { method: 'POST', data: { answer } })
export const updateWorkflowVariables = (id: string, variables: Record<string, unknown>) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${id}/variables`, { method: 'PUT', data: { variables } })
export const retryWorkflow = (id: string) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${id}/retry`, { method: 'POST' })
export const terminateWorkflow = (id: string) => request<ResponseStructure<void>>(`/api/agent/workflow/instances/${id}/terminate`, { method: 'POST' })
