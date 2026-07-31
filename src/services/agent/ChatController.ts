import { getLocale } from '@@/exports'
import { request } from '@umijs/max'
import { EventSourceMessage, fetchEventSource } from '@microsoft/fetch-event-source'
import { ResponseStructure } from '@/services/entity/Common'
import {
  AgentChatReplyRequest,
  AgentChatRequest,
  AgentChatAttachment,
  AgentStreamAcceptedData,
  AgentMessage,
  AgentStreamDoneData,
  AgentStreamErrorData,
  AgentStreamMessageData,
  AgentStreamQuestionData,
  AgentStreamReasoningData,
  AgentStreamRunStepData,
  AgentStreamToolCallData,
} from '@/services/entity/Agent'

export interface StreamAgentChatOptions {
  signal?: AbortSignal;
  onMessage?: (chunk: string, data: AgentStreamMessageData) => void;
  onReasoning?: (chunk: string, data: AgentStreamReasoningData) => void;
  onToolCall?: (data: AgentStreamToolCallData) => void;
  onAccepted?: (data: AgentStreamAcceptedData) => void;
  onRunStep?: (data: AgentStreamRunStepData) => void;
  onProgress?: (data: { stage?: string; message?: string }) => void;
  onQuestion?: (data: AgentStreamQuestionData) => void;
  onDone?: (data: AgentStreamDoneData) => void;
  onError?: (data: AgentStreamErrorData) => void;
}

const dispatchStreamEvent = (event: EventSourceMessage, options: StreamAgentChatOptions) => {
  let data: unknown

  try {
    data = JSON.parse(event.data)
  } catch {
    return
  }

  switch (event.event || 'message') {
    case 'message': {
      const message = data as AgentStreamMessageData
      options.onMessage?.(message.chunk || '', message)
      return
    }
    case 'reasoning': {
      const reasoning = data as AgentStreamReasoningData
      options.onReasoning?.(reasoning.chunk || '', reasoning)
      return
    }
    case 'tool_call':
      options.onToolCall?.(data as AgentStreamToolCallData)
      return
    case 'progress':
      options.onProgress?.(data as { stage?: string; message?: string })
      return
    case 'question':
      options.onQuestion?.(data as AgentStreamQuestionData)
      return
    case 'accepted':
      if (isAcceptedData(data)) {
        options.onAccepted?.(data)
      }
      return
    case 'run_step':
      options.onRunStep?.(data as AgentStreamRunStepData)
      return
    case 'done':
      options.onDone?.(data as AgentStreamDoneData)
      return
    case 'error':
      options.onError?.(data as AgentStreamErrorData)
  }
}

const isAcceptedData = (data: unknown): data is AgentStreamAcceptedData => {
  if (!data || typeof data !== 'object') {
    return false
  }
  const candidate = data as Record<string, unknown>
  return typeof candidate.runId === 'string' && typeof candidate.conversationId === 'string'
}

/**
 * @description 发送 Agent 非流式聊天消息（兼容旧客户端，新的聊天流程统一使用 streamAgentChat）
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
        return Promise.reject(new Error(response.statusText))
      }
      return Promise.resolve()
    },

    onmessage(event) {
      dispatchStreamEvent(event, options)
    },

    onerror(err) {
      options.onError?.({ message: err.message || '连接错误' })
      throw err // 抛出错误停止重连
    },

    openWhenHidden: true,
  })
}

/**
 * Subscribe to an already-created Deep Run. The server replays persisted steps
 * before sending live events, so fetch-event-source retries are safe.
 */
export const streamDeepRun = async (
  runId: string,
  options: StreamAgentChatOptions = {},
) => {
  const token = localStorage.getItem('token')
  await fetchEventSource(`/api/agent/deep-runs/${encodeURIComponent(runId)}/stream`, {
    headers: {
      'Accept-Language': getLocale(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: options.signal,
    onopen(response) {
      if (response.status !== 200) return Promise.reject(new Error(response.statusText))
      return Promise.resolve()
    },
    onmessage(event) {
      dispatchStreamEvent(event, options)
    },
    onerror(err) {
      options.onError?.({ message: err.message || 'Deep Run 连接错误' })
      // Returning normally allows fetch-event-source to reconnect and receive
      // the persisted event history again.
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
        return Promise.reject(new Error(response.statusText))
      }
      return Promise.resolve()
    },

    onmessage(event) {
      dispatchStreamEvent(event, options)
    },

    onerror(err) {
      options.onError?.({ message: err.message || '连接错误' })
      throw err
    },

    openWhenHidden: true,
  })
}
