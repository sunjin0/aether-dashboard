# Chat 调试页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Agent 平台 Chat 调试页面，支持选择启用 Agent、新建会话、选择已有会话、加载消息和发送非流式聊天。

**Architecture:** 在现有 Agent 平台结构中新增 Chat 和 Conversation 服务封装，扩展 Agent 实体类型，并创建一个左右布局的 Chat 调试页面。左侧负责 Agent 选择和轻量会话列表，右侧负责消息展示和输入发送，不实现会话管理操作。

**Tech Stack:** React 18、Umi Max、Ant Design、Ant Design Pro Components、TypeScript、`@umijs/max` request。

---

## 文件结构

- Modify: `src/services/entity/Agent.ts`
  - 增加聊天请求、会话、消息和查询参数类型。
- Create: `src/services/agent/ChatController.ts`
  - 封装 `POST /api/agent/chat`。
- Create: `src/services/agent/ConversationController.ts`
  - 封装轻量会话列表和会话消息接口。
- Create: `src/pages/agent/chat/index.tsx`
  - 实现 Chat 调试页面、会话列表、消息区和发送逻辑。
- Modify: `config/routes.ts`
  - 在 `Agent 平台` 下新增 `/agent/chat` 子路由。

说明：不提交 commit；当前仓库已有 `npm run tsc` 基线错误在 `src/pages/user/member/index.tsx` 和 `src/requestErrorConfig.ts`，本计划只要求不引入新的 TypeScript 错误。

---

### Task 1: 扩展 Chat 和 Conversation 类型

**Files:**
- Modify: `src/services/entity/Agent.ts`

- [ ] **Step 1: 在 `Agent.ts` 末尾追加类型**

```ts

/**
 * @description Agent 聊天请求
 */
export interface AgentChatRequest {
  agentId: string;
  conversationId?: string;
  message: string;
}

/**
 * @description Agent 会话
 */
export interface AgentConversation {
  id?: string;
  agentId?: string;
  title?: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @description Agent 会话查询参数
 */
export interface AgentConversationSearchParams extends AgentConversation {
  current?: number;
  pageSize?: number;
}

/**
 * @description Agent 消息
 */
export interface AgentMessage {
  id?: string;
  conversationId?: string;
  role?: string;
  content?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  createdAt?: string;
}

/**
 * @description Agent 消息查询参数
 */
export interface AgentMessageSearchParams {
  current?: number;
  pageSize?: number;
}
```

- [ ] **Step 2: 运行类型检查**

Run: `npm run tsc`

Expected: 可能仍失败在既有两个基线错误；不得出现 `src/services/entity/Agent.ts` 新错误。

---

### Task 2: 新增 Chat 和 Conversation 服务层

**Files:**
- Create: `src/services/agent/ChatController.ts`
- Create: `src/services/agent/ConversationController.ts`

- [ ] **Step 1: 创建 Chat 服务文件**

```ts
import {request} from '@umijs/max';
import {ResponseStructure} from '@/services/entity/Common';
import {AgentChatRequest, AgentMessage} from '@/services/entity/Agent';

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

- [ ] **Step 2: 创建 Conversation 服务文件**

```ts
import {request} from '@umijs/max';
import {ResponseStructure} from '@/services/entity/Common';
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
```

- [ ] **Step 3: 运行类型检查**

Run: `npm run tsc`

Expected: 只允许既有基线错误；不得出现 `ChatController.ts` 或 `ConversationController.ts` 新错误。

---

### Task 3: 新增 Chat 调试页面

**Files:**
- Create: `src/pages/agent/chat/index.tsx`

- [ ] **Step 1: 创建页面组件**

```tsx
import React, {useEffect, useRef, useState} from 'react';
import {PageContainer} from '@ant-design/pro-components';
import {Button, Card, Empty, Input, List, message, Select, Space, Spin, Typography} from 'antd';
import {getAgentDefinitionList} from '@/services/agent/AgentDefinitionController';
import {sendAgentChat} from '@/services/agent/ChatController';
import {
  getAgentConversationList,
  getAgentConversationMessages,
} from '@/services/agent/ConversationController';
import {AgentConversation, AgentDefinition, AgentMessage} from '@/services/entity/Agent';

const {Text, Paragraph} = Typography;

const ChatDebugPage: React.FC = () => {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [agentId, setAgentId] = useState<string>();
  const [conversationId, setConversationId] = useState<string>();
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const {code, data, message: msg} = await getAgentDefinitionList({
        current: 1,
        pageSize: 1000,
        status: 1,
      });
      if (code === 200) {
        setAgents(data || []);
      } else {
        message.error(msg || '加载 Agent 列表失败');
      }
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const {code, data, message: msg} = await getAgentConversationList({
        current: 1,
        pageSize: 20,
      });
      if (code === 200) {
        setConversations(data || []);
      } else {
        message.error(msg || '加载会话列表失败');
      }
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (id: string) => {
    setLoadingMessages(true);
    try {
      const {code, data, message: msg} = await getAgentConversationMessages(id, {
        current: 1,
        pageSize: 20,
      });
      if (code === 200) {
        setMessages(data || []);
      } else {
        message.error(msg || '加载消息列表失败');
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadAgents();
    loadConversations();
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  const handleNewConversation = () => {
    setConversationId(undefined);
    setMessages([]);
  };

  const handleSelectConversation = async (conversation: AgentConversation) => {
    if (!conversation.id) {
      return;
    }
    setConversationId(conversation.id);
    if (conversation.agentId) {
      setAgentId(conversation.agentId);
    }
    await loadMessages(conversation.id);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!agentId) {
      message.error('请选择 Agent');
      return;
    }
    if (!content) {
      message.error('请输入消息内容');
      return;
    }

    const userMessage: AgentMessage = {
      role: 'user',
      content,
    };

    setSending(true);
    setMessages((current) => [...current, userMessage]);
    try {
      const payload = conversationId
        ? {agentId, conversationId, message: content}
        : {agentId, message: content};
      const {code, data, message: msg} = await sendAgentChat(payload);
      if (code === 200) {
        setMessages((current) => [...current, data]);
        setInput('');
        if (!conversationId && data?.conversationId) {
          setConversationId(data.conversationId);
          await loadConversations();
        }
      } else {
        setMessages((current) => current.filter((item) => item !== userMessage));
        message.error(msg || '发送失败');
      }
    } catch (error) {
      setMessages((current) => current.filter((item) => item !== userMessage));
      message.error('发送失败');
    } finally {
      setSending(false);
    }
  };

  const renderMessageMeta = (item: AgentMessage) => {
    const metas = [
      item.model ? `模型：${item.model}` : undefined,
      item.promptTokens !== undefined ? `Prompt：${item.promptTokens}` : undefined,
      item.completionTokens !== undefined ? `Completion：${item.completionTokens}` : undefined,
      item.totalTokens !== undefined ? `Total：${item.totalTokens}` : undefined,
      item.latencyMs !== undefined ? `耗时：${item.latencyMs}ms` : undefined,
    ].filter(Boolean);

    if (!metas.length) {
      return null;
    }

    return <Text type="secondary">{metas.join(' / ')}</Text>;
  };

  const renderConversationTitle = (item: AgentConversation) => {
    return item.title || item.createdAt || item.id || '未命名会话';
  };

  return (
    <PageContainer>
      <div style={{display: 'flex', gap: 16, minHeight: 640}}>
        <Card style={{width: 320}} bodyStyle={{display: 'flex', flexDirection: 'column', gap: 16, height: '100%'}}>
          <Select
            placeholder="请选择启用 Agent"
            loading={loadingAgents}
            value={agentId}
            showSearch={true}
            allowClear={true}
            optionFilterProp="label"
            onChange={(value) => {
              setAgentId(value);
              setConversationId(undefined);
              setMessages([]);
            }}
            options={agents
              .filter((item) => item.id)
              .map((item) => ({label: item.name || item.code || item.id, value: item.id}))}
          />
          <Button type="primary" onClick={handleNewConversation}>
            新建会话
          </Button>
          <Spin spinning={loadingConversations}>
            <List
              dataSource={conversations}
              locale={{emptyText: '暂无会话'}}
              renderItem={(item) => (
                <List.Item
                  style={{cursor: item.id ? 'pointer' : 'default'}}
                  onClick={() => handleSelectConversation(item)}
                >
                  <List.Item.Meta
                    title={
                      <Text strong={item.id === conversationId} ellipsis={true}>
                        {renderConversationTitle(item)}
                      </Text>
                    }
                    description={item.updatedAt || item.createdAt}
                  />
                </List.Item>
              )}
            />
          </Spin>
        </Card>

        <Card style={{flex: 1}} bodyStyle={{display: 'flex', flexDirection: 'column', height: '100%', minHeight: 640}}>
          <Spin spinning={loadingMessages}>
            <div style={{flex: 1, overflowY: 'auto', paddingRight: 8, minHeight: 500}}>
              {!messages.length ? (
                <Empty description="请选择会话或发送新消息" />
              ) : (
                <Space direction="vertical" size={12} style={{width: '100%'}}>
                  {messages.map((item, index) => {
                    const isUser = item.role === 'user';
                    return (
                      <div key={item.id || `${item.role}-${index}`} style={{display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start'}}>
                        <Card size="small" style={{maxWidth: '80%', background: isUser ? '#e6f4ff' : undefined}}>
                          <Space direction="vertical" size={4}>
                            <Text type="secondary">{item.role || 'unknown'}</Text>
                            <Paragraph style={{whiteSpace: 'pre-wrap', marginBottom: 0}}>{item.content}</Paragraph>
                            {renderMessageMeta(item)}
                          </Space>
                        </Card>
                      </div>
                    );
                  })}
                  <div ref={messageEndRef} />
                </Space>
              )}
            </div>
          </Spin>
          <Space.Compact style={{width: '100%', marginTop: 16}}>
            <Input.TextArea
              value={input}
              disabled={sending}
              autoSize={{minRows: 2, maxRows: 6}}
              placeholder="请输入消息内容"
              onChange={(event) => setInput(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button type="primary" loading={sending} disabled={sending} onClick={handleSend}>
              发送
            </Button>
          </Space.Compact>
        </Card>
      </div>
    </PageContainer>
  );
};

export default ChatDebugPage;
```

- [ ] **Step 2: 运行类型检查**

Run: `npm run tsc`

Expected: 只允许既有基线错误；不得出现 `src/pages/agent/chat/index.tsx` 新错误。

---

### Task 4: 注册 Chat 调试路由

**Files:**
- Modify: `config/routes.ts`

- [ ] **Step 1: 在 Agent 平台 routes 中加入 Chat 调试**

在 `/agent/definition` 路由之后添加：

```ts
      {
        path: '/agent/chat',
        name: 'Chat 调试',
        component: './agent/chat',
      },
```

保持 `path: '*'` 的 404 路由仍然是数组最后一项。

- [ ] **Step 2: 运行路由验证**

Run: `npm run tsc`

Expected: 只允许既有基线错误；不得出现 `config/routes.ts` 新错误。

---

### Task 5: 最终验证

**Files:**
- Verify: `src/services/entity/Agent.ts`
- Verify: `src/services/agent/ChatController.ts`
- Verify: `src/services/agent/ConversationController.ts`
- Verify: `src/pages/agent/chat/index.tsx`
- Verify: `config/routes.ts`

- [ ] **Step 1: 运行 TypeScript 检查**

Run: `npm run tsc`

Expected: 只允许既有基线错误：`src/pages/user/member/index.tsx(78,29)` 和 `src/requestErrorConfig.ts(107,5)`。本次新增/修改文件不得出现在错误列表中。

- [ ] **Step 2: 检查 Chat 接口路径**

Run: `rg "/api/agent/chat" src/services/agent/ChatController.ts`

Expected: 包含 `POST /api/agent/chat` 对应路径。

- [ ] **Step 3: 检查 Conversation 接口路径**

Run: `rg "/api/agent/conversation" src/services/agent/ConversationController.ts`

Expected: 包含 `/list` 和 `/{id}/messages`。

- [ ] **Step 4: 检查 Agent 下拉只请求启用 Agent**

Run: `rg "status: 1|pageSize: 1000|getAgentDefinitionList" src/pages/agent/chat/index.tsx`

Expected: 三项均有匹配。

- [ ] **Step 5: 检查没有会话管理操作**

Run: `rg "close|delete|归档|关闭|删除" src/pages/agent/chat src/services/agent/ConversationController.ts`

Expected: 无匹配。

- [ ] **Step 6: 检查路由已注册**

Run: `rg "Chat 调试|/agent/chat|./agent/chat" config/routes.ts`

Expected: 三项均有匹配，且 404 路由仍在最后。

---

## 自检结果

- 规格覆盖：计划覆盖类型、服务、页面布局、Agent 选择、轻量会话列表、消息加载、首次聊天、继续会话、发送中禁用、路由和排除会话管理操作。
- 占位扫描：计划没有待补全的 TBD/TODO，也没有要求执行者自行设计未说明行为。
- 类型一致性：`AgentChatRequest`、`AgentConversation`、`AgentMessage`、服务函数名和页面导入名保持一致。
