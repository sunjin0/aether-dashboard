# syntax=docker/dockerfile:1
# 生产发布使用本地已验证的 dist 静态产物，避免容器重复下载开发依赖。
FROM nginx:1.27-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY dist /usr/share/nginx/html

EXPOSE 80
