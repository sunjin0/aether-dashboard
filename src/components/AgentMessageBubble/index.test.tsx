import React from 'react';
import {render, screen} from '@testing-library/react';
import AgentMessageBubble from './index';

describe('AgentMessageBubble', () => {
  it('renders markdown content and message metadata', () => {
    render(
      <AgentMessageBubble
        message={{
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

    expect(screen.getByRole('heading', {name: 'Title'})).toBeTruthy();
    expect(screen.getByText('first item')).toBeTruthy();
    expect(screen.getByText(/const ok = true/)).toBeTruthy();
    expect(screen.getByText('Assistant')).toBeTruthy();
    expect(screen.getByText(/模型：gpt-test/)).toBeTruthy();
    expect(screen.getByText(/耗时：42ms/)).toBeTruthy();
  });
});
