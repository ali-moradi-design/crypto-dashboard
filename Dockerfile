# Build context: repository root.  docker build -t crypto-dashboard .
# The final image holds only the static build (dist) and the Nginx config:
# no source code, no Node, no node_modules.
FROM node:24-bookworm-slim AS build
RUN npm install -g pnpm@12.15.0
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Unprivileged Nginx: runs as uid 101 and listens on 8080; it writes only to /tmp.
FROM nginxinc/nginx-unprivileged:1.29.3-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
