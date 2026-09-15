#!/usr/bin/env bash
# 启动本仓的本地调试容器，并入 aether-local-debug 分组。镜像由 local-build.sh 构建，这里只启动。
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
env_file="${AETHER_LOCAL_ENV_FILE:-$repo_root/deploy/dev/.env.local}"
services=(dashboard)
compose=(docker compose --env-file "$env_file" -f "$repo_root/deploy/compose.yml" -f "$repo_root/deploy/dev/compose.yml")

# 基础 compose 用 ${AETHER_RELEASE_TAG:?} / ${AETHER_RELEASE_ROOT:?} 做发布期的强制校验，
# 而 compose 是先逐文件插值、再合并，所以覆盖层救不了这两个必填变量，必须先给出取值。
# 本地实际使用的镜像与构建上下文都由 deploy/dev/compose.yml 覆盖。
export AETHER_RELEASE_TAG="${AETHER_LOCAL_RELEASE_TAG:-local}"
export AETHER_RELEASE_ROOT="$repo_root"

# 与 release.sh 一致：四个仓共用一个项目名，每个仓只声明自己的服务，
# 于是 Compose 会把别仓的容器报成孤儿。这里只静默该告警；绝不能用 --remove-orphans，
# 那会删掉其他仓的容器（项目名相同，Compose 分辨不出归属）。
export COMPOSE_IGNORE_ORPHANS=true

test -f "$env_file" || {
  echo "Missing local environment file: $env_file" >&2
  echo "Create it with: cp deploy/dev/.env.example deploy/dev/.env.local" >&2
  exit 1
}

image="aether-dashboard:dev-${AETHER_LOCAL_RELEASE_TAG:-local}"
docker image inspect "$image" >/dev/null 2>&1 || {
  echo "Missing local image: $image" >&2
  echo "Build it with: bash deploy/dev/local-build.sh" >&2
  exit 1
}

docker network inspect aether-local-debug-services >/dev/null 2>&1 || {
  echo "Missing docker network: aether-local-debug-services" >&2
  echo "Start the Aether debug stack first: bash deploy/dev/local-debug.sh" >&2
  exit 1
}

"${compose[@]}" config --quiet
"${compose[@]}" up -d --no-build "${services[@]}"
"${compose[@]}" ps "${services[@]}"

echo "Local Dashboard: http://127.0.0.1:${LOCAL_DASHBOARD_PORT:-18082}"
