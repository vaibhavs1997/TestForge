# Persistence Strategy

**Decision (2026-08-06):** Continue using **project-scoped JSON files** as the system of record. Do **not** introduce a relational database in this phase.

## Rationale

- Matches current repository implementations and backup/export tooling
- Keeps local development and Docker deployments simple (single data volume)
- Avoids a large migration risk across 20+ bounded contexts
- Sufficient for single-instance and low-concurrency team deployments

## Mitigations for JSON storage

1. **File locking** — All repository writes go through [`JsonFileStore`](../backend/src/infrastructure/persistence/JsonFileStore.ts) (`proper-lockfile`) to prevent torn writes under concurrent requests on one node.
2. **Backup API** — Use `/api` backup routes and documented volume snapshots ([`BACKUP_AND_RESTORE.md`](../BACKUP_AND_RESTORE.md)).
3. **Horizontal scaling** — Not supported without externalizing storage (object store or database). If multi-instance deployment is required, revisit this decision.

## `DB_PATH` semantics

| Variable | Meaning |
|----------|---------|
| `DB_PATH` | Path whose **parent directory** is the data root used by backup/restore (default `./data/testforge.db` → data root `./data`) |
| On disk | JSON trees such as `data/apis/`, `data/environments/`, etc. |

The `testforge.db` filename is **not** an active SQLite database in the current codebase.

## Future migration (if needed)

If concurrency or multi-instance requirements grow:

1. Choose PostgreSQL (or SQLite for single-file embedded) with a single migration path per aggregate
2. Implement repositories behind existing domain interfaces
3. Provide a one-time import from JSON backup format
4. Remove or repurpose `JsonFileStore`

Until then, new features should use the existing repository + `JsonFileStore` pattern.
