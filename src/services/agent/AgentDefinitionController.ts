import { request } from '@umijs/max'
import { Option, ResponseStructure } from '@/services/entity/Common'
import {
  AgentDefinition,
  AgentDefinitionSearchParams,
  AgentDefinitionStatusParams,
  AgentToolBinding,
  BindToolRequest,
  UpdateToolPriorityRequest,
} from '@/services/entity/Agent'

/**
 * @description 获取 Agent 定义列表
 */
export const getAgentDefinitionList = async (
  params: AgentDefinitionSearchParams,
): Promise<ResponseStructure<AgentDefinition[]>> => {
  return request('/api/agent/definition/list', {
    method: 'POST',
    data: params,
  })
}
export const getAgentDefinitionOptions = async (status = 1): Promise<Option[]> => {
  const { data } = await request<ResponseStructure<Option[]>>('/api/agent/definition/options', { method: 'GET', params: { status } })
  return data || []
}

/**
 * @description 获取 Agent 定义详情
 */
export const getAgentDefinitionInfo = async (
  id: string,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${id}`, {
    method: 'GET',
  })
}

/**
 * @description 新增 Agent 定义
 */
export const addAgentDefinitionInfo = async (
  params: AgentDefinition,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request('/api/agent/definition', {
    method: 'POST',
    data: params,
  })
}

/**
 * @description 修改 Agent 定义
 */
export const updateAgentDefinitionInfo = async (
  params: AgentDefinition,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${params.id}`, {
    method: 'PUT',
    data: params,
  })
}

/**
 * @description 删除 Agent 定义
 */
export const deleteAgentDefinitionInfo = async (
  id: string,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${id}`, {
    method: 'DELETE',
  })
}

/**
 * @description 启用/禁用 Agent 定义
 */
export const updateAgentDefinitionStatus = async (
  id: string,
  params: AgentDefinitionStatusParams,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${id}/status`, {
    method: 'PUT',
    data: params,
  })
}

/**
 * @description 复制 Agent 定义
 */
export const copyAgentDefinitionInfo = async (
  id: string,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${id}/copy`, {
    method: 'POST',
  })
}

/**
 * @description 查询 Agent 绑定的工具列表
 */
export const getAgentBoundTools = async (
  agentId: string,
): Promise<ResponseStructure<AgentToolBinding[]>> => {
  return request(`/api/agent/definition/${agentId}/tools`, {
    method: 'GET',
  })
}

/**
 * @description 绑定工具到 Agent
 */
export const bindToolToAgent = async (
  agentId: string,
  params: BindToolRequest,
): Promise<ResponseStructure<AgentToolBinding>> => {
  return request(`/api/agent/definition/${agentId}/tools`, {
    method: 'POST',
    data: params,
  })
}

/**
 * @description 从 Agent 解绑工具
 */
export const unbindToolFromAgent = async (
  agentId: string,
  toolId: string,
): Promise<ResponseStructure<void>> => {
  return request(`/api/agent/definition/${agentId}/tools/${toolId}`, {
    method: 'DELETE',
  })
}

/**
 * @description 调整 Agent 工具优先级
 */
export const updateToolPriority = async (
  agentId: string,
  toolId: string,
  params: UpdateToolPriorityRequest,
): Promise<ResponseStructure<AgentToolBinding>> => {
  return request(`/api/agent/definition/${agentId}/tools/${toolId}/priority`, {
    method: 'PUT',
    data: params,
  })
}
/**
 * @description 获取模型供应商列表
 */
export const getModelProviderList = async (): Promise<Option[]> => {
  const { data } = await request<ResponseStructure<Option[]>>(
    '/api/agent/definition//model/providers',
    {
      method: 'GET',
    },
  )
  return data
}
