import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'
import {
  AgentRun,
  AgentRunSearchParams,
  AgentRunStatistics,
  AgentRunStatisticsParams,
} from '@/services/entity/Agent'

/**
 * @description 获取 Agent 运行记录列表
 */
export const getAgentRunList = async (
  params: AgentRunSearchParams,
): Promise<ResponseStructure<AgentRun[]>> => {
  return request('/api/agent/run/list', {
    method: 'POST',
    data: params,
  })
}

/**
 * @description 获取 Agent 运行记录详情
 */
export const getAgentRunInfo = async (id: string): Promise<ResponseStructure<AgentRun>> => {
  return request(`/api/agent/run/${id}`, {
    method: 'GET',
  })
}

/**
 * @description 获取 Agent 运行统计
 */
export const getAgentRunStatistics = async (
  params?: AgentRunStatisticsParams,
): Promise<ResponseStructure<AgentRunStatistics>> => {
  return request('/api/agent/run/statistics', {
    method: 'GET',
    params,
  })
}
