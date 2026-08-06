# TestForge Architecture Guide

**Version:** 1.1.0  
**Last Updated:** 2026-08-06  
**Audience:** Developers, architects, technical leads

This document describes the **implemented** architecture of TestForge. It replaces earlier aspirational references to PostgreSQL, Redis, Prisma, and JWT that are not present in the codebase today.

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Persistence](#persistence)
7. [API Design](#api-design)
8. [Authentication & Authorization](#authentication--authorization)
9. [Events & Caching](#events--caching)
10. [AI Integration](#ai-integration)
11. [Security](#security)
12. [Operations](#operations)

---

## Introduction

TestForge is an AI-assisted API validation platform: import API contracts, model environments and test data, generate test artifacts with LLMs, execute HTTP plans with assertions, schedule runs, and report results.

### Architecture highlights (as implemented)

- **Monorepo**: npm workspaces (`frontend`, `backend`)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, React Router v6
- **Backend**: Node.js 18+, Express, TypeScript, Clean Architecture layers
- **Persistence**: Project-scoped JSON files under `backend/data/`, with file locking for concurrent writes (single-node deployments)
- **Optional API auth**: API key and/or JWT (see [Authentication & Authorization](#authentication--authorization))
- **AI**: Pluggable provider adapters (OpenAI, Claude, Gemini, Ollama, Azure, Bedrock, custom)

---

## System Overview

```
┌──────────────┐
│   Browser    │  React SPA (Vite build)
└──────┬───────┘
       │ HTTP
┌──────▼───────┐     ┌─────────────────┐
│ Nginx (prod) │────►│ Express API     │
│ or Vite dev  │     │ /api/*          │
└──────────────┘     └────────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        JSON data/      Target APIs      LLM providers
        (per project)   (axios)          (adapters)
```

Entry points:

- Backend: [`backend/src/index.ts`](../backend/src/index.ts)
- Frontend: [`frontend/src/app/main.tsx`](../frontend/src/app/main.tsx)
- Dependency wiring: [`backend/src/application/ApplicationContainer.ts`](../backend/src/application/ApplicationContainer.ts)

---

## Architecture Principles

1. **Clean Architecture (backend)**: Domain → Application → Infrastructure → Interfaces
2. **Feature modules (frontend)**: Self-contained modules with barrel exports
3. **REST-style HTTP API** with consistent JSON envelopes (`success`, `data`, `message`)
4. **Domain events**: In-process `EventBus` for versioning, recommendations, pipeline refresh, and cache invalidation
5. **Extensibility**: AI provider registry and plugin framework for notifications and integrations

---

## Frontend Architecture

### Structure

```
frontend/src/
├── app/              # App shell, main entry
├── modules/          # Feature modules (api, project, execution, …)
├── components/       # Shared UI (ui/, tables/, forms/)
├── layouts/          # AppShell, Sidebar
├── routes/           # Top-level routing
├── services/         # HttpClient and shared services
├── store/            # Zustand (e.g. selected project)
└── styles/
```

### Routing

- `/projects` — project list
- `/projects/:projectId/*` — project workspace (overview, APIs, requirements, execution, etc.)
- Legacy paths (`/apis`, `/knowledge`, …) redirect into the active project via `projectStore`

### State

- **Server state**: TanStack Query (`staleTime`, module `*Service.ts` + hooks)
- **Client state**: React hooks; Zustand for selected `projectId`
- **API client**: [`frontend/src/services/HttpClient.ts`](../frontend/src/services/HttpClient.ts); optional `VITE_API_KEY` sent as `Authorization: Bearer` when auth is enabled on the server

---

## Backend Architecture

### Layers

| Layer | Path | Responsibility |
|-------|------|----------------|
| Domain | `backend/src/domain` | Entities, repository interfaces, `EventBus`, validation engine |
| Application | `backend/src/application` | Use cases, `ApplicationContainer`, AI pipeline, `ExecutePlan` |
| Infrastructure | `backend/src/infrastructure` | JSON repositories, provider adapters, `JsonFileStore` |
| Interfaces | `backend/src/interfaces` | Express routes, controllers, middleware |

### Request flow

```
HTTP → Route → Controller → Use case → Repository → JsonFileStore → filesystem
```

### ApplicationContainer

[`ApplicationContainer`](../backend/src/application/ApplicationContainer.ts) constructs repositories and services once. Route modules import `container` instead of instantiating duplicate repositories.

Construction order matters (EventBus → VersionService → repositories → AI registry → ExecutePlan → plugins → notifications → scheduler → pipeline).

---

## Persistence

See also [`docs/PERSISTENCE_STRATEGY.md`](PERSISTENCE_STRATEGY.md).

- **Primary store**: JSON files per domain under `data/` (e.g. `data/apis/{projectId}/services.json`)
- **Writes**: [`JsonFileStore`](../backend/src/infrastructure/persistence/JsonFileStore.ts) uses `proper-lockfile` for exclusive access per file
- **`DB_PATH`**: Names the data **root** (directory containing project JSON trees). The filename `testforge.db` is a legacy convention for backup layout; there is **no** SQLite/ORM layer in this repository
- **In-memory**: Some admin modules (AI provider registry entries, notifications, plugins, audit in default wiring) use in-memory repositories — configuration may not survive process restart unless persisted elsewhere

---

## API Design

- Base path: `/api`
- Health (unauthenticated): `GET /health`, `GET /ready`
- Success body: `{ "success": true, "data": { ... } }`
- Error body: `{ "success": false, "message": "...", "details": ... }`
- Project-scoped resources: `/api/projects/:projectId/...`

Detailed endpoint lists: [`docs/API_DOCUMENTATION.md`](API_DOCUMENTATION.md) and root [`README.md`](../README.md).

---

## Authentication & Authorization

Authentication is **optional** and enabled when environment variables are set (see [`backend/.env.example`](../backend/.env.example)).

| Mode | Configuration | Client header |
|------|---------------|---------------|
| API key | `TESTFORGE_API_KEY` | `Authorization: Bearer <key>` or `X-API-Key: <key>` |
| JWT | `TESTFORGE_JWT_SECRET` | `Authorization: Bearer <jwt>` with payload `{ "sub": "...", "projects": ["id1"] }` or `"projects": "*"` |

Middleware ([`backend/src/interfaces/middleware/auth.ts`](../backend/src/interfaces/middleware/auth.ts)):

- `authenticate` — applied to `/api`; skipped when no auth secrets are configured (local dev)
- `authorizeProject` — applied to `/api/projects/:projectId`; enforces JWT `projects` claim when not `*`

**Outbound** API authentication (Bearer, API key, OAuth for **target** APIs under test) is modeled on **environment** entities, not on TestForge login.

---

## Events & Caching

- **EventBus** ([`domain/events/EventBus.ts`](../backend/src/domain/events/EventBus.ts)): synchronous in-process pub/sub
- **Subscribers**: version snapshots, recommendation refresh, pipeline refresh, cache invalidation hooks
- **No Redis**: client caching is TanStack Query; server has no distributed cache

Long-running work (AI pipeline, execution) runs **inline** in the API process — there is no separate job queue.

---

## AI Integration

1. **AIProviderRegistry** registers built-in adapters
2. **ManageAIProviders** / resolution service selects provider by id
3. **ProjectContextService** aggregates project context for prompts
4. **PromptBuilderService** builds prompt payloads from templates
5. **RunAIPipeline** chains: requirements → strategy → design → assertions → execution plans → suites (stop-on-failure per stage)

Generation use cases live under `backend/src/application/requirements`, `assertion`, `suite`.

---

## Security

- Enable `TESTFORGE_API_KEY` or JWT for any network-exposed deployment
- Restrict `CORS_ORIGIN` in production
- Provider secrets redacted on read in provider repository
- Treat default (no auth) as **trusted local / private network** only
- Use HTTPS via reverse proxy in production

---

## Operations

- **Docker**: [`docker-compose.yml`](../docker-compose.yml) — backend + frontend, volume on `/app/data`
- **CI**: [`.github/workflows/test-pr.yml`](../.github/workflows/test-pr.yml) — install, typecheck, build, lint
- **Tests**: `npm test` in `backend` — Vitest integration tests for import, execution, and AI pipeline (mocked)
- **Branches**: `master` (development), `main` (production via tagged release workflow)

Deployment details: [`DEPLOYMENT.md`](../DEPLOYMENT.md).  
Backup: [`BACKUP_AND_RESTORE.md`](../BACKUP_AND_RESTORE.md).
