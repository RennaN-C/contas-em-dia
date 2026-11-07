# Contexto: raiz do repositório. Exemplo futuro; não publicado nesta tarefa.
FROM node:24-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build
FROM nginx:1.29-alpine
COPY docs/azure/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
