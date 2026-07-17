# 会话管理页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/agent/conversation` with conversation list, detail drawer, messages, close, and delete.

**Architecture:** Put all conversation APIs in `src/services/agent/ConversationController.ts`, keep `ChatController.ts` focused on sending chat messages, and update Chat Debug to import conversation APIs from the conversation service. The page uses `PageContainer + ProTable` for the list and an Ant Design `Drawer` for details and messages.

**Tech Stack:** Umi Max, React, TypeScript, Ant Design, Ant Design Pro Components, Jest, `@umijs/max` request.

---

## File Structure

- Modify: `src/services/agent/ChatController.ts`
  - Keep only `sendAgentChat`.
- Modify: `src/services/agent/ConversationController.ts`
  - Add conversation list, detail, messages, close, and delete API wrappers.
- Create: `src/services/agent/ConversationController.test.ts`
  - Lock documented request paths and methods.
- Modify: `src/pages/agent/chat/index.tsx`
  - Import conversation APIs from `ConversationController.ts` instead of `ChatController.ts`.
- Create: `src/pages/agent/conversation/index.tsx`
  - Implement list, detail drawer, messages, close, and delete.
- Modify: `config/routes.ts`
  - Register `/agent/conversation` under `Agent 平台`.

---

### Task 1: Conversation Service Contract Test

**Files:**

- Create: `src/services/agent/ConversationController.test.ts`

- [ ] **Step 1: Write the failing service contract test**

Create `src/services/agent/ConversationController.test.ts`:

```ts
import { request } from '@umijs/max';
import {
  closeAgentConversation,
  deleteAgentConversation,
  getAgentConversationInfo,
  getAgentConversationList,
  getAgentConversationMessages,
} from './ConversationController';

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe('ConversationController', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null });
  });

  it('uses documented conversation management endpoints', async () => {
    await getAgentConversationList({ current: 1, pageSize: 20, title: 'hello' });
    await getAgentConversationInfo('conversation-1');
    await getAgentConversationMessages('conversation-1', { current: 1, pageSize: 20 });
    await closeAgentConversation('conversation-1');
    await deleteAgentConversation('conversation-1');

    expect(mockedRequest).toHaveBeenNthCalledWith(1, '/api/agent/conversation/list', {
      method: 'POST',
      data: { current: 1, pageSize: 20, title: 'hello' },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, '/api/agent/conversation/conversation-1', {
      method: 'GET',
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(
      3,
      '/api/agent/conversation/conversation-1/messages',
      {
        method: 'GET',
        params: { current: 1, pageSize: 20 },
      },
    );
    expect(mockedRequest).toHaveBeenNthCalledWith(
      4,
      '/api/agent/conversation/conversation-1/close',
      {
        method: 'PUT',
      },
    );
    expect(mockedRequest).toHaveBeenNthCalledWith(5, '/api/agent/conversation/conversation-1', {
      method: 'DELETE',
    });
  });
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `npm run test -- src/services/agent/ConversationController.test.ts`

Expected: FAIL because the conversation service functions are missing.

---

### Task 2: Conversation Service Implementation

**Files:**

- Modify: `src/services/agent/ConversationController.ts`
- Modify: `src/services/agent/ChatController.ts`

- [ ] **Step 1: Replace ConversationController with documented APIs**

Set `src/services/agent/ConversationController.ts` to:

```ts
import { request } from '@umijs/max';
import { ResponseStructure } from '@/services/entity/Common';
import {
  AgentConversation,
  AgentConversationSearchParams,
  AgentMessage,
  AgentMessageSearchParams,
} from '@/services/entity/Agent';

/**
 * @description 获取 Agent 会话列表
 */
export const getAgentConversationList = async (
  params: AgentConversationSearchParams,
): Promise<ResponseStructure<AgentConversation[]>> => {
  return request('/api/agent/conversation/list', {
    method: 'POST',
    data: params,
  });
};

/**
 * @description 获取 Agent 会话详情
 */
export const getAgentConversationInfo = async (
  id: string,
): Promise<ResponseStructure<AgentConversation>> => {
  return request(`/api/agent/conversation/${id}`, {
    method: 'GET',
  });
};

/**
 * @description 获取 Agent 会话消息列表
 */
export const getAgentConversationMessages = async (
  id: string,
  params: AgentMessageSearchParams,
): Promise<ResponseStructure<AgentMessage[]>> => {
  return request(`/api/agent/conversation/${id}/messages`, {
    method: 'GET',
    params,
  });
};

/**
 * @description 关闭 Agent 会话
 */
export const closeAgentConversation = async (
  id: string,
): Promise<ResponseStructure<AgentConversation>> => {
  return request(`/api/agent/conversation/${id}/close`, {
    method: 'PUT',
  });
};

/**
 * @description 删除 Agent 会话
 */
export const deleteAgentConversation = async (
  id: string,
): Promise<ResponseStructure<AgentConversation>> => {
  return request(`/api/agent/conversation/${id}`, {
    method: 'DELETE',
  });
};
```

- [ ] **Step 2: Remove conversation APIs from ChatController**

Keep `src/services/agent/ChatController.ts` focused on chat sending:

```ts
import { request } from '@umijs/max';
import { ResponseStructure } from '@/services/entity/Common';
import { AgentChatRequest, AgentMessage } from '@/services/entity/Agent';

/**
 * @description 发送 Agent 非流式聊天消息
 */
export const sendAgentChat = async (
  params: AgentChatRequest,
): Promise<ResponseStructure<AgentMessage>> => {
  return request('/api/agent/chat', {
    method: 'POST',
    data: params,
  });
};
```

- [ ] **Step 3: Run test and verify GREEN**

Run: `npm run test -- src/services/agent/ConversationController.test.ts`

Expected: PASS.

---

### Task 3: Update Chat Debug Imports

**Files:**

- Modify: `src/pages/agent/chat/index.tsx`

- [ ] **Step 1: Split chat and conversation imports**

Replace the current import from `ChatController` with:

```ts
import { sendAgentChat } from '@/services/agent/ChatController';
import {
  getAgentConversationList,
  getAgentConversationMessages,
} from '@/services/agent/ConversationController';
```

- [ ] **Step 2: Verify old wrong paths are gone from ChatController**

Run: `rg "/api/agent/chat/conversation" src/services/agent src/pages/agent/chat`

Expected: No matches.

---

### Task 4: Add Conversation Management Page

**Files:**

- Create: `src/pages/agent/conversation/index.tsx`

- [ ] **Step 1: Create page component**

Create `src/pages/agent/conversation/index.tsx`:

```tsx
import React, { useRef, useState } from 'react';
import { ActionType, PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Drawer,
  Empty,
  List,
  message,
  Popconfirm,
  Space,
  Spin,
  Typography,
} from 'antd';
import { history, useAccess } from '@@/exports';
import {
  closeAgentConversation,
  deleteAgentConversation,
  getAgentConversationInfo,
  getAgentConversationList,
  getAgentConversationMessages,
} from '@/services/agent/ConversationController';
import {
  AgentConversation,
  AgentConversationSearchParams,
  AgentMessage,
} from '@/services/entity/Agent';

const { Paragraph, Text } = Typography;

const statusValueEnum = {
  0: { text: '进行中', status: 'Processing' },
  1: { text: '关闭', status: 'Default' },
  2: { text: '归档', status: 'Warning' },
};

const AgentConversationPage: React.FC = () => {
  const ref = useRef<ActionType>();
  const permissionMap = useAccess();
  const path = history.location.pathname;
  const write = permissionMap[path];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string>();
  const [conversation, setConversation] = useState<AgentConversation>();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const [detailResult, messageResult] = await Promise.all([
        getAgentConversationInfo(id),
        getAgentConversationMessages(id, { current: 1, pageSize: 20 }),
      ]);

      if (detailResult.code === 200) {
        setConversation(detailResult.data);
      } else {
        setConversation(undefined);
        message.error(detailResult.message || '加载会话详情失败');
      }

      if (messageResult.code === 200) {
        setMessages(messageResult.data || []);
      } else {
        setMessages([]);
        message.error(messageResult.message || '加载消息列表失败');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = async (record: AgentConversation) => {
    if (!record.id) {
      message.error('缺少会话 ID');
      return;
    }
    setCurrentId(record.id);
    setDrawerOpen(true);
    await loadDetail(record.id);
  };

  const handleCloseConversation = async (record: AgentConversation) => {
    if (!record.id) {
      message.error('缺少会话 ID');
      return;
    }

    const { code, message: msg } = await closeAgentConversation(record.id);
    if (code === 200) {
      message.success(msg || '关闭成功');
      ref.current?.reload();
      if (record.id === currentId) {
        await loadDetail(record.id);
      }
    } else {
      message.error(msg || '关闭失败');
    }
  };

  const handleDeleteConversation = async (record: AgentConversation) => {
    if (!record.id) {
      message.error('缺少会话 ID');
      return;
    }

    const { code, message: msg } = await deleteAgentConversation(record.id);
    if (code === 200) {
      message.success(msg || '删除成功');
      ref.current?.reload();
      if (record.id === currentId) {
        setDrawerOpen(false);
        setCurrentId(undefined);
        setConversation(undefined);
        setMessages([]);
      }
    } else {
      message.error(msg || '删除失败');
    }
  };

  const renderMessageMeta = (item: AgentMessage) => {
    const metas = [
      item.model ? `模型：${item.model}` : undefined,
      item.promptTokens !== undefined ? `Prompt：${item.promptTokens}` : undefined,
      item.completionTokens !== undefined ? `Completion：${item.completionTokens}` : undefined,
      item.totalTokens !== undefined ? `Total：${item.totalTokens}` : undefined,
      item.latencyMs !== undefined ? `耗时：${item.latencyMs}ms` : undefined,
      item.createdAt ? `时间：${item.createdAt}` : undefined,
    ].filter(Boolean);

    if (!metas.length) {
      return null;
    }

    return <Text type="secondary">{metas.join(' / ')}</Text>;
  };

  const columns: any[] = [
    {
      title: '会话标题',
      dataIndex: 'title',
      valueType: 'text',
      ellipsis: true,
    },
    {
      title: 'Agent ID',
      dataIndex: 'agentId',
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
      render: (_: any, record: AgentConversation) => [
        <Button type="link" key="detail" onClick={() => openDetail(record)}>
          查看详情
        </Button>,
        write && record.status === 0 ? (
          <Popconfirm
            key="close"
            title="确认关闭该会话？"
            onConfirm={() => handleCloseConversation(record)}
          >
            <Button type="link" key="close-button">
              关闭
            </Button>
          </Popconfirm>
        ) : null,
        write ? (
          <Popconfirm
            key="delete"
            title="确认删除该会话？"
            onConfirm={() => handleDeleteConversation(record)}
          >
            <Button type="link" key="delete-button">
              删除
            </Button>
          </Popconfirm>
        ) : null,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable
        actionRef={ref}
        rowKey="id"
        request={async (params: AgentConversationSearchParams) => getAgentConversationList(params)}
        columns={columns}
      />
      <Drawer
        title="会话详情"
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose={true}
      >
        <Spin spinning={detailLoading}>
          {conversation ? (
            <ProDescriptions
              column={1}
              dataSource={conversation}
              columns={[
                { title: 'ID', dataIndex: 'id' },
                { title: '标题', dataIndex: 'title' },
                { title: 'Agent ID', dataIndex: 'agentId' },
                { title: '状态', dataIndex: 'status', valueEnum: statusValueEnum },
                { title: '创建时间', dataIndex: 'createdAt', valueType: 'dateTime' },
                { title: '更新时间', dataIndex: 'updatedAt', valueType: 'dateTime' },
              ]}
            />
          ) : (
            <Empty description="暂无会话详情" />
          )}
          <Card title="消息列表" style={{ marginTop: 16 }}>
            {!messages.length ? (
              <Empty description="暂无消息" />
            ) : (
              <List
                dataSource={messages}
                renderItem={(item, index) => (
                  <List.Item key={item.id || `${item.role}-${index}`}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text strong={true}>{item.role || 'unknown'}</Text>
                      <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                        {item.content}
                      </Paragraph>
                      {renderMessageMeta(item)}
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Spin>
      </Drawer>
    </PageContainer>
  );
};

export default AgentConversationPage;
```

- [ ] **Step 2: Verify close button status guard and permission guard**

Run: `rg "write && record.status === 0|write \?" src/pages/agent/conversation/index.tsx`

Expected: Finds the close guard and delete permission guard.

- [ ] **Step 3: Verify messages request size**

Run: `rg "current: 1|pageSize: 20" src/pages/agent/conversation/index.tsx`

Expected: Finds both values in the message request.

---

### Task 5: Register Conversation Route

**Files:**

- Modify: `config/routes.ts`

- [ ] **Step 1: Add route under Agent platform**

Add this route after `/agent/tool` and before `/agent/chat`:

```ts
      {
        path: '/agent/conversation',
        name: '会话管理',
        component: './agent/conversation',
      },
```

- [ ] **Step 2: Verify route**

Run: `rg "/agent/conversation|会话管理|./agent/conversation" config/routes.ts`

Expected: Finds path, name, and component.

---

### Task 6: Verify Implementation

**Files:**

- Inspect: `src/services/agent/ConversationController.ts`
- Inspect: `src/services/agent/ChatController.ts`
- Inspect: `src/pages/agent/chat/index.tsx`
- Inspect: `src/pages/agent/conversation/index.tsx`
- Inspect: `config/routes.ts`

- [ ] **Step 1: Run conversation service test**

Run: `npm run test -- src/services/agent/ConversationController.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full Jest suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run TypeScript check**

Run: `npm run tsc`

Expected: Either PASS, or FAIL only with known baseline errors in `src/pages/user/member/index.tsx` and `src/requestErrorConfig.ts`.

- [ ] **Step 4: Verify documented conversation paths**

Run: `rg "/api/agent/conversation" src/services/agent/ConversationController.ts`

Expected: Finds list, detail, messages, close, and delete paths.

- [ ] **Step 5: Verify wrong chat conversation paths are gone**

Run: `rg "/api/agent/chat/conversation" src/services/agent src/pages/agent`

Expected: No matches.

- [ ] **Step 6: Review git status**

Run: `git status --short`

Expected: Shows intended new and modified files. Do not revert unrelated existing changes such as `src/app.tsx` or `docs/FRONTEND.md`.

---

## Notes For Executor

- Do not commit. The user previously requested no commits for this workflow.
- Use `apply_patch` for manual edits.
- Keep changes focused on conversation management and the service-path correction required by it.
- Do not add message pagination or continue-chat behavior in this page.
