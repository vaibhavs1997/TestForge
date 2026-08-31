---
name: testing
description: Use when adding regression coverage, diagnosing test failures, or deciding which TestForge validation gates apply.
---

# Testing

## Inspect

Read `docs/TESTING.md`, the nearest tests, workspace Vitest config, package scripts, and CI workflows. Determine whether the change is unit, cross-layer, production-artifact, security, or deployment related.

## Procedure

1. Add the narrowest deterministic test at the layer where the rule lives.
2. Cover success and failure/authorization boundaries; include regression cases for security-sensitive changes.
3. Use isolated in-memory/mocked collaborators or the existing E2E fixture server; do not call real providers.
4. Run focused tests first, then applicable typecheck/lint/build/E2E gates.

## Commands

`npm test`, `npm run test:coverage --workspace backend`, `npm run test:coverage --workspace frontend`, and `npm run test:e2e` are repository-defined commands.

## Completion

Tests pass without lowering coverage thresholds or disabling checks, and failures are explained or fixed.
