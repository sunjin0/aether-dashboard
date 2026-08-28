import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'
export interface AgentProductProfile { id: string; productId: string; applicationId: string; code: string; agentDefinitionId?: string; workflowId?: string; productType: string; name: string; inputSchema: string; outputSchema: string; knowledgePolicy?: string; approvalPolicy?: string; handoffPolicy?: string; apiProtocolVersion?: string; allowedContextKeys?: string; publishedSnapshotId?: string; status: number; versionNo: number }
export const getAgentProductProfiles = (data: { current?: number; pageSize?: number; applicationId?: string; name?: string; productType?: string; status?: number } = {}) => request<ResponseStructure<AgentProductProfile[]>>('/api/agent/product-profile/list', { method: 'POST', data })
export const createAgentProductProfile = (data: Omit<AgentProductProfile, 'id' | 'productId' | 'status' | 'versionNo'>) => request<ResponseStructure<string>>('/api/agent/product-profile', { method: 'POST', data })
export const updateAgentProductProfile = (id: string, data: Omit<AgentProductProfile, 'id' | 'productId' | 'status' | 'versionNo'>) => request<ResponseStructure<void>>(`/api/agent/product-profile/${id}`, { method: 'PUT', data })
export const publishAgentProductProfile = (id: string) => request<ResponseStructure<AgentProductProfile>>(`/api/agent/product-profile/${id}/publish`, { method: 'POST' })
export const copyAgentProductProfile = (id: string) => request<ResponseStructure<string>>(`/api/agent/product-profile/${id}/copy`, { method: 'POST' })
export const setAgentProductProfileEnabled = (id: string, enabled: boolean) => request<ResponseStructure<void>>(`/api/agent/product-profile/${id}/enabled`, { method: 'POST', params: { enabled } })
export const deleteAgentProductProfile = (id: string) => request<ResponseStructure<void>>(`/api/agent/product-profile/${id}`, { method: 'DELETE' })
export interface AgentProductProfileVersion { id: string; versionNo: number; snapshot: string; publishedBy?: string; publishedAt: number }
export const getAgentProductProfileVersions = (id: string) => request<ResponseStructure<AgentProductProfileVersion[]>>(`/api/agent/product-profile/${id}/versions`)
