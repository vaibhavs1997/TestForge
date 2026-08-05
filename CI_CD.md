# TestForge CI/CD & Release Automation

## Overview

Every commit is automatically verified and every release is reproducible through GitHub Actions.

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CI Pipeline (ci.yml)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Backend      │  │ Frontend     │  │ Dependency   │              │
│  │ Build & Lint │  │ Build & Lint │  │ Audit        │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └────────┬────────┘                 │                       │
│                  ▼                          │                       │
│         ┌──────────────────┐                │                       │
│         │ Docker Image     │◄───────────────┘                       │
│         │ Validation       │                                        │
│         └──────────────────┘                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     Release Pipeline (release.yml)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Build &      │  │ Docker       │  │ GitHub       │              │
│  │ Package      │  │ Images       │  │ Release      │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └────────┬────────┘                 │                       │
│                  ▼                          │                       │
│         ┌──────────────────┐                │                       │
│         │ Artifacts        │                │                       │
│         │ (tar.gz)         │                │                       │
│         └──────────────────┘                │                       │
│                                             │                       │
│         ┌──────────────────┐                │                       │
│         │ Release Notes    │◄───────────────┘                       │
│         └──────────────────┘                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Pipeline Stages

### CI Pipeline (`.github/workflows/ci.yml`)

Triggered on: push to `main`/`develop`, pull requests

| Stage | Description |
|-------|-------------|
| Backend Build & Lint | TypeScript compilation, ESLint |
| Frontend Build & Lint | TypeScript compilation, ESLint, Vite production build |
| Dependency Audit | `npm audit` for both packages (non-blocking for low severity) |
| Docker Image Validation | Builds both Docker images, validates docker-compose config |

### Release Pipeline (`.github/workflows/release.yml`)

Triggered on: git tag `v*`, manual dispatch

| Stage | Description |
|-------|-------------|
| Build & Package | Compiles backend/frontend, packages dist + Dockerfiles + env templates |
| Docker Images | Builds versioned Docker images, tags as `latest`, saves as tar.gz |
| GitHub Release | Creates release with all artifacts attached |

## Build Metadata

Generated during release builds:
- **Version**: From git tag (e.g., `v1.2.3` → `1.2.3`)
- **Git Commit**: Short SHA from `git rev-parse --short HEAD`
- **Build Timestamp**: UTC ISO timestamp

Exposed via:
- `GET /health` → `{ status, uptime, version, build, gitCommit }`
- `GET /ready` → `{ status, uptime, version, build }`

## Artifacts Produced

### CI Pipeline
- `backend-dist/` – Compiled backend JavaScript
- `frontend-dist/` – Built frontend static files

### Release Pipeline
- `testforge-<version>.tar.gz` – Complete deployment package
  - `release/backend/` – Backend dist + Dockerfile + package.json + .env.example
  - `release/frontend/` – Frontend dist + Dockerfile + nginx.conf + .env.example
  - `release/docker-compose.yml` – Compose configuration
  - `release/DEPLOYMENT.md` – Deployment guide
  - `release/VERSION` – Version metadata
- `testforge-backend-<version>.tar.gz` – Backend Docker image
- `testforge-frontend-<version>.tar.gz` – Frontend Docker image

## Release Process

1. **Create release branch** from `develop`
2. **Run tests** via CI pipeline
3. **Bump version** in `package.json` files
4. **Create git tag**:
   ```bash
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```
5. **Release pipeline** automatically:
   - Builds and packages
   - Creates Docker images
   - Generates GitHub Release with artifacts

## Rollback Strategy

### Option 1: Previous Docker Image
```bash
# Pull previous version
docker pull testforge-backend:1.2.2
docker pull testforge-frontend:1.2.2

# Update compose to use specific version
docker-compose up -d
```

### Option 2: Previous Release Artifact
```bash
# Download previous release tar.gz from GitHub
tar -xzf testforge-1.2.2.tar.gz
cd release
docker-compose up -d --build
```

### Option 3: Git Revert
```bash
git revert <bad-commit>
git push origin main
# CI pipeline rebuilds and redeploys
```

## Code Quality Checks

| Check | Command | Blocking |
|-------|---------|----------|
| TypeScript | `npm run build` | Yes |
| ESLint | `npm run lint` | No (reported) |
| Dependency Audit | `npm audit --audit-level=high` | No (reported) |
| Docker Build | `docker build` | Yes |

## Files

- `.github/workflows/ci.yml` – CI pipeline
- `.github/workflows/release.yml` – Release pipeline
- `DEPLOYMENT.md` – Deployment guide
- `backend/src/config.ts` – Build metadata configuration
- `backend/src/index.ts` – Health endpoints with version info