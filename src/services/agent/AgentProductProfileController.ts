import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'
export interface AgentProductProfile { id: string; applicationId: string; agentDefinitionId: string; productType: string; name: string; inputSchema: string; outputSchema: string; knowledgePolicy?: string; approvalPolicy?: string; handoffPolicy?: string; status: number; versionNo: number }
export const getAgentProductProfiles = (applicationId?: string) => request<ResponseStructure<AgentProductProfile[]>>('/api/agent/product-profile', { params: { applicationId } })
export const createAgentProductProfile = (data: Omit<AgentProductProfile, 'id' | 'status' | 'versionNo'>) => request<ResponseStructure<string>>('/api/agent/product-profile', { method: 'POST', data })
export const updateAgentProductProfile = (id: string, data: Omit<AgentProductProfile, 'id' | 'status' | 'versionNo'>) => request<ResponseStructure<void>>(`/api/agent/product-profile/${id}`, { method: 'PUT', data })
export const publishAgentProductProfile = (id: string) => request<ResponseStructure<AgentProductProfile>>(`/api/agent/product-profile/${id}/publish`, { method: 'POST' })
export const copyAgentProductProfile = (id: string) => request<ResponseStructure<string>>(`/api/agent/product-profile/${id}/copy`, { method: 'POST' })
