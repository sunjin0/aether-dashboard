import {request} from '@umijs/max';
import {ResponseStructure} from '@/services/entity/Common';
import {AgentToolCallLog, AgentToolCallLogSearchParams} from '@/services/entity/Agent';

/**
 * @description 获取 Agent 工具调用日志列表
 */
export const getAgentToolCallLogList = async (
  params: AgentToolCallLogSearchParams,
): Promise<ResponseStructure<AgentToolCallLog[]>> => {
  return request('/api/agent/tool-call-log/list', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 获取 Agent 工具调用日志详情
 */
export const getAgentToolCallLogInfo = async (
  id: string,
): Promise<ResponseStructure<AgentToolCallLog>> => {
  return request(`/api/agent/tool-call-log/${id}`, {
    method: 'GET',
  });
};
