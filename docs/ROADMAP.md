# TestForge roadmap (engineering)

## Phase 1–2 ✅

Import/dashboard/notifications/UX improvements (see git history).

## Phase 3 — Platform ✅

- Projects API, file-backed audit, SSE activity stream, auth helpers
- **SQLite project registry** — set `PERSISTENCE_DRIVER=sqlite` and `DB_PATH=./data/testforge.db` (JSON remains default)

## Phase 4 — Composition ✅ (in progress)

- `ApiModule`, `ProjectModule`, `EnvironmentModule` on `ApplicationContainer`
- `npm run seed` for demo registry
- **Projects home** uses `/api/projects` (last-opened times stay in browser local meta)

### Next

- SQLite (or DB) for module JSON stores (APIs, environments, audit co-location)
- Register additional route modules on the container (datasets, knowledge, …)
- Projects page: audit-backed activity feed instead of session-only log
