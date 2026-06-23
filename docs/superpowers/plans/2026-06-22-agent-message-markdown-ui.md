# Agent 消息 Markdown 与样式优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Chat and Conversation messages as Markdown through a shared message bubble component and improve the Chat page layout and visual polish.

**Architecture:** Add `react-markdown` as a runtime dependency, create a reusable `AgentMessageBubble` component with scoped Less styles, and replace duplicated plain-text message rendering in Chat and Conversation pages. Move Chat page layout styles from inline style objects into `src/pages/agent/chat/index.less` while preserving existing send/load behavior.

**Tech Stack:** Umi Max, React, TypeScript, Ant Design, Ant Design Pro Components, Less, Jest, `react-markdown`.

---

## File Structure

- Modify: `package.json`
  - Add `react-markdown` via `npm install react-markdown`.
- Create: `src/components/AgentMessageBubble/index.tsx`
  - Shared Markdown message renderer.
- Create: `src/components/AgentMessageBubble/index.less`
  - Scoped message bubble and markdown typography styles.
- Modify: `src/pages/agent/chat/index.tsx`
  - Use `AgentMessageBubble`; add structured class names; remove message body `Paragraph` rendering.
- Create: `src/pages/agent/chat/index.less`
  - Chat layout and responsive styling.
- Modify: `src/pages/agent/conversation/index.tsx`
  - Use `AgentMessageBubble` in compact mode.

---

### Task 1: Add Markdown Dependency

**Files:**
- Modify: `package.json`
- Potentially modify local npm lockfile if npm creates or updates one

- [ ] **Step 1: Install dependency**

Run: `npm install react-markdown`

Expected: `package.json` includes `react-markdown` in `dependencies`. If npm updates a local lockfile, leave it as npm generated it.

- [ ] **Step 2: Verify dependency is present**

Run: `rg '"react-markdown"' package.json`

Expected: One dependency entry is found.

---

### Task 2: Add Shared Message Bubble Component

**Files:**
- Create: `src/components/AgentMessageBubble/index.tsx`
- Create: `src/components/AgentMessageBubble/index.less`

- [ ] **Step 1: Create component file**

Create `src/components/AgentMessageBubble/index.tsx`:

```tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import {Typography} from 'antd';
import {AgentMessage} from '@/services/entity/Agent';
import './index.less';

const {Text} = Typography;

export interface AgentMessageBubbleProps {
  message: AgentMessage;
  align?: 'left' | 'right';
  compact?: boolean;
}

const roleLabelMap: Record<string, string> = {
  user: 'User',
  assistant: 'Assistant',
  system: 'System',
  tool: 'Tool',
};

const getRole = (role?: string) => role || 'unknown';

const getAlign = (message: AgentMessage, align?: 'left' | 'right') => {
  if (align) {
    return align;
  }
  return message.role === 'user' ? 'right' : 'left';
};

const getMessageMeta = (message: AgentMessage) => {
  return [
    message.model ? `模型：${message.model}` : undefined,
    message.promptTokens !== undefined ? `Prompt：${message.promptTokens}` : undefined,
    message.completionTokens !== undefined ? `Completion：${message.completionTokens}` : undefined,
    message.totalTokens !== undefined ? `Total：${message.totalTokens}` : undefined,
    message.latencyMs !== undefined ? `耗时：${message.latencyMs}ms` : undefined,
    message.createdAt ? `时间：${message.createdAt}` : undefined,
  ].filter(Boolean);
};

const AgentMessageBubble: React.FC<AgentMessageBubbleProps> = ({message, align, compact}) => {
  const role = getRole(message.role);
  const placement = getAlign(message, align);
  const metas = getMessageMeta(message);
  const className = [
    'agent-message-bubble',
    `agent-message-bubble-${placement}`,
    `agent-message-bubble-role-${role}`,
    compact ? 'agent-message-bubble-compact' : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <div className="agent-message-bubble-card">
        <div className="agent-message-bubble-role">
          {roleLabelMap[role] || roleLabelMap.unknown || 'Unknown'}
        </div>
        <div className="agent-message-bubble-content">
          <ReactMarkdown>{message.content || ''}</ReactMarkdown>
        </div>
        {metas.length ? (
          <Text className="agent-message-bubble-meta" type="secondary">
            {metas.join(' / ')}
          </Text>
        ) : null}
      </div>
    </div>
  );
};

export default AgentMessageBubble;
```

- [ ] **Step 2: Create component styles**

Create `src/components/AgentMessageBubble/index.less`:

```less
.agent-message-bubble {
  display: flex;
  width: 100%;
  margin: 10px 0;

  &-left {
    justify-content: flex-start;
  }

  &-right {
    justify-content: flex-end;
  }

  &-compact {
    margin: 6px 0;
  }

  &-card {
    max-width: min(760px, 82%);
    padding: 14px 16px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
  }

  &-compact &-card {
    width: 100%;
    max-width: 100%;
    padding: 12px 14px;
    box-shadow: none;
  }

  &-right &-card {
    border-color: rgba(22, 119, 255, 0.16);
    background: linear-gradient(135deg, #e6f4ff 0%, #f0f7ff 100%);
  }

  &-role-system &-card,
  &-role-tool &-card,
  &-role-unknown &-card {
    background: #f8fafc;
  }

  &-role {
    margin-bottom: 8px;
    color: rgba(15, 23, 42, 0.55);
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &-content {
    color: rgba(15, 23, 42, 0.88);
    font-size: 14px;
    line-height: 1.7;

    > :first-child {
      margin-top: 0;
    }

    > :last-child {
      margin-bottom: 0;
    }

    p {
      margin: 0 0 10px;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      margin: 14px 0 8px;
      color: rgba(15, 23, 42, 0.95);
      font-weight: 700;
      line-height: 1.35;
    }

    h1 {
      font-size: 22px;
    }

    h2 {
      font-size: 19px;
    }

    h3 {
      font-size: 16px;
    }

    ul,
    ol {
      margin: 0 0 10px 20px;
      padding: 0;
      list-style-position: outside;
    }

    ul {
      list-style-type: disc;
    }

    ol {
      list-style-type: decimal;
    }

    li {
      margin: 4px 0;
    }

    blockquote {
      margin: 10px 0;
      padding: 8px 12px;
      border-left: 3px solid #91caff;
      border-radius: 8px;
      background: rgba(22, 119, 255, 0.06);
      color: rgba(15, 23, 42, 0.72);
    }

    code {
      padding: 2px 5px;
      border-radius: 5px;
      background: rgba(15, 23, 42, 0.08);
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 12px;
    }

    pre {
      margin: 10px 0;
      padding: 12px 14px;
      overflow-x: auto;
      border-radius: 12px;
      background: #111827;
      color: #e5e7eb;

      code {
        padding: 0;
        background: transparent;
        color: inherit;
        font-size: 13px;
        line-height: 1.6;
      }
    }

    a {
      color: #1677ff;
    }
  }

  &-meta {
    display: block;
    margin-top: 10px;
    font-size: 12px;
    line-height: 1.5;
  }
}

@media (max-width: 768px) {
  .agent-message-bubble-card {
    max-width: 94%;
  }
}
```

- [ ] **Step 3: Verify component uses react-markdown**

Run: `rg "ReactMarkdown|react-markdown" src/components/AgentMessageBubble/index.tsx`

Expected: Finds import and usage.

---

### Task 3: Refactor Chat Page To Use Shared Component

**Files:**
- Modify: `src/pages/agent/chat/index.tsx`
- Create: `src/pages/agent/chat/index.less`

- [ ] **Step 1: Update imports**

In `src/pages/agent/chat/index.tsx`, remove `Card`, `List`, `Space`, and `Typography` usage from message rendering if unused after the refactor, import the new component and stylesheet:

```ts
import AgentMessageBubble from '@/components/AgentMessageBubble';
import './index.less';
```

Keep Ant Design imports that are still used:

```ts
import {Button, Card, Empty, Input, List, message, Select, Spin, Typography} from 'antd';
```

After refactor, `Typography` is used only for `Text` in the sidebar and header.

- [ ] **Step 2: Add current agent label helper**

Add this helper below `renderConversationTitle`:

```ts
  const currentAgent = agents.find((item) => item.id === agentId);
  const currentConversation = conversations.find((item) => item.id === conversationId);
```

- [ ] **Step 3: Replace JSX layout with class-based layout**

Replace the current return block in `src/pages/agent/chat/index.tsx` with:

```tsx
  return (
    <PageContainer>
      <div className="agent-chat-page">
        <Card className="agent-chat-sidebar" bodyStyle={{padding: 0}}>
          <div className="agent-chat-sidebar-header">
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
            <Button type="primary" block={true} onClick={handleNewConversation}>
              新建会话
            </Button>
          </div>
          <Spin spinning={loadingConversations}>
            <List
              className="agent-chat-session-list"
              dataSource={conversations}
              locale={{emptyText: '暂无会话'}}
              renderItem={(item) => (
                <List.Item
                  className={item.id === conversationId ? 'agent-chat-session-active' : undefined}
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

        <Card className="agent-chat-panel" bodyStyle={{padding: 0}}>
          <div className="agent-chat-panel-header">
            <div>
              <Text strong={true}>{currentAgent?.name || currentAgent?.code || '未选择 Agent'}</Text>
              <div className="agent-chat-panel-subtitle">
                {currentConversation ? renderConversationTitle(currentConversation) : '新会话'}
              </div>
            </div>
            {conversationId ? <Text type="secondary">会话：{conversationId}</Text> : null}
          </div>

          <Spin spinning={loadingMessages} wrapperClassName="agent-chat-message-spin">
            <div className="agent-chat-message-list">
              {!messages.length ? (
                <Empty description="请选择会话或发送新消息" />
              ) : (
                <>
                  {messages.map((item, index) => (
                    <AgentMessageBubble
                      key={item.id || `${item.role}-${index}`}
                      message={item}
                    />
                  ))}
                  <div ref={messageEndRef} />
                </>
              )}
            </div>
          </Spin>

          <div className="agent-chat-input-bar">
            <Input.TextArea
              value={input}
              disabled={sending}
              autoSize={{minRows: 2, maxRows: 6}}
              placeholder="支持 Markdown，Shift+Enter 换行"
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
          </div>
        </Card>
      </div>
    </PageContainer>
  );
```

- [ ] **Step 4: Create Chat page styles**

Create `src/pages/agent/chat/index.less`:

```less
.agent-chat-page {
  display: flex;
  gap: 16px;
  min-height: calc(100vh - 190px);
}

.agent-chat-sidebar {
  width: 320px;
  flex: 0 0 320px;
  overflow: hidden;
  border-radius: 16px;
}

.agent-chat-sidebar-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid rgba(5, 5, 5, 0.06);
  background: #fff;
}

.agent-chat-session-list {
  max-height: calc(100vh - 330px);
  overflow-y: auto;

  .ant-list-item {
    padding: 12px 16px;
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
      background: #f5f8ff;
    }
  }

  .agent-chat-session-active {
    background: #e6f4ff;
  }
}

.agent-chat-panel {
  flex: 1;
  overflow: hidden;
  border-radius: 18px;
}

.agent-chat-panel .ant-card-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: calc(100vh - 190px);
}

.agent-chat-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(5, 5, 5, 0.06);
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.agent-chat-panel-subtitle {
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.agent-chat-message-spin {
  flex: 1;
  min-height: 0;
}

.agent-chat-message-spin .ant-spin-container {
  height: 100%;
}

.agent-chat-message-list {
  height: 100%;
  min-height: 460px;
  padding: 20px;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, rgba(22, 119, 255, 0.08), transparent 28%),
    linear-gradient(180deg, #f7f9fc 0%, #f3f6fb 100%);
}

.agent-chat-input-bar {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  padding: 16px 20px;
  border-top: 1px solid rgba(5, 5, 5, 0.06);
  background: #fff;

  .ant-input {
    border-radius: 12px;
  }

  .ant-btn {
    height: 40px;
    border-radius: 12px;
  }
}

@media (max-width: 900px) {
  .agent-chat-page {
    flex-direction: column;
  }

  .agent-chat-sidebar {
    width: 100%;
    flex-basis: auto;
  }

  .agent-chat-session-list {
    max-height: 260px;
  }

  .agent-chat-panel .ant-card-body {
    min-height: 640px;
  }

  .agent-chat-panel-header {
    flex-direction: column;
  }

  .agent-chat-input-bar {
    flex-direction: column;

    .ant-btn {
      width: 100%;
    }
  }
}
```

- [ ] **Step 5: Verify Chat uses shared message component**

Run: `rg "AgentMessageBubble|支持 Markdown" src/pages/agent/chat/index.tsx`

Expected: Finds component import/usage and placeholder text.

---

### Task 4: Refactor Conversation Message Rendering

**Files:**
- Modify: `src/pages/agent/conversation/index.tsx`

- [ ] **Step 1: Update imports**

In `src/pages/agent/conversation/index.tsx`, remove `List`, `Space`, and `Typography` imports when no longer used for messages, and add:

```ts
import AgentMessageBubble from '@/components/AgentMessageBubble';
```

Ant Design import must become:

```ts
import {Button, Card, Drawer, Empty, message, Popconfirm, Spin} from 'antd';
```

- [ ] **Step 2: Remove local message meta renderer**

Delete the local `renderMessageMeta` function. The shared component now owns meta rendering.

- [ ] **Step 3: Replace drawer message list content**

Replace the `Card title="消息列表"` body content with:

```tsx
          <Card title="消息列表" style={{marginTop: 16}}>
            {!messages.length ? (
              <Empty description="暂无消息" />
            ) : (
              <div className="agent-conversation-message-list">
                {messages.map((item, index) => (
                  <AgentMessageBubble
                    key={item.id || `${item.role}-${index}`}
                    message={item}
                    compact={true}
                  />
                ))}
              </div>
            )}
          </Card>
```

- [ ] **Step 4: Verify Conversation uses compact shared component**

Run: `rg "AgentMessageBubble|compact=\{true\}" src/pages/agent/conversation/index.tsx`

Expected: Finds import and compact usage.

---

### Task 5: Verify Markdown UI Implementation

**Files:**
- Inspect: `package.json`
- Inspect: `src/components/AgentMessageBubble/index.tsx`
- Inspect: `src/components/AgentMessageBubble/index.less`
- Inspect: `src/pages/agent/chat/index.tsx`
- Inspect: `src/pages/agent/chat/index.less`
- Inspect: `src/pages/agent/conversation/index.tsx`

- [ ] **Step 1: Run full Jest suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run TypeScript check**

Run: `npm run tsc`

Expected: Either PASS, or FAIL only with known baseline errors in `src/pages/user/member/index.tsx` and `src/requestErrorConfig.ts`.

- [ ] **Step 3: Verify markdown dependency**

Run: `rg '"react-markdown"' package.json`

Expected: Finds dependency entry.

- [ ] **Step 4: Verify both pages use shared component**

Run: `rg "AgentMessageBubble" src/pages/agent/chat src/pages/agent/conversation`

Expected: Finds usage in both pages.

- [ ] **Step 5: Verify old plain message renderer is gone**

Run: `rg "whiteSpace: 'pre-wrap'|whiteSpace=\"pre-wrap\"|<Paragraph" src/pages/agent/chat src/pages/agent/conversation`

Expected: No matches.

- [ ] **Step 6: Review git status**

Run: `git status --short`

Expected: Shows intended new/modified files. Do not revert unrelated existing changes such as `src/app.tsx` or `docs/FRONTEND.md`.

---

## Notes For Executor

- Do not commit. The user previously requested no commits for this workflow.
- Use `apply_patch` for manual edits.
- Keep the Markdown renderer safe: do not add `rehype-raw` or render raw HTML.
- Do not add code highlighting, copy buttons, or message actions in this task.
