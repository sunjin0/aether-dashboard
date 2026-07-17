# Agent 定义页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Agent 平台的 Agent 定义管理页面，支持列表、查询、新增、编辑、删除、启用/禁用和复制。

**Architecture:** 复用已完成的 Agent 平台页面模式。扩展 `Agent.ts` 类型，新增 Agent 定义服务层、列表页和表单抽屉，并把 `/agent/definition` 注册到已有 `Agent 平台` 菜单下。

**Tech Stack:** React 18、Umi Max、Ant Design、Ant Design Pro Components、TypeScript、`@umijs/max` request。

---

## 文件结构

- Modify: `src/services/entity/Agent.ts`
  - 增加 Agent 定义实体、查询参数和状态参数类型。
- Create: `src/services/agent/AgentDefinitionController.ts`
  - 封装 `/api/agent/definition/**` 请求。
- Create: `src/pages/agent/definition/AgentDefinitionForm.tsx`
  - 实现新增/编辑抽屉表单，模型供应商下拉只加载启用供应商。
- Create: `src/pages/agent/definition/index.tsx`
  - 实现列表、查询、编辑、复制、启用/禁用、删除和权限控制。
- Modify: `config/routes.ts`
  - 在 `Agent 平台` 下新增 `/agent/definition` 子路由。

说明：不提交 commit；当前仓库已有 `npm run tsc` 基线错误在 `src/pages/user/member/index.tsx` 和 `src/requestErrorConfig.ts`，本计划只要求不引入新的 TypeScript 错误。

---

### Task 1: 扩展 Agent 定义类型

**Files:**

- Modify: `src/services/entity/Agent.ts`

- [ ] **Step 1: 在 `Agent.ts` 末尾追加类型**

```ts
/**
 * @description Agent 定义
 */
export interface AgentDefinition {
  id?: string;
  name?: string;
  code?: string;
  description?: string;
  systemPrompt?: string;
  modelProviderId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  status?: number;
  maxToolRounds?: number;
  accessType?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @description Agent 定义查询参数
 */
export interface AgentDefinitionSearchParams extends AgentDefinition {
  current?: number;
  pageSize?: number;
}

/**
 * @description Agent 定义启用/禁用参数
 */
export interface AgentDefinitionStatusParams {
  status: number;
}
```

- [ ] **Step 2: 运行类型检查**

Run: `npm run tsc`

Expected: 可能仍失败在既有两个基线错误；不得出现 `src/services/entity/Agent.ts` 新错误。

---

### Task 2: 新增 Agent 定义服务层

**Files:**

- Create: `src/services/agent/AgentDefinitionController.ts`

- [ ] **Step 1: 创建服务文件**

```ts
import { request } from '@umijs/max';
import { ResponseStructure } from '@/services/entity/Common';
import {
  AgentDefinition,
  AgentDefinitionSearchParams,
  AgentDefinitionStatusParams,
} from '@/services/entity/Agent';

/**
 * @description 获取 Agent 定义列表
 */
export const getAgentDefinitionList = async (
  params: AgentDefinitionSearchParams,
): Promise<ResponseStructure<AgentDefinition[]>> => {
  return request('/api/agent/definition/list', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 获取 Agent 定义详情
 */
export const getAgentDefinitionInfo = async (
  id: string,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${id}`, {
    method: 'GET',
  });
};

/**
 * @description 新增 Agent 定义
 */
export const addAgentDefinitionInfo = async (
  params: AgentDefinition,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request('/api/agent/definition', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 修改 Agent 定义
 */
export const updateAgentDefinitionInfo = async (
  params: AgentDefinition,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${params.id}`, {
    method: 'PUT',
    data: params,
  });
};

/**
 * @description 删除 Agent 定义
 */
export const deleteAgentDefinitionInfo = async (
  id: string,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${id}`, {
    method: 'DELETE',
  });
};

/**
 * @description 启用/禁用 Agent 定义
 */
export const updateAgentDefinitionStatus = async (
  id: string,
  params: AgentDefinitionStatusParams,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${id}/status`, {
    method: 'PUT',
    data: params,
  });
};

/**
 * @description 复制 Agent 定义
 */
export const copyAgentDefinitionInfo = async (
  id: string,
): Promise<ResponseStructure<AgentDefinition>> => {
  return request(`/api/agent/definition/${id}/copy`, {
    method: 'POST',
  });
};
```

- [ ] **Step 2: 验证服务层路径**

Run: `npm run tsc`

Expected: 只允许既有基线错误；不得出现 `AgentDefinitionController.ts` 新错误。

---

### Task 3: 新增 Agent 定义表单抽屉

**Files:**

- Create: `src/pages/agent/definition/AgentDefinitionForm.tsx`

- [ ] **Step 1: 创建表单组件**

```tsx
import DrawerForm from '@/components/DrawerForm';
import {
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Form } from 'antd';
import {
  addAgentDefinitionInfo,
  getAgentDefinitionInfo,
  updateAgentDefinitionInfo,
} from '@/services/agent/AgentDefinitionController';
import { getModelProviderList } from '@/services/agent/ModelProviderController';

const statusOptions = [
  { label: '草稿', value: 0 },
  { label: '启用', value: 1 },
  { label: '禁用', value: 2 },
];

const accessTypeOptions = [
  { label: 'private', value: 'private' },
  { label: 'public', value: 'public' },
];

const AgentDefinitionForm = (props: {
  id?: string;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const { id, open, setOpen, onSuccess } = props;
  const [form] = Form.useForm();

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      request={async (params) => getAgentDefinitionInfo(params)}
      onSuccess={async (values) => {
        if (id) {
          await updateAgentDefinitionInfo(values);
        } else {
          await addAgentDefinitionInfo(values);
        }
        onSuccess();
        return true;
      }}
      form={form}
    >
      <ProFormText name="id" hidden={true} />
      <ProFormText name="name" label="Agent 名称" rules={[{ required: true }]} />
      <ProFormText name="code" label="Agent 编码" rules={[{ required: true }]} />
      <ProFormTextArea name="description" label="描述" />
      <ProFormTextArea name="systemPrompt" label="系统提示词" />
      <ProFormSelect
        name="modelProviderId"
        label="模型供应商"
        showSearch={true}
        rules={[{ required: true }]}
        request={async () => {
          const { data } = await getModelProviderList({
            current: 1,
            pageSize: 1000,
            status: 1,
          });
          return (data || [])
            .filter((item) => item.id)
            .map((item) => ({
              label: item.name || item.id,
              value: item.id as string,
            }));
        }}
      />
      <ProFormText name="model" label="模型名称" rules={[{ required: true }]} />
      <ProFormDigit name="temperature" label="温度参数" min={0} max={2} />
      <ProFormDigit name="maxTokens" label="最大输出 token" min={1} fieldProps={{ precision: 0 }} />
      <ProFormSelect
        name="status"
        label="状态"
        options={statusOptions}
        rules={[{ required: true }]}
      />
      <ProFormDigit
        name="maxToolRounds"
        label="最大工具轮次"
        min={0}
        fieldProps={{ precision: 0 }}
      />
      <ProFormSelect name="accessType" label="访问类型" options={accessTypeOptions} />
    </DrawerForm>
  );
};

export default AgentDefinitionForm;
```

- [ ] **Step 2: 运行类型检查**

Run: `npm run tsc`

Expected: 只允许既有基线错误；不得出现 `AgentDefinitionForm.tsx` 新错误。若 `ProFormDigit` 在当前版本不可用，把对应字段替换为 `ProFormText`。

---

### Task 4: 新增 Agent 定义列表页

**Files:**

- Create: `src/pages/agent/definition/index.tsx`

- [ ] **Step 1: 创建列表页面组件**

```tsx
import React, { useRef, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, message, Popconfirm } from 'antd';
import { FormattedMessage, history, useAccess } from '@@/exports';
import AgentDefinitionForm from '@/pages/agent/definition/AgentDefinitionForm';
import {
  copyAgentDefinitionInfo,
  deleteAgentDefinitionInfo,
  getAgentDefinitionList,
  updateAgentDefinitionStatus,
} from '@/services/agent/AgentDefinitionController';
import { AgentDefinition, AgentDefinitionSearchParams } from '@/services/entity/Agent';

const statusValueEnum = {
  0: { text: '草稿', status: 'Default' },
  1: { text: '启用', status: 'Success' },
  2: { text: '禁用', status: 'Error' },
};

const accessTypeValueEnum = {
  private: { text: 'private' },
  public: { text: 'public' },
};

const AgentDefinitionPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | undefined>(undefined);
  const ref = useRef<ActionType>();
  const permissionMap = useAccess();
  const path = history.location.pathname;
  const write = permissionMap[path];

  const handleDelete = async (record: AgentDefinition) => {
    if (!record.id) {
      message.error('缺少 Agent ID');
      return;
    }
    const { code, message: msg } = await deleteAgentDefinitionInfo(record.id);
    if (code === 200) {
      message.success(msg || '删除成功');
      ref.current?.reload();
    } else {
      message.error(msg || '删除失败');
    }
  };

  const handleCopy = async (record: AgentDefinition) => {
    if (!record.id) {
      message.error('缺少 Agent ID');
      return;
    }
    const { code, message: msg } = await copyAgentDefinitionInfo(record.id);
    if (code === 200) {
      message.success(msg || '复制成功');
      ref.current?.reload();
    } else {
      message.error(msg || '复制失败');
    }
  };

  const handleStatusChange = async (record: AgentDefinition) => {
    if (!record.id) {
      message.error('缺少 Agent ID');
      return;
    }
    const nextStatus = record.status === 1 ? 2 : 1;
    const { code, message: msg } = await updateAgentDefinitionStatus(record.id, {
      status: nextStatus,
    });
    if (code === 200) {
      message.success(msg || '操作成功');
      ref.current?.reload();
    } else {
      message.error(msg || '操作失败');
    }
  };

  const columns: any[] = [
    { title: 'Agent 名称', dataIndex: 'name', valueType: 'text', ellipsis: true },
    { title: 'Agent 编码', dataIndex: 'code', valueType: 'text', ellipsis: true },
    { title: '模型供应商', dataIndex: 'modelProviderId', valueType: 'text', ellipsis: true },
    { title: '模型名称', dataIndex: 'model', valueType: 'text', ellipsis: true },
    { title: '状态', dataIndex: 'status', valueType: 'select', valueEnum: statusValueEnum },
    { title: '温度参数', dataIndex: 'temperature', valueType: 'digit', hideInSearch: true },
    { title: '最大 token', dataIndex: 'maxTokens', valueType: 'digit', hideInSearch: true },
    { title: '最大工具轮次', dataIndex: 'maxToolRounds', valueType: 'digit', hideInSearch: true },
    {
      title: '访问类型',
      dataIndex: 'accessType',
      valueType: 'select',
      valueEnum: accessTypeValueEnum,
    },
    {
      title: '描述',
      dataIndex: 'description',
      valueType: 'text',
      ellipsis: true,
      hideInSearch: true,
    },
    { title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime', hideInSearch: true },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentDefinition) =>
        write && [
          <Button
            type="link"
            key="edit"
            onClick={() => {
              setId(record.id);
              setOpen(true);
            }}
          >
            编辑
          </Button>,
          <Popconfirm key="copy" title="确认复制该 Agent？" onConfirm={() => handleCopy(record)}>
            <Button type="link" key="copy-button">
              复制
            </Button>
          </Popconfirm>,
          <Popconfirm
            key="status"
            title={`确认${record.status === 1 ? '禁用' : '启用'}该 Agent？`}
            onConfirm={() => handleStatusChange(record)}
          >
            <Button type="link" key="status-button">
              {record.status === 1 ? '禁用' : '启用'}
            </Button>
          </Popconfirm>,
          <Popconfirm
            key="delete"
            title="确认删除该 Agent？"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" key="delete-button">
              删除
            </Button>
          </Popconfirm>,
        ],
    },
  ];

  return (
    <PageContainer>
      <ProTable
        actionRef={ref}
        rowKey="id"
        request={async (params: AgentDefinitionSearchParams) => getAgentDefinitionList(params)}
        toolBarRender={() =>
          write && [
            <Button
              key="button"
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setId(undefined);
                setOpen(true);
              }}
            >
              <FormattedMessage id="pages.common.new" />
            </Button>,
          ]
        }
        columns={columns}
      />
      <AgentDefinitionForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined);
          ref.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default AgentDefinitionPage;
```

- [ ] **Step 2: 运行类型检查和范围检查**

Run: `npm run tsc`

Expected: 只允许既有基线错误；不得出现 `src/pages/agent/definition/index.tsx` 新错误。

Run: `rg "toolIds|绑定工具|/tools" src/pages/agent/definition src/services/agent/AgentDefinitionController.ts`

Expected: 无匹配。

---

### Task 5: 注册 Agent 定义路由

**Files:**

- Modify: `config/routes.ts`

- [ ] **Step 1: 在 Agent 平台 routes 中加入 Agent 定义**

在 `/agent/model-provider` 路由之后添加：

```ts
      {
        path: '/agent/definition',
        name: 'Agent 定义',
        component: './agent/definition',
      },
```

保持 `path: '*'` 的 404 路由仍然是数组最后一项。

- [ ] **Step 2: 运行路由验证**

Run: `npm run tsc`

Expected: 只允许既有基线错误；不得出现 `config/routes.ts` 新错误。

Run: `rg "Agent 定义|/agent/definition|./agent/definition" config/routes.ts`

Expected: 三项均有匹配。

---

### Task 6: 最终验证

**Files:**

- Verify: `src/services/entity/Agent.ts`
- Verify: `src/services/agent/AgentDefinitionController.ts`
- Verify: `src/pages/agent/definition/AgentDefinitionForm.tsx`
- Verify: `src/pages/agent/definition/index.tsx`
- Verify: `config/routes.ts`

- [ ] **Step 1: 运行 TypeScript 检查**

Run: `npm run tsc`

Expected: 只允许既有基线错误：`src/pages/user/member/index.tsx(78,29)` 和 `src/requestErrorConfig.ts(107,5)`。本次新增/修改文件不得出现在错误列表中。

- [ ] **Step 2: 检查服务接口路径**

Run: `rg "/api/agent/definition" src/services/agent/AgentDefinitionController.ts`

Expected: 包含 `/list`、详情、创建、更新、删除、`/status`、`/copy`。

- [ ] **Step 3: 检查表单不包含工具绑定字段**

Run: `rg "toolIds|绑定工具|/tools" src/pages/agent/definition src/services/agent/AgentDefinitionController.ts`

Expected: 无匹配。

- [ ] **Step 4: 检查供应商下拉只请求启用供应商**

Run: `rg "status: 1|pageSize: 1000|getModelProviderList" src/pages/agent/definition/AgentDefinitionForm.tsx`

Expected: 三项均有匹配。

- [ ] **Step 5: 检查路由已注册**

Run: `rg "Agent 定义|/agent/definition|./agent/definition" config/routes.ts`

Expected: 三项均有匹配，且 404 路由仍在最后。

---

## 自检结果

- 规格覆盖：计划覆盖类型、服务、列表页、表单抽屉、模型供应商下拉、路由、权限控制、复制、启用/禁用、删除和排除工具绑定。
- 占位扫描：计划没有待补全的 TBD/TODO，也没有要求执行者自行设计未说明行为。
- 类型一致性：`AgentDefinition`、`AgentDefinitionSearchParams`、`AgentDefinitionStatusParams`、服务函数名和页面导入名保持一致。
