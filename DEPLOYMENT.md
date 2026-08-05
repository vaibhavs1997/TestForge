# TestForge Deployment Guide

## Overview

TestForge is deployable anywhere with a single command using Docker Compose. The stack consists of:

- **Frontend**: Nginx serving static React build (port 80)
- **Backend**: Node.js Express API (port 3000)
- **Data**: Persistent volume for database files

## Quick Start

```bash
# 1. Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Build and start
docker-compose up -d --build

# 3. Verify health
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

## Docker Compose Services

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| backend | testforge-backend | 3000 | Express API server |
| frontend | testforge-frontend | 80 | Nginx static server |

## Environment Variables

### Root `.env`
| Variable | Default | Description |
|----------|---------|-------------|
| BACKEND_PORT | 3000 | Backend host port |
| FRONTEND_PORT | 80 | Frontend host port |

### `backend/.env`
| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Backend listen port |
| NODE_ENV | production | Runtime environment |
| DB_PATH | /app/data/testforge.db | SQLite database path |
| CORS_ORIGIN | http://localhost:80 | Allowed CORS origins (comma-separated) |
| LOG_LEVEL | info | Logging level |
| BUILD_TIMESTAMP | (auto) | Build timestamp |
| GIT_COMMIT | unknown | Git commit hash |

### `frontend/.env`
| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_URL | http://localhost:3000/api | Backend API URL |

## Health Endpoints

### `GET /health`
Returns liveness status:
```json
{
  "status": "ok",
  "uptime": 3600,
  "version": "0.1.0",
  "build": "2024-01-01T00:00:00.000Z",
  "gitCommit": "abc123"
}
```

### `GET /ready`
Returns readiness status:
```json
{
  "status": "ready",
  "uptime": 3600,
  "version": "0.1.0",
  "build": "2024-01-01T00:00:00.000Z"
}
```

## Graceful Shutdown

The backend handles `SIGTERM` and `SIGINT` signals:
1. Stops accepting new connections
2. Closes HTTP server
3. Exits cleanly (or force-exits after 10s timeout)

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` to your frontend domain
- [ ] Set strong secrets in environment
- [ ] Enable HTTPS via reverse proxy (e.g., Traefik, Caddy)
- [ ] Configure log rotation
- [ ] Set up monitoring (health checks)
- [ ] Schedule database backups
- [ ] Pin Docker image versions

## Backup Locations

- **Database**: `/app/data/testforge.db` (mounted volume `testforge-data`)
- **Backup command**: `docker run --rm -v testforge-data:/data -v $(pwd):/backup alpine tar czf /backup/testforge-backup.tar.gz /data`

## Ports

| Port | Service | Protocol |
|------|---------|----------|
| 80 | Frontend (Nginx) | HTTP |
| 3000 | Backend (Express) | HTTP |

## Volumes

| Volume | Mount | Description |
|--------|-------|-------------|
| testforge-data | /app/data | Persistent database storage |

## Networks

| Network | Driver | Description |
|---------|--------|-------------|
| testforge-network | bridge | Internal service communication |

## Docker Images

### Backend (`backend/Dockerfile`)
- Multi-stage build
- Stage 1: Node 20-alpine builder (TypeScript compilation)
- Stage 2: Node 20-alpine runtime (production deps only)
- Non-root user (`app`)
- Health check on `/health`

### Frontend (`frontend/Dockerfile`)
- Multi-stage build
- Stage 1: Node 20-alpine builder (Vite build)
- Stage 2: Nginx stable-alpine runtime
- Custom nginx config with SPA routing and API proxy
- Health check on port 80

## Build Verification

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build

# Docker
docker-compose build
docker-compose up -d
docker-compose ps