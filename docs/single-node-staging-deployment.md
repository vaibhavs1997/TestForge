# TestForge single-node staging deployment

## Supported topology

```text
HTTPS/domain -> existing reverse proxy -> TestForge frontend (nginx)
                                        -> /api -> backend -> persistent Docker volume (/app/data)
```

Only the frontend publishes a host port. Its nginx configuration proxies `/api`
over the private Docker network to the backend; clients therefore use the same
origin and do not need `VITE_API_URL`. Terminate TLS at the external reverse
proxy and forward the original host and `X-Forwarded-*` headers to the frontend.

This is intentionally a **single-node** deployment. Most domain repositories,
the durable job queue, schedules, audit records, and the local SecretStore use
the shared `/app/data` volume. Do not run more than one backend replica, share
the volume between hosts, or enable distributed coordination. A database-backed
repository/job/lease design is required before HA or multi-instance deployment.

## First startup

1. Install Docker Engine and the Compose plugin on the staging host.
2. Copy `.env.staging.example` to `.env.staging`; set a real public
   `CORS_ORIGIN`, authentication secret(s), and `TESTFORGE_SECRET_STORE_KEY`.
   The SecretStore key must be base64-encoded 32 random bytes and retained in
   the approved secret manager. Startup fails if this key is missing or invalid.
3. Build and start the production artifacts:

   ```sh
   docker compose -f docker-compose.staging.yml up -d --build
   ```

4. Confirm the containers are healthy:

   ```sh
   docker compose -f docker-compose.staging.yml ps
   docker compose -f docker-compose.staging.yml exec backend node -e "fetch('http://127.0.0.1:3000/ready').then(r => process.exit(r.ok ? 0 : 1))"
   ```

`/health` is the liveness endpoint. `/ready` (also `/readiness`) includes
configured dependency readiness and is the Compose health check. Metrics remain
authenticated and internal by default.

## Persistence, backup, and restore

The named `testforge-staging-data` volume is mounted at `/app/data` and retains
projects/contracts, environments and secret references, requirements and test
cases, suites/schedules, execution runs, durable jobs, and audit data across
container recreation. Backups are written to `/app/data/backups`, so include
that volume in host-level/off-host backup policy.

Use the authenticated backup API/UI only with a global administrator. Backup
metadata and archive paths are validated before restore; restore replaces the
current data directory, so first take a fresh backup and test restoration on an
isolated staging clone. Backups are not additionally encrypted by TestForge;
encrypt the Docker volume and off-host backup destination with platform controls.

## Upgrade, restart, and rollback

For a normal restart or image upgrade:

```sh
docker compose -f docker-compose.staging.yml up -d --build
docker compose -f docker-compose.staging.yml ps
```

The backend handles `SIGTERM` by stopping the scheduler, durable worker,
activity hub, database connections, and HTTP listener before exit. Do not use
`down -v`: that deletes the persistent application volume. Before upgrading,
create a backup and record the image/source revision. To roll back, deploy the
previous known-good image/source revision with the same `.env.staging` and the
same persistent volume, then verify `/ready`. A changed SecretStore key cannot
decrypt previously stored secret references.

## Production checklist

- Keep `.env.staging` readable only by deployment operators and never commit it.
- Keep the backend private; publish only the frontend through an HTTPS reverse proxy.
- Set `TESTFORGE_ALLOW_SINGLE_NODE_JSON=true` only for this explicitly
  single-node topology (the Compose files do so deliberately).
- Monitor container health, authenticated metrics, execution/durable-job
  failures, and `/app/data` capacity. Retention currently applies to backup
  count; define platform log and volume backup retention separately.
- Verify a backup/restore dry run on a non-production clone before relying on it.
