# Aether Dashboard

Aether 的 React 管理与聊天控制台，基于 Umi Max、Ant Design 5 和 Ant Design Pro Components 构建。

## 功能

- 用户、角色、资源权限、模型供应商、Agent、MCP 服务与工具管理。
- 知识库、文档、索引任务和检索评估管理。
- 普通 Agent 与 Deep Agent 共用的聊天页面、附件上传、SSE 流式输出、工具审批和 `ask_user` 交互。
- Deep Agent 任务规划面板、执行步骤、工具审计和带编号/文档名称的知识库引用。
- 中文与英文国际化。

## 开发

要求 Node.js 20+（Docker 构建使用 Node 20）。

```powershell
npm ci
npm run start:dev
```

默认开发服务由 Umi 启动；API 代理配置见 `config/`。常用检查：

```powershell
npm run tsc
npm run build
```

## API 与流式聊天

Dashboard 通过 Nginx 将 `/api/` 代理至 Java Admin。聊天使用 `POST /api/agent/chat/stream` 的 SSE 协议，普通 Agent 与 Deep Agent 使用统一入口；Deep Agent 的任务状态、工具确认和用户追问由事件流渲染。

## Docker

```powershell
docker compose up -d --build dashboard
```

关键环境变量：

| 变量 | 说明 |
| --- | --- |
| `DASHBOARD_PORT` | Dashboard 对外端口，默认 `8001`。 |
| `AETHER_ADMIN_UPSTREAM` | Nginx 代理目标，容器内通常为 `http://aether-admin:8080`。 |

完整平台部署请使用 Java 项目的 `docker-compose.all.yml`。
