# Agent SSE 流式聊天前端对接方案

> 适用版本：V0.4 SSE 流式响应
> 后端接口：`GET /api/agent/chat/stream`

## 1. 对接结论

前端推荐使用 `fetch` + `ReadableStream` 手动解析 SSE，不推荐优先使用浏览器原生 `EventSource`。

原因：当前后端鉴权依赖 `Authorization: Bearer ...` 请求头，而原生 `EventSource` 不能自定义请求头。`fetch` 可以携带 `Authorization`，更适合当前后端鉴权方式。

## 2. 接口信息

```http
GET /api/agent/chat/stream?agentId=1&conversationId=100&message=你好
Accept: text/event-stream
Authorization: Bearer <token>
```

Query 参数：

| 参数 | 必填 | 说明 |
|------|------|------|
| `agentId` | 是 | Agent 定义 ID |
| `conversationId` | 否 | 会话 ID。首次对话不传，由后端自动创建 |
| `message` | 是 | 用户输入内容 |

响应类型：

```http
Content-Type: text/event-stream
```

## 3. SSE 事件格式

### 3.1 message

模型生成的文本分片。

```text
event: message
data: {"chunk":"你好","conversationId":"100","messageId":null}
```

字段说明：

| 字段 | 说明 |
|------|------|
| `chunk` | 当前文本分片 |
| `conversationId` | 当前会话 ID |
| `messageId` | 当前为 `null`，真实 assistant 消息 ID 在 `done` 事件返回 |

### 3.2 tool_call

工具调用事件。V0.4 仅保留事件格式，不执行完整工具调用闭环。

```text
event: tool_call
data: {"toolName":"weather","toolCallId":"call_123","arguments":{"city":"北京"}}
```

### 3.3 error

模型调用、参数校验或连接处理异常。

```text
event: error
data: {"code":500,"message":"模型调用失败"}
```

前端收到 `error` 后应结束本次流式请求，不再等待 `done`。

### 3.4 done

流式响应结束。

```text
event: done
data: {"conversationId":"100","messageId":"1000","totalTokens":50}
```

字段说明：

| 字段 | 说明 |
|------|------|
| `conversationId` | 当前会话 ID |
| `messageId` | 后端保存后的 assistant 消息 ID |
| `totalTokens` | 总 token 数，可能为空 |

## 4. 前端状态流转

推荐前端按以下流程处理：

1. 用户点击发送。
2. 前端立即把用户消息追加到聊天列表。
3. 前端创建一条临时 assistant 消息，内容为空，状态为 `streaming`。
4. 发起 `/api/agent/chat/stream` 请求。
5. 收到 `message` 事件时，把 `chunk` 追加到临时 assistant 消息。
6. 收到 `done` 事件时，更新 assistant 消息的真实 `messageId`，保存 `conversationId`，状态改为 `done`。
7. 收到 `error` 事件时，状态改为 `error`，展示错误信息，可保留已收到片段并标记“生成中断”。
8. 用户点击“停止生成”时，中断请求，并把当前 assistant 草稿标记为“已停止”。

## 5. TypeScript 类型建议

```ts
export type AgentStreamEvent =
  | {
      event: 'message'
      data: {
        chunk: string
        conversationId: string
        messageId: string | null
      }
    }
  | {
      event: 'tool_call'
      data: {
        conversationId?: string
        toolName?: string
        toolCallId?: string
        arguments?: Record<string, unknown>
      }
    }
  | {
      event: 'error'
      data: {
        code: number
        message: string
      }
    }
  | {
      event: 'done'
      data: {
        conversationId: string
        messageId: string
        totalTokens?: number
      }
    }
```

## 6. 推荐请求封装

```ts
export async function streamAgentChat(params: {
  token: string
  agentId: string
  conversationId?: string
  message: string
  signal?: AbortSignal
  onMessage: (chunk: string, data: any) => void
  onToolCall?: (data: any) => void
  onDone: (data: any) => void
  onError: (data: any) => void
}) {
  const query = new URLSearchParams()
  query.set('agentId', params.agentId)
  query.set('message', params.message)

  if (params.conversationId) {
    query.set('conversationId', params.conversationId)
  }

  const response = await fetch(`/api/agent/chat/stream?${query.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${params.token}`,
    },
    signal: params.signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`SSE request failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    const events = buffer.split('\n\n')
    buffer = events.pop() || ''

    for (const rawEvent of events) {
      const parsed = parseSseEvent(rawEvent)

      if (!parsed) {
        continue
      }

      if (parsed.event === 'message') {
        params.onMessage(parsed.data.chunk, parsed.data)
      }

      if (parsed.event === 'tool_call') {
        params.onToolCall?.(parsed.data)
      }

      if (parsed.event === 'error') {
        params.onError(parsed.data)
        return
      }

      if (parsed.event === 'done') {
        params.onDone(parsed.data)
        return
      }
    }
  }
}

function parseSseEvent(raw: string): { event: string; data: any } | null {
  const lines = raw.split('\n')
  let event = 'message'
  let data = ''

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim()
    }

    if (line.startsWith('data:')) {
      data += line.slice('data:'.length).trim()
    }
  }

  if (!data) {
    return null
  }

  return {
    event,
    data: JSON.parse(data),
  }
}
```

## 7. 页面侧使用示例

```ts
const controller = new AbortController()

await streamAgentChat({
  token,
  agentId: selectedAgentId,
  conversationId: currentConversationId,
  message: inputText,
  signal: controller.signal,

  onMessage(chunk, data) {
    currentConversationId = data.conversationId
    updateAssistantDraft((old) => old + chunk)
  },

  onToolCall(data) {
    showToolCallStatus(data)
  },

  onDone(data) {
    currentConversationId = data.conversationId
    finalizeAssistantMessage({
      messageId: data.messageId,
      totalTokens: data.totalTokens,
    })
  },

  onError(data) {
    markAssistantMessageError(data.message)
  },
})
```

## 8. 停止生成

前端应为流式生成提供“停止生成”按钮。

```ts
controller.abort()
```

用户停止后，建议将当前 assistant 草稿标记为 `stopped` 或 `interrupted`，不要标记为正常完成。

## 9. EventSource 备选方案

只有在后端支持 Cookie 登录态或临时 stream token 时，才建议使用 `EventSource`。

```ts
const source = new EventSource(
  `/api/agent/chat/stream?agentId=${agentId}&conversationId=${conversationId}&message=${encodeURIComponent(message)}`
)

source.addEventListener('message', (event) => {
  const data = JSON.parse(event.data)
  appendChunk(data.chunk)
})

source.addEventListener('done', (event) => {
  const data = JSON.parse(event.data)
  finalizeMessage(data.messageId)
  source.close()
})

source.addEventListener('error', () => {
  source.close()
})
```

当前后端使用 `Authorization` 请求头鉴权，因此不推荐该方案。

## 10. 建议前端模块结构

```text
src/
  api/
    agentChat.ts          # streamAgentChat 封装
  stores/
    chatStore.ts          # conversationId、messages、streaming 状态
  components/
    ChatPanel.vue/tsx     # 聊天主界面
    ChatMessage.vue/tsx   # 单条消息渲染
    ChatInput.vue/tsx     # 输入框、发送、停止生成
```

## 11. 验收标准

- 发送消息后用户消息立即展示。
- assistant 回复逐片段追加，不等待完整响应。
- `done` 后消息状态变为完成，并保存后端返回的 `messageId`。
- `error` 后展示错误提示并关闭流。
- 点击“停止生成”能中断当前请求。
- 首次对话能正确保存后端返回的 `conversationId`。
- 刷新页面后可通过会话消息接口重新加载历史消息。

## 12. 注意事项

- `message` 事件中的 `messageId` 当前为 `null`，真实 `messageId` 以 `done` 事件为准。
- 如果收到 `error`，不要继续等待 `done`。
- 当前后端没有断点续传能力，网络断开后不建议自动重连继续同一条生成。
- URL Query 中的 `message` 需要通过 `URLSearchParams` 或 `encodeURIComponent` 编码，避免中文和特殊字符导致请求错误。
