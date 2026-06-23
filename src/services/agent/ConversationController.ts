import {request} from '@umijs/max';
import {ResponseStructure} from '@/services/entity/Common';
import {
  AgentConversation,
  AgentConversationSearchParams,
  AgentMessage,
  AgentMessageSearchParams,
} from '@/services/entity/Agent';

/**
 * @description 获取 Agent 会话列表
 */
export const getAgentConversationList = async (
  params: AgentConversationSearchParams,
): Promise<ResponseStructure<AgentConversation[]>> => {
  return request('/api/agent/conversation/list', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 获取 Agent 会话详情
 */
export const getAgentConversationInfo = async (
  id: string,
): Promise<ResponseStructure<AgentConversation>> => {
  return request(`/api/agent/conversation/${id}`, {
    method: 'GET',
  });
};

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
  });
};

/**
 * @description 关闭 Agent 会话
 */
export const closeAgentConversation = async (
  id: string,
): Promise<ResponseStructure<AgentConversation>> => {
  return request(`/api/agent/conversation/${id}/close`, {
    method: 'PUT',
  });
};

/**
 * @description 删除 Agent 会话
 */
export const deleteAgentConversation = async (
  id: string,
): Promise<ResponseStructure<AgentConversation>> => {
  return request(`/api/agent/conversation/${id}`, {
    method: 'DELETE',
  });
};
