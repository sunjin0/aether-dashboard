import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import InteractiveQuestionCard from './index';

describe('InteractiveQuestionCard', () => {
  it('renders a confirmation layout for MCP tool approvals', () => {
    const onSubmit = jest.fn();

    render(
      <InteractiveQuestionCard
        questionConfig={{
          type: 'group',
          layout: 'confirm',
          question: '请确认 MCP 工具调用',
          questions: [
            {
              id: 'confirm',
              type: 'confirm',
              question: 'AI 请求调用 MCP 工具，请核对调用详情后确认。',
              confirmText: '确认执行',
              cancelText: '拒绝执行',
            },
          ],
          approvalType: 'mcp_tool_approval',
          toolName: 'list_commits',
          arguments: { owner: 'sunjin0', repo: 'aether', sha: 'master' },
          riskLevel: 'medium',
          riskReason: '无法确认调用是否只读，按中风险处理',
        }}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('工具调用确认')).toBeTruthy();
    expect(screen.getByText('list_commits')).toBeTruthy();
    expect(screen.getByText('中风险')).toBeTruthy();
    expect(screen.getByText(/"owner": "sunjin0"/)).toBeTruthy();
    expect(screen.queryByText('多项提问')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /确认执行/ }));

    expect(onSubmit).toHaveBeenCalledWith({ confirm: { confirmed: true } });
  });

  it('renders tool details and authorization choices for choice-based confirmations', () => {
    const onSubmit = jest.fn();

    render(
      <InteractiveQuestionCard
        questionConfig={{
          type: 'group',
          layout: 'confirm',
          question: '请确认 MCP 工具调用',
          questions: [
            {
              id: 'decision',
              type: 'choice',
              question: 'AI 请求调用 MCP 工具，请核对调用详情后确认。',
              multiple: false,
              options: [
                { id: 'once', label: '仅本次执行', value: 'once' },
                { id: 'allow_10m', label: '当前工具 10 分钟内免确认', value: 'allow_10m' },
                { id: 'reject', label: '拒绝执行', value: 'reject' },
              ],
            },
          ],
          toolName: 'search_commits',
          arguments: { perPage: 10, query: 'author:sunjin0' },
          riskLevel: 'low',
          riskReason: '调用看起来是只读查询；仍需用户确认后才会发送',
        }}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('search_commits')).toBeTruthy();
    expect(screen.getByText('低风险')).toBeTruthy();
    expect(screen.getByText('仅本次执行')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('仅本次执行'));
    fireEvent.click(screen.getByRole('button', { name: /确\s*认/ }));

    expect(onSubmit).toHaveBeenCalledWith({ decision: { selected: 'once' } });
  });
});
