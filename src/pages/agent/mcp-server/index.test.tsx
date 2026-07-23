import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import McpServerPage from './index';

const mockDiscoverMcpServerTools = jest.fn();

jest.mock('@/services/agent/McpServerController', () => ({
  deleteMcpServer: jest.fn(),
  discoverMcpServerTools: (...args: unknown[]) => mockDiscoverMcpServerTools(...args),
  getMcpServerList: jest.fn(),
  importMcpServerTools: jest.fn(),
  updateMcpServer: jest.fn(),
}));

jest.mock('@/services/agent/ToolController', () => ({
  getAgentToolList: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock('@/services/sys/DictController', () => ({ getOptionList: jest.fn() }));
jest.mock('./McpServerForm', () => () => null);
jest.mock('@/components/JsonDisplay', () => () => null);

jest.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children }: any) => <>{children}</>,
  ProTable: ({ columns }: any) => (
    <button
      type="button"
      onClick={() =>
        columns
          .find((column: any) => column.valueType === 'option')
          .render(null, { id: 'server-1' })[0]
          .props.onClick()
      }
    >
      Discover
    </button>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');
  return {
    Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    Checkbox: ({ checked, onChange, children }: any) => (
      <label>
        <input type="checkbox" checked={checked} onChange={onChange} />
        {children}
      </label>
    ),
    Drawer: ({ children }: any) => <>{children}</>,
    Empty: () => null,
    Input: { Search: () => null },
    Modal: ({ children, open }: any) => (open ? <>{children}</> : null),
    Popconfirm: ({ children }: any) => <>{children}</>,
    Space: ({ children }: any) => <div>{children}</div>,
    Tag: ({ children }: any) => <>{children}</>,
    Typography: {
      Text: ({ children }: any) => <span>{children}</span>,
      Paragraph: ({ children }: any) => <p>{children}</p>,
    },
    message: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
  };
});

jest.mock('@@/exports', () => ({
  FormattedMessage: () => null,
  history: { location: { pathname: '/agent/mcp-server' } },
  useAccess: () => ({ '/agent/mcp-server': true }),
  useIntl: () => ({ formatMessage: ({ id }: any) => id }),
}));

describe('McpServerPage', () => {
  it('selects a tool when its card is clicked', async () => {
    mockDiscoverMcpServerTools.mockResolvedValue({
      code: 200,
      data: [{ name: 'weather', description: 'Gets weather' }],
    });

    render(<McpServerPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Discover' }));

    const card = await screen.findByRole('checkbox', { name: 'weather' });
    fireEvent.click(card);

    await waitFor(() => expect(card.getAttribute('aria-checked')).toBe('true'));
  });
});
