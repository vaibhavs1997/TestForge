# TestForge agent guidance

TestForge is an npm-workspaces monorepo. `frontend/` is a React 18 + TypeScript + Vite application; `backend/` is an Express + TypeScript service. This file is the primary repository instruction entry point. Keep feature work inside the appropriate workspace and preserve the existing module boundaries.

## Documentation map

Read only the deeper guidance relevant to the task, in addition to this file:

- [Architecture](docs/ARCHITECTURE.md): structural, backend-layer, persistence, runtime, integration, or deployment-topology changes.
- [Security](docs/SECURITY.md): authentication, authorization, project/tenant isolation, secrets, browser sensitive state, imports, webhooks, backups, scripts, or outbound-network changes.
- [Testing](docs/TESTING.md): adding/changing tests, diagnosing test failures, or deciding validation for cross-layer and production-affecting changes.
- [Design](DESIGN.md): meaningful frontend/UI, layout, styling, accessibility, or reusable-component changes.

When an implementation change makes one of these documents materially inaccurate, update the affected documentation in the same change.

## Skills map

Follow the applicable skill procedure; do not load unrelated skills:

- `skills/backend-development/SKILL.md`: backend routes, controllers, application/domain logic, repositories, execution, or backend configuration.
- `skills/frontend-development/SKILL.md`: React modules, routes, hooks, stores, API services, or shared UI.
- `skills/database-migration/SKILL.md`: persistence schemas, SQLite, PostgreSQL/pgvector, or durable JSON formats.
- `skills/testing/SKILL.md`: test additions, regression coverage, test failures, or validation planning.
- `skills/security-review/SKILL.md`: auth, isolation, secrets, sensitive browser state, imports, webhooks, backups, scripts, or network egress.

## Rules for every change

- Inspect the relevant module, its route/controller/service/repository, and existing tests before editing.
- Do not add a second abstraction when an existing service, hook, repository interface, shared UI component, API adapter, or utility already covers the need.
- Preserve the public API response envelope (`success`, with `data` on success and `message`/`details` on failure) and existing route compatibility unless the task explicitly changes it.
- Keep TypeScript strictness and existing ESLint conventions. Prefer small, single-purpose files and existing barrel exports.
- Keep project-scoped data and authorization project-scoped end to end. Never rely on a client-selected project as an authorization decision.
- Backend dependencies point inward: interfaces/routes/controllers call application services; application code depends on domain contracts; infrastructure implements those contracts. Do not import infrastructure/provider SDKs into domain code.
- Use the configured repository/container instead of direct storage access from controllers. JSON persistence is file-locked and single-node; do not assume it is safe for multiple replicas.
- Treat credentials, tokens, cookies, passwords, API keys, and secret references as sensitive. Keep provider credentials server-side, use the secret store where the existing workflow does, and pass data through the redaction service before logs/exports/integrations.
- Validate user-provided URLs with the outbound network policy before server-side egress. Preserve environment execution-policy restrictions and do not weaken SSRF/DNS/private-network checks.
- Follow existing async error handling and `ApiResponse`/shared error types; do not leak driver errors, secrets, or database URLs.
- Frontend server state belongs in TanStack Query; cross-page client state uses the existing Zustand stores. Clear user-scoped query/cache and sensitive browser state on logout.
- Use existing UI components and semantic Tailwind tokens/classes. See `DESIGN.md`; do not introduce a parallel design-token system.

## Validation

Before completing a change, run the smallest relevant checks, then the full applicable gate: `npm run typecheck`, `npm run lint`, `npm test`, and, for production/runtime or cross-layer changes, `npm run build` and `npm run test:e2e`. CI also enforces workspace coverage thresholds, backend compiled startup, dependency audit, and Docker/Compose validation. See [Testing](docs/TESTING.md).

Do not modify application behavior, dependencies, schemas, or deployment topology as part of documentation-only work. For changes covered by the documentation map or skills map, inspect and follow the applicable guidance before editing; do not require unrelated documents or skills.
