# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage
FROM nginx:stable-alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  # nginx in this image listens on IPv4. `localhost` may resolve to IPv6
  # first, which marks a healthy frontend container as unhealthy.
  CMD wget --spider -S -q http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
