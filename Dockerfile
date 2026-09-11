# syntax=docker/dockerfile:1
# 多阶段构建：由容器内的 Node 环境产出 dist，再交给 nginx 提供静态服务。
FROM node:20-bookworm-slim AS build
WORKDIR /app
# 国内网络加速：npm 切换淘宝镜像
RUN npm config set registry https://registry.npmmirror.com
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
FROM nginx:1.27-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
