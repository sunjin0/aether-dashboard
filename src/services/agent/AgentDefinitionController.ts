import {request} from '@umijs/max';
import {ResponseStructure} from '@/services/entity/Common';
import {
  AgentDefinition,
  AgentDefinitionSearchParams,
  AgentDefinitionStatusParams,
} from '@/services/entity/Agent';

/**
 * @description 获取 Agent 定义列表
 */
export const getAgentDefinitionList = async (
  params: AgentDefinitionSearchParams,
): Promise<ResponseStructure<AgentDefinition[]>> => {
  return request('/api/agent/definition/list', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 获取 Agent 定义详情
 */
export const getAgentDefinitionInfo = async (
  id: string,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${id}`, {
    method: 'GET',
  });
};

/**
 * @description 新增 Agent 定义
 */
export const addAgentDefinitionInfo = async (
  params: AgentDefinition,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request('/api/agent/definition', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 修改 Agent 定义
 */
export const updateAgentDefinitionInfo = async (
  params: AgentDefinition,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${params.id}`, {
    method: 'PUT',
    data: params,
  });
};

/**
 * @description 删除 Agent 定义
 */
export const deleteAgentDefinitionInfo = async (
  id: string,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${id}`, {
    method: 'DELETE',
  });
};

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
  });
};

/**
 * @description 复制 Agent 定义
 */
export const copyAgentDefinitionInfo = async (
  id: string,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${id}/copy`, {
    method: 'POST',
  });
};
