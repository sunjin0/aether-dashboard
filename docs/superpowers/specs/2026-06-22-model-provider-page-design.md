# 模型供应商页面设计

## 范围

本次只实现 Agent 平台的一个前端页面：模型供应商管理。页面覆盖 `docs/FRONTEND.md` 中定义的 `/api/agent/model-provider/**` 接口能力，包括新增、查询、编辑、删除和启用/禁用。

首版不展示“测试连接”操作，因为当前后端接口仍是占位实现，展示后容易让用户误以为已经完成真实连通性校验。

## 路由与文件位置

在后台管理系统中新增 `Agent 平台` 菜单，并在其下新增 `模型供应商` 页面：

- 路由：`/agent/model-provider`
- 菜单名称：`模型供应商`
- 路由组件：`./agent/model-provider`

页面文件放在 `src/pages/agent/model-provider/index.tsx`。表单抽屉文件放在 `src/pages/agent/model-provider/ModelProviderForm.tsx`。

## 数据模型与服务层

新增 Agent 相关实体类型文件：`src/services/entity/Agent.ts`。

包含类型：

- `ModelProvider`：模型供应商实体。
- `ModelProviderSearchParams`：列表查询参数，包含分页字段和可查询字段。
- `ModelProviderStatusParams`：启用/禁用请求参数。

新增服务文件：`src/services/agent/ModelProviderController.ts`。

包含接口函数：

- `getModelProviderList`：`POST /api/agent/model-provider/list`
- `getModelProviderInfo`：`GET /api/agent/model-provider/{id}`
- `addModelProviderInfo`：`POST /api/agent/model-provider`
- `updateModelProviderInfo`：`PUT /api/agent/model-provider/{id}`
- `deleteModelProviderInfo`：`DELETE /api/agent/model-provider/{id}`
- `updateModelProviderStatus`：`PUT /api/agent/model-provider/{id}/status`

列表接口按后端当前 `WebResponse.Page(list, total)` 结构处理：`data` 是列表数据，顶层 `total` 是总数。

## 列表页

列表页沿用项目现有后台页面模式，使用 `PageContainer` 包裹 `ProTable`。

表格列：

- `name`：供应商名称。
- `type`：类型，映射 `openai` 和 `local`。
- `apiBaseUrl`：API 基础地址。
- `defaultModel`：默认模型。
- `status`：状态，`0` 表示禁用，`1` 表示启用。
- `sort`：排序。
- `remark`：备注。
- `createAt`：创建时间，不参与搜索。
- `option`：操作列。

列表不展示 `apiKey`。

工具栏：

- 当前路径存在写权限时展示“新增”按钮。
- 写权限判断沿用现有模式：`useAccess()[history.location.pathname]`。

行操作：

- 编辑。
- 删除，操作前弹出确认框。
- 启用或禁用，根据当前 `status` 自动切换操作文案和目标状态。

没有写权限时隐藏新增、编辑、删除、启用和禁用操作。

## 表单抽屉

表单沿用项目现有 `DrawerForm` 组件。

字段：

- 隐藏字段 `id`。
- `name`：供应商名称，必填。
- `type`：供应商类型，必填，下拉选项只提供 `openai` 和 `local`。
- `apiBaseUrl`：API 基础地址，必填。
- `apiKey`：API Key，密码输入框。
- `defaultModel`：默认模型，选填。
- `status`：状态，必填，下拉选项为 `0 禁用` 和 `1 启用`。
- `sort`：排序，数字输入，选填。
- `remark`：备注，多行文本，选填。

API Key 处理规则：

- 新增供应商时 `apiKey` 必填。
- 编辑供应商时 `apiKey` 非必填。
- 编辑时如果 `apiKey` 留空，表示不修改原 API Key。
- 编辑状态下表单展示提示文案：`留空表示不修改原 API Key`。

## 请求与结果处理

新增：

- 表单提交到 `POST /api/agent/model-provider`。

编辑：

- 打开表单时通过 `GET /api/agent/model-provider/{id}` 加载详情。
- 表单提交到 `PUT /api/agent/model-provider/{id}`。

删除：

- 用户确认后调用 `DELETE /api/agent/model-provider/{id}`。

启用/禁用：

- 调用 `PUT /api/agent/model-provider/{id}/status`。
- 请求体为 `{ "status": 0 }` 或 `{ "status": 1 }`。

新增、编辑、删除和启用/禁用操作都按 `code === 200` 判断成功。成功后展示成功提示并刷新表格；失败时展示后端返回的 `message`。

## 错误处理

页面不新增全局错误处理层，继续沿用当前项目页面级处理方式。后端参数错误、业务校验失败、权限错误和系统错误都通过 Ant Design `message.error` 展示后端 `message`。

认证失效和未登录跳转继续由现有 `src/app.tsx` 运行时逻辑处理，模型供应商页面不单独处理登录态。

## 验证

实现后需要验证：

- 执行 `npm run tsc`，确认 TypeScript 编译通过。
- 确认 `config/routes.ts` 中新增路由能解析到页面。
- 确认列表接口使用 `POST /api/agent/model-provider/list`，分页字段放在请求体中。
- 确认列表和详情不展示 `apiKey`。
- 确认新增时 `apiKey` 必填，编辑时 `apiKey` 可为空。
- 确认没有展示“测试连接”按钮。

## 不在本次范围内

- 测试连接按钮。
- Agent 定义、工具管理、Chat 调试、会话管理、运行记录和工具调用日志页面。
- 抽象通用 Agent 平台 CRUD 组件或工具函数。
