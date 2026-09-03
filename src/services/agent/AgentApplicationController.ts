import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

export interface ApplicationRecord { id?: string; code: string; name: string; status?: number }

export const getApplicationList = (): Promise<ResponseStructure<ApplicationRecord[]>> =>
  request('/api/agent/application/list', { method: 'POST', data: { current: 1, pageSize: 100 } })
export interface AgentApplication { id: string; code: string; name: string; description?: string; status: number; maxAgentCallsPerHour?: number; maxWorkflowStartsPerHour?: number }
export const getAgentApplicationList = (data: Record<string, unknown> = {}) => request<ResponseStructure<AgentApplication[]>>('/api/agent/application/list', { method: 'POST', data })
export const createAgentApplication = (data: Omit<AgentApplication, 'id'>) => request<ResponseStructure<void>>('/api/agent/application', { method: 'POST', data })
export const updateAgentApplication = (id: string, data: Omit<AgentApplication, 'id'>) => request<ResponseStructure<void>>(`/api/agent/application/${id}`, { method: 'PUT', data })
export const deleteAgentApplication = (id: string) => request<ResponseStructure<void>>(`/api/agent/application/${id}`, { method: 'DELETE' })
export interface AgentApplicationUsage { applicationId: string; agentRuns: number; workflowRuns: number; totalTokens: number; callbackFailed: number }
export const getAgentApplicationUsage = (id: string) => request<ResponseStructure<AgentApplicationUsage>>(`/api/agent/application/${id}/usage`)
