import {request} from '@umijs/max';
import {ResponseStructure} from '@/services/entity/Common';
import {AgentRun, AgentRunSearchParams} from '@/services/entity/Agent';

/**
 * @description 获取 Agent 运行记录列表
 */
export const getAgentRunList = async (
  params: AgentRunSearchParams,
): Promise<ResponseStructure<AgentRun[]>> => {
  return request('/api/agent/run/list', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 获取 Agent 运行记录详情
 */
export const getAgentRunInfo = async (id: string): Promise<ResponseStructure<AgentRun>> => {
  return request(`/api/agent/run/${id}`, {
    method: 'GET',
  });
};
