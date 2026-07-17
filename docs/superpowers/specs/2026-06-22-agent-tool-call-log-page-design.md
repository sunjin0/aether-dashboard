# Agent 工具调用日志页设计

## 背景

Agent 平台已具备运行记录页，用于查看模型调用审计信息。工具调用日志用于查看某次 Agent 运行中 HTTP 工具的实际请求、响应、耗时、状态和错误信息，是排查工具执行问题的只读审计数据。

文档说明工具调用日志在 V0.5 工具调用闭环实现后才会有真实数据。因此页面首版应提供结构和查询能力，但避免暗示当前一定存在真实日志。

## 目标

- 新增 `/agent/tool-call-log` 工具调用日志页面。
- 提供工具调用日志分页列表，用于按运行记录、工具、Agent 和状态定位调用。
- 提供详情抽屉，用于查看完整请求、响应和错误信息。
- 保持首版只读，不提供新增、编辑、删除、重试等操作。
- 遵循现有 Umi Max / Ant Design Pro 页面模式。

## 非目标

- 不实现工具调用重试。
- 不提供日志删除。
- 不跳转运行记录、工具详情或 Agent 定义详情。
- 不格式化 JSON，不做语法高亮，不做复制按钮。
- 不调用工具测试接口或真实执行工具。

## 路由与菜单

在 `config/routes.ts` 的 `Agent 平台` 下新增：

```ts
{
  path: '/agent/tool-call-log',
  name: '工具调用日志',
  component: './agent/tool-call-log',
}
```

页面组件路径为 `src/pages/agent/tool-call-log/index.tsx`。

## 数据类型

在 `src/services/entity/Agent.ts` 增加 `AgentToolCallLog`：

```ts
export interface AgentToolCallLog {
  id?: string;
  runId?: string;
  toolId?: string;
  agentDefinitionId?: string;
  requestUrl?: string;
  requestMethod?: string;
  requestHeaders?: string;
  requestBody?: string;
  responseStatus?: number;
  responseBody?: string;
  latencyMs?: number;
  status?: number;
  errorMsg?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

增加查询参数类型：

```ts
export interface AgentToolCallLogSearchParams extends AgentToolCallLog {
  current?: number;
  pageSize?: number;
}
```

## 接口

新增 `src/services/agent/ToolCallLogController.ts`：

- `getAgentToolCallLogList(params)`：`POST /api/agent/tool-call-log/list`
- `getAgentToolCallLogInfo(id)`：`GET /api/agent/tool-call-log/{id}`

分页列表遵循当前后端统一结构：列表数据读取响应顶层 `data`，总数读取响应顶层 `total`。

## 页面结构

页面使用 `PageContainer + ProTable + Drawer`：

- `PageContainer`：承载页面。
- `Alert`：提示工具调用日志依赖 V0.5 工具调用闭环，当前可能暂无真实数据。
- `ProTable`：展示工具调用日志列表、查询表单、分页。
- `Drawer`：展示详情。

## 列表字段

默认展示以下列：

| 字段              | 展示          | 查询           |
| ----------------- | ------------- | -------------- |
| runId             | 运行记录 ID   | 支持           |
| toolId            | 工具 ID       | 支持           |
| agentDefinitionId | Agent 定义 ID | 支持           |
| requestMethod     | 请求方法      | 支持 valueEnum |
| responseStatus    | HTTP 状态码   | 不查询         |
| status            | 执行状态 Tag  | 支持 valueEnum |
| latencyMs         | 耗时 ms       | 不查询         |
| createdAt         | 创建时间      | 不查询         |
| 操作              | 详情          | 不查询         |

请求方法筛选值：

- `GET`
- `POST`
- `PUT`
- `DELETE`
- `PATCH`

执行状态映射：

- `0`：成功，绿色。
- `1`：失败，红色。
- `2`：超时，橙色。
- `3`：安全拦截，紫色。
- 其他值：未知，默认色。

长 ID 和 URL 字段在表格中使用省略展示，避免撑宽页面。

## 详情抽屉

点击 `详情` 后调用 `GET /api/agent/tool-call-log/{id}` 获取最新详情。

详情分为四组：

1. 基础信息：ID、运行记录 ID、工具 ID、Agent 定义 ID、请求方法、请求 URL、HTTP 响应状态码、执行状态、耗时、创建时间、更新时间。
2. 请求内容：requestHeaders、requestBody。
3. 响应内容：responseBody。
4. 错误信息：errorMsg。

`requestHeaders`、`requestBody`、`responseBody`、`errorMsg` 使用可换行纯文本块展示。`errorMsg` 有值时使用错误色强调，便于排查失败、超时和安全拦截记录。

## 权限

工具调用日志首版只读，不包含写操作按钮。页面访问依赖后端运行时菜单和路由权限。不使用 `useAccess()[history.location.pathname]` 控制按钮展示，因为页面没有新增、编辑、删除、启停等写操作。

## 错误处理

- 列表接口失败时返回空列表，并通过全局 request 错误处理或页面消息提示反馈。
- 详情接口失败时关闭详情加载态，保留抽屉或显示空态，不伪造详情数据。
- 未返回长文本字段时展示 `暂无内容` 或空态文案。
- `requestHeaders` 即使是 JSON 字符串，首版也按纯文本展示，不尝试解析。

## 测试与验证

新增 `src/services/agent/ToolCallLogController.test.ts`，验证：

- `getAgentToolCallLogList` 请求路径为 `/api/agent/tool-call-log/list`，方法为 `POST`。
- `getAgentToolCallLogInfo('log-1')` 请求路径为 `/api/agent/tool-call-log/log-1`，方法为 `GET`。

实现后运行：

- `npm run test -- src/services/agent/ToolCallLogController.test.ts`
- `npm test`
- `npm run tsc`
- `rg "/agent/tool-call-log|AgentToolCallLog" src config`

`npm run tsc` 当前项目存在既有基线错误时，应记录实际错误位置，不将其归因于工具调用日志页。
