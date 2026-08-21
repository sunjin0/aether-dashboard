import { request } from '@umijs/max'
import { ResponseStructure } from '@/services/entity/Common'
import {
  AgentConversation,
  AgentConversationContext,
  AgentContextOperationsMetrics,
  AgentConversationSearchParams,
  AgentSessionMemory,
  AgentMessage,
  AgentMessageSearchParams,
  ConversationLifecycle,
  MessageStatistics,
} from '@/services/entity/Agent'

const memoryWriteHeaders = (memoryVersion: number | undefined, idempotencyKey: string) => {
  const headers: Record<string, string> = {
    'Idempotency-Key': idempotencyKey,
  }
  if (memoryVersion != null) {
    headers['If-Match'] = String(memoryVersion)
  }
  return headers
}

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
 * @description 获取会话最近一次已完成模型调用的上下文容量
 */
export const getAgentConversationContext = async (
  id: string,
): Promise<ResponseStructure<AgentConversationContext>> => {
  return request(`/api/agent/conversation/${id}/context`, {
    method: 'GET',
  })
}

/**
 * @description 获取上下文组装、压缩和容量压力的运营聚合指标
 */
export const getAgentContextOperationsMetrics = async (
  sinceCreatedAt?: number,
): Promise<ResponseStructure<AgentContextOperationsMetrics>> => {
  return request('/api/agent/conversation/context/operations/metrics', {
    method: 'GET',
    params: sinceCreatedAt == null ? undefined : { sinceCreatedAt },
  })
}

/** 查询当前会话可见的会话记忆。 */
export const getAgentConversationMemories = async (
  id: string,
): Promise<ResponseStructure<AgentSessionMemory[]>> =>
  request(`/api/agent/conversation/${id}/memory`, { method: 'GET' })

/** 通过取代旧记录修正会话记忆。 */
export const correctAgentConversationMemory = async (
  id: string,
  memoryId: string,
  payload: { content: string; reason: string; memoryVersion?: number },
  idempotencyKey: string,
): Promise<ResponseStructure<AgentSessionMemory>> =>
  request(`/api/agent/conversation/${id}/memory/${memoryId}`, {
    method: 'PUT',
    data: payload,
    headers: memoryWriteHeaders(payload.memoryVersion, idempotencyKey),
  })

/** 从后续上下文中移除会话记忆。 */
export const deleteAgentConversationMemory = async (
  id: string,
  memoryId: string,
  memoryVersion: number | undefined,
  idempotencyKey: string,
): Promise<ResponseStructure<void>> =>
  request(`/api/agent/conversation/${id}/memory/${memoryId}`, {
    method: 'DELETE',
    headers: memoryWriteHeaders(memoryVersion, idempotencyKey),
  })

/** 反馈会话记忆准确性或过期状态。 */
export const submitAgentConversationMemoryFeedback = async (
  id: string,
  payload: {
    memoryId: string
    memoryVersion?: number
    verdict: 'ACCURATE' | 'INACCURATE' | 'EXPIRED'
    reason?: string
  },
  idempotencyKey: string,
): Promise<ResponseStructure<AgentSessionMemory>> =>
  request(`/api/agent/conversation/${id}/memory/feedback`, {
    method: 'POST',
    data: payload,
    headers: memoryWriteHeaders(payload.memoryVersion, idempotencyKey),
  })

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
