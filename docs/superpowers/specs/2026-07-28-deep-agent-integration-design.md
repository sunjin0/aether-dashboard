# Deep Agent 前端联动设计

## 目标

在 Dashboard 中支持选择 Deep Agent、展示其异步执行进度、取消正在执行的任务，并在运行记录页面查看可恢复的步骤时间线；普通 Agent 的页面和聊天行为保持不变。

## 范围

- Agent 配置页展示并保存执行模式 `STANDARD` / `DEEP`。
- 聊天页识别已选 Agent 的执行模式，Deep Agent 固定通过既有流式接口发送。
- 流式客户端支持新的 `run_step` SSE，聊天页面以进度区域展示计划、步骤和工具生命周期。
- 用户停止 Deep Agent 时调用后端取消接口，而不是只中断浏览器连接。
- 运行记录页面显示 Deep 运行状态、执行模式、外部运行 ID 和步骤时间线。
- 断线恢复通过运行详情与步骤查询完成，不重放 SSE。

## 非目标

- 不直接调用 Deep Agent Python 服务。
- 不在浏览器持有服务共享密钥或 MCP 委托 JWT。
- 不为 Deep Agent 单独增加一个聊天页面或第二套发送入口。
- 不实现聊天 SSE 自动重连和历史事件重放。

## Agent 配置与选择

`AgentDefinition` 保持 `executionMode?: 'STANDARD' | 'DEEP'`。定义表单中的执行模式标签和选项必须使用中英文国际化资源，默认值为 `STANDARD`。

聊天页需要知道下拉选项的执行模式。可用 Agent 选项接口应返回 `id`、`name` 和 `executionMode`；前端不再把选项强制转换成只含 ID 和名称的对象。选中 `DEEP` 时：

- 使用 `streamAgentChat()`，不得调用非流式 `sendAgentChat()`。
- 保留用户消息和 assistant 占位消息。
- 隐藏或禁用只适用于普通模型推理的 `thinking`、`reasoningEffort` 和交互式问题回复入口，避免发送 Deep 服务不支持的语义。

## SSE 契约

既有 `/api/agent/chat/stream` 继续使用 `fetchEventSource`。在 `StreamAgentChatOptions` 和实体类型中新增 `onRunStep`。收到 `event: run_step` 时解析：

```json
{
  "runId": "agentRunId",
  "eventId": "uuid",
  "eventType": "tool.completed",
  "occurredAt": 1760000000000,
  "data": {
    "toolName": "search_knowledge",
    "message": "Completed search_knowledge",
    "outputSummary": "..."
  }
}
```

聊天页将步骤依 `eventId` 去重、按 `occurredAt` 排序，并关联到当前 assistant 占位消息。显示规则：

- `plan.updated`：显示计划摘要和最大步骤数。
- `step.started`：显示当前执行步骤。
- `tool.started`：显示工具调用进行中。
- `tool.completed`：将对应工具标记为完成，并可展开输出摘要。
- `run.started`：显示“正在执行”。

最终 `done` 事件沿用既有处理方式，补充处理 `runId`、来源、模型和 Token 信息，并结束进度状态。`error` 将占位消息标记失败；若是取消，则显示已取消而非模型错误。

## 取消

当 Deep 运行的 `runId` 已通过步骤或完成事件获得时，停止按钮调用 `POST /api/agent/run/{runId}/cancel`。成功受理取消后保留当前进度，等待 `run.cancelled` 转换的 SSE `error` 或运行详情的取消状态。普通流式聊天继续使用现有 `AbortController` 断开行为。

如果用户在尚未获得 `runId` 前点击停止，只中断浏览器请求并将占位消息标为停止；不发送无效取消请求。

## 运行记录和恢复

扩展 `AgentRun` 类型：

```ts
executionMode?: 'STANDARD' | 'DEEP'
externalRunId?: string
status?: 0 | 1 | 2 | 3 | 4 | 5
```

状态标签：

- `0` 成功，绿色。
- `1` 失败，红色。
- `2` 超时，橙色。
- `3` 排队中，蓝色。
- `4` 执行中，处理色或蓝绿色。
- `5` 已取消，默认灰色。

新增 `AgentRunStep` 类型及 `getAgentRunSteps(id)`，调用 `GET /api/agent/run/{id}/steps`。运行详情抽屉在获取运行详情后同时获取步骤，针对 Deep 模式展示按发生时间排序的时间线；每个步骤显示事件类型、时间、消息、工具名和可展开 JSON 数据。标准模式没有步骤时显示空状态，不报错。

聊天 SSE 断开后，页面不尝试补发事件。用户通过运行记录页打开对应 run，并通过运行详情和步骤接口查看已保存的进度与最终状态。

## 组件与类型边界

- `src/services/entity/Agent.ts`：定义执行模式、Deep Run 步骤、扩展运行和 SSE 负载类型。
- `src/services/agent/ChatController.ts`：集中解析 `run_step`，两种流式调用共享同一事件分发函数，避免重复分支。
- `src/services/agent/RunController.ts`：提供步骤查询和取消 API 包装。
- `src/pages/agent/chat/index.tsx`：只管理当前聊天的 Deep 进度、取消和最终消息状态。
- `src/pages/agent/run/index.tsx`：只管理审计列表、详情和步骤时间线。

## 测试和验收

- ChatController 单测：`run_step` 正确解析并触发 `onRunStep`，普通 SSE 事件回归通过。
- 聊天页测试：Deep 模式累计去重步骤、完成后结束进度、取消请求仅在具备 run ID 时发出。
- RunController 单测：步骤查询和取消 API 的 URL、方法正确。
- 运行记录页测试：新增状态颜色、Deep 字段和步骤时间线正确渲染。
- Agent 定义表单测试：执行模式默认值、编辑回显和 i18n 标签正确。
- 执行 `npm run tsc`、相关 Jest 测试；完整校验可执行 `npm run lint`，并检查其 Prettier 自动格式化的差异。
