import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'
import {
  AgentTool,
  AgentToolFacets,
  AgentToolSearchParams,
  AgentToolStatistics,
  AgentToolStatisticsParams,
  AgentToolTestResult,
} from '@/services/entity/Agent'

/**
 * @description 获取 Agent 工具列表
 */
export const getAgentToolList = async (
  params: AgentToolSearchParams,
): Promise<ResponseStructure<AgentTool[]>> => {
  return request('/api/agent/tool/list', {
    method: 'POST',
    data: params,
  })
}

/**
 * @description 获取 Agent 工具统计
 */
export const getAgentToolStatistics = async (
  params: AgentToolStatisticsParams,
): Promise<ResponseStructure<AgentToolStatistics>> => {
  return request('/api/agent/tool/statistics', {
    method: 'GET',
    params,
  })
}

/** 获取工具中心左侧筛选聚合数据 */
export const getAgentToolFacets = async (): Promise<ResponseStructure<AgentToolFacets>> => {
  return request('/api/agent/tool/facets', {
    method: 'GET',
  })
}

/**
 * @description 获取 Agent 工具详情
 */
export const getAgentToolInfo = async (id: string): Promise<ResponseStructure<AgentTool>> => {
  return request(`/api/agent/tool/${id}`, {
    method: 'GET',
  })
}

/**
 * @description 新增 Agent 工具
 */
export const addAgentToolInfo = async (
  params: AgentTool,
): Promise<ResponseStructure<AgentTool>> => {
  return request('/api/agent/tool', {
    method: 'POST',
    data: params,
  })
}

/**
 * @description 修改 Agent 工具
 */
export const updateAgentToolInfo = async (
  params: AgentTool,
): Promise<ResponseStructure<AgentTool>> => {
  return request(`/api/agent/tool/${params.id}`, {
    method: 'PUT',
    data: params,
  })
}

/**
 * @description 测试 MCP 工具调用
 */
export const testAgentTool = async (
  id: string,
  args: Record<string, unknown>,
): Promise<ResponseStructure<AgentToolTestResult>> => {
  return request(`/api/agent/tool/${id}/test`, {
    method: 'POST',
    data: args,
  })
}

/**
 * @description 删除 Agent 工具
 */
export const deleteAgentToolInfo = async (id: string): Promise<ResponseStructure<AgentTool>> => {
  return request(`/api/agent/tool/${id}`, {
    method: 'DELETE',
  })
}
