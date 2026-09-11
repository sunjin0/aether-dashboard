# syntax=docker/dockerfile:1
# 发布态运行镜像。dist 由 CI 构建完成后随暂存区上传，本文件只把静态产物交给 nginx。
#
# 与源码构建路径 Dockerfile 并存、互不影响：那个在镜像内跑一遍 npm ci + max build，
# 用于本地与离线场景；本文件用于 docker-compose.release.yml，服务器不再重复跑构建。
#
# 构建上下文约定为 release/<tag>/dashboard，其中必须存在 dist/ 与 nginx/default.conf.template。
#
# 下面两行与 Dockerfile 的第二阶段完全一致：nginx 官方镜像启动时会用 envsubst 渲染
# /etc/nginx/templates/*.template，配置里的 ${AETHER_ADMIN_UPSTREAM} 由 compose 的 environment 提供。
FROM nginx:1.27-alpine
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY dist /usr/share/nginx/html
EXPOSE 80
