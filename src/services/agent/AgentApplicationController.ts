import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

export interface AgentApplication { id: string; code: string; name: string; description?: string; status: number }
export const getAgentApplicationList = (data: Record<string, unknown> = {}) => request<ResponseStructure<AgentApplication[]>>('/api/agent/application/list', { method: 'POST', data })
export const createAgentApplication = (data: Omit<AgentApplication, 'id'>) => request<ResponseStructure<void>>('/api/agent/application', { method: 'POST', data })
export const updateAgentApplication = (id: string, data: Omit<AgentApplication, 'id'>) => request<ResponseStructure<void>>(`/api/agent/application/${id}`, { method: 'PUT', data })
