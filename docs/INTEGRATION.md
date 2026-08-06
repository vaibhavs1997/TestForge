# Integration status (pages ↔ API)

Run automated API smoke (backend must be listening on port 3000):

```bash
cd backend
npm run integration:smoke
```

Last verified: core REST routes for a seeded project return `200` with `success: true` where applicable.

## Fixes applied during this audit

| Issue | Impact |
|--------|--------|
| `ProjectService` used `/api/projects` with base URL `/api` → **double `/api`** | Projects, dashboard, import center, notification inbox |
| `HttpClient` did not unwrap `{ success, data }` | Same consumers as above |
| `domain/audit/index.ts` re-exported types as values | **Backend crash** under `tsx`/ESM (`AuditAction` export) |
| `TestDataLibraryPage` never called datasets API | Test data library always empty |

## Global / shell

| Route | Page | API integration | Notes |
|--------|------|-----------------|--------|
| `/` | Landing | N/A | Static marketing |
| `/dashboard` | Dashboard | Audit + `GET /projects` | No `/projects/:id/dashboard` endpoint (not used) |
| `/import` | Import Center | Unified wizard + audit history | Multi-file API + env import |
| `/projects` | Projects home | `GET/POST/PATCH/DELETE /projects` | Last-opened in localStorage meta |
| `/settings` | Settings | Mostly local UI | — |
| `/showcase` | Showcase | N/A | Dev UI gallery |

## Project workspace (`/projects/:projectId/...`)

| Area | Route | Integration | Notes |
|------|--------|-------------|--------|
| Overview | `overview` | Hooks: APIs, envs, datasets, knowledge, analysis, requirements, suites, execution, reports | Aggregates live counts |
| APIs | `apis` | Full CRUD + import file/URL | OK |
| Environment | `environment` | CRUD + import helpers | OK |
| Test data | `testdata/*` | Datasets **list wired**; column suggestions in dataset details still TODO | Mapping sub-route uses MappingPage |
| Knowledge | `knowledge` | Backend knowledge routes | OK |
| Requirements | `requirements/*` | Requirements/strategy/design routes | Assertion attach/detach TODOs in UI |
| Execution | `execution/*` | Execution routes | OK |
| Reports | `reports` | Report routes | OK |
| Recommendations | `recommendations` | Recommendation API | OK |
| Pipeline | `pipeline` | Pipeline API | OK |
| Notifications | `notifications` | Notification rules API | Inbox bell uses audit, not this page only |
| Versions | `versions` | Version API | OK |
| Audit | `audit` | `GET .../audit` | OK |
| Plugins | `plugins` | Plugin API | OK |
| AI providers | `ai-providers` | AI provider API | OK |
| Context | `context` | `GET .../context` | OK |
| Prompts | `prompts` | Prompt API | OK |

## Not wired to navigation

| Page | Notes |
|------|--------|
| `BackupPage` | Implements `/api/backups` but **no route** in `AppRoutes` — dead code unless linked manually |

## Auth

When `TESTFORGE_API_KEY` / JWT is enabled:

- `HttpClient` and SSE (`VITE_API_KEY`) send credentials.
- Most module services use `ApiClient` + raw `axios` **without** the API key interceptor — enable auth only after aligning `ApiClient` with `apiAxios` (or set axios defaults).

## Optional follow-ups

- Wire dataset **columns** API in dataset detail panel.
- Route **Backup** page under Settings or Admin.
- Projects home **recent activity** from audit API.
- `GET /projects/:id/dashboard` or remove unused `getDashboardData`.
