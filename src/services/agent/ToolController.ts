import {request} from '@umijs/max';
import {ResponseStructure} from '@/services/entity/Common';
import {AgentTool, AgentToolSearchParams} from '@/services/entity/Agent';

/**
 * @description 获取 Agent 工具列表
 */
export const getAgentToolList = async (
  params: AgentToolSearchParams,
): Promise<ResponseStructure<AgentTool[]>> => {
  return request('/api/agent/tool/list', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 获取 Agent 工具详情
 */
export const getAgentToolInfo = async (id: string): Promise<ResponseStructure<AgentTool>> => {
  return request(`/api/agent/tool/${id}`, {
    method: 'GET',
  });
};

/**
 * @description 新增 Agent 工具
 */
export const addAgentToolInfo = async (
  params: AgentTool,
): Promise<ResponseStructure<AgentTool>> => {
  return request('/api/agent/tool', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 修改 Agent 工具
 */
export const updateAgentToolInfo = async (
  params: AgentTool,
): Promise<ResponseStructure<AgentTool>> => {
  return request(`/api/agent/tool/${params.id}`, {
    method: 'PUT',
    data: params,
  });
};

/**
 * @description 删除 Agent 工具
 */
export const deleteAgentToolInfo = async (id: string): Promise<ResponseStructure<AgentTool>> => {
  return request(`/api/agent/tool/${id}`, {
    method: 'DELETE',
  });
};
