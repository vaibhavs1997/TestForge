---
name: security-review
description: Use when changing authentication, project isolation, secrets, browser sensitive state, imports, webhooks, backups, scripts, or outbound network execution.
---

# Security review

## Inspect

Read `docs/SECURITY.md`, auth/project middleware, config validation, secret/redaction services, outbound policy, affected routes, frontend session utilities, and existing security tests.

## Procedure

1. Trace untrusted input from route/browser to storage, logs, outbound calls, or execution.
2. Verify authentication, tenant/project authorization, validation, redaction, and error handling at the server boundary.
3. For URLs, preserve DNS-aware `OutboundNetworkPolicy` checks and environment allowlists immediately before egress.
4. For credentials, use references/server-side storage and clear browser sensitive state on logout.
5. Add blocked and allowed regression tests; document genuine gaps under `Known gaps` rather than claiming a missing control.

## Validation

Run backend/frontend security-focused tests, full workspace tests, typecheck, lint, build, and E2E where the browser/API boundary changes. CI’s high-severity npm audit is also relevant to dependency changes.

## Avoid

Logging raw tokens, trusting client project IDs, wildcard production CORS, bypassing DNS/private-network checks, or treating the local in-memory limiter as distributed protection.
