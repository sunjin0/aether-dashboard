import React from 'react';
import { render, screen } from '@testing-library/react';
import AgentMessageBubble from './index';
import { KnowledgeSource } from '@/services/entity/Agent';

describe('AgentMessageBubble', () => {
  it('renders markdown content and message metadata', () => {
    render(
      <AgentMessageBubble
        agentMessage={{
          role: 'assistant',
          content: '## Title\n\n- first item\n\n```ts\nconst ok = true;\n```',
          model: 'gpt-test',
          promptTokens: 1,
          completionTokens: 2,
          totalTokens: 3,
          latencyMs: 42,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Title' })).toBeTruthy();
    expect(screen.getByText('first item')).toBeTruthy();
    expect(screen.getByText(/const ok = true/)).toBeTruthy();
    expect(screen.getByText('助手')).toBeTruthy();
    expect(screen.queryByText('🤖')).toBeNull();
    expect(screen.getByText(/模型: gpt-test/)).toBeTruthy();
    expect(screen.getByText(/耗时: 42ms/)).toBeTruthy();
  });

  it('renders GFM tables as semantic table elements', () => {
    render(
      <AgentMessageBubble
        agentMessage={{
          role: 'assistant',
          content: '| 工具 | 能干嘛 |\n| --- | --- |\n| 搜索代码 | 搜索代码片段 |',
        }}
      />,
    );

    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '工具' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: '搜索代码' })).toBeTruthy();
  });

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
});
