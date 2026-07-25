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
      {
        path: '/sys/preference',
        name: '偏好管理',
        component: './sys/admin-preference',
      },
    ],
  },
  {
    path: '/agent',
    name: 'Agent 平台',
    icon: 'robot',
    routes: [
      {
        path: '/agent/model-provider',
        name: '模型供应商',
        component: './agent/model-provider',
      },
      {
        path: '/agent/definition',
        name: 'Agent 定义',
        component: './agent/definition',
      },
      {
        path: '/agent/mcp-server',
        name: 'MCP 服务管理',
        component: './agent/mcp-server',
      },
      {
        path: '/agent/tool',
        name: 'MCP 工具管理',
        component: './agent/tool',
      },
      {
        path: '/agent/conversation',
        name: '会话管理',
        component: './agent/conversation',
      },
      {
        path: '/agent/chat',
        name: 'Chat 调试',
        component: './agent/chat',
      },
      {
        path: '/agent/run',
        name: '运行记录',
        component: './agent/run',
      },
      {
        path: '/agent/tool-call-log',
        name: '工具调用日志',
        component: './agent/tool-call-log',
      },
    ],
  },
  {
    path: '/knowledge',
    name: '知识库管理',
    icon: 'database',
    routes: [
      {
        path: '/knowledge/base',
        name: '知识库列表',
        component: './knowledge/base',
      },
      {
        path: '/knowledge/document',
        name: '文档管理',
        component: './knowledge/document',
      },
      {
        path: '/knowledge/document/:documentId/review',
        name: 'AI 审阅工作台',
        hideInMenu: true,
        component: './knowledge/review/detail',
      },
      {
        path: '/knowledge/document/:documentId/versions',
        name: '版本历史',
        hideInMenu: true,
        component: './knowledge/document/version',
      },
      {
        path: '/knowledge/reviews',
        name: '审批中心',
        component: './knowledge/review',
      },
      {
        path: '/knowledge/reviews/:taskId',
        name: '人工审批',
        hideInMenu: true,
        component: './knowledge/review/task',
      },
      {
        path: '/knowledge/index-job',
        name: '索引任务',
        component: './knowledge/index-job',
      },
    ],
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
    ],
  },
  {
    path: '*',
    layout: false,
    component: './404',
  },
];
