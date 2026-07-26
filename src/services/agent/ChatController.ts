import { getLocale } from '@@/exports'
import { request } from '@umijs/max'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { ResponseStructure } from '@/services/entity/Common'
import {
  AgentChatReplyRequest,
  AgentChatRequest,
  AgentChatAttachment,
  AgentMessage,
  AgentStreamDoneData,
  AgentStreamErrorData,
  AgentStreamMessageData,
  AgentStreamQuestionData,
  AgentStreamReasoningData,
  AgentStreamToolCallData,
} from '@/services/entity/Agent'

export interface StreamAgentChatOptions {
  signal?: AbortSignal;
  onMessage?: (chunk: string, data: AgentStreamMessageData) => void;
  onReasoning?: (chunk: string, data: AgentStreamReasoningData) => void;
  onToolCall?: (data: AgentStreamToolCallData) => void;
  onProgress?: (data: { stage?: string; message?: string }) => void;
  onQuestion?: (data: AgentStreamQuestionData) => void;
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
  })
}

/**
 * @description 发送 Agent 流式聊天消息
 */
export const streamAgentChat = async (
  params: AgentChatRequest,
  options: StreamAgentChatOptions = {},
) => {
  const token = localStorage.getItem('token')
  await fetchEventSource('/api/agent/chat/stream', {
    method: 'Post',
    headers: {
      'Accept-Language': getLocale(),
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
    signal: options.signal,

    onopen(response) {
      if (response.status !== 200) {
        options.onError?.({ message: response.statusText })
        return Promise.reject(new Error(response.statusText))
      }
      return Promise.resolve()
    },

    onmessage(event) {
      const eventType = event.event || 'message'
      let data: any

      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }

      if (eventType === 'message') {
        options.onMessage?.(data.chunk || '', data)
      } else if (eventType === 'reasoning') {
        options.onReasoning?.(data.chunk || '', data)
      } else if (eventType === 'tool_call') {
        options.onToolCall?.(data)
      } else if (eventType === 'progress') {
        options.onProgress?.(data)
      } else if (eventType === 'question') {
        options.onQuestion?.(data)
      } else if (eventType === 'done') {
        options.onDone?.(data)
      } else if (eventType === 'error') {
        options.onError?.(data)
      }
    },

    onerror(err) {
      options.onError?.({ message: err.message || '连接错误' })
      throw err // 抛出错误停止重连
    },

    openWhenHidden: true,
  })
}

/** 上传文件并完成文本识别；聊天请求仅携带该接口返回的识别结果。 */
export const uploadAgentChatAttachments = async (
  files: File[],
): Promise<ResponseStructure<AgentChatAttachment[]>> => {
  const data = new FormData()
  files.forEach((file) => data.append('files', file))
  return request('/api/agent/chat/attachment', { method: 'POST', data })
}

/**
 * @description 流式回复 Agent 提问（使用同一个 stream 接口）
 */
export const streamReplyAgentChat = async (
  params: AgentChatReplyRequest,
  options: StreamAgentChatOptions = {},
) => {
  const token = localStorage.getItem('token')

  await fetchEventSource('/api/agent/chat/stream', {
    method: 'Post',
    headers: {
      'Accept-Language': getLocale(),
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...params, interactive: true }),
    signal: options.signal,

    onopen(response) {
      if (response.status !== 200) {
        options.onError?.({ message: response.statusText })
        return Promise.reject(new Error(response.statusText))
      }
      return Promise.resolve()
    },

    onmessage(event) {
      const eventType = event.event || 'message'
      let data: any

      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }

      if (eventType === 'message') {
        options.onMessage?.(data.chunk || '', data)
      } else if (eventType === 'reasoning') {
        options.onReasoning?.(data.chunk || '', data)
      } else if (eventType === 'tool_call') {
        options.onToolCall?.(data)
      } else if (eventType === 'question') {
        options.onQuestion?.(data)
      } else if (eventType === 'done') {
        options.onDone?.(data)
      } else if (eventType === 'error') {
        options.onError?.(data)
      }
    },

    onerror(err) {
      options.onError?.({ message: err.message || '连接错误' })
      throw err
    },

    openWhenHidden: true,
  })
}
