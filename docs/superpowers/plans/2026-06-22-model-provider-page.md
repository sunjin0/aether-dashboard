# 模型供应商页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Agent 平台的模型供应商管理页面，支持列表、查询、新增、编辑、删除和启用/禁用。

**Architecture:** 按现有 Umi Max + Ant Design Pro 后台 CRUD 模式实现。新增 Agent 实体类型、模型供应商服务层、模型供应商列表页和表单抽屉，并在 `config/routes.ts` 注册 `Agent 平台 / 模型供应商` 路由。

**Tech Stack:** React 18、Umi Max、Ant Design、Ant Design Pro Components、TypeScript、`@umijs/max` request。

---

## 文件结构

- Create: `src/services/entity/Agent.ts`
  - 负责 Agent 平台相关实体类型。本次只定义模型供应商相关类型。
- Create: `src/services/agent/ModelProviderController.ts`
  - 负责 `/api/agent/model-provider/**` 接口请求封装。
- Create: `src/pages/agent/model-provider/ModelProviderForm.tsx`
  - 负责模型供应商新增和编辑抽屉表单。
- Create: `src/pages/agent/model-provider/index.tsx`
  - 负责模型供应商列表、查询、操作列和权限控制。
- Modify: `config/routes.ts`
  - 新增 `Agent 平台` 一级菜单和 `模型供应商` 子路由。

说明：本计划不包含 git commit 步骤，因为当前工作流要求只有在用户明确要求时才提交代码。

---

### Task 1: 新增模型供应商类型定义

**Files:**

- Create: `src/services/entity/Agent.ts`

- [ ] **Step 1: 创建 Agent 实体类型文件**

使用 `apply_patch` 创建 `src/services/entity/Agent.ts`，内容如下：

```ts
/**
 * @description 模型供应商
 */
export interface ModelProvider {
  id?: string;
  name?: string;
  type?: string;
  apiBaseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
  status?: number;
  sort?: number;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @description 模型供应商查询参数
 */
export interface ModelProviderSearchParams extends ModelProvider {
  current?: number;
  pageSize?: number;
}

/**
 * @description 模型供应商启用/禁用参数
 */
export interface ModelProviderStatusParams {
  status: number;
}
```

- [ ] **Step 2: 运行类型检查确认新增类型无语法错误**

Run: `npm run tsc`

Expected: TypeScript 检查可能因为后续页面还未实现而没有新增错误；如果当前仓库已有历史类型错误，记录原始错误，不在本任务中修复无关问题。

---

### Task 2: 新增模型供应商服务层

**Files:**

- Create: `src/services/agent/ModelProviderController.ts`
- Depends on: `src/services/entity/Agent.ts`
- Depends on: `src/services/entity/Common.ts`

- [ ] **Step 1: 创建服务文件**

使用 `apply_patch` 创建 `src/services/agent/ModelProviderController.ts`，内容如下：

```ts
import { request } from '@umijs/max';
import { ResponseStructure } from '@/services/entity/Common';
import {
  ModelProvider,
  ModelProviderSearchParams,
  ModelProviderStatusParams,
} from '@/services/entity/Agent';

/**
 * @description 获取模型供应商列表
 */
export const getModelProviderList = async (
  params: ModelProviderSearchParams,
): Promise<ResponseStructure<ModelProvider[]>> => {
  return request('/api/agent/model-provider/list', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 获取模型供应商详情
 */
export const getModelProviderInfo = async (
  id: string,
): Promise<ResponseStructure<ModelProvider>> => {
  return request(`/api/agent/model-provider/${id}`, {
    method: 'GET',
  });
};

/**
 * @description 新增模型供应商
 */
export const addModelProviderInfo = async (
  params: ModelProvider,
): Promise<ResponseStructure<ModelProvider>> => {
  return request('/api/agent/model-provider', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 修改模型供应商
 */
export const updateModelProviderInfo = async (
  params: ModelProvider,
): Promise<ResponseStructure<ModelProvider>> => {
  return request(`/api/agent/model-provider/${params.id}`, {
    method: 'PUT',
    data: params,
  });
};

/**
 * @description 删除模型供应商
 */
export const deleteModelProviderInfo = async (
  id: string,
): Promise<ResponseStructure<ModelProvider>> => {
  return request(`/api/agent/model-provider/${id}`, {
    method: 'DELETE',
  });
};

/**
 * @description 启用/禁用模型供应商
 */
export const updateModelProviderStatus = async (
  id: string,
  params: ModelProviderStatusParams,
): Promise<ResponseStructure<ModelProvider>> => {
  return request(`/api/agent/model-provider/${id}/status`, {
    method: 'PUT',
    data: params,
  });
};
```

- [ ] **Step 2: 运行类型检查确认服务层导入和签名正确**

Run: `npm run tsc`

Expected: 服务层新增代码没有 TypeScript 错误；如果存在仓库原有错误，确认错误不来自 `ModelProviderController.ts` 或 `Agent.ts`。

---

### Task 3: 新增模型供应商表单抽屉

**Files:**

- Create: `src/pages/agent/model-provider/ModelProviderForm.tsx`
- Depends on: `src/components/DrawerForm/index.tsx`
- Depends on: `src/services/agent/ModelProviderController.ts`

- [ ] **Step 1: 创建表单组件**

使用 `apply_patch` 创建 `src/pages/agent/model-provider/ModelProviderForm.tsx`，内容如下：

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
  addModelProviderInfo,
  getModelProviderInfo,
  updateModelProviderInfo,
} from '@/services/agent/ModelProviderController';

const typeOptions = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Local', value: 'local' },
];

const statusOptions = [
  { label: '禁用', value: 0 },
  { label: '启用', value: 1 },
];

const ModelProviderForm = (props: {
  id?: string;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const { id, open, setOpen, onSuccess } = props;
  const [form] = Form.useForm();

  return (
    <DrawerForm
      id={id}
      open={open}
      setOpen={setOpen}
      request={async (params) => getModelProviderInfo(params)}
      onSuccess={async (values) => {
        if (id) {
          await updateModelProviderInfo(values);
        } else {
          await addModelProviderInfo(values);
        }
        onSuccess();
        return true;
      }}
      form={form}
    >
      <ProFormText name="id" hidden={true} />
      <ProFormText name="name" label="供应商名称" rules={[{ required: true }]} />
      <ProFormSelect
        name="type"
        label="供应商类型"
        options={typeOptions}
        rules={[{ required: true }]}
      />
      <ProFormText name="apiBaseUrl" label="API 基础地址" rules={[{ required: true }]} />
      <ProFormText.Password
        name="apiKey"
        label="API Key"
        required={!id}
        rules={[{ required: !id }]}
        fieldProps={{ autoComplete: 'new-password' }}
        extra={id ? '留空表示不修改原 API Key' : undefined}
      />
      <ProFormText name="defaultModel" label="默认模型" />
      <ProFormSelect
        name="status"
        label="状态"
        options={statusOptions}
        rules={[{ required: true }]}
      />
      <ProFormDigit name="sort" label="排序" min={0} fieldProps={{ precision: 0 }} />
      <ProFormTextArea name="remark" label="备注" />
    </DrawerForm>
  );
};

export default ModelProviderForm;
```

- [ ] **Step 2: 运行类型检查确认表单组件可编译**

Run: `npm run tsc`

Expected: `ModelProviderForm.tsx` 无 TypeScript 错误；如果 `ProFormDigit` 类型在当前依赖版本不可用，则替换为 `ProFormText` 并保留数字校验规则。

如果需要替换为 `ProFormText`，使用以下字段代码：

```tsx
<ProFormText name="sort" label="排序" />
```

---

### Task 4: 新增模型供应商列表页面

**Files:**

- Create: `src/pages/agent/model-provider/index.tsx`
- Depends on: `src/pages/agent/model-provider/ModelProviderForm.tsx`
- Depends on: `src/services/agent/ModelProviderController.ts`
- Depends on: `src/services/entity/Agent.ts`

- [ ] **Step 1: 创建列表页面组件**

使用 `apply_patch` 创建 `src/pages/agent/model-provider/index.tsx`，内容如下：

```tsx
import React, { useRef, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, message, Popconfirm } from 'antd';
import { FormattedMessage, history, useAccess } from '@@/exports';
import ModelProviderForm from '@/pages/agent/model-provider/ModelProviderForm';
import {
  deleteModelProviderInfo,
  getModelProviderList,
  updateModelProviderStatus,
} from '@/services/agent/ModelProviderController';
import { ModelProvider, ModelProviderSearchParams } from '@/services/entity/Agent';

const typeValueEnum = {
  openai: { text: 'OpenAI' },
  local: { text: 'Local' },
};

const statusValueEnum = {
  0: { text: '禁用', status: 'Default' },
  1: { text: '启用', status: 'Success' },
};

const ModelProviderPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | undefined>(undefined);
  const ref = useRef<ActionType>();
  const permissionMap = useAccess();
  const path = history.location.pathname;
  const write = permissionMap[path];

  const handleDelete = async (record: ModelProvider) => {
    if (!record.id) {
      message.error('缺少模型供应商 ID');
      return;
    }
    const { code, message: msg } = await deleteModelProviderInfo(record.id);
    if (code === 200) {
      message.success(msg || '删除成功');
      ref.current?.reload();
    } else {
      message.error(msg || '删除失败');
    }
  };

  const handleStatusChange = async (record: ModelProvider) => {
    if (!record.id) {
      message.error('缺少模型供应商 ID');
      return;
    }
    const nextStatus = record.status === 1 ? 0 : 1;
    const { code, message: msg } = await updateModelProviderStatus(record.id, {
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
    {
      title: '供应商名称',
      dataIndex: 'name',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      valueType: 'select',
      valueEnum: typeValueEnum,
    },
    {
      title: 'API 基础地址',
      dataIndex: 'apiBaseUrl',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '默认模型',
      dataIndex: 'defaultModel',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusValueEnum,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      valueType: 'text',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      render: (_: any, record: ModelProvider) =>
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
          <Popconfirm
            key="status"
            title={`确认${record.status === 1 ? '禁用' : '启用'}该模型供应商？`}
            onConfirm={() => handleStatusChange(record)}
          >
            <Button type="link" key="status-button">
              {record.status === 1 ? '禁用' : '启用'}
            </Button>
          </Popconfirm>,
          <Popconfirm
            key="delete"
            title="确认删除该模型供应商？"
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
        request={async (params: ModelProviderSearchParams) => getModelProviderList(params)}
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
      <ModelProviderForm
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

export default ModelProviderPage;
```

- [ ] **Step 2: 运行类型检查确认页面可编译**

Run: `npm run tsc`

Expected: `src/pages/agent/model-provider/index.tsx` 无 TypeScript 错误。

- [ ] **Step 3: 检查页面中不包含测试连接入口**

Run: `rg "测试连接|test" src/pages/agent/model-provider src/services/agent/ModelProviderController.ts`

Expected: 没有匹配结果。

---

### Task 5: 注册 Agent 平台路由

**Files:**

- Modify: `config/routes.ts`

- [ ] **Step 1: 在 `config/routes.ts` 中加入 Agent 平台菜单**

使用 `apply_patch` 修改 `config/routes.ts`。在 `/sys` 路由块之后、通配 `*` 路由之前插入：

```ts
  {
    path: '/agent',
    name: 'Agent 平台',
    icon: 'robot',
    routes: [
      {
        path: '/agent/model-provider',
        name: '模型供应商',
        component: './agent/model-provider',
      },
    ],
  },
```

如果当前文件中通配 `*` 路由不是最后一个，需要同时整理顺序，让 `*` 路由位于数组最后，避免新增业务路由被 404 捕获。整理后的尾部结构应为：

```ts
  {
    path: '/user',
    name: 'user',
    routes: [
      {
        path: '/user/member',
        name: 'Member',
        component: './user/member',
      },
    ],
  },
  {
    path: '*',
    layout: false,
    component: './404',
  },
];
```

- [ ] **Step 2: 运行类型检查确认路由配置无语法错误**

Run: `npm run tsc`

Expected: `config/routes.ts` 无语法错误。

---

### Task 6: 最终验证

**Files:**

- Verify: `src/services/entity/Agent.ts`
- Verify: `src/services/agent/ModelProviderController.ts`
- Verify: `src/pages/agent/model-provider/ModelProviderForm.tsx`
- Verify: `src/pages/agent/model-provider/index.tsx`
- Verify: `config/routes.ts`

- [ ] **Step 1: 运行 TypeScript 检查**

Run: `npm run tsc`

Expected: PASS。如果失败，确认失败是否由本次新增文件引起。由本次新增文件引起的错误必须修复；历史无关错误记录在最终说明中。

- [ ] **Step 2: 检查 API Key 没有出现在列表页列定义中**

Run: `rg "apiKey" src/pages/agent/model-provider/index.tsx`

Expected: 没有匹配结果。

- [ ] **Step 3: 检查 API Key 只在表单中作为密码字段出现**

Run: `rg "apiKey|Password|留空表示不修改原 API Key" src/pages/agent/model-provider/ModelProviderForm.tsx`

Expected: 输出包含 `apiKey`、`ProFormText.Password` 和 `留空表示不修改原 API Key`。

- [ ] **Step 4: 检查服务层接口路径与文档一致**

Run: `rg "/api/agent/model-provider" src/services/agent/ModelProviderController.ts`

Expected: 输出包含 `/list`、详情路径、创建路径、更新路径、删除路径和 `/status` 路径；不包含 `/test`。

- [ ] **Step 5: 检查路由已注册**

Run: `rg "Agent 平台|/agent/model-provider|./agent/model-provider" config/routes.ts`

Expected: 输出包含 Agent 平台菜单、模型供应商路径和组件路径。

---

## 自检结果

- 规格覆盖：计划覆盖实体、服务层、列表页、表单抽屉、路由、权限控制、API Key 不展示、新增必填、编辑可空、启用/禁用、删除和无测试连接按钮。
- 占位扫描：计划中没有需要执行者自行补全的 TODO/TBD。
- 类型一致性：`ModelProvider`、`ModelProviderSearchParams`、`ModelProviderStatusParams`、服务函数名和页面导入名保持一致。
