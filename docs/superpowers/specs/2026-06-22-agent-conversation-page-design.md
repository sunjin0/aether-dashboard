# 会话管理页设计

## 背景

Agent 平台已完成模型供应商、Agent 定义、工具管理和 Chat 调试页。Chat 调试页只提供轻量会话选择能力，不承担完整会话治理。本页补齐独立会话管理能力，用于查看当前登录用户的会话、查看会话详情和消息，并支持关闭、删除会话。

## 页面范围

- 页面名称：会话管理
- 路由：`/agent/conversation`
- 菜单位置：`Agent 平台 / 会话管理`
- 页面目标：提供会话列表、会话详情、消息列表、关闭会话和删除会话。

首版不包含：

- 不从会话管理页继续发送聊天消息。
- 不做消息分页，详情抽屉固定加载前 20 条消息。
- 不做归档操作，后端文档没有提供归档接口。
- 不做跨用户会话管理，后端列表只返回当前登录用户会话。

## 页面结构

采用单页管理结构：

- 外层使用 `PageContainer`。
- 主体使用 `ProTable` 展示会话列表。
- 使用 Ant Design `Drawer` 展示会话详情。
- 抽屉内分为会话基础信息和消息列表两块。

## 列表设计

列表接口：

```http
POST /api/agent/conversation/list
```

请求体包含分页字段和查询字段：

- `current`
- `pageSize`
- `agentId`
- `title`
- `status`

分页返回按项目现有约定处理：

- `data` 是列表数组。
- `total` 是总数。
- `code === 200` 表示成功。

查询字段：

- Agent ID：`agentId`
- 会话标题：`title`
- 状态：`status`

列表展示列：

- 会话标题：`title`
- Agent ID：`agentId`
- 状态：`status`
- 创建时间：`createdAt`
- 更新时间：`updatedAt`
- 操作

状态枚举：

- `0`：进行中
- `1`：关闭
- `2`：归档

## 操作设计

操作列包含：

- 查看详情
- 关闭
- 删除

查看详情：

- 所有有页面访问权限的用户可见。
- 点击后打开详情抽屉。

关闭：

- 仅写权限可见。
- 仅 `status === 0` 的会话显示。
- 使用 `Popconfirm` 二次确认。
- 调用关闭接口。
- 成功后刷新列表。
- 如果当前抽屉正在查看该会话，则重新加载详情和消息。

删除：

- 仅写权限可见。
- 使用 `Popconfirm` 二次确认。
- 调用删除接口。
- 成功后刷新列表。
- 如果当前抽屉正在查看该会话，则关闭抽屉并清空当前详情。

关闭接口：

```http
PUT /api/agent/conversation/{id}/close
```

删除接口：

```http
DELETE /api/agent/conversation/{id}
```

## 详情抽屉

打开详情时并行加载：

```http
GET /api/agent/conversation/{id}
GET /api/agent/conversation/{id}/messages?current=1&pageSize=20
```

基础信息展示：

- ID：`id`
- 标题：`title`
- Agent ID：`agentId`
- 状态：`status`
- 创建时间：`createdAt`
- 更新时间：`updatedAt`

消息列表展示：

- 角色：`role`
- 内容：`content`
- 模型：`model`
- Prompt tokens：`promptTokens`
- Completion tokens：`completionTokens`
- Total tokens：`totalTokens`
- 耗时：`latencyMs`
- 创建时间：`createdAt`

消息按后端返回顺序展示。后端文档说明消息按创建时间升序返回，前端不重新排序。

## 服务与类型

复用并扩展 `src/services/entity/Agent.ts`：

- 复用 `AgentConversation`
- 复用 `AgentConversationSearchParams`
- 复用 `AgentMessage`
- 复用 `AgentMessageSearchParams`

扩展 `src/services/agent/ConversationController.ts`：

- 保留 `getAgentConversationList`
- 新增 `getAgentConversationInfo`
- 保留 `getAgentConversationMessages`
- 新增 `closeAgentConversation`
- 新增 `deleteAgentConversation`

## 权限

写权限沿用项目现有模式：

```ts
useAccess()[history.location.pathname]
```

没有写权限时隐藏：

- 关闭按钮
- 删除按钮

查看详情不受写权限控制。

## 错误处理

- 列表加载失败时返回空列表并展示后端 `message`。
- 详情加载失败时保留抽屉打开，展示错误提示，并显示空态。
- 消息加载失败时保留抽屉打开，展示错误提示，并显示空消息列表。
- 关闭失败时展示后端 `message`。
- 删除失败时展示后端 `message`。
- 关闭和删除成功后刷新列表。

## 验证

实现完成后验证：

- `config/routes.ts` 包含 `/agent/conversation`。
- `ConversationController.ts` 包含会话列表、详情、消息、关闭、删除接口路径。
- 页面关闭按钮只在 `status === 0` 时显示。
- 页面关闭和删除按钮受写权限控制。
- 页面使用 `GET /api/agent/conversation/{id}/messages` 时带 `current: 1` 和 `pageSize: 20`。
- `npm test` 通过。
- `npm run tsc` 无新增类型错误；如果仍失败，应确认失败点是否仅为既有基线错误。

## 后续扩展

后续可独立实现：

- 消息分页或加载更多。
- 从会话详情跳转到 Chat 调试继续会话。
- 归档操作。
- 管理员跨用户会话查询。
