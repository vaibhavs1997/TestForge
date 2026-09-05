# Testing

## Test layers

- Backend unit/integration tests live beside source as `backend/src/**/*.test.ts`, run in Node by `backend/vitest.config.ts`; they cover domain validation, middleware, repositories, security policy, use cases, and serialization.
- Frontend tests live beside source as `frontend/src/**/*.test.ts`/`.test.tsx`, run in jsdom by `frontend/vitest.config.js`; they cover utilities, shared components, and selected feature/page behavior.
- `e2e/production-golden.spec.ts` is a Playwright production-artifact gate. `e2e/fixture-api-server.mjs` provides controlled external API behavior. Playwright builds both workspaces, starts compiled backend plus Vite preview, and tests through `http://127.0.0.1:3101`.

## Commands

From the repository root:

```text
npm test
npm run test:frontend
npm run test:backend
npm run lint
npm run typecheck
npm run build:backend
npm run build:frontend
npm run test:e2e
npm run test:e2e:ui
```

Workspace-specific coverage is `npm run test:coverage --workspace frontend` or `npm run test:coverage --workspace backend`. Backend thresholds are 60% statements, 50% branches, 70% functions, 60% lines. Frontend thresholds are 60%, 45%, 55%, 62% respectively for the explicitly included reusable-core paths. CI also runs backend compiled startup smoke, npm high-severity dependency audits, and Docker/Compose config validation.

## What to add

- Add focused backend tests for new domain rules, application use cases, repositories, middleware, auth/project isolation, egress policy, and error mappings.
- Add frontend tests for reusable UI behavior, validation, state transitions, accessibility behavior, and API mapping utilities. Use existing UI/test helpers and avoid testing implementation details.
- Add or extend Playwright coverage when a change crosses the browser/API boundary, affects production startup, execution/scheduling, imports, auth, or user-visible workflow integration.
- Security-sensitive changes need regression tests for allowed and blocked cases, including tenant/project separation and secret redaction.

## Fixtures and infrastructure

Unit tests use in-memory/mocked collaborators where appropriate. E2E uses isolated runtime files and the fixture API server; it supplies a test JWT secret, disables rate limiting, and enables only the fixture-safe local egress policy. PostgreSQL/pgvector is optional and is not the primary application test database. Do not use committed `.env` credentials or real external providers in tests.

## Completion criteria

Run relevant tests plus typecheck/lint. For cross-layer or production-affecting work run build and `npm run test:e2e`; for persistence/config changes also run the applicable Docker Compose config check. Investigate failures rather than weakening thresholds or disabling tests.

## P0 regression coverage

Regression tests cover organization-name isolation, project resource parameters and nested request references, project-bound secret resolution, provider credential migration, corrupt JSON preservation, concurrent updates, raw backup integrity and staged restore, execution profile isolation, overlapping worker ticks and shutdown draining, status regex/header/response-time assertions, large reports, and the actual script worker interpreter.

Playwright starts the compiled backend with an isolated temporary working directory shared through TESTFORGE_E2E_DATA_ROOT. It clears MongoDB and shared API-key configuration and uses explicit test credentials. Durable-job evidence reads this isolated directory. The production-preview test captures a screenshot and checks browser runtime errors. Developer project data is never an E2E fixture.

CI and container builders use Node 22, matching the locked better-sqlite3 minimum (Node >=22). The E2E launcher owns its server processes directly so Windows teardown does not depend on shell process-tree termination.
