import { Button, Dropdown, Tabs } from 'antd';
import type { MenuProps, TabsProps } from 'antd';
import { CloseOutlined, DownOutlined, ReloadOutlined } from '@ant-design/icons';
import { history, useIntl } from '@umijs/max';
import { KeepAlive, useAliveController } from 'react-activation';
import React, { useEffect, useState } from 'react';
import './index.less';

type RouteTab = {
  key: string;
  label: string;
  closable: boolean;
};

type MenuItem = {
  name?: string;
  path?: string;
  children?: MenuItem[];
};

type RouteTabsProps = {
  pathname: string;
  children: React.ReactNode;
};

let routeMenus: MenuItem[] = [];
let routeMenusLoaded = false;
const menuListeners = new Set<() => void>();

export const setRouteMenus = (menus: MenuItem[]) => {
  routeMenus = menus;
  routeMenusLoaded = true;
  menuListeners.forEach((listener) => listener());
};

export const resetRouteMenus = () => {
  routeMenus = [];
  routeMenusLoaded = false;
  menuListeners.forEach((listener) => listener());
};

const findMenuName = (menus: MenuItem[], pathname: string): string | undefined => {
  for (const menu of menus) {
    if (menu.path === pathname) {
      return menu.name;
    }
    const childName = findMenuName(menu.children || [], pathname);
    if (childName) {
      return childName;
    }
  }
  return undefined;
};

const getRouteLabel = (
  pathname: string,
  menus: MenuItem[],
  formatMessage: ReturnType<typeof useIntl>['formatMessage'],
): string => {
  if (/^\/knowledge\/base\/[^/]+$/.test(pathname))
    return formatMessage({ id: 'components.routeTabs.documentManagement' });
  if (/^\/knowledge\/document\/[^/]+$/.test(pathname))
    return formatMessage({ id: 'components.routeTabs.documentDetails' });
  if (/^\/knowledge\/document\/[^/]+\/review$/.test(pathname))
    return formatMessage({ id: 'components.routeTabs.aiReviewWorkspace' });
  if (pathname.endsWith('/versions') && pathname.startsWith('/knowledge/document/'))
    return formatMessage({ id: 'components.routeTabs.versionHistory' });
  if (/^\/knowledge\/reviews\/[^/]+$/.test(pathname))
    return formatMessage({ id: 'components.routeTabs.humanReview' });
  if (/^\/knowledge\/evaluation\/sets\/[^/]+\/runs\/[^/]+$/.test(pathname))
    return formatMessage({ id: 'components.routeTabs.evaluationRun' });
  if (/^\/knowledge\/evaluation\/sets\/[^/]+$/.test(pathname))
    return formatMessage({ id: 'components.routeTabs.evaluationWorkspace' });
  if (/^\/(?:agent\/workflow|workflow\/workflow)\/[^/]+\/run$/.test(pathname))
    return formatMessage({ id: 'components.routeTabs.workflowRun' });
  if (/^\/(?:agent\/workflow|workflow\/workflow)\/[^/]+$/.test(pathname))
    return formatMessage({ id: 'components.routeTabs.workflowEditor' });
  return pathname === '/dashboard'
    ? formatMessage({ id: 'components.routeTabs.dashboard' })
    : findMenuName(menus, pathname) || pathname;
};

const getTab = (
  pathname: string,
  menus: MenuItem[],
  formatMessage: ReturnType<typeof useIntl>['formatMessage'],
): RouteTab => ({
  key: pathname,
  label: getRouteLabel(pathname, menus, formatMessage),
  closable: pathname !== '/dashboard',
});

const RouteTabs = ({ pathname, children }: RouteTabsProps) => {
  const intl = useIntl();
  const routePath = pathname === '/' ? '/dashboard' : pathname;
  const [menus, setMenus] = useState(routeMenus);
  const [menusLoaded, setMenusLoaded] = useState(routeMenusLoaded);
  const [tabs, setTabs] = useState<RouteTab[]>(() => [
    getTab(routePath, routeMenus, intl.formatMessage),
  ]);
  const { drop, refresh } = useAliveController();

  useEffect(() => {
    const updateMenus = () => {
      setMenus(routeMenus);
      setMenusLoaded(routeMenusLoaded);
    };
    menuListeners.add(updateMenus);
    return () => {
      menuListeners.delete(updateMenus);
    };
  }, []);

  useEffect(() => {
    setTabs((previousTabs) =>
      previousTabs.some((tab) => tab.key === routePath)
        ? previousTabs
        : [...previousTabs, getTab(routePath, menus, intl.formatMessage)],
    );
  }, [menus, routePath]);

  const closeTab = (targetKey: string) => {
    if (targetKey === '/dashboard') return;
    const targetIndex = tabs.findIndex((tab) => tab.key === targetKey);
    const nextTabs = tabs.filter((tab) => tab.key !== targetKey);
    drop(targetKey);
    setTabs(nextTabs);

    if (targetKey === routePath && nextTabs.length > 0) {
      history.push(nextTabs[Math.max(0, targetIndex - 1)].key);
    }
  };

  const refreshTab = () => {
    refresh(routePath);
  };

  const closeOtherTabs = () => {
    const nextTabs = tabs.filter((tab) => tab.key === '/dashboard' || tab.key === routePath);
    tabs
      .filter((tab) => !nextTabs.some((nextTab) => nextTab.key === tab.key))
      .forEach((tab) => drop(tab.key));
    setTabs(nextTabs);
  };

  const closeAllTabs = () => {
    tabs.filter((tab) => tab.key !== '/dashboard').forEach((tab) => drop(tab.key));
    setTabs((previousTabs) => previousTabs.filter((tab) => tab.key === '/dashboard'));
    if (routePath !== '/dashboard') history.push('/dashboard');
  };

  const items: TabsProps['items'] = tabs.map((tab) => ({
    key: tab.key,
    label: getRouteLabel(tab.key, menus, intl.formatMessage),
    closable: tab.closable,
  }));
  const actionItems: MenuProps['items'] = [
    {
      key: 'refresh',
      icon: <ReloadOutlined />,
      label: intl.formatMessage({ id: 'components.routeTabs.refresh' }),
    },
    { type: 'divider' },
    {
      key: 'closeOthers',
      icon: <CloseOutlined />,
      label: intl.formatMessage({ id: 'components.routeTabs.closeOthers' }),
    },
    {
      key: 'closeAll',
      icon: <CloseOutlined />,
      label: intl.formatMessage({ id: 'components.routeTabs.closeAll' }),
    },
  ];

  return (
    <>
      <div className="route-tabs">
        {(menusLoaded || routePath === '/dashboard') && (
          <Tabs
            activeKey={routePath}
            hideAdd
            items={items}
            type="editable-card"
            tabBarExtraContent={
              <Dropdown
                menu={{
                  items: actionItems,
                  onClick: ({ key }) => {
                    if (key === 'refresh') refreshTab();
                    if (key === 'closeOthers') closeOtherTabs();
                    if (key === 'closeAll') closeAllTabs();
                  },
                }}
              >
                <Button className="route-tabs-actions" size="small" type="text">
                  {intl.formatMessage({ id: 'components.routeTabs.actions' })} <DownOutlined />
                </Button>
              </Dropdown>
            }
            onChange={(key) => history.push(key)}
            onEdit={(targetKey, action) => {
              if (action === 'remove') {
                closeTab(targetKey as string);
              }
            }}
          />
        )}
      </div>
      <KeepAlive autoFreeze={false} cacheKey={routePath} name={routePath}>
        {children}
      </KeepAlive>
    </>
  );
};

export default RouteTabs;
