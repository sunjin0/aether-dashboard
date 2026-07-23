const React = require('react');
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import AgentMessageBubble from './index';
import { KnowledgeSource } from '@/services/entity/Agent';
import enUS from '@/locales/en-US';

const renderWithEnglishLocale = (ui: any) =>
  render(React.createElement(IntlProvider as any, { locale: 'en-US', messages: enUS }, ui));

describe('AgentMessageBubble', () => {
  it('renders markdown content and message metadata', () => {
    renderWithEnglishLocale(
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
    expect(screen.getByText('Assistant')).toBeTruthy();
    expect(screen.queryByText('🤖')).toBeNull();
    expect(screen.getByText(/Model: gpt-test/)).toBeTruthy();
    expect(screen.getByText(/Latency: 42ms/)).toBeTruthy();
  });

  it('renders GFM tables as semantic table elements', () => {
    renderWithEnglishLocale(
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
    const { container } = renderWithEnglishLocale(
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
    expect(screen.getByText('Sources (2)')).toBeTruthy();
  });

  it('uses the unknown role label for unrecognized backend roles', () => {
    renderWithEnglishLocale(
      <AgentMessageBubble
        agentMessage={{
          role: 'function',
          content: 'Function response',
        }}
      />,
    );

    expect(screen.getByText('Unknown')).toBeTruthy();
  });

  it('formats yesterday using the localized time interpolation', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(13, 5, 0, 0);
    const formattedTime = yesterday.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    renderWithEnglishLocale(
      <AgentMessageBubble
        agentMessage={{
          role: 'assistant',
          content: 'Yesterday response',
          createdAt: yesterday.getTime(),
        }}
      />,
    );

    expect(screen.getByText(`Yesterday at ${formattedTime}`)).toBeTruthy();
  });

  it('renders the Unix epoch timestamp', () => {
    const epoch = new Date(0);
    const formattedDate = epoch.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    renderWithEnglishLocale(
      <AgentMessageBubble
        agentMessage={{
          role: 'assistant',
          content: 'Epoch response',
          createdAt: 0,
        }}
      />,
    );

    expect(screen.getByText(formattedDate)).toBeTruthy();
  });
});
