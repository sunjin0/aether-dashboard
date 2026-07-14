const React = require('react');
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { history } from '@umijs/max';
import RouteTabs, { resetRouteMenus, setRouteMenus } from '.';

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
}));

jest.mock('antd', () => ({
  Tabs: ({ activeKey, items, onChange, onEdit }: any) => (
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
    </div>
  ),
}));

jest.mock('react-activation', () => ({
  KeepAlive: ({ children }: any) => <>{children}</>,
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
  });
});
