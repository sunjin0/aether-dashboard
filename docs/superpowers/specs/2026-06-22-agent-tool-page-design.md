# 工具管理页设计

## 背景

Agent 平台已完成模型供应商、Agent 定义和 Chat 调试页。下一步补齐 HTTP 工具基础配置能力，为后续工具绑定和工具调用闭环做准备。

本页只实现工具配置 CRUD，不实现工具测试，不实现 Agent 工具绑定。

## 页面范围

- 页面名称：工具管理
- 路由：`/agent/tool`
- 菜单位置：`Agent 平台 / 工具管理`
- 页面目标：管理 HTTP 工具定义，包括新增、查询、编辑、删除、启用和禁用。

首版不包含：

- 不显示“测试工具”按钮。
- 不调用 `POST /api/agent/tool/{id}/test`。
- 不处理 Agent 与工具的绑定、解绑、优先级调整。
- 不做工具真实执行结果展示。

## 页面结构

采用现有后台页面模式：

- 外层使用 `PageContainer`。
- 主体使用 `ProTable`。
- 新增和编辑使用现有 `src/components/DrawerForm/index.tsx` 抽屉表单。

## 列表设计

列表接口：

```http
POST /api/agent/tool/list
```

请求体包含分页字段和查询字段：

- `current`
- `pageSize`
- `name`
- `code`
- `type`
- `status`

分页返回按项目现有约定处理：

- `data` 是列表数组。
- `total` 是总数。
- `code === 200` 表示成功。

列表查询字段：

- 工具名称：`name`
- 工具编码：`code`
- 工具类型：`type`
- 状态：`status`

列表展示列：

- 工具名称：`name`
- 工具编码：`code`
- 工具类型：`type`
- HTTP 方法：`httpMethod`
- HTTP URL：`httpUrl`
- 超时时间：`timeoutMs`
- 状态：`status`
- 创建时间：`createdAt`
- 更新时间：`updatedAt`
- 操作

操作列包含：

- 编辑
- 删除
- 启用或禁用

删除使用确认弹窗。启用和禁用成功后刷新表格。

## 表单设计

新增接口：

```http
POST /api/agent/tool
```

编辑详情接口：

```http
GET /api/agent/tool/{id}
```

编辑提交接口：

```http
PUT /api/agent/tool/{id}
```

删除接口：

```http
DELETE /api/agent/tool/{id}
```

表单字段：

| 字段 | 控件 | 必填 | 说明 |
|------|------|------|------|
| `name` | 输入框 | 是 | 工具名称 |
| `code` | 输入框 | 是 | 工具编码 |
| `description` | 多行文本 | 否 | 工具描述 |
| `type` | 下拉框 | 是 | 首版只提供 `http` |
| `httpMethod` | 下拉框 | 否 | `GET` 或 `POST` |
| `httpUrl` | 输入框 | 否 | HTTP 请求地址 |
| `httpHeaders` | 多行文本 | 否 | JSON 字符串模板 |
| `httpBodyTemplate` | 多行文本 | 否 | 请求体模板 |
| `responseExtractRule` | 多行文本 | 否 | 响应提取规则 |
| `timeoutMs` | 数字输入 | 否 | 超时时间，单位毫秒 |
| `cacheTtlSeconds` | 数字输入 | 否 | 缓存 TTL，单位秒 |
| `status` | 单选或下拉 | 是 | `0` 禁用，`1` 启用 |

`httpHeaders`、`httpBodyTemplate`、`responseExtractRule` 不做 JSON 强校验。它们作为模板字符串提交，避免前端限制后续模板语法。

## 状态与权限

状态枚举：

- `0`：禁用
- `1`：启用

写权限沿用项目现有模式：

```ts
useAccess()[history.location.pathname]
```

没有写权限时隐藏：

- 新增按钮
- 编辑按钮
- 删除按钮
- 启用或禁用按钮

## 服务与类型

扩展 `src/services/entity/Agent.ts`：

- `AgentTool`
- `AgentToolSearchParams`
- `AgentToolStatusParams`

新增 `src/services/agent/ToolController.ts`：

- `getAgentToolList`
- `getAgentToolDetail`
- `createAgentTool`
- `updateAgentTool`
- `deleteAgentTool`

后端文档没有提供工具独立启停接口。首版启用和禁用通过以下流程实现：先调用详情接口获取完整工具配置，再调用编辑接口提交完整配置和目标 `status`。

## 错误处理

- 列表加载失败时返回空列表并展示后端 `message`。
- 新增、编辑、删除、启停失败时展示后端 `message`。
- 删除前弹出确认。
- 成功操作后刷新列表。

## 验证

实现完成后验证：

- `config/routes.ts` 包含 `/agent/tool`。
- `ToolController.ts` 包含工具 CRUD 接口路径。
- 页面不包含“测试工具”按钮。
- 页面不调用 `/api/agent/tool/{id}/test`。
- `npm run tsc` 无新增类型错误；如果仍失败，应确认失败点是否仅为既有基线错误。

## 后续扩展

后续可独立实现：

- Agent 工具绑定管理。
- 工具测试占位或真实测试。
- 工具调用日志查看。
- 工具真实执行结果展示。
