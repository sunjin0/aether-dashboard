# Chat 调试页面设计

## 范围

本次只实现 Agent 平台的一个前端页面：Chat 调试。页面覆盖 `docs/FRONTEND.md` 中定义的 V0.3 非流式聊天闭环，包括选择启用 Agent、新建会话、选择已有会话、加载消息和发送聊天消息。

首版包含轻量会话列表，但不实现会话关闭、删除、归档等会话管理能力。这些能力保留给后续“会话管理”页面。

## 路由与文件位置

在已有 `Agent 平台` 菜单下新增 `Chat 调试` 页面：

- 路由：`/agent/chat`
- 菜单名称：`Chat 调试`
- 路由组件：`./agent/chat`

页面文件放在 `src/pages/agent/chat/index.tsx`。

## 数据模型与服务层

继续扩展 `src/services/entity/Agent.ts`。

新增类型：

- `AgentChatRequest`：聊天请求参数。
- `AgentMessage`：会话消息实体，兼容聊天接口返回的 assistant 消息。
- `AgentConversation`：会话实体。
- `AgentConversationSearchParams`：会话列表查询参数。
- `AgentMessageSearchParams`：会话消息查询参数。

新增服务文件：`src/services/agent/ChatController.ts`。

包含接口函数：

- `sendAgentChat`：`POST /api/agent/chat`

新增服务文件：`src/services/agent/ConversationController.ts`。

包含接口函数：

- `getAgentConversationList`：`POST /api/agent/conversation/list`
- `getAgentConversationMessages`：`GET /api/agent/conversation/{id}/messages`

Agent 下拉复用已实现的 `getAgentDefinitionList`，只请求 `status: 1` 的启用 Agent。

## 页面布局

页面使用左右布局：

- 左侧：Agent 选择器、新建会话按钮、轻量会话列表。
- 右侧：消息展示区、输入框和发送按钮。

左侧会话列表只用于 Chat 调试场景，不包含关闭、删除、归档等操作。

## 页面状态

页面维护以下状态：

- `agentId`：当前选中的 Agent ID。
- `conversationId`：当前会话 ID；新建会话时为空。
- `conversations`：当前用户会话列表。
- `messages`：当前会话消息列表。
- `input`：待发送消息内容。
- `loadingAgents`：Agent 下拉加载状态。
- `loadingConversations`：会话列表加载状态。
- `loadingMessages`：消息加载状态。
- `sending`：聊天发送状态。

## 数据流

进入页面：

- 请求启用 Agent 列表，参数包含 `status: 1`、`current: 1`、`pageSize: 1000`。
- 请求会话列表，参数包含 `current: 1`、`pageSize: 20`。

选择 Agent：

- 更新 `agentId`。
- 清空当前 `conversationId` 和 `messages`。
- 保留会话列表，用户可继续选择已有会话。

点击“新建会话”：

- 清空 `conversationId`。
- 清空 `messages`。
- 保留当前选中的 Agent。

选择已有会话：

- 设置 `conversationId`。
- 调用 `GET /api/agent/conversation/{id}/messages?current=1&pageSize=20`。
- 按后端返回顺序展示消息。

发送消息：

- 校验必须选择 Agent。
- 校验输入内容不能为空。
- 发送中禁用输入框和发送按钮。
- 请求体包含 `agentId`、`message`，如果 `conversationId` 存在则同时传入。
- 成功后追加 user 消息和 assistant 返回消息。
- 如果是首次聊天，则从 assistant 返回消息中读取 `conversationId` 并刷新会话列表。
- 失败时保留输入内容，并展示后端返回的 `message`。

## 消息展示

消息按 `role` 区分展示：

- `user`：用户消息，靠右或使用用户样式。
- `assistant`：模型回复，靠左或使用助手样式。
- `system`：系统消息，使用中性样式。

assistant 消息展示可用元信息：

- `model`
- `promptTokens`
- `completionTokens`
- `totalTokens`
- `latencyMs`

如果字段不存在则不展示对应元信息。

## 错误处理

页面不新增全局错误处理层，继续沿用当前项目页面级处理方式。后端参数错误、业务校验失败、模型供应商不可用、Agent 未启用、API Key 错误、模型地址不可用等错误都通过 Ant Design `message.error` 展示后端 `message`。

认证失效和未登录跳转继续由现有 `src/app.tsx` 运行时逻辑处理，Chat 调试页面不单独处理登录态。

## 验证

实现后需要验证：

- 执行 `npm run tsc`，确认本次新增文件没有 TypeScript 错误。
- 确认 `config/routes.ts` 中新增 `/agent/chat` 路由能解析到页面。
- 确认 Agent 下拉只请求启用 Agent。
- 确认首次聊天请求体不包含 `conversationId`。
- 确认继续会话请求体包含已有 `conversationId`。
- 确认发送中会禁用输入框和发送按钮。
- 确认页面没有关闭、删除、归档会话操作。

## 不在本次范围内

- SSE 流式聊天。
- 会话关闭、删除、归档。
- 会话管理完整页面。
- 运行记录展示。
- 工具调用和工具调用日志。
- 工具绑定和工具真实执行。
