# ── Build Stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (needed for build)
RUN npm ci

# Copy source
COPY . .

# Build the application
RUN npm run build

# ── Runtime Stage ────────────────────────────────────────────────────────
FROM nginx:stable-alpine AS runtime

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -S -q http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
</arg_value>
<task_progress>
- [x] Examine backend structure
- [x] Create backend Dockerfile
- [x] Create frontend Dockerfile
- [ ] Create docker-compose.yml
- []  Create environment configuration files
- []  Add health endpoints
- []  Implement graceful shutdown
- []  Add configuration validation
- []  Expose version information
- []  Create DEPLOYMENT.md
- []  Verify build
</task_progress>
