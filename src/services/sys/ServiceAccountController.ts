import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

export interface ServiceAccount {
  id: string
  name: string
  description?: string
  clientId: string
  allowedWorkflowIds: string[]
  allowedAgentIds: string[]
  maxStartsPerHour: number
  maxAgentCallsPerHour: number
  enabled: boolean
  lastUsedAt?: number
}

export interface ServiceAccountSecret {
  id: string
  name: string
  clientId: string
  clientSecret: string
}

export interface ServiceAccountToken {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export interface ServiceAccountUsageItem {
  id: string
  name: string
  calls: number
  tokens: number
}

export interface ServiceAccountUsage {
  totalCalls: number
  agentCalls: number
  workflowStarts: number
  totalTokens: number
  accounts: ServiceAccountUsageItem[]
  agents: ServiceAccountUsageItem[]
  workflows: ServiceAccountUsageItem[]
}

export type ServiceAccountCreate = Omit<Pick<ServiceAccount, 'name' | 'description' | 'clientId' | 'allowedWorkflowIds' | 'allowedAgentIds' | 'maxStartsPerHour' | 'maxAgentCallsPerHour'>, 'clientId'> & { clientId?: string }
export type ServiceAccountUpdate = Pick<ServiceAccount, 'name' | 'description' | 'allowedWorkflowIds' | 'allowedAgentIds' | 'maxStartsPerHour' | 'maxAgentCallsPerHour'>

export const getServiceAccountList = (data: Record<string, unknown> = {}) =>
  request<ResponseStructure<ServiceAccount[]>>('/api/sys/service-account/list', { method: 'POST', data })
export const createServiceAccount = (data: ServiceAccountCreate) =>
  request<ResponseStructure<ServiceAccountSecret>>('/api/sys/service-account', { method: 'POST', data })
export const rotateServiceAccountSecret = (id: string) =>
  request<ResponseStructure<ServiceAccountSecret>>(`/api/sys/service-account/${id}/rotate-secret`, { method: 'POST' })
export const setServiceAccountEnabled = (id: string, enabled: boolean) =>
  request<ResponseStructure<void>>(`/api/sys/service-account/${id}/enabled`, { method: 'POST', params: { enabled } })
export const updateServiceAccount = (id: string, data: ServiceAccountUpdate) =>
  request<ResponseStructure<void>>(`/api/sys/service-account/${id}`, { method: 'PUT', data })
export const deleteServiceAccount = (id: string) =>
  request<ResponseStructure<void>>(`/api/sys/service-account/${id}`, { method: 'DELETE' })
export const issueServiceAccountToken = (clientId: string, clientSecret: string) =>
  request<ResponseStructure<ServiceAccountToken>>('/api/auth/service-account/token', { method: 'POST', data: { clientId, clientSecret } })
export const getServiceAccountUsage = () =>
  request<ResponseStructure<ServiceAccountUsage>>('/api/sys/service-account/usage')
