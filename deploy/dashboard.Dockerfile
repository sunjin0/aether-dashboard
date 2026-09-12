FROM nginx:1.27-alpine
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY dist /usr/share/nginx/html
EXPOSE 80
