export default [
  {
    name: 'login',
    path: '/login',
    layout: false,
    component: './Login',
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    icon: 'smile',
    component: './Dashboard',
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/msg',
    name: '消息中心',
    routes: [
      {
        path: '/msg/sms',
        name: '短信管理',
        component: './message/sms',
      },
      {
        path: '/msg/email',
        name: '邮件管理',
        component: './message/email',
      },
    ],
  },
  {
    path: '/sys',
    name: '系统管理',
    icon: 'tool',
    routes: [
      {
        path: '/sys/admin',
        name: '用户管理',
        component: './sys/admin',
      },
      {
        path: '/sys/role',
        name: '角色管理',
        component: './sys/role',
      },
      {
        path: '/sys/resource',
        name: '资源管理',
        component: './sys/resource',
      },
      {
        path: '/sys/dict',
        name: '字典管理',
        component: './sys/dict',
      },
    ],
  },
  {
    path: '*',
    layout: false,
    component: './404',
  },
    {
      path: '/user',
      name: 'user',
        routes: [
            {
              path: '/user/member',
              name: 'Member',
              component: './user/member',
            },
        ]
    },

]
