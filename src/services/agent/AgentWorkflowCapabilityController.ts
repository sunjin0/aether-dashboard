import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'

export interface AgentWorkflowCapability {
  id: string
  applicationId: string
  workflowId: string
  workflowVersionId: string
  capabilityCode: string
  displayName: string
  description?: string
  enabled?: boolean
  status?: number
  allowedActions: string
  agentWritableVariables?: string
  allowedEventTypes?: string
  riskLevel?: string
  policyJson?: string
  inputSchema?: string
  outputSchema?: string
  updatedAt?: number | string
}

export type AgentWorkflowCapabilityRequest = Omit<AgentWorkflowCapability, 'id' | 'updatedAt'> & {
  id?: string
}

export const getAgentWorkflowCapabilities = (params: { applicationId?: string; workflowId?: string } = {}) =>
  request<ResponseStructure<AgentWorkflowCapability[]>>('/api/agent/workflow-capability', {
    method: 'GET',
    params,
  })

export const createAgentWorkflowCapability = (data: AgentWorkflowCapabilityRequest) =>
  request<ResponseStructure<string>>('/api/agent/workflow-capability', {
    method: 'POST',
    data,
  })

export const updateAgentWorkflowCapability = (id: string, data: AgentWorkflowCapabilityRequest) =>
  request<ResponseStructure<void>>(`/api/agent/workflow-capability/${id}`, {
    method: 'PUT',
    data,
  })

export const deleteAgentWorkflowCapability = (id: string) =>
  request<ResponseStructure<void>>(`/api/agent/workflow-capability/${id}`, {
    method: 'DELETE',
  })

export const setAgentWorkflowCapabilityEnabled = (id: string, enabled: boolean) =>
  request<ResponseStructure<void>>(`/api/agent/workflow-capability/${id}/enabled`, {
    method: 'POST',
    params: { enabled },
  })
