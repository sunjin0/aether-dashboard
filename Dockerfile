# syntax=docker/dockerfile:1
# 多阶段构建：由容器内的 Node 环境产出 dist，再交给 nginx 提供静态服务。
# 这样从干净检出即可构建，部署机无需预装 Node，也不必先在宿主机上跑一次 npm build。
# 依赖装在有 glibc 的 Debian slim 上，避免 umi/max 依赖链里的原生模块在 musl 上装不上。
FROM node:20-bookworm-slim AS build
WORKDIR /app
# 依赖层单独成层：依赖只由 lock 文件决定，改源码时无需重装。
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
