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

## Windows 桌面版

桌面版使用 Electron，并在本机回环地址启动静态页面和 `/api/` 代理，因此现有前端接口与 SSE 流式聊天无需改为绝对地址。

```powershell
# 开发调试（先构建 Dashboard，再启动 Electron）
npm run desktop:dev

# 生成 NSIS 安装程序和便携版 exe
npm run desktop:pack
```

产物位于 `release/`；桌面构建文件使用独立的 `dist-desktop/` 目录，不会和正在运行的 Web 开发服务或标准 `dist/` 构建冲突。默认连接 `http://localhost:8080` 的 Aether Admin。连接远端 Admin 时，在 `%APPDATA%/aether-dashboard/config.json` 中创建以下配置后重新打开应用：

```json
{ "adminUrl": "https://admin.example.com" }
```

也可在启动程序的环境中设置 `AETHER_ADMIN_URL`；该变量优先于配置文件。桌面版只封装 Dashboard，Admin、数据库、Redis 与 MinIO 等服务仍需单独运行或部署。

桌面版会跟随 Windows 明暗主题，记住上次窗口尺寸和位置，并提供原生菜单快捷键：`Ctrl+R` 刷新、`Ctrl+Shift+R` 强制刷新、`Ctrl+=`/`Ctrl+-` 缩放、`F11` 全屏。通过菜单“应用 → 打开连接配置目录”可以直接配置 Admin 地址。
