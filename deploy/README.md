# Tag 发布

本仓仅在推送 `v*` 标签后发布自己的服务：Dashboard。

## 服务器目录

```text
/opt/aether-server/
  .env
  aether/releases/<UTC时间>-<tag>/
  dashboard/releases/<UTC时间>-<tag>/
  deep-agent/releases/<UTC时间>-<tag>/
  mcp/releases/<UTC时间>-<tag>/
```

项目目录由工作流自动创建；Aether 也是一个项目目录，不占用部署根目录。每次标签发布都会创建如 `20260912T103000Z-v0.1.2` 的独立版本目录。

## 配置

统一配置模板由 Aether 仓维护；本仓不再提供环境文件。

首次部署前，在服务器创建统一配置：

```bash
mkdir -p /opt/aether-server
cp <Aether仓库>/deploy/.env.example /opt/aether-server/.env
chmod 600 /opt/aether-server/.env
```

四个仓库均配置 GitHub Secret `DEPLOY_SSH_KEY`，以及 Variables：`DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_PORT`（默认 22）和 `DEPLOY_ROOT=/opt/aether-server`。

工作流不会上传或覆盖 `.env`。各项目的 Compose 均读取同一个 `/opt/aether-server/.env`，因此共享数据库、Redis、网络与跨服务密钥只需维护一次。

## 发布与回滚

工作流先完成测试和构建，再上传本项目的发布产物，并以 `--no-deps` 只更新本项目服务。不会执行 `down` 或 `--remove-orphans`。

成功记录保存在 `<项目>/.releases/dashboard.current`；回滚时：

```bash
cd /opt/aether-server/dashboard
source .releases/dashboard.previous
bash "releases/$release_id/dashboard/deploy/release.sh" dashboard "$tag" "$PWD" "$release_id"
```

数据库迁移为前向迁移，镜像回滚不会回退 schema。

## 本地 Docker 调试

本地调试栈的项目名统一为 `aether-local-debug`，与 Aether 仓、MCP、Deep Agent 的调试容器归入 Docker Desktop 的同一分组。网络 `aether-local-debug-services` 由 Aether 仓的 `deploy/dev/local-debug.sh` 创建，本仓只加入不创建，所以先起 Aether 调试栈。

```bash
bash deploy/dev/local-build.sh   # 构建 aether-dashboard:dev-local
bash deploy/dev/local-up.sh      # 启动 aether-local-dashboard
```

访问 `http://127.0.0.1:18082`。`AETHER_LOCAL_RELEASE_TAG` 覆盖镜像标签，`LOCAL_DASHBOARD_PORT` 覆盖宿主端口，`AETHER_LOCAL_ENV_FILE` 覆盖环境文件路径。

本仓的容器也可以由 Aether 仓的 `deploy/dev/local-debug.sh` 按需代拉起：在 Aether 仓的 `deploy/dev/.env.local` 里把 `AETHER_LOCAL_DASHBOARD_DIR` 指向本仓目录即可。
