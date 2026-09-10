# syntax=docker/dockerfile:1
# 生产发布使用本地已验证的 dist 静态产物，避免容器重复下载开发依赖。
FROM nginx:1.27-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
RUN rm -rf /usr/share/nginx/html/*
COPY dist/ /usr/share/nginx/html/
# Docker Desktop 的目录复制在部分 Windows 环境会遗漏入口文件；显式复制保证 SPA 回退可用。
COPY dist/index.html /usr/share/nginx/html/index.html

EXPOSE 80
