# ── Build Stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install OpenSSL (needed by some Node native modules)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies + dev for build
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# ── Runtime Stage ────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S -s /bin/sh -G nodejs app

WORKDIR /app

# Copy only production dependencies from builder
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Create data directory for persistence
RUN mkdir -p /app/data && chown -R app:nodejs /app/data

# Switch to non-root user
USER app

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
</arg_value>
<task_progress>
- [x] Examine backend structure
- [x] Create backend Dockerfile
- [ ] Create frontend Dockerfile
- [ ] Create docker-compose.yml
- [ ] Create environment configuration files
- [ ] Add health endpoints
- [ ] Implement graceful shutdown
- [ ] Add configuration validation
- [ ] Expose version information
- []  Create DEPLOYMENT.md
- []  Verify build
</task_progress>
