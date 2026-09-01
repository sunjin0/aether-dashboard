import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'
import {
  AgentRun,
  AgentRunStep,
  AgentRunSearchParams,
  AgentRunStatistics,
  AgentRunStatisticsParams,
  AgentRunPlan,
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
 * @description 获取 Agent 运行步骤
 */
export const getAgentRunSteps = async (id: string): Promise<ResponseStructure<AgentRunStep[]>> => {
  return request(`/api/agent/run/${id}/steps`, {
    method: 'GET',
  })
}

/**
 * @description 取消 Agent 运行
 */
export const cancelAgentRun = async (id: string): Promise<ResponseStructure<void>> => {
  return request(`/api/agent/run/${id}/cancel`, {
    method: 'POST',
  })
}
export const getAgentRunPlan = async (id: string): Promise<ResponseStructure<AgentRunPlan>> => request(`/api/agent/run/${id}/plan`, { method: 'GET' })
export const pauseAgentRun = async (id: string): Promise<ResponseStructure<void>> => request(`/api/agent/run/${id}/pause`, { method: 'POST' })
export const resumeAgentRun = async (id: string): Promise<ResponseStructure<void>> => request(`/api/agent/run/${id}/resume`, { method: 'POST' })

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

export const downloadToolAuditCsv = async (params?: { startTime?: number; endTime?: number }): Promise<Blob> =>
  request('/api/agent/governance/audit/tool-calls/export', { method: 'GET', params, responseType: 'blob' })
