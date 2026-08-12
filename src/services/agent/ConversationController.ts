import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'
import {
  AgentConversation,
  AgentConversationSearchParams,
  AgentMessage,
  AgentMessageSearchParams,
  ConversationLifecycle,
  MessageStatistics,
} from '@/services/entity/Agent'

/**
 * @description 获取 Agent 会话列表
 */
export const getAgentConversationList = async (
  params: AgentConversationSearchParams,
): Promise<ResponseStructure<AgentConversation[]>> => {
  return request('/api/agent/conversation/list', {
    method: 'POST',
    data: params,
  })
}

/**
 * @description 获取 Agent 会话详情
 */
export const getAgentConversationInfo = async (
  id: string,
): Promise<ResponseStructure<AgentConversation>> => {
  return request(`/api/agent/conversation/${id}`, {
    method: 'GET',
  })
}

/**
 * @description 获取 Agent 会话消息列表
 */
export const getAgentConversationMessages = async (
  id: string,
  params: AgentMessageSearchParams,
): Promise<ResponseStructure<AgentMessage[]>> => {
  return request(`/api/agent/conversation/${id}/messages`, {
    method: 'GET',
    params,
  })
}

/**
 * @description 关闭 Agent 会话
 */
export const closeAgentConversation = async (
  id: string,
): Promise<ResponseStructure<AgentConversation>> => {
  return request(`/api/agent/conversation/${id}/close`, {
    method: 'PUT',
  })
}

export const updateAgentConversationToolApprovalPolicy = async (
  id: string,
  toolApprovalPolicy: 'ask' | 'risky' | 'never',
): Promise<ResponseStructure<void>> =>
  request(`/api/agent/conversation/${id}/tool-approval-policy`, {
    method: 'PUT',
    data: { toolApprovalPolicy },
  })

/**
 * @description 删除 Agent 会话
 */
export const deleteAgentConversation = async (
  id: string,
): Promise<ResponseStructure<AgentConversation>> => {
  return request(`/api/agent/conversation/${id}`, {
    method: 'DELETE',
  })
}

/**
 * @description 获取会话生命周期信息
 */
export const getConversationLifecycle = async (
  id: string,
): Promise<ResponseStructure<ConversationLifecycle>> => {
  return request(`/api/agent/conversation/${id}/lifecycle`, {
    method: 'GET',
  })
}

/**
 * @description 获取会话消息统计
 */
export const getConversationStatistics = async (
  id: string,
): Promise<ResponseStructure<MessageStatistics>> => {
  return request(`/api/agent/conversation/${id}/statistics`, {
    method: 'GET',
  })
}
