#!/bin/sh
# Renders inject_env.json from the container's environment so the SPA can pick up
# runtime config (see getCfg() in src/main.tsx). Runs automatically: nginx:stable-alpine
# executes every executable *.sh in /docker-entrypoint.d/ before starting nginx.
set -eu

envsubst < /usr/share/nginx/html/inject_env.json.template > /usr/share/nginx/html/inject_env.json
