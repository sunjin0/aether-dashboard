import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { history } from '@umijs/max';
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
const menuListeners = new Set<() => void>();

export const setRouteMenus = (menus: MenuItem[]) => {
  routeMenus = menus;
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

const getTab = (pathname: string, menus: MenuItem[]): RouteTab => ({
  key: pathname,
  label: findMenuName(menus, pathname) || pathname,
  closable: pathname !== '/dashboard',
});

const RouteTabs = ({ pathname, children }: RouteTabsProps) => {
  const [menus, setMenus] = useState(routeMenus);
  const [tabs, setTabs] = useState<RouteTab[]>(() => [getTab(pathname, routeMenus)]);

  useEffect(() => {
    const updateMenus = () => setMenus(routeMenus);
    menuListeners.add(updateMenus);
    return () => menuListeners.delete(updateMenus);
  }, []);

  useEffect(() => {
    setTabs((previousTabs) =>
      previousTabs.some((tab) => tab.key === pathname)
        ? previousTabs
        : [...previousTabs, getTab(pathname, menus)],
    );
  }, [menus, pathname]);

  const closeTab = (targetKey: string) => {
    const targetIndex = tabs.findIndex((tab) => tab.key === targetKey);
    const nextTabs = tabs.filter((tab) => tab.key !== targetKey);
    setTabs(nextTabs);

    if (targetKey === pathname && nextTabs.length > 0) {
      history.push(nextTabs[Math.max(0, targetIndex - 1)].key);
    }
  };

  const items: TabsProps['items'] = tabs.map((tab) => ({
    key: tab.key,
    label: findMenuName(menus, tab.key) || tab.label,
    closable: tab.closable,
  }));

  return (
    <>
      <div className="route-tabs">
        <Tabs
          activeKey={pathname}
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
      </div>
      <KeepAlive autoFreeze={false} cacheKey={pathname} name={pathname}>
        {children}
      </KeepAlive>
    </>
  );
};

export default RouteTabs;
