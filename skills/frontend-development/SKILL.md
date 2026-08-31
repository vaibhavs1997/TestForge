---
name: frontend-development
description: Use when changing React modules, routes, hooks, stores, API services, or shared UI in the Vite frontend.
---

# Frontend development

## Inspect

Read the target module, route, service, hook/store, nearest tests, and shared components under `frontend/src/components/ui`. Check `App.tsx` for Query/Router/auth behavior and `styles/index.css` for tokens.

## Procedure

1. Keep feature code in its module and use existing barrel exports.
2. Use TanStack Query for server state and existing Zustand stores only for cross-page client state.
3. Reuse semantic tokens, shared components, `cn`, Lucide icons, validation helpers, and auth/session behavior.
4. Preserve project scoping, 401 recovery, logout cache clearing, loading/empty/error states, and keyboard/focus behavior.
5. Add focused component/utility tests and update E2E for cross-layer workflows.

## Validation

`npm run typecheck --workspace frontend`, `npm run lint --workspace frontend`, `npm run test:frontend`, and `npm run build:frontend`; run `npm run test:e2e` for integrated behavior.

## Avoid

Duplicated primitives, raw design values, credentials in persistent browser state, unlabelled icon controls, and global state for query data.
