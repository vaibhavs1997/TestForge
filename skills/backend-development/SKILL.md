---
name: backend-development
description: Use when changing TestForge Express routes, controllers, application services, domain rules, repositories, execution, or backend configuration.
---

# Backend development

## Inspect

Read `backend/src/index.ts`, the target interface/controller, its application service/use case, domain contract/entity, infrastructure adapter, and nearby tests. Check `ApplicationContainer.ts` before adding dependencies.

## Procedure

1. Identify the route and API response/error contract.
2. Put transport parsing in interfaces, business rules in application/domain, and storage/provider code in infrastructure.
3. Reuse repository contracts, shared errors, `ApiResponse`, logger, redaction, auth, project access, and outbound policy.
4. Register new composition in the application container and route setup only where required.
5. Add focused tests for success, validation, authorization, and failure paths.

## Validation

`npm run typecheck --workspace backend`, `npm run lint --workspace backend`, `npm run test:backend`, and `npm run build:backend`; use `npm run test:e2e` for browser/API behavior.

## Avoid

Direct file/database access from controllers, provider SDK types in domain code, unscoped project queries, secret-bearing logs, and weakening `OutboundNetworkPolicy`.
