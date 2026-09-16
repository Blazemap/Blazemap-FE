FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
ARG VITE_AUTH_URL
RUN test -n "$VITE_AUTH_URL" && npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine
ENV PORT=8080
ENV NGINX_ENVSUBST_FILTER="^PORT$"
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
