# Unique Citation Anchors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure knowledge base citation anchors in AgentMessageBubble are unique per message to prevent cross-message navigation.

**Architecture:** Modify the `remarkCitations` function to include message ID in anchor URLs, and update the corresponding anchor IDs in the knowledge sources section.

**Tech Stack:** React, TypeScript, ReactMarkdown, remark plugin

---

### Task 1: Update remarkCitations function signature

**Files:**

- Modify: `src/components/AgentMessageBubble/index.tsx:51-75`

- [ ] **Step 1: Add messageId parameter to remarkCitations**

```typescript
const remarkCitations = (sources: KnowledgeSource[], messageId?: string) => () => (tree: any) => {
  const validIndexes = new Set(sources.map((source) => source.citationIndex));
  const prefix = messageId ? `${messageId}-` : '';
  const visit = (node: any) => {
    if (node.type === 'link' || !Array.isArray(node.children)) {
      return;
    }
    node.children = node.children.reduce((children: any[], child: any) => {
      if (child.type !== 'text') {
        visit(child);
        children.push(child);
        return children;
      }
      const parts = child.value.split(/(\u3010\d+\u3011)/g);
      parts.forEach((part: string) => {
        const match = /^\u3010(\d+)\u3011$/.exec(part);
        const citationIndex = match ? Number(match[1]) : undefined;
        children.push(
          citationIndex !== undefined && validIndexes.has(citationIndex)
            ? {
                type: 'link',
                url: `#knowledge-source-${prefix}${citationIndex}`,
                children: [{ type: 'text', value: part }],
              }
            : { type: 'text', value: part },
        );
      });
      return children;
    }, []);
  };
  visit(tree);
};
```

- [ ] **Step 2: Update remarkCitations usage in renderContent**

```typescript
// In renderContent function, update the ReactMarkdown remarkPlugins
<ReactMarkdown remarkPlugins={[remarkGfm, remarkCitations(agentMessage.sources || [], agentMessage.id || agentMessage.clientId)]}>
  {currentContent}
</ReactMarkdown>
```

- [ ] **Step 3: Verify the change compiles**

Run: `npm run tsc` Expected: No TypeScript errors

### Task 2: Update knowledge sources anchor IDs

**Files:**

- Modify: `src/components/AgentMessageBubble/index.tsx:275-276`

- [ ] **Step 1: Update anchor ID in knowledge sources**

```typescript
// In the knowledge sources section, update the article id
<article
  id={`knowledge-source-${agentMessage.id || agentMessage.clientId || 'unknown'}-${source.citationIndex}`}
  key={source.chunkId}
  className="agent-message-bubble-source"
>
```

- [ ] **Step 2: Verify the change compiles**

Run: `npm run tsc` Expected: No TypeScript errors

### Task 3: Update tests for unique anchors

**Files:**

- Modify: `src/components/AgentMessageBubble/index.test.tsx`

- [ ] **Step 1: Add test for unique anchor IDs**

```typescript
it('generates unique anchor IDs for citations across messages', () => {
  const { container } = render(
    <AgentMessageBubble
      agentMessage={{
        id: 'msg-123',
        role: 'assistant',
        content: '参考 【1】 和 【2】',
        sources: [
          { chunkId: 'chunk-1', citationIndex: 1, content: 'Source 1' },
          { chunkId: 'chunk-2', citationIndex: 2, content: 'Source 2' },
        ],
      }}
    />,
  );

  const citationLink = container.querySelector('a[href="#knowledge-source-msg-123-1"]');
  expect(citationLink).toBeTruthy();
  expect(citationLink?.textContent).toBe('【1】');

  const sourceAnchor = container.querySelector('#knowledge-source-msg-123-1');
  expect(sourceAnchor).toBeTruthy();
});
```

- [ ] **Step 2: Run the test**

Run: `npm run test -- --testPathPattern=AgentMessageBubble` Expected: Test passes

### Task 4: Handle edge cases for missing message IDs

**Files:**

- Modify: `src/components/AgentMessageBubble/index.tsx`

- [ ] **Step 1: Add fallback for missing message ID**

```typescript
// In renderContent, ensure we have a valid prefix
const messageIdPrefix = agentMessage.id || agentMessage.clientId || `msg-${Math.random().toString(36).substr(2, 9)}`

// Update ReactMarkdown usage
<ReactMarkdown remarkPlugins={[remarkGfm, remarkCitations(agentMessage.sources || [], messageIdPrefix)]}>
  {currentContent}
</ReactMarkdown>

// Update knowledge sources anchor
<article
  id={`knowledge-source-${messageIdPrefix}-${source.citationIndex}`}
  key={source.chunkId}
  className="agent-message-bubble-source"
>
```

- [ ] **Step 2: Verify the change compiles**

Run: `npm run tsc` Expected: No TypeScript errors

### Task 5: Run full test suite and lint

**Files:**

- None

- [ ] **Step 1: Run all tests**

Run: `npm run test` Expected: All tests pass

- [ ] **Step 2: Run lint**

Run: `npm run lint` Expected: No lint errors

- [ ] **Step 3: Commit changes**

```bash
git add src/components/AgentMessageBubble/index.tsx src/components/AgentMessageBubble/index.test.tsx
git commit -m "fix: ensure citation anchors are unique per message

- Modified remarkCitations to include messageId in anchor URLs
- Updated knowledge sources to use message-specific anchor IDs
- Added fallback for missing message IDs
- Added test for unique anchor generation"
```
