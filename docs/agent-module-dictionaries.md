# Agent 模块字典配置文档

## 概述

Agent 模块使用字典服务统一管理下拉选项，通过 `getOptionList(parentCode)` 获取选项数据。

## 字典编码列表

| 字典编码 | 说明 | 使用页面 |
|---------|------|---------|
| `Agent_Status` | 工具/供应商状态 | tool, model-provider |
| `Agent_Tool_Type` | 工具类型 | tool |
| `Agent_Http_Method` | HTTP 请求方法 | tool, tool-call-log |
| `Agent_Content_Type` | Content-Type 类型 | tool |
| `Agent_Response_Type` | 响应提取类型 | tool |
| `Model_Provider_Type` | 供应商类型 | model-provider |
| `Model_Provider_Name` | 供应商名称 | model-provider |
| `Model_Provider_Model` | 默认模型 | model-provider |
| `Agent_Definition_Status` | Agent 定义状态 | definition |
| `Agent_Access_Type` | 访问类型 | definition |
| `Agent_Reasoning_Effort` | 推理力度 | definition, chat |
| `Agent_Run_Status` | 运行状态 | run |
| `Agent_ToolCall_Status` | 工具调用状态 | tool-call-log |
| `Agent_Conversation_Status` | 会话状态 | conversation |

## 字典值明细

### Agent_Status (工具/供应商状态)

| 标签 | 值 | 说明 |
|------|---|------|
| 禁用 | 0 | 禁用状态 |
| 启用 | 1 | 启用状态 |

### Agent_Tool_Type (工具类型)

| 标签 | 值 | 说明 |
|------|---|------|
| HTTP | http | HTTP 请求工具 |

### Agent_Http_Method (HTTP 请求方法)

| 标签 | 值 | 说明 |
|------|---|------|
| GET | GET | GET 请求 |
| POST | POST | POST 请求 |
| PUT | PUT | PUT 请求 |
| DELETE | DELETE | DELETE 请求 |
| PATCH | PATCH | PATCH 请求 |

### Agent_Content_Type (Content-Type 类型)

| 标签 | 值 | 说明 |
|------|---|------|
| application/json | application/json | JSON 格式 |
| application/x-www-form-urlencoded | application/x-www-form-urlencoded | 表单格式 |
| multipart/form-data | multipart/form-data | 文件上传格式 |
| text/plain | text/plain | 纯文本格式 |
| text/xml | text/xml | XML 格式 |

### Agent_Response_Type (响应提取类型)

| 标签 | 值 | 说明 |
|------|---|------|
| JSONPath | jsonpath | JSONPath 表达式 |
| 正则 | regex | 正则表达式 |
| 空（完整响应） | empty | 返回完整响应 |

### Model_Provider_Type (供应商类型)

| 标签 | 值 | 说明 |
|------|---|------|
| OpenAI | openai | OpenAI 兼容接口 |
| Local | local | 本地模型 |

### Model_Provider_Name (供应商名称)

| 标签 | 值 | 说明 |
|------|---|------|
| OpenAI | OpenAI | OpenAI 官方 |
| Azure OpenAI | Azure OpenAI | Azure OpenAI 服务 |
| Anthropic | Anthropic | Claude 系列模型 |
| 通义千问 | qwen | 阿里云通义千问 |
| 文心一言 | wenxin | 百度文心一言 |
| 智谱 AI | zhipu | GLM 系列模型 |
| 本地模型 | local | 自部署模型 |

### Model_Provider_Model (默认模型)

按供应商分组，使用 `parent` 字段关联父级：

| 标签 | 值 | 父级 | 说明 |
|------|---|------|------|
| gpt-4o | gpt-4o | Model_Provider_Name_OpenAI | GPT-4o |
| gpt-4o-mini | gpt-4o-mini | Model_Provider_Name_OpenAI | GPT-4o Mini |
| gpt-3.5-turbo | gpt-3.5-turbo | Model_Provider_Name_OpenAI | GPT-3.5 Turbo |
| claude-3-5-sonnet | claude-3-5-sonnet | Model_Provider_Name_Anthropic | Claude 3.5 Sonnet |
| claude-3-haiku | claude-3-haiku | Model_Provider_Name_Anthropic | Claude 3 Haiku |
| qwen-max | qwen-max | Model_Provider_Name_Qwen | 通义千问 Max |
| qwen-plus | qwen-plus | Model_Provider_Name_Qwen | 通义千问 Plus |
| qwen-turbo | qwen-turbo | Model_Provider_Name_Qwen | 通义千问 Turbo |
| ernie-4.0 | ernie-4.0 | Model_Provider_Name_Wenxin | 文心一言 4.0 |
| ernie-3.5 | ernie-3.5 | Model_Provider_Name_Wenxin | 文心一言 3.5 |
| glm-4 | glm-4 | Model_Provider_Name_Zhipu | GLM-4 |
| glm-3-turbo | glm-3-turbo | Model_Provider_Name_Zhipu | GLM-3 Turbo |

### Agent_Definition_Status (Agent 定义状态)

| 标签 | 值 | 说明 |
|------|---|------|
| 草稿 | 0 | 草稿状态 |
| 启用 | 1 | 启用状态 |
| 禁用 | 2 | 禁用状态 |

### Agent_Access_Type (访问类型)

| 标签 | 值 | 说明 |
|------|---|------|
| 私有 | private | 仅自己可访问 |
| 公开 | public | 所有人可访问 |

### Agent_Reasoning_Effort (推理力度)

| 标签 | 值 | 说明 |
|------|---|------|
| 轻度 | low | 轻度推理 |
| 中度 | medium | 中度推理 |
| 深度 | high | 深度推理 |

### Agent_Run_Status (运行状态)

| 标签 | 值 | 说明 |
|------|---|------|
| 成功 | 0 | 运行成功 |
| 失败 | 1 | 运行失败 |
| 超时 | 2 | 运行超时 |

### Agent_ToolCall_Status (工具调用状态)

| 标签 | 值 | 说明 |
|------|---|------|
| 成功 | 0 | 调用成功 |
| 失败 | 1 | 调用失败 |
| 超时 | 2 | 调用超时 |
| 安全拦截 | 3 | 安全拦截 |

### Agent_Conversation_Status (会话状态)

| 标签 | 值 | 说明 |
|------|---|------|
| 进行中 | 0 | 进行中 |
| 关闭 | 1 | 已关闭 |
| 归档 | 2 | 已归档 |

## 使用方式

### ProFormSelect

```tsx
import {getOptionList} from "@/services/sys/DictController";

<ProFormSelect
  name="status"
  label="状态"
  request={async () => getOptionList("Agent_Status")}
/>
```

### ProTable 搜索筛选

```tsx
import {getOptionList} from "@/services/sys/DictController";

{
  title: '状态',
  dataIndex: 'status',
  valueType: 'select',
  request: async () => getOptionList("Agent_Status"),
}
```

### ProTable valueEnum (静态)

```tsx
// 对于已加载的字典数据，可转换为 valueEnum 格式
const statusValueEnum: Record<number, {text: string}> = {};
const statusOptions = await getOptionList("Agent_Status");
statusOptions.forEach(opt => {
  statusValueEnum[opt.value] = {text: opt.label};
});
```
