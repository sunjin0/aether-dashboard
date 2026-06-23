# Agent 定义页面设计

## 范围

本次只实现 Agent 平台的一个前端页面：Agent 定义管理。页面覆盖 `docs/FRONTEND.md` 中定义的 `/api/agent/definition/**` 基础管理能力，包括新增、查询、编辑、删除、启用/禁用和复制。

首版不实现工具绑定区域，不查询绑定工具，不提交 `toolIds`。工具管理和工具绑定后续作为独立页面或独立迭代处理。

## 路由与文件位置

在已有 `Agent 平台` 菜单下新增 `Agent 定义` 页面：

- 路由：`/agent/definition`
- 菜单名称：`Agent 定义`
- 路由组件：`./agent/definition`

页面文件放在 `src/pages/agent/definition/index.tsx`。表单抽屉文件放在 `src/pages/agent/definition/AgentDefinitionForm.tsx`。

## 数据模型与服务层

继续扩展 `src/services/entity/Agent.ts`。

新增类型：

- `AgentDefinition`：Agent 定义实体。
- `AgentDefinitionSearchParams`：列表查询参数，包含分页字段和可查询字段。
- `AgentDefinitionStatusParams`：启用/禁用请求参数。

新增服务文件：`src/services/agent/AgentDefinitionController.ts`。

包含接口函数：

- `getAgentDefinitionList`：`POST /api/agent/definition/list`
- `getAgentDefinitionInfo`：`GET /api/agent/definition/{id}`
- `addAgentDefinitionInfo`：`POST /api/agent/definition`
- `updateAgentDefinitionInfo`：`PUT /api/agent/definition/{id}`
- `deleteAgentDefinitionInfo`：`DELETE /api/agent/definition/{id}`
- `updateAgentDefinitionStatus`：`PUT /api/agent/definition/{id}/status`
- `copyAgentDefinitionInfo`：`POST /api/agent/definition/{id}/copy`

列表接口按后端当前 `WebResponse.Page(list, total)` 结构处理：`data` 是列表数据，顶层 `total` 是总数。

## 列表页

列表页沿用项目现有后台页面模式，使用 `PageContainer` 包裹 `ProTable`。

表格列：

- `name`：Agent 名称。
- `code`：Agent 编码。
- `modelProviderId`：模型供应商 ID 或名称。首版如后端未返回供应商名称，直接展示 ID。
- `model`：模型名称。
- `status`：状态，`0` 表示草稿，`1` 表示启用，`2` 表示禁用。
- `temperature`：温度参数。
- `maxTokens`：最大输出 token。
- `maxToolRounds`：最大工具轮次。
- `accessType`：访问类型。
- `description`：描述。
- `createdAt`：创建时间，不参与搜索。
- `option`：操作列。

工具栏：

- 当前路径存在写权限时展示“新增”按钮。
- 写权限判断沿用现有模式：`useAccess()[history.location.pathname]`。

行操作：

- 编辑。
- 复制。
- 启用或禁用，根据当前 `status` 自动切换操作文案和目标状态。
- 删除，操作前弹出确认框。

没有写权限时隐藏新增、编辑、复制、删除、启用和禁用操作。

## 表单抽屉

表单沿用项目现有 `DrawerForm` 组件。

字段：

- 隐藏字段 `id`。
- `name`：Agent 名称，必填。
- `code`：Agent 编码，必填。
- `description`：描述，多行文本，选填。
- `systemPrompt`：系统提示词，多行文本，选填。
- `modelProviderId`：模型供应商，必填。
- `model`：模型名称，必填。
- `temperature`：温度参数，数字输入，范围 `0-2`，选填。
- `maxTokens`：最大输出 token，数字输入，选填。
- `status`：状态，必填，下拉选项为 `0 草稿`、`1 启用`、`2 禁用`。
- `maxToolRounds`：最大工具轮次，数字输入，选填。
- `accessType`：访问类型，下拉选项为 `private` 和 `public`，选填。

模型供应商下拉：

- 复用已实现的 `getModelProviderList`。
- 请求参数包含 `status: 1`、`current: 1`、`pageSize: 1000`。
- 选项 label 优先使用供应商 `name`，value 使用供应商 `id`。
- 若没有启用的模型供应商，表单仍可打开，但下拉为空，用户无法通过必填校验提交。

首版表单不包含 `toolIds` 字段。

## 请求与结果处理

新增：

- 表单提交到 `POST /api/agent/definition`。

编辑：

- 打开表单时通过 `GET /api/agent/definition/{id}` 加载详情。
- 表单提交到 `PUT /api/agent/definition/{id}`。

删除：

- 用户确认后调用 `DELETE /api/agent/definition/{id}`。

复制：

- 用户确认后调用 `POST /api/agent/definition/{id}/copy`。
- 成功后刷新列表。

启用/禁用：

- 启用调用 `PUT /api/agent/definition/{id}/status`，请求体为 `{ "status": 1 }`。
- 禁用调用 `PUT /api/agent/definition/{id}/status`，请求体为 `{ "status": 2 }`。
- 草稿和禁用状态展示“启用”，启用状态展示“禁用”。

新增、编辑、删除、复制和启用/禁用操作都按 `code === 200` 判断成功。成功后展示成功提示并刷新表格；失败时展示后端返回的 `message`。

## 错误处理

页面不新增全局错误处理层，继续沿用当前项目页面级处理方式。后端参数错误、业务校验失败、权限错误和系统错误都通过 Ant Design `message.error` 展示后端 `message`。

认证失效和未登录跳转继续由现有 `src/app.tsx` 运行时逻辑处理，Agent 定义页面不单独处理登录态。

## 验证

实现后需要验证：

- 执行 `npm run tsc`，确认本次新增文件没有 TypeScript 错误。
- 确认 `config/routes.ts` 中新增 `/agent/definition` 路由能解析到页面。
- 确认列表接口使用 `POST /api/agent/definition/list`，分页字段放在请求体中。
- 确认表单模型供应商下拉只请求启用供应商。
- 确认新增/编辑表单不包含 `toolIds` 字段。
- 确认没有展示工具绑定入口。
- 确认复制、启用/禁用、删除都受写权限控制。

## 不在本次范围内

- 工具绑定区域。
- 工具列表查询、绑定、解绑、调整优先级。
- 工具管理、Chat 调试、会话管理、运行记录和工具调用日志页面。
- 抽象通用 Agent 平台 CRUD 组件或工具函数。
