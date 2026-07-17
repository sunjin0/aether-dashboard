# Agent 平台前端开发文档（V0.2-V0.3）

> 版本：V0.3 后端实现基线状态：前端开发参考范围：基于 V0.2 数据管理 CRUD 和 V0.3 非流式聊天闭环，指导前端页面、接口、字段、权限和交互开发

---

## 1. 开发范围

本阶段前端需要覆盖 V0.2-V0.3 已实现的后端能力：

- 模型供应商管理：增删改查、启用/禁用、测试连接占位。
- Agent 定义管理：增删改查、启用/禁用、复制、绑定工具。
- 工具管理：增删改查、测试工具占位。
- 工具绑定管理：查询、绑定、解绑、调整优先级。
- 会话管理：会话列表、详情、消息列表、关闭、删除。
- 非流式聊天：`POST /api/agent/chat`。
- 运行记录：列表、详情、统计占位。
- 工具调用日志：列表、详情。

暂不开发或仅做占位入口：

- SSE 流式聊天（V0.4）。
- 工具真实执行和工具调用闭环（V0.5）。
- 运行统计真实聚合（V0.6，目前后端返回零值占位）。
- 工作流、知识库、文档管理页面（V0.7 预留结构，当前无 Controller）。

---

## 2. 全局接口约定

### 2.1 基础地址

所有 Agent 平台接口统一使用：

```text
/api/agent/**
```

### 2.2 认证

所有接口都需要带登录态 Token：

```http
Authorization: Bearer <token>
```

### 2.3 响应结构

后端统一返回 `WebResponse<T>`：

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "total": 0
}
```

分页列表当前实际返回形式：

```json
{
  "code": 200,
  "message": "success",
  "data": [{}],
  "total": 100
}
```

说明：当前 Controller 使用 `WebResponse.Page(list, total)`，不是 `data.records` 包装结构。前端分页组件应从顶层 `total` 读取总数，从 `data` 读取列表。

### 2.4 分页参数

当前后端实际分页查询大多是 `POST /list`，分页参数放在请求体：

```json
{
  "current": 1,
  "pageSize": 20
}
```

会话消息列表例外，使用 GET query：

```text
current=1&pageSize=20
```

### 2.5 状态码处理

前端应按 `code` 做统一处理：

| code | 含义         | 前端处理                  |
| ---- | ------------ | ------------------------- |
| 200  | 成功         | 展示数据或成功提示        |
| 400  | 参数错误     | 表单校验提示              |
| 401  | 未授权       | 跳转登录或刷新 Token      |
| 403  | 无权限       | 展示无权限提示            |
| 404  | 资源不存在   | 展示空态或返回列表        |
| 422  | 业务校验失败 | 展示后端 message          |
| 500  | 系统错误     | 展示错误提示              |
| 503  | 服务不可用   | 展示模型/供应商不可用提示 |

---

## 3. 页面与菜单建议

建议在后台管理系统中新增一级菜单：`Agent 平台`。

二级菜单：

| 页面 | 路由建议 | 后端权限路径 | 说明 |
| --- | --- | --- | --- |
| 模型供应商 | `/agent/model-provider` | `/agent/model-provider` | 管理 OpenAI、本地模型等供应商配置 |
| Agent 定义 | `/agent/definition` | `/agent/definition` | 管理 Agent 基础配置、模型和工具绑定 |
| 工具管理 | `/agent/tool` | `/agent/tool` | 管理 HTTP 工具配置，真实执行 V0.5 实现 |
| 会话管理 | `/agent/conversation` | `/agent/conversation` | 查看当前用户会话和消息 |
| Chat 调试 | `/agent/chat` | `/agent/chat` | 非流式聊天调试页面 |
| 运行记录 | `/agent/run` | `/agent/run` | 查看模型调用审计记录 |
| 工具调用日志 | `/agent/tool-call-log` | `/agent/tool-call-log` | V0.5 后有真实日志数据 |

按钮级写权限：后端使用同一路径加 `Permission.Type.Write`。前端可参考现有系统权限模型，若某菜单路径写权限为 false，则隐藏新增、编辑、删除、启停、复制、绑定、解绑等按钮。

---

## 4. 模型供应商管理

### 4.1 字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 否 | 后端生成 |
| name | string | 是 | 供应商名称 |
| type | string | 是 | `openai`、`local`，`azure`/`anthropic` 目前未实现客户端 |
| apiBaseUrl | string | 是 | API 基础地址，如 `https://api.openai.com` 或本地兼容服务地址 |
| apiKey | string | 新增时建议必填 | 后端 AES 加密保存，列表和详情不回显 |
| defaultModel | string | 否 | 默认模型名称 |
| status | number | 是 | `0` 禁用，`1` 启用 |
| sort | number | 否 | 排序 |
| remark | string | 否 | 备注 |

### 4.2 接口

注意：当前后端实际列表接口是 `POST /list`，不是 API 草案中的 GET。

| 功能      | 方法   | 路径                                    | 请求                         |
| --------- | ------ | --------------------------------------- | ---------------------------- |
| 列表      | POST   | `/api/agent/model-provider/list`        | `ModelProviderVo` + 分页字段 |
| 详情      | GET    | `/api/agent/model-provider/{id}`        | path id                      |
| 新增      | POST   | `/api/agent/model-provider`             | `ModelProviderDto`           |
| 编辑      | PUT    | `/api/agent/model-provider/{id}`        | `ModelProviderDto`           |
| 删除      | DELETE | `/api/agent/model-provider/{id}`        | path id                      |
| 启用/禁用 | PUT    | `/api/agent/model-provider/{id}/status` | `{ "status": 1 }`            |
| 测试连接  | POST   | `/api/agent/model-provider/{id}/test`   | 当前返回 `true` 占位         |

### 4.3 前端交互要求

- API Key 只在新增/编辑表单中输入，不在详情和列表中展示。
- 编辑时 API Key 留空表示不修改原 Key。
- type 下拉建议先提供 `openai`、`local`；`azure`、`anthropic` 可置灰或标注“后端暂未支持”。
- 测试连接当前为后端占位，前端可显示“接口已调用，真实连通性待后端完善”。

---

## 5. Agent 定义管理

### 5.1 字段

| 字段            | 类型     | 必填 | 说明                          |
| --------------- | -------- | ---- | ----------------------------- |
| id              | string   | 否   | 后端生成                      |
| name            | string   | 是   | Agent 名称                    |
| code            | string   | 是   | Agent 编码，未删除数据内唯一  |
| description     | string   | 否   | 描述                          |
| systemPrompt    | string   | 否   | 系统提示词                    |
| modelProviderId | string   | 是   | 选择模型供应商                |
| model           | string   | 是   | 模型名称，如 `gpt-4o-mini`    |
| temperature     | number   | 否   | 温度参数，建议范围 0-2        |
| maxTokens       | number   | 否   | 最大输出 token                |
| status          | number   | 是   | `0` 草稿，`1` 启用，`2` 禁用  |
| maxToolRounds   | number   | 否   | V0.6 预留，默认 1             |
| accessType      | string   | 否   | V1.0 预留，`private`/`public` |
| toolIds         | string[] | 否   | 新增/编辑时绑定工具           |

### 5.2 接口

| 功能      | 方法   | 路径                                | 请求                           |
| --------- | ------ | ----------------------------------- | ------------------------------ |
| 列表      | POST   | `/api/agent/definition/list`        | `AgentDefinitionVo` + 分页字段 |
| 详情      | GET    | `/api/agent/definition/{id}`        | path id                        |
| 新增      | POST   | `/api/agent/definition`             | `AgentDefinitionDto`           |
| 编辑      | PUT    | `/api/agent/definition/{id}`        | `AgentDefinitionDto`           |
| 删除      | DELETE | `/api/agent/definition/{id}`        | path id                        |
| 启用/禁用 | PUT    | `/api/agent/definition/{id}/status` | `{ "status": 1 }`              |
| 复制      | POST   | `/api/agent/definition/{id}/copy`   | path id                        |

### 5.3 前端交互要求

- 创建 Agent 前应先创建至少一个启用的模型供应商。
- Agent 只有 `status = 1` 时可用于聊天。
- 复制 Agent 后后端会生成 `code + "_copy"` 和名称副本，状态为草稿。
- 编辑时如果传入 `toolIds`，后端会先移除旧绑定再重新绑定；前端应提交完整的目标工具 ID 列表。

---

## 6. 工具管理与绑定

### 6.1 工具字段

| 字段                | 类型   | 必填 | 说明                    |
| ------------------- | ------ | ---- | ----------------------- |
| name                | string | 是   | 工具名称                |
| code                | string | 是   | 工具编码                |
| description         | string | 否   | 描述                    |
| type                | string | 是   | 当前仅 `http`           |
| httpMethod          | string | 否   | `GET` 或 `POST`         |
| httpUrl             | string | 否   | HTTP 请求地址           |
| httpHeaders         | string | 否   | JSON 字符串模板         |
| httpBodyTemplate    | string | 否   | 请求体模板              |
| responseExtractRule | string | 否   | 响应提取规则，V0.5 实现 |
| timeoutMs           | number | 否   | 超时时间                |
| cacheTtlSeconds     | number | 否   | V0.6 预留，默认 0       |
| status              | number | 是   | `0` 禁用，`1` 启用      |

### 6.2 工具接口

| 功能     | 方法   | 路径                        | 请求                                  |
| -------- | ------ | --------------------------- | ------------------------------------- |
| 列表     | POST   | `/api/agent/tool/list`      | `AgentToolVo` + 分页字段              |
| 详情     | GET    | `/api/agent/tool/{id}`      | path id                               |
| 新增     | POST   | `/api/agent/tool`           | `AgentToolDto`                        |
| 编辑     | PUT    | `/api/agent/tool/{id}`      | `AgentToolDto`                        |
| 删除     | DELETE | `/api/agent/tool/{id}`      | path id                               |
| 测试工具 | POST   | `/api/agent/tool/{id}/test` | body 字符串，当前返回“工具测试待实现” |

### 6.3 工具绑定接口

| 功能 | 方法 | 路径 | 请求 |
| --- | --- | --- | --- |
| 查询绑定 | GET | `/api/agent/definition/{agentId}/tools` | path agentId |
| 绑定工具 | POST | `/api/agent/definition/{agentId}/tools` | `{ "toolId": "...", "priority": 0, "status": 1 }` |
| 解绑工具 | DELETE | `/api/agent/definition/{agentId}/tools/{toolId}` | path agentId/toolId |
| 调整优先级 | PUT | `/api/agent/definition/{agentId}/tools/{toolId}/priority` | `{ "priority": 1 }` |

### 6.4 前端交互要求

- V0.3 聊天不会调用工具，绑定工具仅做配置管理。
- 工具测试为占位接口，前端不要把它作为真实执行结果。
- Agent 编辑页建议提供“绑定工具”区域，支持添加、删除、排序。

---

## 7. 非流式聊天页面

### 7.1 页面功能

Chat 调试页用于验证 V0.3 普通聊天闭环：

- 选择一个启用状态 Agent。
- 展示当前会话消息列表。
- 输入用户消息并调用非流式聊天接口。
- 接口返回后追加 assistant 消息。
- 支持新建会话和继续已有会话。

### 7.2 聊天接口

```http
POST /api/agent/chat
Content-Type: application/json
Authorization: Bearer <token>
```

请求：

```json
{
  "agentId": "agentId",
  "conversationId": "conversationId，可选，首次对话不传",
  "message": "你好"
}
```

响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "assistantMessageId",
    "conversationId": "conversationId",
    "role": "assistant",
    "content": "模型回复内容",
    "model": "模型名",
    "promptTokens": 10,
    "completionTokens": 20,
    "totalTokens": 30,
    "latencyMs": 1200
  },
  "total": 0
}
```

### 7.3 前端状态处理

- 发送中：禁用输入框和发送按钮，显示 loading。
- 成功：追加 assistant 消息；如果首次聊天，需要刷新会话列表以获取新会话。
- 失败：保留用户输入或在消息区展示失败状态，提示后端返回的 `message`。
- 业务失败常见原因：Agent 未启用、供应商禁用、API Key 错误、供应商超时、模型地址不可用。

### 7.4 会话消息接口

```http
GET /api/agent/conversation/{id}/messages?current=1&pageSize=20
```

消息按创建时间升序返回。

---

## 8. 会话管理

### 8.1 状态枚举

| status | 含义   |
| ------ | ------ |
| 0      | 进行中 |
| 1      | 关闭   |
| 2      | 归档   |

### 8.2 接口

| 功能 | 方法   | 路径                                    | 请求                             |
| ---- | ------ | --------------------------------------- | -------------------------------- |
| 列表 | POST   | `/api/agent/conversation/list`          | `AgentConversationVo` + 分页字段 |
| 详情 | GET    | `/api/agent/conversation/{id}`          | path id                          |
| 消息 | GET    | `/api/agent/conversation/{id}/messages` | query `current`, `pageSize`      |
| 关闭 | PUT    | `/api/agent/conversation/{id}/close`    | path id                          |
| 删除 | DELETE | `/api/agent/conversation/{id}`          | path id                          |

### 8.3 注意事项

- 当前后端会话列表只返回当前登录用户的会话。
- 关闭后的会话不能继续聊天。
- 删除为逻辑删除。

---

## 9. 运行记录和工具调用日志

### 9.1 运行记录

| 功能 | 方法 | 路径                        | 请求                                    |
| ---- | ---- | --------------------------- | --------------------------------------- |
| 列表 | POST | `/api/agent/run/list`       | `AgentRunVo` + 分页字段                 |
| 详情 | GET  | `/api/agent/run/{id}`       | path id                                 |
| 统计 | GET  | `/api/agent/run/statistics` | query `agentId`, `startTime`, `endTime` |

运行状态：

| status | 含义 |
| ------ | ---- |
| 0      | 成功 |
| 1      | 失败 |
| 2      | 超时 |

说明：统计接口当前为 V0.6 占位实现，返回零值。前端可以先做页面结构，但不要展示为真实统计。

### 9.2 工具调用日志

| 功能 | 方法 | 路径                            | 请求                            |
| ---- | ---- | ------------------------------- | ------------------------------- |
| 列表 | POST | `/api/agent/tool-call-log/list` | `AgentToolCallLogVo` + 分页字段 |
| 详情 | GET  | `/api/agent/tool-call-log/{id}` | path id                         |

工具调用日志在 V0.5 工具调用闭环实现后才会有真实数据。

---

## 10. 推荐用户流程

### 10.1 管理员配置流程

1. 进入“模型供应商”页面。
2. 新增供应商，类型选择 `openai` 或 `local`。
3. 填写 `apiBaseUrl`、`apiKey`、`defaultModel`，状态设为启用。
4. 进入“Agent 定义”页面。
5. 新增 Agent，选择模型供应商，填写模型名称、系统提示词、温度和最大 token。
6. 启用 Agent。
7. 进入“Chat 调试”页面选择 Agent 发起对话。
8. 在“运行记录”页面查看调用结果和错误信息。

### 10.2 开发者调试流程

1. 确认供应商状态为启用。
2. 确认 Agent 状态为启用。
3. 使用 Chat 调试页发送测试消息。
4. 如失败，查看接口返回 message 和运行记录 `errorMsg`。
5. 修正 API Key、模型名、API 地址或 Agent 配置后重试。

---

## 11. 前端实现建议

### 11.1 API 模块划分

建议按资源拆分 API 文件：

```text
api/agent/modelProvider.ts
api/agent/definition.ts
api/agent/tool.ts
api/agent/toolBinding.ts
api/agent/conversation.ts
api/agent/chat.ts
api/agent/run.ts
api/agent/toolCallLog.ts
```

### 11.2 页面组件划分

建议页面组件：

```text
views/agent/model-provider/index.vue
views/agent/definition/index.vue
views/agent/tool/index.vue
views/agent/conversation/index.vue
views/agent/chat/index.vue
views/agent/run/index.vue
views/agent/tool-call-log/index.vue
```

如果项目不是 Vue，也可保持同样的资源粒度：每个资源一个列表页、一个表单弹窗或详情抽屉。

### 11.3 表单校验

- 供应商：`name`、`type`、`apiBaseUrl`、新增时 `apiKey`、`status`。
- Agent：`name`、`code`、`modelProviderId`、`model`、`status`。
- 工具：`name`、`code`、`type`、`status`。
- 聊天：`agentId`、`message`。

### 11.4 安全与脱敏

- API Key 输入框使用 password 类型。
- 详情和列表不显示 API Key。
- 编辑供应商时提示：“留空表示不修改原 API Key”。

---

## 12. 已知差异与注意事项

- `docs/agent-platform/API.md` 草案中部分列表接口写为 GET，但当前后端实际实现为 `POST /list`，前端应以当前 Controller 实现为准。
- `ModelProviderController.testConnection` 当前返回 `true` 占位，不代表真实模型供应商可用。
- `AgentToolController.testTool` 当前返回“工具测试待实现”。
- `AgentRunController.statistics` 当前返回零值占位。
- V0.3 非流式聊天不会调用工具，即使 Agent 已绑定工具。
- 当前未提供工作流、知识库、文档的前端接口。

---

## 13. 联调检查清单

- [ ] 登录后请求头正确携带 `Authorization: Bearer <token>`。
- [ ] 模型供应商新增后，列表和详情不显示 API Key。
- [ ] 编辑供应商留空 API Key 不会清空原 Key。
- [ ] Agent 新增后可在列表显示，并可启用。
- [ ] Chat 调试页只能选择启用状态 Agent。
- [ ] 首次聊天不传 `conversationId`。
- [ ] 继续会话时传入已有 `conversationId`。
- [ ] 聊天成功后可在会话消息列表看到 user 和 assistant 消息。
- [ ] 聊天成功或失败后可在运行记录中看到对应记录。
- [ ] 关闭会话后再次发送消息能正确展示失败提示。
