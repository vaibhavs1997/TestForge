# Security model

This documents protections present in the current implementation, not a target-state security plan.

## Authentication and authorization

- `/api` is protected by `backend/src/interfaces/middleware/auth.ts` when `TESTFORGE_AUTH_ENABLED` resolves to enabled. Credentials are `x-api-key` or `Authorization: Bearer ...`; API-key comparison uses `timingSafeEqual`, and JWTs are verified with `TESTFORGE_JWT_SECRET`.
- JWT context carries subject, tenant, role, and project scope. `authorizeProject` checks project IDs, then verified project ownership via the project repository. Tenant claims alone never grant access; new registrations receive independent UUID tenant IDs. Sharing requires explicit signed project scopes until a verified membership workflow exists. Global backup/metrics operations require global scope and an admin/owner role.
- Enterprise login is enabled by `MONGODB_URI` (unless explicitly disabled), with JWT required. Deployment validation requires authentication and 32-byte minimum API/JWT secrets where configured (`backend/src/config.ts`).
- The no-auth path is intended for local development only. Compose development explicitly enables single-node JSON; staging uses production validation and authentication.

## Secrets and sensitive state

`LocalSecretStore` encrypts stored values with AES-256-GCM. In staging/production `TESTFORGE_SECRET_STORE_KEY` must be an externally supplied base64-encoded 32-byte key; development may generate a local key under `backend/data/runtime`. `SensitiveDataRedactionService` redacts sensitive keys and known values for persistence/logging/export paths. AI provider credentials are stored as references to encrypted secret-store entries. Startup migrates legacy plaintext AI provider keys before accepting traffic or starting jobs; preserve the existing secret-store key for this migration. Secret resolution verifies project ownership before decryption.

The frontend stores the JWT through `frontend/src/services/authSession` and uses session/browser storage for API workspace state. Logout clears the JWT, selected project, and sensitive browser state. Do not place new long-lived credentials in browser storage or logs.

## Network and input boundaries

`backend/src/infrastructure/security/OutboundNetworkPolicy.ts` validates URL scheme, DNS resolution, metadata/link-local/private/loopback destinations, allowed hosts, ports, and environment policy. Preserve the validation immediately before server-side outbound calls; do not substitute a string-only URL check. Development fixtures explicitly allow loopback/private destinations in tests.

Express sets `nosniff`, `DENY` frame protection, `no-referrer`, CSP `default-src 'none'`, and production HSTS in `backend/src/index.ts`. CORS uses an explicit comma-separated origin list; production/staging reject missing or wildcard `CORS_ORIGIN` in config validation. `/metrics` is authenticated and internal-only by default when auth is disabled.

Request validation is implemented in feature DTOs/domain validators and frontend Zod/utilities. File imports use Multer and parser adapters; preserve size/type validation present in the receiving route. Script execution is isolated to the frontend API-execution sandbox utility; do not add `eval` or server-side arbitrary code execution.

## Rate limiting, logging, webhooks, and backups

Non-development `/api` requests use an in-memory IP rate limiter (100 requests per 15 minutes) unless `RATE_LIMIT_ENABLED=false`. It is not shared across replicas. Logging is centralized under `backend/src/infrastructure/logging` and should receive redacted data. Project resource parameters and control-plane body/query references are checked by the shared route authorizer before controllers run. Webhook routes and backup/restore code require dedicated review. Backups use a separate raw format with SHA-256 integrity manifests; exports remain redacted. Restore is offline-only and retains the previous data directory. Backups are not additionally encrypted by TestForge.

## Invariants

- Every project-scoped read/write must pass backend project authorization and preserve project/tenant ownership.
- Never expose secret plaintext in API responses, logs, reports, exports, or client persistence when a secret reference/redacted form is sufficient.
- Never permit metadata/link-local destinations or bypass DNS/private-network rechecks for convenience.
- Preserve explicit production CORS, authentication, secret-store-key, and single-node configuration gates.

## Known gaps

- The rate limiter is process-local and uses the first `X-Forwarded-For` value; it is not a distributed or independently trusted proxy-aware limiter.
- The current single-node JSON/file persistence, scheduler, activity hub, and durable worker are not suitable for multi-replica deployment.
- TestForge does not additionally encrypt backup archives; deployment storage/off-host backup encryption is required operationally.
- The frontend API workspace can hold request credentials in browser/session state for the active workflow; this is a deliberate compatibility behavior and requires care when changing persistence.

## Backup and restore operations

Stop the server before offline maintenance. From the repository root, run `npm run backup:create --workspace=backend` or `npm run backup:restore --workspace=backend -- <backup-id>`. The server and maintenance commands share a single-node storage lock. The HTTP restore endpoint refuses live replacement. Online JSON snapshots fail if a storage lock is active; SQLite WAL/journal snapshots require the offline command. MongoDB and optional PostgreSQL require their own database backups. An external DB_PATH outside the application data directory is rejected by file backup creation.

Raw backups preserve exact bytes, including the encrypted secret store and any development key file. Treat the entire backup as sensitive, restrict filesystem access, and encrypt deployment/off-host storage. In production the external secret-store key must be restored separately. Never share raw backups as project exports. Legacy redacted backups cannot be restored as recoverable snapshots.

Restore checks the manifest, stages data outside the live directory, preserves nested backups, swaps directories, and retains `data.restore-previous-*` for rollback. Restart TestForge after restore; remove old rollback copies only after verifying recovery.
