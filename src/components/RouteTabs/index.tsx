import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { history, useIntl } from '@umijs/max';
import { KeepAlive } from 'react-activation';
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
  if (/^\/knowledge\/reviews\/[^/]+$/.test(pathname))
    return formatMessage({ id: 'components.routeTabs.humanReview' });
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
    const targetIndex = tabs.findIndex((tab) => tab.key === targetKey);
    const nextTabs = tabs.filter((tab) => tab.key !== targetKey);
    setTabs(nextTabs);

    if (targetKey === routePath && nextTabs.length > 0) {
      history.push(nextTabs[Math.max(0, targetIndex - 1)].key);
    }
  };

  const items: TabsProps['items'] = tabs.map((tab) => ({
    key: tab.key,
    label: getRouteLabel(tab.key, menus, intl.formatMessage),
    closable: tab.closable,
  }));

  return (
    <>
      <div className="route-tabs">
        {(menusLoaded || routePath === '/dashboard') && (
          <Tabs
            activeKey={routePath}
            hideAdd
            items={items}
            type="editable-card"
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
