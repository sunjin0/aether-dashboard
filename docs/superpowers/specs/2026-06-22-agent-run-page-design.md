# Agent 运行记录页设计

## 背景

Agent 平台已具备模型供应商、Agent 定义、工具管理、会话管理和 Chat 调试页面。用户在 Chat 调试失败时，需要查看模型调用审计信息，包括调用状态、Token、耗时和错误信息。

后端已提供运行记录实体 `AgentRun` 和只读查询接口。统计接口当前为 V0.6 占位实现，返回零值，不应在页面中展示为真实统计。

## 目标

- 新增 `/agent/run` 运行记录页面。
- 提供运行记录分页列表，用于快速定位某次 Agent 调用。
- 提供详情抽屉，用于查看完整审计字段和错误信息。
- 保持首版只读，不提供新增、编辑、删除等操作。
- 遵循现有 Umi Max / Ant Design Pro 页面模式。

## 非目标

- 不实现运行统计图表。
- 不调用 `/api/agent/run/statistics`。
- 不提供运行记录删除或重试能力。
- 不联动跳转会话详情或 Chat 页面。
- 不渲染 `inputContent`、`outputContent` 中的 Markdown；它们作为审计摘要按纯文本展示。

## 路由与菜单

在 `config/routes.ts` 的 `Agent 平台` 下新增：

```ts
{
  path: '/agent/run',
  name: '运行记录',
  component: './agent/run',
}
```

页面组件路径为 `src/pages/agent/run/index.tsx`。

## 数据类型

在 `src/services/entity/Agent.ts` 增加 `AgentRun`：

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
  status?: number;
  errorMsg?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

增加查询参数类型：

```ts
export interface AgentRunSearchParams extends AgentRun {
  current?: number;
  pageSize?: number;
}
```

## 接口

新增 `src/services/agent/RunController.ts`：

- `queryAgentRunList(params)`：`POST /api/agent/run/list`
- `getAgentRun(id)`：`GET /api/agent/run/{id}`

分页列表遵循当前后端统一结构：列表数据读取响应顶层 `data`，总数读取响应顶层 `total`。

## 页面结构

页面使用 `PageContainer + ProTable + Drawer`：

- `PageContainer`：承载页面。
- `ProTable`：展示运行记录列表、查询表单、分页。
- `Drawer`：展示详情。

页面顶部不展示统计卡片，只在表格区域上方或说明文案中提示：运行统计接口当前为 V0.6 占位，页面仅展示审计明细。

## 列表字段

默认展示以下列：

| 字段 | 展示 | 查询 |
|------|------|------|
| agentDefinitionId | Agent 定义 ID | 支持 |
| conversationId | 会话 ID | 支持 |
| messageId | 输出消息 ID | 不默认查询 |
| model | 模型 | 支持 |
| status | 状态 Tag | 支持 valueEnum |
| totalTokens | 总 Token | 不查询 |
| latencyMs | 耗时 ms | 不查询 |
| createdAt | 创建时间 | 不查询 |
| 操作 | 详情 | 不查询 |

状态映射：

- `0`：成功，绿色。
- `1`：失败，红色。
- `2`：超时，橙色。
- 其他值：未知，默认色。

长 ID 字段在表格中使用省略展示，避免撑宽页面。

## 详情抽屉

点击 `详情` 后调用 `GET /api/agent/run/{id}` 获取最新详情。

详情分为三组：

1. 基础信息：ID、Agent 定义 ID、用户 ID、会话 ID、输出消息 ID、模型供应商 ID、模型、状态、创建时间、更新时间。
2. Token 与耗时：promptTokens、completionTokens、totalTokens、latencyMs。
3. 内容与错误：inputContent、outputContent、errorMsg。

`inputContent`、`outputContent`、`errorMsg` 使用可换行纯文本块展示。`errorMsg` 有值时使用错误色强调，便于排查失败和超时记录。

## 权限

运行记录首版只读，不包含写操作按钮。页面访问依赖后端运行时菜单和路由权限。不使用 `useAccess()[history.location.pathname]` 控制按钮展示，因为页面没有新增、编辑、删除、启停等写操作。

## 错误处理

- 列表接口失败时返回空列表，并通过全局 request 错误处理或页面消息提示反馈。
- 详情接口失败时关闭详情加载态，保留抽屉或显示空态，不伪造详情数据。
- 未返回长文本字段时展示 `-` 或空态文案。

## 测试与验证

新增 `src/services/agent/RunController.test.ts`，验证：

- `queryAgentRunList` 请求路径为 `/api/agent/run/list`，方法为 `POST`。
- `getAgentRun('run-1')` 请求路径为 `/api/agent/run/run-1`，方法为 `GET`。

实现后运行：

- `npm run test -- src/services/agent/RunController.test.ts`
- `npm run tsc`
- `rg "/agent/run|AgentRun" src config`

`npm run tsc` 当前项目存在既有基线错误时，应记录实际错误位置，不将其归因于运行记录页。
