# Contexto: raiz do repositório. Exemplo futuro; não publicado nesta tarefa.
FROM node:24-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build
FROM nginx:1.29-alpine
COPY docs/azure/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
RUN mkdir -p /var/cache/nginx /var/run \
    && chown -R nginx:nginx /var/cache/nginx /var/run /etc/nginx/templates /etc/nginx/conf.d
USER nginx
EXPOSE 8080
