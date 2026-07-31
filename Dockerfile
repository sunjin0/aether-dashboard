# syntax=docker/dockerfile:1
# Mako 提供的是 glibc 预编译二进制，构建阶段不能使用 Alpine/musl。
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# 依赖仅由 package 清单决定，代码变更时可复用 Docker 缓存层。
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline
# Windows 生成的 lockfile 可能遗漏 Linux 可选二进制；容器构建显式补齐 Mako 原生模块。
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-save --ignore-scripts @umijs/mako-linux-x64-gnu@0.11.10

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
