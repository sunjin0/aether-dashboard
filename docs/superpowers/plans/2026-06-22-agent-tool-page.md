# 工具管理页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/agent/tool` Tool Management page for HTTP tool CRUD, without exposing the backend placeholder test-tool API.

**Architecture:** Follow the existing Agent platform CRUD pattern: entity types in `src/services/entity/Agent.ts`, API wrappers in `src/services/agent/ToolController.ts`, a `PageContainer + ProTable` list page, and a `DrawerForm`-based add/edit form. Tool enable/disable uses the documented detail and update APIs because the backend documentation does not define a separate status endpoint.

**Tech Stack:** Umi Max, React, TypeScript, Ant Design, Ant Design Pro Components, `@umijs/max` request.

---

## File Structure

- Modify: `src/services/entity/Agent.ts`
  - Add `AgentTool` and `AgentToolSearchParams` interfaces.
- Create: `src/services/agent/ToolController.ts`
  - Wrap documented tool CRUD APIs.
- Create: `src/pages/agent/tool/AgentToolForm.tsx`
  - Drawer form for add/edit tool configuration.
- Create: `src/pages/agent/tool/index.tsx`
  - Tool list, query, add, edit, delete, enable, disable.
- Modify: `config/routes.ts`
  - Register `/agent/tool` under `Agent 平台`.

---

### Task 1: Add Tool Entity Types

**Files:**
- Modify: `src/services/entity/Agent.ts`

- [ ] **Step 1: Add interfaces after `AgentMessageSearchParams`**

Append this code to `src/services/entity/Agent.ts` after the existing `AgentMessageSearchParams` interface:

```ts

/**
 * @description Agent 工具
 */
export interface AgentTool {
  id?: string;
  name?: string;
  code?: string;
  description?: string;
  type?: string;
  httpMethod?: string;
  httpUrl?: string;
  httpHeaders?: string;
  httpBodyTemplate?: string;
  responseExtractRule?: string;
  timeoutMs?: number;
  cacheTtlSeconds?: number;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @description Agent 工具查询参数
 */
export interface AgentToolSearchParams extends AgentTool {
  current?: number;
  pageSize?: number;
}
```

- [ ] **Step 2: Verify type names are present**

Run: `rg "interface AgentTool|interface AgentToolSearchParams" src/services/entity/Agent.ts`

Expected: Both interfaces are found.

---

### Task 2: Add Tool Service Controller

**Files:**
- Create: `src/services/agent/ToolController.ts`

- [ ] **Step 1: Create service file**

Create `src/services/agent/ToolController.ts` with this content:

```ts
import {request} from '@umijs/max';
import {ResponseStructure} from '@/services/entity/Common';
import {AgentTool, AgentToolSearchParams} from '@/services/entity/Agent';

/**
 * @description 获取 Agent 工具列表
 */
export const getAgentToolList = async (
  params: AgentToolSearchParams,
): Promise<ResponseStructure<AgentTool[]>> => {
  return request('/api/agent/tool/list', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 获取 Agent 工具详情
 */
export const getAgentToolInfo = async (id: string): Promise<ResponseStructure<AgentTool>> => {
  return request(`/api/agent/tool/${id}`, {
    method: 'GET',
  });
};

/**
 * @description 新增 Agent 工具
 */
export const addAgentToolInfo = async (
  params: AgentTool,
): Promise<ResponseStructure<AgentTool>> => {
  return request('/api/agent/tool', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 修改 Agent 工具
 */
export const updateAgentToolInfo = async (
  params: AgentTool,
): Promise<ResponseStructure<AgentTool>> => {
  return request(`/api/agent/tool/${params.id}`, {
    method: 'PUT',
    data: params,
  });
};

/**
 * @description 删除 Agent 工具
 */
export const deleteAgentToolInfo = async (id: string): Promise<ResponseStructure<AgentTool>> => {
  return request(`/api/agent/tool/${id}`, {
    method: 'DELETE',
  });
};
```

- [ ] **Step 2: Verify service paths**

Run: `rg "/api/agent/tool" src/services/agent/ToolController.ts`

Expected: Finds `/api/agent/tool/list`, `/api/agent/tool/${id}`, and `/api/agent/tool`.

- [ ] **Step 3: Verify test endpoint is absent**

Run: `rg "test|/test" src/services/agent/ToolController.ts`

Expected: No matches.

---

### Task 3: Add Tool Drawer Form

**Files:**
- Create: `src/pages/agent/tool/AgentToolForm.tsx`

- [ ] **Step 1: Create form component**

Create `src/pages/agent/tool/AgentToolForm.tsx` with this content:

```tsx
import DrawerForm from '@/components/DrawerForm';
import {
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import {Form} from 'antd';
import {
  addAgentToolInfo,
  getAgentToolInfo,
  updateAgentToolInfo,
} from '@/services/agent/ToolController';

const typeOptions = [{label: 'HTTP', value: 'http'}];

const httpMethodOptions = [
  {label: 'GET', value: 'GET'},
  {label: 'POST', value: 'POST'},
];

const statusOptions = [
  {label: '禁用', value: 0},
  {label: '启用', value: 1},
];

const AgentToolForm = (props: {
  id?: string;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const {id, open, setOpen, onSuccess} = props;
  const [form] = Form.useForm();

  return (
    <DrawerForm
      id={id || ''}
      open={open}
      setOpen={setOpen}
      request={async (params) => getAgentToolInfo(params)}
      onSuccess={async (values) => {
        if (id) {
          await updateAgentToolInfo(values);
        } else {
          await addAgentToolInfo(values);
        }
        onSuccess();
        return true;
      }}
      form={form}
    >
      <ProFormText name="id" hidden={true} />
      <ProFormText name="name" label="工具名称" rules={[{required: true}]} />
      <ProFormText name="code" label="工具编码" rules={[{required: true}]} />
      <ProFormTextArea name="description" label="描述" />
      <ProFormSelect
        name="type"
        label="工具类型"
        options={typeOptions}
        rules={[{required: true}]}
        initialValue="http"
      />
      <ProFormSelect name="httpMethod" label="HTTP 方法" options={httpMethodOptions} />
      <ProFormText name="httpUrl" label="HTTP URL" />
      <ProFormTextArea
        name="httpHeaders"
        label="HTTP Headers"
        fieldProps={{placeholder: '请输入 JSON 字符串模板'}}
      />
      <ProFormTextArea name="httpBodyTemplate" label="请求体模板" />
      <ProFormTextArea name="responseExtractRule" label="响应提取规则" />
      <ProFormDigit
        name="timeoutMs"
        label="超时时间(ms)"
        min={0}
        fieldProps={{precision: 0}}
      />
      <ProFormDigit
        name="cacheTtlSeconds"
        label="缓存 TTL(s)"
        min={0}
        fieldProps={{precision: 0}}
      />
      <ProFormSelect
        name="status"
        label="状态"
        options={statusOptions}
        rules={[{required: true}]}
        initialValue={1}
      />
    </DrawerForm>
  );
};

export default AgentToolForm;
```

- [ ] **Step 2: Verify no JSON validation was added**

Run: `rg "JSON\.parse|validator|rules=\{\[\{validator" src/pages/agent/tool/AgentToolForm.tsx`

Expected: No matches.

---

### Task 4: Add Tool List Page

**Files:**
- Create: `src/pages/agent/tool/index.tsx`

- [ ] **Step 1: Create page component**

Create `src/pages/agent/tool/index.tsx` with this content:

```tsx
import React, {useRef, useState} from 'react';
import {PlusOutlined} from '@ant-design/icons';
import {ActionType, PageContainer, ProTable} from '@ant-design/pro-components';
import {Button, message, Popconfirm} from 'antd';
import {FormattedMessage, history, useAccess} from '@@/exports';
import AgentToolForm from '@/pages/agent/tool/AgentToolForm';
import {
  deleteAgentToolInfo,
  getAgentToolInfo,
  getAgentToolList,
  updateAgentToolInfo,
} from '@/services/agent/ToolController';
import {AgentTool, AgentToolSearchParams} from '@/services/entity/Agent';

const typeValueEnum = {
  http: {text: 'HTTP'},
};

const httpMethodValueEnum = {
  GET: {text: 'GET'},
  POST: {text: 'POST'},
};

const statusValueEnum = {
  0: {text: '禁用', status: 'Default'},
  1: {text: '启用', status: 'Success'},
};

const AgentToolPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | undefined>(undefined);
  const ref = useRef<ActionType>();
  const permissionMap = useAccess();
  const path = history.location.pathname;
  const write = permissionMap[path];

  const handleDelete = async (record: AgentTool) => {
    if (!record.id) {
      message.error('缺少工具 ID');
      return;
    }

    const {code, message: msg} = await deleteAgentToolInfo(record.id);
    if (code === 200) {
      message.success(msg || '删除成功');
      ref.current?.reload();
    } else {
      message.error(msg || '删除失败');
    }
  };

  const handleStatusChange = async (record: AgentTool) => {
    if (!record.id) {
      message.error('缺少工具 ID');
      return;
    }

    const nextStatus = record.status === 1 ? 0 : 1;
    const detail = await getAgentToolInfo(record.id);
    if (detail.code !== 200 || !detail.data) {
      message.error(detail.message || '获取工具详情失败');
      return;
    }

    const {code, message: msg} = await updateAgentToolInfo({
      ...detail.data,
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
      title: '工具名称',
      dataIndex: 'name',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '工具编码',
      dataIndex: 'code',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '工具类型',
      dataIndex: 'type',
      valueType: 'select',
      valueEnum: typeValueEnum,
    },
    {
      title: 'HTTP 方法',
      dataIndex: 'httpMethod',
      valueType: 'select',
      valueEnum: httpMethodValueEnum,
    },
    {
      title: 'HTTP URL',
      dataIndex: 'httpUrl',
      valueType: 'text',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '超时时间(ms)',
      dataIndex: 'timeoutMs',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusValueEnum,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentTool) =>
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
            title={`确认${record.status === 1 ? '禁用' : '启用'}该工具？`}
            onConfirm={() => handleStatusChange(record)}
          >
            <Button type="link" key="status-button">
              {record.status === 1 ? '禁用' : '启用'}
            </Button>
          </Popconfirm>,
          <Popconfirm key="delete" title="确认删除该工具？" onConfirm={() => handleDelete(record)}>
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
        request={async (params: AgentToolSearchParams) => getAgentToolList(params)}
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
      <AgentToolForm
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

export default AgentToolPage;
```

- [ ] **Step 2: Verify test-tool action is absent**

Run: `rg "测试工具|test|/test" src/pages/agent/tool`

Expected: No matches.

- [ ] **Step 3: Verify status change uses detail plus update**

Run: `rg "getAgentToolInfo|updateAgentToolInfo" src/pages/agent/tool/index.tsx`

Expected: Both function names are found in `index.tsx`.

---

### Task 5: Register Route

**Files:**
- Modify: `config/routes.ts`

- [ ] **Step 1: Add route under Agent platform**

In `config/routes.ts`, add this route under the existing `/agent/definition` route and before `/agent/chat`:

```ts
      {
        path: '/agent/tool',
        name: '工具管理',
        component: './agent/tool',
      },
```

Expected local route order under `/agent`:

```ts
    routes: [
      {
        path: '/agent/model-provider',
        name: '模型供应商',
        component: './agent/model-provider',
      },
      {
        path: '/agent/definition',
        name: 'Agent 定义',
        component: './agent/definition',
      },
      {
        path: '/agent/tool',
        name: '工具管理',
        component: './agent/tool',
      },
      {
        path: '/agent/chat',
        name: 'Chat 调试',
        component: './agent/chat',
      },
    ],
```

- [ ] **Step 2: Verify route is registered**

Run: `rg "/agent/tool|工具管理|./agent/tool" config/routes.ts`

Expected: All three strings are found.

---

### Task 6: Verify Implementation

**Files:**
- Inspect: `src/services/entity/Agent.ts`
- Inspect: `src/services/agent/ToolController.ts`
- Inspect: `src/pages/agent/tool/AgentToolForm.tsx`
- Inspect: `src/pages/agent/tool/index.tsx`
- Inspect: `config/routes.ts`

- [ ] **Step 1: Run TypeScript check**

Run: `npm run tsc`

Expected: Either PASS, or FAIL only with the known baseline errors:

```text
src/pages/user/member/index.tsx(78,29): error TS2345: Argument of type 'Record<any, any>' is not assignable to parameter of type 'MemberSearchParams'.
src/requestErrorConfig.ts(107,5): error TS2322: Type '(response: ResponseStructure<any>) => ResponseStructure<any>' is not assignable to type 'IResponseInterceptorTuple'.
```

- [ ] **Step 2: Verify no test-tool API is exposed**

Run: `rg "测试工具|/api/agent/tool/.*/test|/test" src/pages/agent/tool src/services/agent/ToolController.ts`

Expected: No matches.

- [ ] **Step 3: Verify CRUD paths**

Run: `rg "/api/agent/tool" src/services/agent/ToolController.ts`

Expected: Finds only CRUD paths for list, detail, create, update, and delete.

- [ ] **Step 4: Verify route**

Run: `rg "/agent/tool|工具管理|./agent/tool" config/routes.ts`

Expected: Finds the route path, menu name, and component path.

- [ ] **Step 5: Review git status**

Run: `git status --short`

Expected: Shows the intended new and modified files. Do not revert unrelated existing changes such as `src/app.tsx` or `docs/FRONTEND.md`.

---

## Notes For Executor

- Do not commit. The user previously requested no commits for this workflow.
- Use `apply_patch` for manual edits.
- Keep the page aligned with existing Agent CRUD files rather than introducing a new abstraction.
- Do not add compatibility code or placeholder UI for tool testing.
