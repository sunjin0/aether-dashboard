#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"
npm run build
docker build -f deploy/dashboard.Dockerfile -t "aether-dashboard:dev-${AETHER_LOCAL_RELEASE_TAG:-local}" .