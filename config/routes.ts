export default [
  {
    name: 'login',
    path: '/login',
    layout: false,
    component: './Login',
  },
  {
    path: '/dashboard',
    name: '工作台',
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
        name: '短信消息',
        component: './message/sms',
      },
      {
        path: '/msg/email',
        name: '邮件消息',
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
        name: '管理员管理',
        component: './sys/admin',
      },
      {
        path: '/sys/role',
        name: '角色管理',
        component: './sys/role',
      },
      {
        path: '/sys/resource',
        name: '资源与权限',
        component: './sys/resource',
      },
      {
        path: '/sys/dict',
        name: '字典管理',
        component: './sys/dict',
      },
      {
        path: '/sys/config',
        name: '系统配置',
        component: './sys/config',
      },
      {
        path: '/sys/preference',
        name: '管理员偏好',
        component: './sys/admin-preference',
      },
    ],
  },
  {
    path: '/service-account',
    name: '服务账号',
    icon: 'key',
    routes: [
      {
        path: '/service-account/manage',
        name: '账号管理',
        component: './service-account/manage',
      },
      {
        path: '/service-account/monitor',
        name: '使用监控',
        component: './service-account/monitor',
      },
    ],
  },
  {
    path: '/agent',
    name: '智能体平台',
    icon: 'robot',
    routes: [
      {
        path: '/agent/build',
        name: '构建与发布',
        routes: [
          { path: '/agent/application', name: '业务应用空间', component: './agent/application' },
          { path: '/agent/definition', name: '智能体配置', component: './agent/definition' },
          { path: '/agent/product-profile', name: 'Agent 产品发布', component: './agent/product-profile' },
        ],
      },
      {
        path: '/agent/capability',
        name: '模型与能力',
        routes: [
          { path: '/agent/model-provider', name: '模型服务商', component: './agent/model-provider' },
          { path: '/agent/mcp-server', name: 'MCP 服务', component: './agent/mcp-server' },
          { path: '/agent/tool', name: '工具目录', component: './agent/tool' },
          { path: '/agent/skill', name: '智能体技能', component: './agent/skill' },
        ],
      },
      {
        path: '/agent/operations',
        name: '调试与运营',
        routes: [
          { path: '/agent/chat', name: '对话调试', component: './agent/chat' },
          { path: '/agent/conversation', name: '会话管理', component: './agent/conversation' },
          { path: '/agent/run', name: '执行记录', component: './agent/run' },
          { path: '/agent/tool-call-log', name: '工具调用日志', component: './agent/tool-call-log' },
          { path: '/agent/artifact', name: '生成文件库', component: './agent/artifact' },
        ],
      },
      {
        path: '/agent/runtime',
        name: '运行保障',
        routes: [
          { path: '/agent/sandbox', name: '沙箱执行平台', component: './agent/sandbox' },
        ],
      },
    ],
  },
  {
    path: '/workflow',
    name: 'AI 工作流',
    icon: 'apartment',
    routes: [
      {
        path: '/workflow/operations',
        name: '运营中心',
        exact: true,
        component: './workflow/operations',
      },
      {
        path: '/workflow/run',
        name: '工作流实例',
        exact: true,
        component: './workflow/instances',
      },
      {
        path: '/workflow/schedule',
        name: '工作流定时任务',
        exact: true,
        component: './workflow/schedule',
      },
      {
        path: '/workflow/workflow/:id/run',
        name: '工作流运行',
        hideInMenu: true,
        component: './workflow/run',
      },
      {
        path: '/workflow/workflow/:id',
        name: '工作流编排',
        hideInMenu: true,
        component: './workflow/editor',
      },
      {
        path: '/workflow/workflow',
        name: '工作流管理',
        exact: true,
        component: './workflow',
      },
    ],
  },
  {
    path: '/knowledge',
    name: '知识中心',
    icon: 'database',
    routes: [
      {
        path: '/knowledge/base',
        name: '知识库',
        component: './knowledge/base',
      },
      {
        path: '/knowledge/document',
        name: '知识文档',
        component: './knowledge/document',
      },
      {
        path: '/knowledge/document/:documentId/review',
        name: '文档 AI 审阅',
        hideInMenu: true,
        component: './knowledge/review/detail',
      },
      {
        path: '/knowledge/document/:documentId/versions',
        name: '文档版本',
        hideInMenu: true,
        component: './knowledge/document/version',
      },
      {
        path: '/knowledge/reviews',
        name: '内容审核',
        component: './knowledge/review',
      },
      {
        path: '/knowledge/reviews/:taskId',
        name: '审核任务',
        hideInMenu: true,
        component: './knowledge/review/task',
      },
      {
        path: '/knowledge/index-job',
        name: '索引任务',
        component: './knowledge/index-job',
      },
      {
        path: '/knowledge/evaluation/sets/:setId/runs/:runId',
        name: '评测运行详情',
        hideInMenu: true,
        component: './knowledge/evaluation/run',
      },
      {
        path: '/knowledge/evaluation/sets/:setId',
        name: '评测集详情',
        hideInMenu: true,
        component: './knowledge/evaluation/set',
      },
      { path: '/knowledge/evaluation', name: '检索评测', exact: true, component: './knowledge/evaluation' },
    ],
  },
  {
    path: '/user',
    name: '用户中心',
    routes: [
      {
        path: '/user/member',
        name: '成员管理',
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
