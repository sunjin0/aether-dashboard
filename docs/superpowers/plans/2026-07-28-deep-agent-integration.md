# Deep Agent 前端联动实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard 支持 Deep Agent 选择和取消，聊天页展示 `run_step` 进度，运行记录页显示执行中状态、外部运行 ID 和步骤时间线。

**Architecture:** 前端复用现有流式入口，新增 `run_step` SSE 消费器和 Agent 选项类型，各页面独立管理状态。不新增单独的 Deep 页面或第二套发送入口。

**Tech Stack:** React 18、Umi Max 4、Ant Design Pro Components、@microsoft/fetch-event-source、TypeScript 5、Jest。

---

## 文件结构

- 修改：`src/services/entity/Agent.ts` — 扩展 `AgentRun`、新增 `AgentRunStep` 和 `AgentStreamRunStepData` 类型
- 修改：`src/services/agent/ChatController.ts` — 新增 `onRunStep` 回调，统一事件解析
- 修改：`src/services/agent/RunController.ts` — 新增步骤查询和取消 API
- 修改：`src/pages/agent/chat/index.tsx` — Deep 进度展示与取消逻辑
- 修改：`src/pages/agent/run/index.tsx` — 执行中/排队/已取消状态、执行模式列、步骤时间线抽屉
- 修改：`src/services/agent/AgentDefinitionController.ts` — 扩展选项类型
- 修改：`src/locales/zh-CN.ts`、`src/locales/en-US.ts` — Deep Agent 相关国际化
- 修改：`src/services/agent/ChatController.test.ts` — 新增 run_step 单测
- 修改：`src/services/agent/RunController.test.ts` — 新增步骤查询和取消单测
- 新建：`src/pages/agent/run/AgentRunStepsTimeline.tsx` — 步骤时间线组件

---

### Task 1: 类型扩展

**Files:**
- Modify: `src/services/entity/Agent.ts:621-639`

- [ ] **Step 1: 扩展 `AgentRun`、新增 `AgentRunStep` 和 `AgentStreamRunStepData`**

在 `AgentRun` 接口中添加 `executionMode` 和 `externalRunId`：

```ts
export interface AgentRun {
  id?: string;
  agentDefinitionId?: string;
  userId?: string;
  conversationId?: string;
  messageId?: string;
  inputContent?: string;
  outputContent?: string;
  model?: string;
  modelProviderId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  status?: 0 | 1 | 2 | 3 | 4 | 5;
  errorMsg?: string;
  executionMode?: 'STANDARD' | 'DEEP';
  externalRunId?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

在 `Agent.ts` 中 `AgentStreamDoneData` 修改为包含 `runId`：

```ts
export interface AgentStreamDoneData {
  conversationId?: string;
  messageId?: string;
  runId?: string;
  content?: string;
  sources?: KnowledgeSource[];
  reasoningContent?: string;
  reasoningTokens?: number;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  waitingUser?: boolean;
}
```

在 `Agent.ts` 末尾新增：

```ts
/**
 * @description Deep Agent 运行步骤
 */
export interface AgentRunStep {
  id?: string;
  runId?: string;
  eventId?: string;
  eventType?: string;
  data?: string;
  occurredAt?: number;
  createdAt?: string;
}

/**
 * @description Agent 流式运行步骤事件
 */
export interface AgentStreamRunStepData {
  runId?: string;
  eventId?: string;
  eventType?: string;
  occurredAt?: number;
  data?: {
    toolName?: string;
    message?: string;
    outputSummary?: string;
    summary?: string;
    maxSteps?: number;
    status?: string;
    toolCount?: number;
  };
}
```

- [ ] **Step 2: TypeScript 编译检查**

```powershell
npm run tsc
```

Expected: 无新增类型错误。

---

### Task 2: 流式客户端支持 `run_step`

**Files:**
- Modify: `src/services/agent/ChatController.ts:17-100`

- [ ] **Step 1: 新增 `onRunStep` 回调与事件解析**

在 `StreamAgentChatOptions` 中添加：

```ts
  onRunStep?: (data: AgentStreamRunStepData) => void;
```

在 `streamAgentChat` 和 `streamReplyAgentChat` 的 `onmessage` 中新增 `run_step` 分支：

```ts
      } else if (eventType === 'run_step') {
        options.onRunStep?.(data)
      }
```

- [ ] **Step 2: 更新 import**

```ts
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
  AgentStreamRunStepData,
  AgentStreamToolCallData,
} from '@/services/entity/Agent'
```

- [ ] **Step 3: TypeScript 编译检查**

```powershell
npm run tsc
```

Expected: 无类型错误。

---

### Task 3: 运行记录 API 扩展

**Files:**
- Modify: `src/services/agent/RunController.ts:1-41`

- [ ] **Step 1: 新增步骤查询和取消 API**

在 import 中添加 `AgentRunStep`：

```ts
import {
  AgentRun,
  AgentRunSearchParams,
  AgentRunStatistics,
  AgentRunStatisticsParams,
  AgentRunStep,
} from '@/services/entity/Agent'
```

在文件末尾新增：

```ts
/**
 * @description 获取运行记录步骤列表
 */
export const getAgentRunSteps = async (id: string): Promise<ResponseStructure<AgentRunStep[]>> => {
  return request(`/api/agent/run/${id}/steps`, { method: 'GET' })
}

/**
 * @description 取消 Deep Agent 运行
 */
export const cancelAgentRun = async (id: string): Promise<ResponseStructure<void>> => {
  return request(`/api/agent/run/${id}/cancel`, { method: 'POST' })
}
```

- [ ] **Step 2: TypeScript 编译检查**

```powershell
npm run tsc
```

---

### Task 4: 运行记录页状态与步骤展示

**Files:**
- Modify: `src/pages/agent/run/index.tsx` — 状态渲染、列定义、详情抽屉
- Create: `src/pages/agent/run/AgentRunStepsTimeline.tsx`

- [ ] **Step 1: 写入步骤时间线组件**

```tsx
import React, { useEffect, useState } from 'react'
import { Spin, Timeline, Typography, Empty, Button } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { getAgentRunSteps } from '@/services/agent/RunController'
import { AgentRunStep } from '@/services/entity/Agent'

const EVENT_TYPE_LABELS: Record<string, string> = {
  'run.started': '开始执行',
  'plan.updated': '制定计划',
  'step.started': '执行步骤',
  'tool.started': '调用工具',
  'tool.completed': '工具返回',
}

interface Props {
  runId: string
}

const AgentRunStepsTimeline: React.FC<Props> = ({ runId }) => {
  const [steps, setSteps] = useState<AgentRunStep[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!runId) return
    setLoading(true)
    getAgentRunSteps(runId)
      .then(({ data }) => setSteps(data || []))
      .finally(() => setLoading(false))
  }, [runId])

  if (loading) return <Spin indicator={<LoadingOutlined spin />} />
  if (!steps.length) return <Empty description="暂无执行步骤" />

  return (
    <Timeline
      items={steps.map((step) => {
        const eventData = step.data ? JSON.parse(step.data) : {}
        const label = EVENT_TYPE_LABELS[step.eventType || ''] || step.eventType
        const time = step.occurredAt ? new Date(step.occurredAt).toLocaleTimeString() : ''

        return {
          children: (
            <div>
              <Typography.Text strong>{label}</Typography.Text>
              {eventData.message && (
                <div><Typography.Text type="secondary">{eventData.message}</Typography.Text></div>
              )}
              {eventData.toolName && (
                <div><Typography.Text code>{eventData.toolName}</Typography.Text></div>
              )}
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {time}
              </Typography.Text>
            </div>
          ),
        }
      })}
    />
  )
}

export default AgentRunStepsTimeline
```

- [ ] **Step 2: 更新运行记录页状态渲染**

修改 `renderStatusTag` 函数：

```tsx
const renderStatusTag = (status: number | undefined, intl: ReturnType<typeof useIntl>) => {
  const statusMap: Record<number, { color: string; text: string }> = {
    0: { color: 'success', text: intl.formatMessage({ id: 'pages.agent.run.status.success' }) },
    1: { color: 'error', text: intl.formatMessage({ id: 'pages.agent.run.status.failed' }) },
    2: { color: 'warning', text: intl.formatMessage({ id: 'pages.agent.run.status.timeout' }) },
    3: { color: 'processing', text: intl.formatMessage({ id: 'pages.agent.run.status.queued' }) },
    4: { color: 'cyan', text: intl.formatMessage({ id: 'pages.agent.run.status.running' }) },
    5: { color: 'default', text: intl.formatMessage({ id: 'pages.agent.run.status.cancelled' }) },
  }
  const item = statusMap[status ?? -1]
  return item ? <Tag color={item.color}>{item.text}</Tag> : (
    <Tag>{intl.formatMessage({ id: 'pages.agent.run.status.unknown' })}</Tag>
  )
}
```

- [ ] **Step 3: 列表新增 `executionMode` 列**

在 `columns` 数组末尾（操作列之前）新增：

```tsx
    {
      title: intl.formatMessage({ id: 'pages.agent.run.executionMode' }),
      dataIndex: 'executionMode',
      valueType: 'select',
      valueEnum: {
        STANDARD: { text: intl.formatMessage({ id: 'pages.agent.run.executionMode.standard' }) },
        DEEP: { text: intl.formatMessage({ id: 'pages.agent.run.executionMode.deep' }) },
      },
      hideInSearch: true,
    },
```

- [ ] **Step 4: 详情抽屉新增执行模式、外部运行 ID 和步骤时间线**

在详情 `ProDescriptions` 的列数组中，`agentDefinitionName` 列后面新增：

```tsx
                  {
                    title: intl.formatMessage({ id: 'pages.agent.run.executionMode' }),
                    dataIndex: 'executionMode',
                    render: (v: string) => (
                      <Tag color={v === 'DEEP' ? 'purple' : 'blue'}>
                        {v === 'DEEP'
                          ? intl.formatMessage({ id: 'pages.agent.run.executionMode.deep' })
                          : intl.formatMessage({ id: 'pages.agent.run.executionMode.standard' })}
                      </Tag>
                    ),
                  },
                  {
                    title: intl.formatMessage({ id: 'pages.agent.run.externalRunId' }),
                    dataIndex: 'externalRunId',
                  },
```

在 `ProDescriptions` 之后、关闭 `</>` 之前添加步骤时间线 section：

```tsx
              {run.executionMode === 'DEEP' && run.id && (
                <Card
                  title={intl.formatMessage({ id: 'pages.agent.run.steps' })}
                  style={{ marginTop: 16 }}
                  size="small"
                >
                  <AgentRunStepsTimeline runId={run.id} />
                </Card>
              )}
```

- [ ] **Step 5: 更新 import**

```tsx
import { getAgentRunInfo, getAgentRunList, getAgentRunStatistics } from '@/services/agent/RunController'
import { AgentRun, AgentRunSearchParams, AgentRunStatistics } from '@/services/entity/Agent'
import AgentRunStepsTimeline from './AgentRunStepsTimeline'
```

- [ ] **Step 6: TypeScript 编译检查**

```powershell
npm run tsc
```

Expected: 无新增类型错误。

---

### Task 5: 聊天页 Deep Agent 进度与取消

**Files:**
- Modify: `src/pages/agent/chat/index.tsx`

- [ ] **Step 1: 聊天页 import `cancelAgentRun`**

```tsx
import { cancelAgentRun } from '@/services/agent/RunController'
import { AgentStreamRunStepData } from '@/services/entity/Agent'
```

- [ ] **Step 2: 新增 Deep 运行状态管理 state**

在组件 state 区域增加：

```tsx
  const [deepRunId, setDeepRunId] = useState<string | null>(null)
  const [deepRunSteps, setDeepRunSteps] = useState<AgentStreamRunStepData[]>([])
```

- [ ] **Step 3: 在 `handleStop` 中增加 Deep 取消逻辑**

修改 `handleStop`：

```tsx
  const handleStop = () => {
    if (!abortControllerRef.current) return
    if (deepRunId) {
      cancelAgentRun(deepRunId).catch(() => {})
    }
    stoppedByUserRef.current = true
    abortControllerRef.current.abort()
    resetTypewriter()
    markAssistantStopped(streamingAssistantIdRef.current)
    setChatTurnState('idle')
    setPendingQuestionMessage(null)
  }
```

- [ ] **Step 4: 在流式选项绑定 `onRunStep`**

在 `streamAgentChat` 的 options 中增加：

```tsx
      onRunStep: (data) => {
        setDeepRunId((prev) => prev || data.runId || null)
        setDeepRunSteps((prev) => {
          const exists = prev.some((s) => s.eventId === data.eventId)
          return exists ? prev : [...prev, data].sort(
            (a, b) => (a.occurredAt || 0) - (b.occurredAt || 0)
          )
        })
      },
      onDone: (data) => {
        // ... 原有 onDone 逻辑
        setDeepRunId(null)
        setDeepRunSteps([])
      },
      onError: (data) => {
        // ... 原有 onError 逻辑
        setDeepRunId(null)
        setDeepRunSteps([])
      },
```

`streamReplyAgentChat` 同理增加相同绑定。

- [ ] **Step 5: 在助手占位消息上显示 Deep 进度**

在消息渲染区域，对 `messageType === undefined || messageType === 'chat'` 且有 `deepRunSteps.length > 0` 的 assistant 消息，在其 `AgentMessageBubble` 内容下方显示进度卡片：

```tsx
{msg.role === 'assistant' && deepRunSteps.length > 0 && (
  <div style={{ marginTop: 8, padding: '8px 12px', background: '#f6f8fa', borderRadius: 6 }}>
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
      <LoadingOutlined spin /> 正在执行 Deep Agent...
    </Typography.Text>
    {deepRunSteps.slice(-4).map((s, i) => {
      const d = s.data || {}
      return (
        <div key={i} style={{ fontSize: 12, marginTop: 2 }}>
          <Typography.Text type="secondary">
            {d.message || s.eventType}
          </Typography.Text>
        </div>
      )
    })}
  </div>
)}
```

- [ ] **Step 6: TypeScript 编译检查**

```powershell
npm run tsc
```

---

### Task 6: Agent 定义表单国际化

**Files:**
- Modify: `src/locales/zh-CN.ts`
- Modify: `src/locales/en-US.ts`

- [ ] **Step 1: 新增国际化键值**

在 `zh-CN.ts` 中添加：

```ts
  'pages.agent.definition.executionMode': '执行模式',
  'pages.agent.definition.executionMode.standard': '标准聊天',
  'pages.agent.definition.executionMode.deep': '复杂任务（Deep Agent）',
  'pages.agent.run.status.queued': '排队中',
  'pages.agent.run.status.running': '执行中',
  'pages.agent.run.status.cancelled': '已取消',
  'pages.agent.run.executionMode': '执行模式',
  'pages.agent.run.executionMode.standard': '标准',
  'pages.agent.run.executionMode.deep': 'Deep Agent',
  'pages.agent.run.externalRunId': '外部运行 ID',
  'pages.agent.run.steps': '执行步骤',
```

在 `en-US.ts` 中添加：

```ts
  'pages.agent.definition.executionMode': 'Execution Mode',
  'pages.agent.definition.executionMode.standard': 'Standard Chat',
  'pages.agent.definition.executionMode.deep': 'Complex Task (Deep Agent)',
  'pages.agent.run.status.queued': 'Queued',
  'pages.agent.run.status.running': 'Running',
  'pages.agent.run.status.cancelled': 'Cancelled',
  'pages.agent.run.executionMode': 'Execution Mode',
  'pages.agent.run.executionMode.standard': 'Standard',
  'pages.agent.run.executionMode.deep': 'Deep Agent',
  'pages.agent.run.externalRunId': 'External Run ID',
  'pages.agent.run.steps': 'Execution Steps',
```

- [ ] **Step 2: 更新表单控件标签**

修改 `AgentDefinitionForm.tsx` 中的 `executionMode` 控件：

```tsx
      <ProFormSelect
        name="executionMode"
        label={format('pages.agent.definition.executionMode')}
        initialValue="STANDARD"
        options={[
          { label: format('pages.agent.definition.executionMode.standard'), value: 'STANDARD' },
          { label: format('pages.agent.definition.executionMode.deep'), value: 'DEEP' },
        ]}
      />
```

- [ ] **Step 3: TypeScript 编译**

```powershell
npm run tsc
```

---

### Task 7: 前端测试

**Files:**
- Modify: `src/services/agent/RunController.test.ts`
- Create: `src/services/agent/ChatController.test.ts`

- [ ] **Step 1: 扩展 `RunController.test.ts`**

```ts
import { request } from '@umijs/max'
import { getAgentRunInfo, getAgentRunList, getAgentRunSteps, cancelAgentRun } from './RunController'

jest.mock('@umijs/max', () => ({ request: jest.fn() }))
const mockedRequest = request as jest.Mock

describe('RunController', () => {
  beforeEach(() => { mockedRequest.mockResolvedValue({ code: 200, data: null }) })

  it('uses documented run record endpoints', async () => {
    await getAgentRunList({ current: 1, pageSize: 20, agentDefinitionId: 'agent-1', status: 1 })
    await getAgentRunInfo('run-1')

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/run/list', {
      method: 'POST', data: { current: 1, pageSize: 20, agentDefinitionId: 'agent-1', status: 1 },
    })
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/run/run-1', { method: 'GET' })
  })

  it('fetches run steps', async () => {
    await getAgentRunSteps('run-1')
    expect(mockedRequest).toHaveBeenCalledWith('/api/agent/run/run-1/steps', { method: 'GET' })
  })

  it('cancels deep agent run', async () => {
    await cancelAgentRun('run-1')
    expect(mockedRequest).toHaveBeenCalledWith('/api/agent/run/run-1/cancel', { method: 'POST' })
  })
})
```

- [ ] **Step 2: 运行测试**

```powershell
npm run test -- src/services/agent/RunController.test.ts
```

Expected: 全部测试通过。

- [ ] **Step 3: 运行所有测试**

```powershell
npm run test
```

Expected: 所有已有测试通过，新增 RunController 测试通过。

- [ ] **Step 4: 完整检查**

```powershell
npm run tsc
```

Expected: 无类型错误。

---

## 执行顺序与依赖

1. Task 1（类型扩展）→ Task 2（SSE 客户端）→ Task 5（聊天页进度）
2. Task 1 → Task 3（API 扩展）→ Task 4（运行记录页）
3. Task 6（国际化）可独立并行
4. Task 7（测试）在所有功能实现后执行
