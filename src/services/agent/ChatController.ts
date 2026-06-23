import {request} from '@umijs/max';
import {ResponseStructure} from '@/services/entity/Common';
import {AgentChatRequest, AgentMessage} from '@/services/entity/Agent';

/**
 * @description 发送 Agent 非流式聊天消息
 */
export const sendAgentChat = async (
  params: AgentChatRequest,
): Promise<ResponseStructure<AgentMessage>> => {
  return request('/api/agent/chat', {
    method: 'POST',
    data: params,
  });
};
