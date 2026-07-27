import { AvatarDropdown, AvatarName, FileImage, Footer, SelectLang } from '@/components'
import {
  DashboardOutlined,
  DatabaseOutlined,
  LinkOutlined,
  MessageOutlined,
  OpenAIOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { Settings as LayoutSettings } from '@ant-design/pro-components'
import { SettingDrawer } from '@ant-design/pro-components'
import { RunTimeLayoutConfig } from '@umijs/max'
import { history, Link } from '@umijs/max'
import React from 'react'
import { message } from 'antd'
import { AliveScope } from 'react-activation'
import defaultSettings from '../config/defaultSettings'
import RouteTabs, { setRouteMenus } from './components/RouteTabs'
import { errorConfig } from './requestErrorConfig'
import { getRoutes, info } from '@/services/sys/LoginController'

const isDev = process.env.NODE_ENV === 'development'
const loginPath = '/login'
const iconMap: Record<string, React.ReactNode> = {
  SettingOutlined: <SettingOutlined />,
  UserOutlined: <UserOutlined />,
  DashboardOutlined: <DashboardOutlined />,
  MessageOutlined: <MessageOutlined />,
  OpenAIOutlined: <OpenAIOutlined />,
  DatabaseOutlined: <DatabaseOutlined />,
}

const pagePermissionPaths = [
  '/agent/model-provider',
  '/agent/definition',
  '/agent/mcp-server',
  '/agent/tool',
  '/agent/conversation',
  '/agent/chat',
  '/agent/run',
  '/agent/tool-call-log',
  '/knowledge/base',
  '/knowledge/document',
  '/knowledge/reviews',
  '/knowledge/index-job',
  '/knowledge/evaluation',
  '/sys/admin',
  '/sys/role',
  '/sys/resource',
  '/sys/dict',
  '/sys/preference',
  '/message/sms',
  '/message/email',
  '/user/member',
]

const resolvePagePermission = (pathname: string) =>
  [...pagePermissionPaths].sort((a, b) => b.length - a.length).find(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: any;
  loading?: boolean;
  fetchUserInfo?: () => Promise<any | undefined>;
}> {
  const fetchUserInfo = async () => {
    try {
      const { data } = await info()
      return data
    } catch (error) {
      history.push(loginPath)
    }
    return undefined
  }
  // 如果不是登录页面，执行
  const { location } = history
  if (location.pathname !== loginPath) {
    const currentUser = await fetchUserInfo()
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    }
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  }
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  return {
    actionsRender: () => [<SelectLang key="SelectLang" />],
    avatarProps: {
      src: <FileImage value={initialState?.currentUser?.avatar} />,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown>{avatarChildren}</AvatarDropdown>
      },
    },
    waterMarkProps: {
      content: initialState?.currentUser?.username,
    },
    footerRender: () => <Footer fixed />,
    menu: {
      locale: false,
      params: {
        id: initialState?.currentUser?.id,
      },
      request: async () => {
        if (!initialState?.currentUser) {
          return []
        }

        try {
          const { data } = await getRoutes()
          const menuData = Array.isArray(data) ? data : []
          setRouteMenus(menuData)
          menuData.forEach((item: any) => {
            item.icon = iconMap[item.icon]
          })
          const routes = new Array<object>()
          menuData.forEach((item: any) => {
            if (item.children) {
              item.children.forEach((child: any) => {
                routes[child.path] = { write: child.access?.includes('Write') }
              })
            }
          })
          return menuData
        } catch {
          return []
        }
      },
      menuItemRender: (item: any, dom: React.ReactNode) => {
        if (item.isUrl || item.children?.length) {
          return dom
        }
        return <Link to={item.path || '/'}>{dom}</Link>
      },
      defaultOpenAll: false,
    },
    onPageChange: () => {
      const { location } = history
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.push(loginPath)
        return
      }
      const permissionMap = initialState?.currentUser?.permissionMap
      const permissionPath = resolvePagePermission(location.pathname)
      if (permissionPath && permissionMap && !Object.prototype.hasOwnProperty.call(permissionMap, permissionPath)) {
        message.warning('暂无该页面访问权限')
        history.push('/dashboard')
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDev
      ? [
        <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
          <LinkOutlined />
          <span>OpenAPI 文档</span>
        </Link>,
      ]
      : [],
    breadcrumbRender: () => [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <AliveScope>
          <div style={{ paddingBottom: 72 }}>
            <RouteTabs pathname={history.location.pathname}>{children}</RouteTabs>
          </div>
          {isDev && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                  routes: [],
                }))
              }}
            />
          )}
        </AliveScope>
      )
    },
    ...initialState?.settings,
  }
}

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request = {
  ...errorConfig,
}
