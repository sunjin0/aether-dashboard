# Admin Preference Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the admin preference frontend from the old `category+content` model to the new structured preference system with keyName, value, description, priority, scope, decay, and feedback APIs.

**Architecture:** Update the service layer types and API functions first, then update the form component, then update the list page with new columns/filters/actions, and finally update tests.

**Tech Stack:** React, TypeScript, Ant Design Pro (ProTable, ProForm\*), @umijs/max request

---

## File Structure

| File | Role |
| --- | --- |
| `src/services/sys/AdminPreferenceController.ts` | API service + TypeScript interfaces (modify) |
| `src/pages/sys/admin-preference/PreferenceForm.tsx` | Create/edit drawer form (modify) |
| `src/pages/sys/admin-preference/index.tsx` | List page component (modify) |
| `src/services/sys/AdminPreferenceController.test.ts` | Unit tests (modify) |

---

### Task 1: Update Service Layer Types and API Functions

**Files:**

- Modify: `src/services/sys/AdminPreferenceController.ts:1-51`

- [ ] **Step 1: Update the AdminPreference interface**

Replace the entire interface block (lines 4-15) with the new structured fields:

```typescript
export interface AdminPreference {
  id?: string;
  adminId?: string;
  category?: string;
  keyName?: string;
  value?: string;
  description?: string;
  priority?: number;
  scope?: string;
  scopeDetail?: string;
  source?: string;
  confidence?: number;
  usageCount?: number;
  lastUsedAt?: number;
  expiresAt?: number;
  decayRate?: number;
  effectiveScore?: number;
  status?: number;
  createdAt?: number;
  updatedAt?: number;
}
```

- [ ] **Step 2: Update AdminPreferenceSearchParams**

Replace the search params interface (lines 17-20):

```typescript
export interface AdminPreferenceSearchParams {
  current?: number;
  pageSize?: number;
  category?: string;
  keyName?: string;
  value?: string;
  status?: number;
}
```

- [ ] **Step 3: Add new API functions for feedback and override**

Append after the `updateAdminPreferenceStatus` function (after line 51):

```typescript
export const confirmAdminPreference = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/sys/admin/preference/${id}/feedback`, { method: 'POST' });

export const rejectAdminPreference = async (id: string): Promise<ResponseStructure<void>> =>
  request(`/api/sys/admin/preference/${id}/feedback`, { method: 'DELETE' });

export const overrideAdminPreference = async (
  id: string,
  params: { value: string },
): Promise<ResponseStructure<void>> =>
  request(`/api/sys/admin/preference/${id}/override`, { method: 'PUT', data: params });
```

- [ ] **Step 4: Verify the file compiles**

Run: `npx tsc --noEmit src/services/sys/AdminPreferenceController.ts` Expected: No errors

---

### Task 2: Update PreferenceForm Component

**Files:**

- Modify: `src/pages/sys/admin-preference/PreferenceForm.tsx:1-76`

- [ ] **Step 1: Replace imports and add constants**

Replace lines 1-14 with:

```typescript
import DrawerForm from '@/components/DrawerForm';
import {
  addAdminPreference,
  getAdminPreference,
  updateAdminPreference,
} from '@/services/sys/AdminPreferenceController';
import {
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Form } from 'antd';
import dayjs from 'dayjs';

const CATEGORY_OPTIONS = [
  { label: '语言', value: 'language' },
  { label: '表达风格', value: 'style' },
  { label: '输出格式', value: 'format' },
  { label: '技术栈', value: 'tech_stack' },
  { label: '工具策略', value: 'tool_strategy' },
];

const SCOPE_OPTIONS = [
  { label: '全局', value: 'global' },
  { label: '会话', value: 'session' },
  { label: '任务类型', value: 'task_type' },
];
```

- [ ] **Step 2: Replace the form body**

Replace lines 40-71 (the form fields inside `<DrawerForm>`) with:

```typescript
      <ProFormSelect
        name="category"
        label="分类"
        rules={[{ required: true, message: '请选择分类' }]}
        options={CATEGORY_OPTIONS}
        fieldProps={{ showSearch: true }}
      />
      <ProFormText
        name="keyName"
        label="键名"
        rules={[{ required: true, message: '请输入键名' }]}
        placeholder="如 output_length"
      />
      <ProFormText
        name="value"
        label="偏好值"
        rules={[{ required: true, message: '请输入偏好值' }]}
        placeholder="如 简洁"
      />
      <ProFormTextArea
        name="description"
        label="描述"
        fieldProps={{ rows: 3, maxLength: 500, showCount: true }}
      />
      <ProFormSelect
        name="scope"
        label="作用域"
        initialValue="global"
        options={SCOPE_OPTIONS}
      />
      <ProFormText
        name="scopeDetail"
        label="任务类型"
        placeholder="如 code_review、document_generation"
        dependencies={[['scope']]}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (getFieldValue('scope') === 'task_type' && !value) {
                return Promise.reject(new Error('scope 为 task_type 时必须填写任务类型'))
              }
              return Promise.resolve()
            },
          }),
        ]}
      />
      <ProFormDigit
        name="priority"
        label="优先级"
        initialValue={50}
        min={0}
        max={100}
        fieldProps={{ precision: 0 }}
      />
      <ProFormText
        name="expiresAt"
        label="过期时间"
        placeholder="留空表示永不过期"
        fieldProps={{
          showTime: true,
          format: 'YYYY-MM-DD HH:mm:ss',
        }}
        valuePropName="value"
        transform={(value) => ({
          expiresAt: value ? dayjs(value).valueOf() : null,
        })}
      />
      <ProFormDigit
        name="decayRate"
        label="衰减率"
        initialValue={0}
        min={0}
        max={0.1}
        fieldProps={{ precision: 2, step: 0.01 }}
      />
      <ProFormSelect
        name="status"
        label="状态"
        initialValue={1}
        rules={[{ required: true }]}
        options={[
          { label: '启用', value: 1 },
          { label: '禁用', value: 0 },
        ]}
      />
```

- [ ] **Step 3: Update the onSuccess handler**

Replace lines 33-38 with:

```typescript
      onSuccess={async (values) => {
        const payload = {
          ...values,
          status: Number(values.status),
          priority: Number(values.priority),
          decayRate: Number(values.decayRate),
          expiresAt: values.expiresAt || null,
          scopeDetail: values.scope === 'task_type' ? values.scopeDetail : null,
        }
        if (id) await updateAdminPreference({ ...payload, id })
        else await addAdminPreference(payload)
        onSuccess()
        return true
      }}
```

- [ ] **Step 4: Verify the file compiles**

Run: `npx tsc --noEmit src/pages/sys/admin-preference/PreferenceForm.tsx` Expected: No errors

---

### Task 3: Update List Page Columns and Filters

**Files:**

- Modify: `src/pages/sys/admin-preference/index.tsx:1-151`

- [ ] **Step 1: Replace imports**

Replace lines 1-15 with:

```typescript
import PreferenceForm from '@/pages/sys/admin-preference/PreferenceForm';
import {
  AdminPreference,
  AdminPreferenceSearchParams,
  confirmAdminPreference,
  deleteAdminPreference,
  getAdminPreferenceList,
  rejectAdminPreference,
  overrideAdminPreference,
  updateAdminPreferenceStatus,
} from '@/services/sys/AdminPreferenceController';
import { PlusOutlined } from '@ant-design/icons';
import { ActionType, PageContainer, ProTable } from '@ant-design/pro-components';
import { history, useAccess } from '@@/exports';
import { Alert, Button, Input, message, Popconfirm, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { getSwitchStatus } from '@/pages/agent/knowledge-base/status';
import dayjs from 'dayjs';

const CATEGORY_MAP: Record<string, string> = {
  language: '语言',
  style: '表达风格',
  format: '输出格式',
  tech_stack: '技术栈',
  tool_strategy: '工具策略',
};

const SCOPE_MAP: Record<string, string> = {
  global: '全局',
  session: '会话',
  task_type: '任务类型',
};

const SOURCE_MAP: Record<string, { label: string; color: string }> = {
  explicit: { label: '手动', color: 'blue' },
  implicit: { label: '自动学习', color: 'orange' },
  manual_override: { label: '手动覆盖', color: 'purple' },
};
```

- [ ] **Step 2: Add override modal state and helper**

After line 20 (`const [id, setId] = useState<string>()`), add:

```typescript
const [overrideId, setOverrideId] = useState<string>();
const [overrideValue, setOverrideValue] = useState('');
```

- [ ] **Step 3: Add confirm/reject/override handler functions**

After the `updateStatus` function (after line 33), add:

```typescript
const handleConfirm = async (record: AdminPreference) => {
  if (!record.id) return;
  const response = await confirmAdminPreference(record.id);
  if (response.code === 200) {
    message.success(response.message || '确认成功');
    ref.current?.reload();
  } else message.error(response.message || '操作失败');
};

const handleReject = async (record: AdminPreference) => {
  if (!record.id) return;
  const response = await rejectAdminPreference(record.id);
  if (response.code === 200) {
    message.success(response.message || '已拒绝');
    ref.current?.reload();
  } else message.error(response.message || '操作失败');
};

const handleOverride = async () => {
  if (!overrideId || !overrideValue.trim()) {
    message.warning('请输入新值');
    return;
  }
  const response = await overrideAdminPreference(overrideId, { value: overrideValue.trim() });
  if (response.code === 200) {
    message.success(response.message || '覆盖成功');
    setOverrideId(undefined);
    setOverrideValue('');
    ref.current?.reload();
  } else message.error(response.message || '操作失败');
};
```

- [ ] **Step 4: Replace the columns array**

Replace lines 35-107 with the new columns:

```typescript
  const columns: any[] = [
    {
      title: '分类',
      dataIndex: 'category',
      valueType: 'select',
      width: 100,
      fieldProps: { options: Object.entries(CATEGORY_MAP).map(([v, l]) => ({ label: l, value: v })) },
      render: (_: unknown, record: AdminPreference) => CATEGORY_MAP[record.category || ''] || record.category,
    },
    {
      title: '键名',
      dataIndex: 'keyName',
      width: 140,
      ellipsis: true,
      render: (_: unknown, record: AdminPreference) => (
        <code style={{ fontSize: 12 }}>{record.keyName}</code>
      ),
    },
    { title: '偏好值', dataIndex: 'value', width: 180, ellipsis: true },
    {
      title: '描述',
      dataIndex: 'description',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 80,
      hideInSearch: true,
      sorter: true,
    },
    {
      title: '作用域',
      dataIndex: 'scope',
      width: 100,
      valueType: 'select',
      fieldProps: { options: Object.entries(SCOPE_MAP).map(([v, l]) => ({ label: l, value: v })) },
      render: (_: unknown, record: AdminPreference) => {
        const scope = record.scope || 'global'
        if (scope === 'task_type' && record.scopeDetail) {
          return `任务类型: ${record.scopeDetail}`
        }
        return SCOPE_MAP[scope] || scope
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 80,
      hideInSearch: true,
      render: (_: unknown, record: AdminPreference) => {
        const source = SOURCE_MAP[record.source || 'explicit']
        return <Tag color={source.color}>{source.label}</Tag>
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      width: 80,
      hideInSearch: true,
      sorter: true,
      render: (_: unknown, record: AdminPreference) => {
        const val = record.confidence ?? 0
        const color = val >= 0.7 ? 'green' : val >= 0.3 ? 'orange' : 'red'
        return <span style={{ color }}>{(val * 100).toFixed(0)}%</span>
      },
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      width: 80,
      hideInSearch: true,
      sorter: true,
    },
    {
      title: '有效分数',
      dataIndex: 'effectiveScore',
      width: 80,
      hideInSearch: true,
      sorter: true,
      render: (_: unknown, record: AdminPreference) => record.effectiveScore?.toFixed(1) || '-',
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      width: 120,
      hideInSearch: true,
      sorter: true,
      render: (_: unknown, record: AdminPreference) =>
        record.lastUsedAt ? dayjs(record.lastUsedAt).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      valueType: 'select',
      valueEnum: { 0: { text: '禁用' }, 1: { text: '启用' } },
      render: (_: unknown, record: AdminPreference) => {
        const item = getSwitchStatus(record.status)
        return <Tag color={item.color}>{item.label}</Tag>
      },
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      fixed: 'right',
      width: 200,
      render: (_: unknown, record: AdminPreference) =>
        write && [
          <Button
            key="edit"
            type="link"
            onClick={() => {
              setId(record.id)
              setOpen(true)
            }}
          >
            编辑
          </Button>,
          record.source === 'implicit' && record.status === 1 && (
            <Button key="confirm" type="link" style={{ color: '#52c41a' }} onClick={() => handleConfirm(record)}>
              确认
            </Button>
          ),
          record.source === 'implicit' && record.status === 1 && (
            <Popconfirm
              key="reject"
              title="拒绝后该偏好将被降低置信度，确认拒绝？"
              onConfirm={() => handleReject(record)}
            >
              <Button type="link" danger>
                拒绝
              </Button>
            </Popconfirm>
          ),
          record.status === 1 && (
            <Button
              key="override"
              type="link"
              onClick={() => {
                setOverrideId(record.id)
                setOverrideValue(record.value || '')
              }}
            >
              覆盖
            </Button>
          ),
          <Popconfirm
            key="delete"
            title="确认删除该偏好？"
            onConfirm={async () => {
              if (!record.id) return
              const response = await deleteAdminPreference(record.id)
              if (response.code === 200) {
                message.success(response.message || '删除成功')
                ref.current?.reload()
              } else message.error(response.message || '删除失败')
            }}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>,
        ],
    },
  ]
```

- [ ] **Step 5: Replace the return JSX**

Replace lines 109-148 with:

```typescript
  return (
    <PageContainer>
      <Alert
        showIcon
        type="info"
        message="系统会在聊天后自动提取长期偏好。启用的偏好会在后续聊天中作为上下文参考。"
        style={{ marginBottom: 16 }}
      />
      <ProTable<AdminPreference>
        actionRef={ref}
        rowKey="id"
        columns={columns}
        request={(params: AdminPreferenceSearchParams) => getAdminPreferenceList(params)}
        toolBarRender={() =>
          write && [
            <Button
              key="new"
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                setId(undefined)
                setOpen(true)
              }}
            >
              新增偏好
            </Button>,
          ]
        }
      />
      <PreferenceForm
        id={id}
        open={open}
        setOpen={setOpen}
        onSuccess={() => {
          setId(undefined)
          ref.current?.reload()
        }}
      />
      {overrideId && (
        <div style={{ display: 'none' }}>
          {/* Override modal trigger - using Popconfirm pattern */}
        </div>
      )}
      <Popconfirm
        title="覆盖偏好值"
        description={
          <div>
            <div style={{ marginBottom: 8 }}>新值：</div>
            <Input
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
              placeholder="请输入新的偏好值"
            />
          </div>
        }
        open={!!overrideId}
        onConfirm={handleOverride}
        onCancel={() => {
          setOverrideId(undefined)
          setOverrideValue('')
        }}
        okText="确认覆盖"
        cancelText="取消"
      >
        <span />
      </Popconfirm>
    </PageContainer>
  )
```

- [ ] **Step 6: Verify the file compiles**

Run: `npx tsc --noEmit src/pages/sys/admin-preference/index.tsx` Expected: No errors

---

### Task 4: Update Unit Tests

**Files:**

- Modify: `src/services/sys/AdminPreferenceController.test.ts:1-57`

- [ ] **Step 1: Update imports and add new functions**

Replace lines 1-9 with:

```typescript
import { request } from '@umijs/max';
import {
  addAdminPreference,
  confirmAdminPreference,
  deleteAdminPreference,
  getAdminPreference,
  getAdminPreferenceList,
  overrideAdminPreference,
  rejectAdminPreference,
  updateAdminPreference,
  updateAdminPreferenceStatus,
} from './AdminPreferenceController';
```

- [ ] **Step 2: Update the test case**

Replace lines 22-56 with:

```typescript
it('uses documented user preference endpoints', async () => {
  await getAdminPreferenceList({
    current: 1,
    pageSize: 20,
    category: 'style',
    keyName: 'output_length',
  });
  await getAdminPreference('preference-1');
  await addAdminPreference({
    category: 'style',
    keyName: 'output_length',
    value: '简洁',
    status: 1,
  });
  await updateAdminPreference({
    id: 'preference-1',
    category: 'style',
    keyName: 'output_length',
    value: '详细',
  });
  await updateAdminPreferenceStatus('preference-1', { status: 0 });
  await confirmAdminPreference('preference-1');
  await rejectAdminPreference('preference-1');
  await overrideAdminPreference('preference-1', { value: '详细' });
  await deleteAdminPreference('preference-1');

  expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/sys/admin/preference/list', {
    method: 'POST',
    data: { current: 1, pageSize: 20, category: 'style', keyName: 'output_length' },
  });
  expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/sys/admin/preference/preference-1', {
    method: 'GET',
  });
  expect(mockedRequest).toHaveBeenNthCalledWith(3, '/api/sys/admin/preference', {
    method: 'POST',
    data: { category: 'style', keyName: 'output_length', value: '简洁', status: 1 },
  });
  expect(mockedRequest).toHaveBeenNthCalledWith(4, '/api/sys/admin/preference/preference-1', {
    method: 'PUT',
    data: { id: 'preference-1', category: 'style', keyName: 'output_length', value: '详细' },
  });
  expect(mockedRequest).toHaveBeenNthCalledWith(
    5,
    '/api/sys/admin/preference/preference-1/status',
    {
      method: 'PUT',
      data: { status: 0 },
    },
  );
  expect(mockedRequest).toHaveBeenNthCalledWith(
    6,
    '/api/sys/admin/preference/preference-1/feedback',
    {
      method: 'POST',
    },
  );
  expect(mockedRequest).toHaveBeenNthCalledWith(
    7,
    '/api/sys/admin/preference/preference-1/feedback',
    {
      method: 'DELETE',
    },
  );
  expect(mockedRequest).toHaveBeenNthCalledWith(
    8,
    '/api/sys/admin/preference/preference-1/override',
    {
      method: 'PUT',
      data: { value: '详细' },
    },
  );
  expect(mockedRequest).toHaveBeenNthCalledWith(9, '/api/sys/admin/preference/preference-1', {
    method: 'DELETE',
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm run test -- --testPathPattern=AdminPreferenceController` Expected: All tests pass

---

### Task 5: Run Full Verification

- [ ] **Step 1: Run lint**

Run: `npm run lint` Expected: No errors

- [ ] **Step 2: Run type check**

Run: `npm run tsc` Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `npm run test` Expected: All tests pass
