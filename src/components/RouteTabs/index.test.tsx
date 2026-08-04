const React = require('react');
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { history } from '@umijs/max';
import RouteTabs, { resetRouteMenus, setRouteMenus } from '.';

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
  useIntl: () => ({
    locale: 'zh-CN',
    formatMessage: ({ id }: { id: string }) =>
      ({
        'components.routeTabs.dashboard': '仪表盘',
        'components.routeTabs.aiReviewWorkspace': 'AI 审阅工作台',
        'components.routeTabs.humanReview': '人工审批',
        'components.routeTabs.workflowEditor': '工作流编排',
        'components.routeTabs.workflowRun': '工作流运行',
        'components.routeTabs.actions': '标签操作',
        'components.routeTabs.refresh': '刷新当前页',
        'components.routeTabs.closeOthers': '关闭其他标签',
        'components.routeTabs.closeAll': '关闭全部标签',
      })[id] || id,
  }),
}));

jest.mock('antd', () => ({
  Tabs: ({ activeKey, items, onChange, onEdit, tabBarExtraContent }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.key}>
          <button aria-pressed={item.key === activeKey} onClick={() => onChange(item.key)}>
            {item.label}
          </button>
          {item.closable && (
            <button aria-label={`close-${item.key}`} onClick={() => onEdit(item.key, 'remove')}>
              close
            </button>
          )}
        </div>
      ))}
      {tabBarExtraContent}
    </div>
  ),
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Dropdown: ({ children, menu }: any) => (
    <div>
      {children}
      {menu.items.map((item: any) =>
        item.type === 'divider' ? null : (
          <button key={item.key} onClick={() => menu.onClick({ key: item.key })}>
            {item.label}
          </button>
        ),
      )}
    </div>
  ),
}));

const mockDrop = jest.fn();
const mockRefresh = jest.fn();

jest.mock('react-activation', () => ({
  KeepAlive: ({ children }: any) => <>{children}</>,
  useAliveController: () => ({ drop: mockDrop, refresh: mockRefresh }),
}));

describe('RouteTabs', () => {
  const menus = [
    { name: '仪表盘', path: '/dashboard' },
    {
      name: '消息中心',
      path: '/msg',
      children: [{ name: '短信管理（接口）', path: '/msg/sms' }],
    },
  ];

  beforeEach(() => {
    resetRouteMenus();
    jest.clearAllMocks();
  });

  it('tracks visited routes as closable tabs and navigates from a tab', () => {
    setRouteMenus(menus);
    const { rerender } = render(
      <RouteTabs pathname="/dashboard">
        <div>Dashboard</div>
      </RouteTabs>,
    );

    rerender(
      <RouteTabs pathname="/msg/sms">
        <div>SMS</div>
      </RouteTabs>,
    );

    expect(screen.getByRole('button', { name: '仪表盘' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '短信管理（接口）' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '仪表盘' }));

    expect(history.push).toHaveBeenCalledWith('/dashboard');
  });

  it('waits for menus before rendering a route label', async () => {
    render(
      <RouteTabs pathname="/msg/sms">
        <div>SMS</div>
      </RouteTabs>,
    );

    expect(screen.queryByRole('button', { name: '/msg/sms' })).toBeNull();

    setRouteMenus(menus);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '短信管理（接口）' })).toBeTruthy();
    });
  });

  it('renders the dashboard tab before menus load', () => {
    render(
      <RouteTabs pathname="/dashboard">
        <div>Dashboard</div>
      </RouteTabs>,
    );

    expect(screen.getByRole('button', { name: '仪表盘' })).toBeTruthy();
  });

  it('uses names for hidden dynamic review routes', async () => {
    const { rerender } = render(
      <RouteTabs pathname="/knowledge/document/document-1/review">
        <div>AI review</div>
      </RouteTabs>,
    );

    setRouteMenus(menus);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'AI 审阅工作台' })).toBeTruthy();
    });

    rerender(
      <RouteTabs pathname="/knowledge/reviews/task-1">
        <div>Human review</div>
      </RouteTabs>,
    );

    expect(screen.getByRole('button', { name: '人工审批' })).toBeTruthy();
  });

  it('uses names for hidden dynamic workflow routes', async () => {
    const { rerender } = render(
      <RouteTabs pathname="/workflow/workflow/workflow-1">
        <div>Workflow editor</div>
      </RouteTabs>,
    );

    setRouteMenus(menus);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '工作流编排' })).toBeTruthy();
    });

    rerender(
      <RouteTabs pathname="/workflow/workflow/workflow-1/run">
        <div>Workflow run</div>
      </RouteTabs>,
    );

    expect(screen.getByRole('button', { name: '工作流运行' })).toBeTruthy();
  });

  it('keeps labels for legacy workflow dynamic routes', async () => {
    const { rerender } = render(
      <RouteTabs pathname="/agent/workflow/workflow-1">
        <div>Legacy workflow editor</div>
      </RouteTabs>,
    );

    setRouteMenus(menus);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '工作流编排' })).toBeTruthy();
    });

    rerender(
      <RouteTabs pathname="/agent/workflow/workflow-1/run">
        <div>Legacy workflow run</div>
      </RouteTabs>,
    );

    expect(screen.getByRole('button', { name: '工作流运行' })).toBeTruthy();
  });

  it('does not create a tab for the root route before its dashboard redirect', () => {
    const { rerender } = render(
      <RouteTabs pathname="/">
        <div>Redirecting</div>
      </RouteTabs>,
    );

    rerender(
      <RouteTabs pathname="/dashboard">
        <div>Dashboard</div>
      </RouteTabs>,
    );

    expect(screen.queryByRole('button', { name: '/' })).toBeNull();
    expect(screen.getAllByRole('button', { name: '仪表盘' })).toHaveLength(1);
  });

  it('navigates to the previous tab when closing the active tab', () => {
    setRouteMenus(menus);
    const { rerender } = render(
      <RouteTabs pathname="/dashboard">
        <div>Dashboard</div>
      </RouteTabs>,
    );

    rerender(
      <RouteTabs pathname="/msg/sms">
        <div>SMS</div>
      </RouteTabs>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'close-/msg/sms' }));

    expect(history.push).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByRole('button', { name: '短信管理（接口）' })).toBeNull();
    expect(mockDrop).toHaveBeenCalledWith('/msg/sms');
  });

  it('refreshes the active tab through the keep-alive controller', () => {
    render(
      <RouteTabs pathname="/dashboard">
        <div>Dashboard</div>
      </RouteTabs>,
    );

    fireEvent.click(screen.getByRole('button', { name: '刷新当前页' }));

    expect(mockRefresh).toHaveBeenCalledWith('/dashboard');
  });

  it('closes all non-dashboard tabs and returns to the dashboard', () => {
    setRouteMenus(menus);
    const { rerender } = render(
      <RouteTabs pathname="/dashboard">
        <div>Dashboard</div>
      </RouteTabs>,
    );

    rerender(
      <RouteTabs pathname="/msg/sms">
        <div>SMS</div>
      </RouteTabs>,
    );

    fireEvent.click(screen.getByRole('button', { name: '关闭全部标签' }));

    expect(mockDrop).toHaveBeenCalledWith('/msg/sms');
    expect(history.push).toHaveBeenCalledWith('/dashboard');
  });
});
