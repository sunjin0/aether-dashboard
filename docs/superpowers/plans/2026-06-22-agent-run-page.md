# Agent Run Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only Agent run-record audit page at `/agent/run` with list search and a detail drawer.

**Architecture:** Follow the existing Agent resource pattern: shared entity types in `src/services/entity/Agent.ts`, request wrappers in `src/services/agent/RunController.ts`, route registration in `config/routes.ts`, and a single page component in `src/pages/agent/run/index.tsx`. The page uses `PageContainer + ProTable + Drawer + ProDescriptions`, with pure-text blocks for audit content and errors.

**Tech Stack:** Umi Max, React, TypeScript, Ant Design, Ant Design Pro Components, Jest, `@umijs/max` request.

---

## File Structure

- Modify: `src/services/entity/Agent.ts`
  - Add `AgentRun` and `AgentRunSearchParams` interfaces.
- Create: `src/services/agent/RunController.ts`
  - Add list and detail request wrappers.
- Create: `src/services/agent/RunController.test.ts`
  - Verify documented run-record endpoints and request methods.
- Create: `src/pages/agent/run/index.tsx`
  - Implement read-only list and detail drawer.
- Create: `src/pages/agent/run/index.less`
  - Add small scoped styles for long text blocks and page note.
- Modify: `config/routes.ts`
  - Register `/agent/run` under `Agent 平台`.

---

### Task 1: Add Agent Run Types

**Files:**

- Modify: `src/services/entity/Agent.ts`

- [ ] **Step 1: Add `AgentRun` and `AgentRunSearchParams` after `AgentMessageSearchParams`**

Insert this code after the existing `AgentMessageSearchParams` interface:

```ts
/**
 * @description Agent 运行记录
 */
export interface AgentRun {
  id?: string;
  agentDefinitionId?: string;
  userId?: string;
  conversationId?: string;
  messageId?: string;
  inputContent?: string;
  outputContent?: string;
  model?: string;
  modelProviderId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  status?: number;
  errorMsg?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @description Agent 运行记录查询参数
 */
export interface AgentRunSearchParams extends AgentRun {
  current?: number;
  pageSize?: number;
}
```

- [ ] **Step 2: Verify the type names exist once**

Run: `rg "interface AgentRun|interface AgentRunSearchParams" src/services/entity/Agent.ts`

Expected: two matches, one for `AgentRun` and one for `AgentRunSearchParams`.

---

### Task 2: Add Run Controller Tests First

**Files:**

- Create: `src/services/agent/RunController.test.ts`

- [ ] **Step 1: Create the failing endpoint test**

Create `src/services/agent/RunController.test.ts` with:

```ts
import { request } from '@umijs/max';
import { getAgentRunInfo, getAgentRunList } from './RunController';

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe('RunController', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null });
  });

  it('uses documented run record endpoints', async () => {
    await getAgentRunList({
      current: 1,
      pageSize: 20,
      agentDefinitionId: 'agent-1',
      status: 1,
    });
    await getAgentRunInfo('run-1');

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/run/list', {
      method: 'POST',
      data: {
        current: 1,
        pageSize: 20,
        agentDefinitionId: 'agent-1',
        status: 1,
      },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/run/run-1', {
      method: 'GET',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails before implementation**

Run: `npm run test -- src/services/agent/RunController.test.ts`

Expected: FAIL because `./RunController` does not exist or exported functions are missing.

---

### Task 3: Implement Run Controller

**Files:**

- Create: `src/services/agent/RunController.ts`
- Test: `src/services/agent/RunController.test.ts`

- [ ] **Step 1: Create the controller implementation**

Create `src/services/agent/RunController.ts` with:

```ts
import { request } from '@umijs/max';
import { ResponseStructure } from '@/services/entity/Common';
import { AgentRun, AgentRunSearchParams } from '@/services/entity/Agent';

/**
 * @description 获取 Agent 运行记录列表
 */
export const getAgentRunList = async (
  params: AgentRunSearchParams,
): Promise<ResponseStructure<AgentRun[]>> => {
  return request('/api/agent/run/list', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 获取 Agent 运行记录详情
 */
export const getAgentRunInfo = async (id: string): Promise<ResponseStructure<AgentRun>> => {
  return request(`/api/agent/run/${id}`, {
    method: 'GET',
  });
};
```

- [ ] **Step 2: Run the controller test**

Run: `npm run test -- src/services/agent/RunController.test.ts`

Expected: PASS with one passing test suite.

---

### Task 4: Register the Route

**Files:**

- Modify: `config/routes.ts`

- [ ] **Step 1: Add the route under `Agent 平台`**

In `config/routes.ts`, add this object after the Chat route or before it if you want the menu order to follow the docs:

```ts
      {
        path: '/agent/run',
        name: '运行记录',
        component: './agent/run',
      },
```

Recommended final order under `/agent`: model provider, definition, tool, conversation, chat, run.

- [ ] **Step 2: Verify route registration**

Run: `rg "/agent/run|运行记录|./agent/run" config/routes.ts`

Expected: three matches in `config/routes.ts`.

---

### Task 5: Add Run Page Styles

**Files:**

- Create: `src/pages/agent/run/index.less`

- [ ] **Step 1: Create scoped styles**

Create `src/pages/agent/run/index.less` with:

```less
.agent-run-page-note {
  margin-bottom: 16px;
}

.agent-run-text-block {
  max-height: 240px;
  padding: 12px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f5f7fa;
  border: 1px solid rgba(5, 5, 5, 0.06);
  border-radius: 8px;
}

.agent-run-error-block {
  color: #a8071a;
  background: #fff1f0;
  border-color: #ffccc7;
}
```

- [ ] **Step 2: Verify the style file exists**

Run: `rg "agent-run-text-block|agent-run-error-block" src/pages/agent/run/index.less`

Expected: two matches.

---

### Task 6: Implement the Run Page

**Files:**

- Create: `src/pages/agent/run/index.tsx`
- Uses: `src/services/agent/RunController.ts`
- Uses: `src/services/entity/Agent.ts`
- Uses: `src/pages/agent/run/index.less`

- [ ] **Step 1: Create the page component**

Create `src/pages/agent/run/index.tsx` with:

```tsx
import React, { useRef, useState } from 'react';
import { ActionType, PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components';
import { Alert, Button, Card, Drawer, Empty, message, Spin, Tag, Typography } from 'antd';
import { getAgentRunInfo, getAgentRunList } from '@/services/agent/RunController';
import { AgentRun, AgentRunSearchParams } from '@/services/entity/Agent';
import './index.less';

const { Text } = Typography;

const statusValueEnum = {
  0: { text: '成功', status: 'Success' },
  1: { text: '失败', status: 'Error' },
  2: { text: '超时', status: 'Warning' },
};

const renderStatusTag = (status?: number) => {
  if (status === 0) {
    return <Tag color="success">成功</Tag>;
  }
  if (status === 1) {
    return <Tag color="error">失败</Tag>;
  }
  if (status === 2) {
    return <Tag color="warning">超时</Tag>;
  }
  return <Tag>未知</Tag>;
};

const renderTextBlock = (content?: string, error?: boolean) => {
  if (!content) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无内容" />;
  }

  return (
    <div className={`agent-run-text-block${error ? ' agent-run-error-block' : ''}`}>{content}</div>
  );
};

const AgentRunPage: React.FC = () => {
  const ref = useRef<ActionType>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [run, setRun] = useState<AgentRun>();
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (record: AgentRun) => {
    if (!record.id) {
      message.error('缺少运行记录 ID');
      return;
    }

    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const { code, data, message: msg } = await getAgentRunInfo(record.id);
      if (code === 200) {
        setRun(data);
      } else {
        setRun(undefined);
        message.error(msg || '加载运行记录详情失败');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: any[] = [
    {
      title: 'Agent 定义 ID',
      dataIndex: 'agentDefinitionId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '会话 ID',
      dataIndex: 'conversationId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '输出消息 ID',
      dataIndex: 'messageId',
      valueType: 'text',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '模型',
      dataIndex: 'model',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusValueEnum,
      render: (_: any, record: AgentRun) => renderStatusTag(record.status),
    },
    {
      title: '总 Token',
      dataIndex: 'totalTokens',
      valueType: 'digit',
      hideInSearch: true,
    },
    {
      title: '耗时(ms)',
      dataIndex: 'latencyMs',
      valueType: 'digit',
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
      width: 120,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentRun) => [
        <Button type="link" key="detail" onClick={() => openDetail(record)}>
          查看详情
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer>
      <Alert
        className="agent-run-page-note"
        type="info"
        showIcon={true}
        message="运行记录为只读审计数据；统计接口当前为 V0.6 占位，页面仅展示调用明细。"
      />
      <ProTable
        actionRef={ref}
        rowKey="id"
        request={async (params: AgentRunSearchParams) => getAgentRunList(params)}
        columns={columns}
      />
      <Drawer
        title="运行记录详情"
        width={760}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose={true}
      >
        <Spin spinning={detailLoading}>
          {run ? (
            <>
              <ProDescriptions
                column={1}
                dataSource={run}
                columns={[
                  { title: 'ID', dataIndex: 'id' },
                  { title: 'Agent 定义 ID', dataIndex: 'agentDefinitionId' },
                  { title: '用户 ID', dataIndex: 'userId' },
                  { title: '会话 ID', dataIndex: 'conversationId' },
                  { title: '输出消息 ID', dataIndex: 'messageId' },
                  { title: '模型供应商 ID', dataIndex: 'modelProviderId' },
                  { title: '模型', dataIndex: 'model' },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    render: (_: any, record: AgentRun) => renderStatusTag(record.status),
                  },
                  { title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime' },
                  { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime' },
                ]}
              />
              <Card title="Token 与耗时" size="small" style={{ marginTop: 16 }}>
                <ProDescriptions
                  column={2}
                  dataSource={run}
                  columns={[
                    { title: '输入 Token', dataIndex: 'promptTokens' },
                    { title: '输出 Token', dataIndex: 'completionTokens' },
                    { title: '总 Token', dataIndex: 'totalTokens' },
                    { title: '总耗时(ms)', dataIndex: 'latencyMs' },
                  ]}
                />
              </Card>
              <Card title="输入内容摘要" size="small" style={{ marginTop: 16 }}>
                {renderTextBlock(run.inputContent)}
              </Card>
              <Card title="输出内容摘要" size="small" style={{ marginTop: 16 }}>
                {renderTextBlock(run.outputContent)}
              </Card>
              <Card title="错误信息" size="small" style={{ marginTop: 16 }}>
                {run.errorMsg ? (
                  renderTextBlock(run.errorMsg, true)
                ) : (
                  <Text type="secondary">暂无错误信息</Text>
                )}
              </Card>
            </>
          ) : (
            <Empty description="暂无运行记录详情" />
          )}
        </Spin>
      </Drawer>
    </PageContainer>
  );
};

export default AgentRunPage;
```

- [ ] **Step 2: Verify imports and key strings**

Run: `rg "AgentRunPage|agent-run-page-note|getAgentRunList|运行记录详情" src/pages/agent/run/index.tsx`

Expected: four matches.

---

### Task 7: Run Focused Verification

**Files:**

- Test: `src/services/agent/RunController.test.ts`
- Verify: `src/pages/agent/run/index.tsx`
- Verify: `config/routes.ts`
- Verify: `src/services/entity/Agent.ts`

- [ ] **Step 1: Run the focused controller test**

Run: `npm run test -- src/services/agent/RunController.test.ts`

Expected: PASS with one passing test suite.

- [ ] **Step 2: Run all tests**

Run: `npm test`

Expected: PASS. Existing Jest warning about open handles may appear after completion; record it if present.

- [ ] **Step 3: Run TypeScript check**

Run: `npm run tsc`

Expected: If the project baseline is unchanged, it may still fail at `src/pages/user/member/index.tsx(78,29)` and `src/requestErrorConfig.ts(107,5)`. No new errors should mention `src/pages/agent/run`, `src/services/agent/RunController.ts`, or `src/services/entity/Agent.ts`.

- [ ] **Step 4: Run static grep checks**

Run: `rg "/agent/run|AgentRun|RunController|getAgentRunList|getAgentRunInfo" src config`

Expected: matches in `config/routes.ts`, `src/services/entity/Agent.ts`, `src/services/agent/RunController.ts`, `src/services/agent/RunController.test.ts`, and `src/pages/agent/run/index.tsx`.

- [ ] **Step 5: Check worktree summary**

Run: `git status --short`

Expected: includes the new run page files, service files, updated `Agent.ts`, updated `config/routes.ts`, and existing unrelated workspace changes. Do not revert unrelated files.

---

## Self-Review Notes

- Spec coverage: The plan covers route/menu, types, controller, list page, detail drawer, status mapping, no write actions, no statistics call, pure-text long content, and endpoint tests.
- Placeholder scan: No `TBD`, `TODO`, or vague implementation-only steps remain.
- Type consistency: `AgentRun`, `AgentRunSearchParams`, `getAgentRunList`, and `getAgentRunInfo` are consistently named across tests, services, and page code.
