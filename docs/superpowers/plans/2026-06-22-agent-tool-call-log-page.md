# Agent Tool Call Log Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only Agent tool-call-log audit page at `/agent/tool-call-log` with list search and a detail drawer.

**Architecture:** Follow the existing Agent audit-page pattern: shared entity types in `src/services/entity/Agent.ts`, request wrappers in `src/services/agent/ToolCallLogController.ts`, route registration in `config/routes.ts`, and a single page component in `src/pages/agent/tool-call-log/index.tsx`. The page uses `PageContainer + ProTable + Drawer + ProDescriptions`, with pure-text blocks for request, response, and error content.

**Tech Stack:** Umi Max, React, TypeScript, Ant Design, Ant Design Pro Components, Jest, `@umijs/max` request.

---

## File Structure

- Modify: `src/services/entity/Agent.ts`
  - Add `AgentToolCallLog` and `AgentToolCallLogSearchParams` interfaces.
- Create: `src/services/agent/ToolCallLogController.ts`
  - Add list and detail request wrappers.
- Create: `src/services/agent/ToolCallLogController.test.ts`
  - Verify documented tool-call-log endpoints and request methods.
- Create: `src/pages/agent/tool-call-log/index.tsx`
  - Implement read-only list and detail drawer.
- Create: `src/pages/agent/tool-call-log/index.less`
  - Add small scoped styles for long text blocks and page note.
- Modify: `config/routes.ts`
  - Register `/agent/tool-call-log` under `Agent 平台`.

---

### Task 1: Add Tool Call Log Types

**Files:**

- Modify: `src/services/entity/Agent.ts`

- [ ] **Step 1: Add `AgentToolCallLog` and `AgentToolCallLogSearchParams` after `AgentRunSearchParams`**

Insert this code after the existing `AgentRunSearchParams` interface:

```ts
/**
 * @description Agent 工具调用日志
 */
export interface AgentToolCallLog {
  id?: string;
  runId?: string;
  toolId?: string;
  agentDefinitionId?: string;
  requestUrl?: string;
  requestMethod?: string;
  requestHeaders?: string;
  requestBody?: string;
  responseStatus?: number;
  responseBody?: string;
  latencyMs?: number;
  status?: number;
  errorMsg?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @description Agent 工具调用日志查询参数
 */
export interface AgentToolCallLogSearchParams extends AgentToolCallLog {
  current?: number;
  pageSize?: number;
}
```

- [ ] **Step 2: Verify the type names exist once**

Run: `rg "interface AgentToolCallLog|interface AgentToolCallLogSearchParams" src/services/entity/Agent.ts`

Expected: two matches, one for `AgentToolCallLog` and one for `AgentToolCallLogSearchParams`.

---

### Task 2: Add Tool Call Log Controller Tests First

**Files:**

- Create: `src/services/agent/ToolCallLogController.test.ts`

- [ ] **Step 1: Create the failing endpoint test**

Create `src/services/agent/ToolCallLogController.test.ts` with:

```ts
import { request } from '@umijs/max';
import { getAgentToolCallLogInfo, getAgentToolCallLogList } from './ToolCallLogController';

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe('ToolCallLogController', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null });
  });

  it('uses documented tool call log endpoints', async () => {
    await getAgentToolCallLogList({
      current: 1,
      pageSize: 20,
      runId: 'run-1',
      toolId: 'tool-1',
      status: 3,
    });
    await getAgentToolCallLogInfo('log-1');

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/tool-call-log/list', {
      method: 'POST',
      data: {
        current: 1,
        pageSize: 20,
        runId: 'run-1',
        toolId: 'tool-1',
        status: 3,
      },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/tool-call-log/log-1', {
      method: 'GET',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails before implementation**

Run: `npm run test -- src/services/agent/ToolCallLogController.test.ts`

Expected: FAIL because `./ToolCallLogController` does not exist or exported functions are missing.

---

### Task 3: Implement Tool Call Log Controller

**Files:**

- Create: `src/services/agent/ToolCallLogController.ts`
- Test: `src/services/agent/ToolCallLogController.test.ts`

- [ ] **Step 1: Create the controller implementation**

Create `src/services/agent/ToolCallLogController.ts` with:

```ts
import { request } from '@umijs/max';
import { ResponseStructure } from '@/services/entity/Common';
import { AgentToolCallLog, AgentToolCallLogSearchParams } from '@/services/entity/Agent';

/**
 * @description 获取 Agent 工具调用日志列表
 */
export const getAgentToolCallLogList = async (
  params: AgentToolCallLogSearchParams,
): Promise<ResponseStructure<AgentToolCallLog[]>> => {
  return request('/api/agent/tool-call-log/list', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 获取 Agent 工具调用日志详情
 */
export const getAgentToolCallLogInfo = async (
  id: string,
): Promise<ResponseStructure<AgentToolCallLog>> => {
  return request(`/api/agent/tool-call-log/${id}`, {
    method: 'GET',
  });
};
```

- [ ] **Step 2: Run the controller test**

Run: `npm run test -- src/services/agent/ToolCallLogController.test.ts`

Expected: PASS with one passing test suite.

---

### Task 4: Register the Route

**Files:**

- Modify: `config/routes.ts`

- [ ] **Step 1: Add the route under `Agent 平台`**

In `config/routes.ts`, add this object after the run route:

```ts
      {
        path: '/agent/tool-call-log',
        name: '工具调用日志',
        component: './agent/tool-call-log',
      },
```

Recommended final order under `/agent`: model provider, definition, tool, conversation, chat, run, tool-call-log.

- [ ] **Step 2: Verify route registration**

Run: `rg "/agent/tool-call-log|工具调用日志|./agent/tool-call-log" config/routes.ts`

Expected: three matches in `config/routes.ts`.

---

### Task 5: Add Tool Call Log Page Styles

**Files:**

- Create: `src/pages/agent/tool-call-log/index.less`

- [ ] **Step 1: Create scoped styles**

Create `src/pages/agent/tool-call-log/index.less` with:

```less
.agent-tool-call-log-page-note {
  margin-bottom: 16px;
}

.agent-tool-call-log-text-block {
  max-height: 280px;
  padding: 12px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f5f7fa;
  border: 1px solid rgba(5, 5, 5, 0.06);
  border-radius: 8px;
}

.agent-tool-call-log-error-block {
  color: #a8071a;
  background: #fff1f0;
  border-color: #ffccc7;
}
```

- [ ] **Step 2: Verify the style file exists**

Run: `rg "agent-tool-call-log-text-block|agent-tool-call-log-error-block" src/pages/agent/tool-call-log/index.less`

Expected: two matches.

---

### Task 6: Implement the Tool Call Log Page

**Files:**

- Create: `src/pages/agent/tool-call-log/index.tsx`
- Uses: `src/services/agent/ToolCallLogController.ts`
- Uses: `src/services/entity/Agent.ts`
- Uses: `src/pages/agent/tool-call-log/index.less`

- [ ] **Step 1: Create the page component**

Create `src/pages/agent/tool-call-log/index.tsx` with:

```tsx
import React, { useState } from 'react';
import { PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components';
import { Alert, Button, Card, Drawer, Empty, message, Spin, Tag, Typography } from 'antd';
import {
  getAgentToolCallLogInfo,
  getAgentToolCallLogList,
} from '@/services/agent/ToolCallLogController';
import { AgentToolCallLog, AgentToolCallLogSearchParams } from '@/services/entity/Agent';
import './index.less';

const { Text } = Typography;

const methodValueEnum = {
  GET: { text: 'GET' },
  POST: { text: 'POST' },
  PUT: { text: 'PUT' },
  DELETE: { text: 'DELETE' },
  PATCH: { text: 'PATCH' },
};

const statusValueEnum = {
  0: { text: '成功', status: 'Success' },
  1: { text: '失败', status: 'Error' },
  2: { text: '超时', status: 'Warning' },
  3: { text: '安全拦截', status: 'Processing' },
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
  if (status === 3) {
    return <Tag color="purple">安全拦截</Tag>;
  }
  return <Tag>未知</Tag>;
};

const renderTextBlock = (content?: string, error?: boolean) => {
  if (!content) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无内容" />;
  }

  return (
    <div
      className={`agent-tool-call-log-text-block${error ? ' agent-tool-call-log-error-block' : ''}`}
    >
      {content}
    </div>
  );
};

const AgentToolCallLogPage: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toolCallLog, setToolCallLog] = useState<AgentToolCallLog>();
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (record: AgentToolCallLog) => {
    if (!record.id) {
      message.error('缺少工具调用日志 ID');
      return;
    }

    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const { code, data, message: msg } = await getAgentToolCallLogInfo(record.id);
      if (code === 200) {
        setToolCallLog(data);
      } else {
        setToolCallLog(undefined);
        message.error(msg || '加载工具调用日志详情失败');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: any[] = [
    {
      title: '运行记录 ID',
      dataIndex: 'runId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '工具 ID',
      dataIndex: 'toolId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: 'Agent 定义 ID',
      dataIndex: 'agentDefinitionId',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: '请求方法',
      dataIndex: 'requestMethod',
      valueType: 'select',
      valueEnum: methodValueEnum,
      width: 110,
    },
    {
      title: 'HTTP 状态码',
      dataIndex: 'responseStatus',
      valueType: 'digit',
      hideInSearch: true,
      width: 120,
    },
    {
      title: '执行状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusValueEnum,
      render: (_: any, record: AgentToolCallLog) => renderStatusTag(record.status),
      width: 120,
    },
    {
      title: '耗时(ms)',
      dataIndex: 'latencyMs',
      valueType: 'digit',
      hideInSearch: true,
      width: 110,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
      width: 180,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      key: 'option',
      fixed: 'right',
      render: (_: any, record: AgentToolCallLog) => [
        <Button type="link" key="detail" onClick={() => openDetail(record)}>
          查看详情
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer>
      <Alert
        className="agent-tool-call-log-page-note"
        type="info"
        showIcon={true}
        message="工具调用日志依赖 V0.5 工具调用闭环，当前环境可能暂无真实数据。"
      />
      <ProTable
        rowKey="id"
        request={async (params: AgentToolCallLogSearchParams) => getAgentToolCallLogList(params)}
        columns={columns}
        scroll={{ x: 1200 }}
      />
      <Drawer
        title="工具调用日志详情"
        width={820}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose={true}
      >
        <Spin spinning={detailLoading}>
          {toolCallLog ? (
            <>
              <ProDescriptions
                column={1}
                dataSource={toolCallLog}
                columns={[
                  { title: 'ID', dataIndex: 'id' },
                  { title: '运行记录 ID', dataIndex: 'runId' },
                  { title: '工具 ID', dataIndex: 'toolId' },
                  { title: 'Agent 定义 ID', dataIndex: 'agentDefinitionId' },
                  { title: '请求方法', dataIndex: 'requestMethod' },
                  { title: '请求 URL', dataIndex: 'requestUrl' },
                  { title: 'HTTP 状态码', dataIndex: 'responseStatus' },
                  {
                    title: '执行状态',
                    dataIndex: 'status',
                    render: (_: any, record: AgentToolCallLog) => renderStatusTag(record.status),
                  },
                  { title: '耗时(ms)', dataIndex: 'latencyMs' },
                  { title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime' },
                  { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime' },
                ]}
              />
              <Card title="请求头" size="small" style={{ marginTop: 16 }}>
                {renderTextBlock(toolCallLog.requestHeaders)}
              </Card>
              <Card title="请求体" size="small" style={{ marginTop: 16 }}>
                {renderTextBlock(toolCallLog.requestBody)}
              </Card>
              <Card title="响应体" size="small" style={{ marginTop: 16 }}>
                {renderTextBlock(toolCallLog.responseBody)}
              </Card>
              <Card title="错误信息" size="small" style={{ marginTop: 16 }}>
                {toolCallLog.errorMsg ? (
                  renderTextBlock(toolCallLog.errorMsg, true)
                ) : (
                  <Text type="secondary">暂无错误信息</Text>
                )}
              </Card>
            </>
          ) : (
            <Empty description="暂无工具调用日志详情" />
          )}
        </Spin>
      </Drawer>
    </PageContainer>
  );
};

export default AgentToolCallLogPage;
```

- [ ] **Step 2: Verify imports and key strings**

Run: `rg "AgentToolCallLogPage|agent-tool-call-log-page-note|getAgentToolCallLogList|工具调用日志详情" src/pages/agent/tool-call-log/index.tsx`

Expected: at least four matches, including the component name, style class, list request, and drawer title.

---

### Task 7: Run Focused Verification

**Files:**

- Test: `src/services/agent/ToolCallLogController.test.ts`
- Verify: `src/pages/agent/tool-call-log/index.tsx`
- Verify: `config/routes.ts`
- Verify: `src/services/entity/Agent.ts`

- [ ] **Step 1: Run the focused controller test**

Run: `npm run test -- src/services/agent/ToolCallLogController.test.ts`

Expected: PASS with one passing test suite.

- [ ] **Step 2: Run all tests**

Run: `npm test`

Expected: PASS. Existing Jest warning about open handles may appear after completion; record it if present.

- [ ] **Step 3: Run TypeScript check**

Run: `npm run tsc`

Expected: If the project baseline is unchanged, it may still fail at `src/pages/user/member/index.tsx(78,29)` and `src/requestErrorConfig.ts(107,5)`. No new errors should mention `src/pages/agent/tool-call-log`, `src/services/agent/ToolCallLogController.ts`, or `src/services/entity/Agent.ts`.

- [ ] **Step 4: Run static grep checks**

Run: `rg "/agent/tool-call-log|AgentToolCallLog|ToolCallLogController|getAgentToolCallLogList|getAgentToolCallLogInfo" src config`

Expected: matches in `config/routes.ts`, `src/services/entity/Agent.ts`, `src/services/agent/ToolCallLogController.ts`, `src/services/agent/ToolCallLogController.test.ts`, and `src/pages/agent/tool-call-log/index.tsx`.

- [ ] **Step 5: Check worktree summary**

Run: `git status --short`

Expected: includes the new tool-call-log page files, service files, updated `Agent.ts`, updated `config/routes.ts`, and existing unrelated workspace changes. Do not revert unrelated files.

---

## Self-Review Notes

- Spec coverage: The plan covers route/menu, types, controller, list page, detail drawer, method/status mappings, no write actions, no JSON formatting, pure-text long content, and endpoint tests.
- Placeholder scan: No unresolved placeholder instructions remain.
- Type consistency: `AgentToolCallLog`, `AgentToolCallLogSearchParams`, `getAgentToolCallLogList`, and `getAgentToolCallLogInfo` are consistently named across tests, services, and page code.
