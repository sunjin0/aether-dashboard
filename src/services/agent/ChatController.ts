import { getLocale } from '@@/exports';
import { request } from '@umijs/max';
import { ResponseStructure } from '@/services/entity/Common';
import {
  AgentChatRequest,
  AgentMessage,
  AgentStreamDoneData,
  AgentStreamErrorData,
  AgentStreamEvent,
  AgentStreamMessageData,
  AgentStreamToolCallData,
} from '@/services/entity/Agent';

export interface StreamAgentChatOptions {
  signal?: AbortSignal;
  onMessage?: (chunk: string, data: AgentStreamMessageData) => void;
  onToolCall?: (data: AgentStreamToolCallData) => void;
  onDone?: (data: AgentStreamDoneData) => void;
  onError?: (data: AgentStreamErrorData) => void;
}

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

/**
 * @description 发送 Agent 流式聊天消息
 */
export const streamAgentChat = async (
  params: AgentChatRequest,
  options: StreamAgentChatOptions = {},
) => {
  const query = new URLSearchParams();
  query.set('agentId', params.agentId);
  query.set('message', params.message);
  if (params.conversationId) {
    query.set('conversationId', params.conversationId);
  }

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    'Accept-Language': getLocale(),
  };
  const token = localStorage.getItem('token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/api/agent/chat/stream?${query.toString()}`, {
    method: 'GET',
    headers,
    signal: options.signal,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    throw new Error('登录已过期，请重新登录');
  }

  if (!response.ok || !response.body) {
    throw new Error(`SSE request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const dispatchEvent = (rawEvent: string) => {
    const parsed = parseSseEvent(rawEvent);
    if (!parsed) {
      return false;
    }

    if (parsed.event === 'message') {
      options.onMessage?.(parsed.data.chunk || '', parsed.data);
      return false;
    }
    if (parsed.event === 'tool_call') {
      options.onToolCall?.(parsed.data);
      return false;
    }
    if (parsed.event === 'error') {
      options.onError?.(parsed.data);
      return true;
    }
    if (parsed.event === 'done') {
      options.onDone?.(parsed.data);
      return true;
    }
    return false;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';

      for (const rawEvent of events) {
        if (dispatchEvent(rawEvent)) {
          return;
        }
      }
    }

    if (buffer.trim() && dispatchEvent(buffer)) {
      return;
    }
  } finally {
    reader.releaseLock();
  }
};

const parseSseEvent = (raw: string): AgentStreamEvent | null => {
  const lines = raw.split(/\r?\n/);
  let event = 'message';
  const dataLines: string[] = [];

  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
    }
  });

  if (!dataLines.length) {
    return null;
  }

  return {
    event,
    data: JSON.parse(dataLines.join('\n')),
  } as AgentStreamEvent;
};
