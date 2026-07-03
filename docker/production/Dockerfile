# syntax=docker/dockerfile:1

# --- Build stage -------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage -------------------------------------------------------
# nginx:stable-alpine already renders /etc/nginx/templates/*.template to
# /etc/nginx/conf.d/ via envsubst on boot (see docker-entrypoint.d/20-envsubst-on-templates.sh
# baked into the base image), so default.conf.template only needs to be copied into place.
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/production/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/production/inject_env.json.template /usr/share/nginx/html/inject_env.json.template
COPY docker/production/40-inject-env.sh /docker-entrypoint.d/40-inject-env.sh
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

EXPOSE 80
