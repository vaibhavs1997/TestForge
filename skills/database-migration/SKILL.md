---
name: database-migration
description: Use when changing persistence schemas, PostgreSQL/pgvector RAG tables, SQLite-backed repositories, or durable JSON data formats.
---

# Persistence changes

## Inspect

Read the repository contract and adapter, `backend/src/infrastructure/database`, config validation, Docker Compose files, deployment docs, and all related tests. There is no single project-wide migration framework: JSON is the default, selected stores use SQLite, and optional RAG uses PostgreSQL/pgvector migrations at startup.

## Procedure

1. Identify the storage driver(s) and whether the change is backward-compatible with existing data.
2. Preserve file locking and single-node assumptions for JSON; use direct/unpooled PostgreSQL connections for migration/session operations where applicable.
3. Add startup migration/version handling only in the existing infrastructure boundary; do not make controllers aware of storage details.
4. Test existing data, fresh initialization, malformed data, and rollback/backup implications.
5. Update architecture/deployment documentation only when the current behavior changes.

## Validation

Run backend typecheck, lint, tests, build, and relevant smoke/E2E tests. Validate Compose config for deployment changes. Never use production credentials in local tests.

## Avoid

Treating JSON as multi-instance safe, changing schemas without compatibility tests, or enabling distributed mode without database-backed repositories/job/lease adapters.
