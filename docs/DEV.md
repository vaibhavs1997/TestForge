# TestForge — local development

## Prerequisites

- Node.js 20+
- npm

## Environment

Copy examples and adjust if needed:

- `backend/.env` — `PORT=3000`, `NODE_ENV=development`
- `frontend/.env` — `VITE_API_URL=/api` (Vite proxies to the backend)
- Optional auth: `TESTFORGE_API_KEY` or `TESTFORGE_JWT_SECRET` on the backend; `VITE_API_KEY` on the frontend (used for SSE when API auth is enabled)

### Persistence

- `PERSISTENCE_DRIVER=json` (default) — project registry and audit logs on disk under `backend/data/`
- `PERSISTENCE_DRIVER=memory` — in-memory audit only (tests)

## Run

Use two terminals from the repo root:

```bash
npm run dev:backend
npm run dev:frontend
```

Open the URL printed by Vite (often `http://localhost:5173`). The frontend calls `/api`, which is proxied to the backend.

Health check: `http://localhost:3000/health`

## Seed demo data

From `backend/`:

```bash
npm run seed
```

Registers demo projects and syncs folders already present under `data/`.

## Auth (optional)

```bash
cd backend
npm run issue-jwt -- --sub dev@local --projects '*'
```

Send `Authorization: Bearer <token>` or `X-API-Key` on API calls. EventSource uses `?token=` when `VITE_API_KEY` is set.

## Tests

```bash
npm test
npm run typecheck
```
