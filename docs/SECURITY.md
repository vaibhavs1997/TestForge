# Security model

This documents protections present in the current implementation, not a target-state security plan.

## Authentication and authorization

- `/api` is protected by `backend/src/interfaces/middleware/auth.ts` when `TESTFORGE_AUTH_ENABLED` resolves to enabled. Credentials are `x-api-key` or `Authorization: Bearer ...`; API-key comparison uses `timingSafeEqual`, and JWTs are verified with `TESTFORGE_JWT_SECRET`.
- JWT context carries subject, tenant, role, and project scope. `authorizeProject` checks project IDs, then owner or tenant via the project repository. Global backup/metrics operations require global scope and an admin/owner role.
- Enterprise login is enabled by `MONGODB_URI` (unless explicitly disabled), with JWT required. Deployment validation requires authentication and 32-byte minimum API/JWT secrets where configured (`backend/src/config.ts`).
- The no-auth path is intended for local development only. Compose development explicitly enables single-node JSON; staging uses production validation and authentication.

## Secrets and sensitive state

`LocalSecretStore` encrypts stored values with AES-256-GCM. In staging/production `TESTFORGE_SECRET_STORE_KEY` must be an externally supplied base64-encoded 32-byte key; development may generate a local key under `backend/data/runtime`. `SensitiveDataRedactionService` redacts sensitive keys and known values for persistence/logging/export paths. Provider credentials are configured server-side.

The frontend stores the JWT through `frontend/src/services/authSession` and uses session/browser storage for API workspace state. Logout clears the JWT, selected project, and sensitive browser state. Do not place new long-lived credentials in browser storage or logs.

## Network and input boundaries

`backend/src/infrastructure/security/OutboundNetworkPolicy.ts` validates URL scheme, DNS resolution, metadata/link-local/private/loopback destinations, allowed hosts, ports, and environment policy. Preserve the validation immediately before server-side outbound calls; do not substitute a string-only URL check. Development fixtures explicitly allow loopback/private destinations in tests.

Express sets `nosniff`, `DENY` frame protection, `no-referrer`, CSP `default-src 'none'`, and production HSTS in `backend/src/index.ts`. CORS uses an explicit comma-separated origin list; production/staging reject missing or wildcard `CORS_ORIGIN` in config validation. `/metrics` is authenticated and internal-only by default when auth is disabled.

Request validation is implemented in feature DTOs/domain validators and frontend Zod/utilities. File imports use Multer and parser adapters; preserve size/type validation present in the receiving route. Script execution is isolated to the frontend API-execution sandbox utility; do not add `eval` or server-side arbitrary code execution.

## Rate limiting, logging, webhooks, and backups

Non-development `/api` requests use an in-memory IP rate limiter (100 requests per 15 minutes) unless `RATE_LIMIT_ENABLED=false`. It is not shared across replicas. Logging is centralized under `backend/src/infrastructure/logging` and should receive redacted data. Webhook routes and backup/restore code require dedicated review; backup restore replaces the data directory and backups are not additionally encrypted by TestForge.

## Invariants

- Every project-scoped read/write must pass backend project authorization and preserve project/tenant ownership.
- Never expose secret plaintext in API responses, logs, reports, backups, or client persistence when a secret reference/redacted form is sufficient.
- Never permit metadata/link-local destinations or bypass DNS/private-network rechecks for convenience.
- Preserve explicit production CORS, authentication, secret-store-key, and single-node configuration gates.

## Known gaps

- The rate limiter is process-local and uses the first `X-Forwarded-For` value; it is not a distributed or independently trusted proxy-aware limiter.
- The current single-node JSON/file persistence, scheduler, activity hub, and durable worker are not suitable for multi-replica deployment.
- TestForge does not additionally encrypt backup archives; deployment storage/off-host backup encryption is required operationally.
- The frontend API workspace can hold request credentials in browser/session state for the active workflow; this is a deliberate compatibility behavior and requires care when changing persistence.
