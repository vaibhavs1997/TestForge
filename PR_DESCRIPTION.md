# 🐛 Fix 500 Errors on API Import, Environment, Knowledge, and Requirement Pages

## Summary
Fixes runtime `500 Internal Server Error` on all create operations across the API import, Environment, Knowledge, and Requirement modules. The root cause was three systemic issues in the backend caused by ESM-style module resolution.

## Problem
When navigating to API import, environment, knowledge, and requirement pages and attempting to create/import records, the backend returned `500 error`. The issues:

1. **`crypto.randomUUID()` used without import** — The backend runs in ESM mode (`"type": "module"`). In ESM, `crypto` is **not** a global, so calling `crypto.randomUUID()` threw `ReferenceError: crypto is not defined`, returning 500 on every create operation.
2. **`ApiOperationEntity` constructor mismatch** — `ImportApiContract.ts` passed 10 constructor args when 11 were required (missing `projectId`). `ApiController.createOperation` also didn't pass the `projectId` from the route params.
3. **`ApiOperationRepository.create()` path bug** — Used `operation.serviceId` instead of `operation.projectId` when reading/writing the operations file.
4. **ESM type/value export mismatches** — Multiple domain barrel `index.ts` files exported TypeScript **types** (interfaces, type aliases) using value-export syntax, causing `SyntaxError` on server startup.

## Changes

### 1. Fixed `crypto.randomUUID()` → proper `node:crypto` import
- Added `import { randomUUID } from 'node:crypto'` and replaced `crypto.randomUUID()` → `randomUUID()`
- Affected **44 files** across `application/`, `infrastructure/`, and `domain/` layers:
  - API module: `CreateApiOperation.ts`, `CreateApiService.ts`, `ImportApiContract.ts`, `TestDataResolutionService.ts`
  - Environment module: `CreateEnvironment.ts`
  - Knowledge module: `CreateKnowledgeFlow.ts`, `ManageBusinessRules.ts`, `ManageDependencies.ts`, `ManageDocumentation.ts`, `ManageRuntimeVariables.ts`
  - Requirement module: `CreateRequirement.ts`, `GenerateFromAnalysis.ts`, `GenerateTestDesigns.ts`, `PlanExecution.ts`, `PlanTestStrategy.ts`
  - Plus all other modules: analysis, audit, execution, notification, pipeline, plugin, prompt, providers, report, scheduler, suite, test-data, versioning

### 2. Fixed API Operation entity and repository
- **`ImportApiContract.ts`**: Added `params.projectId` to `ApiOperationEntity` constructor call
- **`ApiController.ts`**: Pass `projectId` from route params to `CreateApiOperation.execute()`
- **`ApiOperationRepository.ts`**: Fixed `create()` to use `operation.projectId` (not `operation.serviceId`) when reading/writing the operations file

### 3. Fixed ESM type/value export mismatches in barrel files
Converted type-export syntax to `export type` in domain barrel `index.ts` files:
- `domain/ai-provider/index.ts` — 12 type exports (adapter, config, types, etc.)
- `domain/plugin/index.ts` — 4 type exports
- `domain/notification/index.ts` — 4 type exports
- `domain/analysis/index.ts`, `domain/audit/index.ts`, `domain/environment/index.ts`, `domain/execution/index.ts`, `domain/recommendation/index.ts`, `domain/validation/index.ts`, `domain/versioning/index.ts`

Also updated all importer files to use `import type { ... }` for type-only imports (AI provider registry, resolution service, plugin registry/service/loader, notification service, infrastructure repositories).

## Files Changed
**Bug Fix (this PR):**
- `backend/src/application/api/ImportApiContract.ts`
- `backend/src/application/api/CreateApiOperation.ts`
- `backend/src/application/api/CreateApiService.ts`
- `backend/src/interfaces/api/ApiController.ts`
- `backend/src/infrastructure/api/ApiOperationRepository.ts`
- `backend/src/domain/ai-provider/index.ts`
- `backend/src/domain/plugin/index.ts`
- `backend/src/domain/notification/index.ts`
- `backend/src/domain/analysis/index.ts`
- `backend/src/domain/audit/index.ts`
- `backend/src/domain/environment/index.ts`
- `backend/src/domain/execution/index.ts`
- `backend/src/domain/recommendation/index.ts`
- `backend/src/domain/validation/index.ts`
- `backend/src/domain/versioning/index.ts`
- Plus 44 files with `randomUUID` import fixes (application + infrastructure layers)

## Testing
Verified locally:
- ✅ Server starts cleanly: `Server running on port 3000` (no SyntaxError)
- ✅ `GET /api/projects/:projectId/environments` → `{"success":true,"data":[]}`
- ✅ `GET /api/projects/:projectId/knowledge/flows` → `{"success":true,"data":[]}`
- ✅ `GET /api/projects/:projectId/services` → `{"success":true,"data":[]}`
- ✅ `POST /api/projects/:projectId/services` (create service) → `201 {"success":true}`
- ✅ `POST /api/projects/:projectId/environments` (create env) → `201 {"success":true}`
- ✅ `POST /api/projects/:projectId/knowledge/flows` (create flow) → `201 {"success":true}`
- ✅ `POST /api/projects/:projectId/services/:serviceId/apis` (create operation) → `201 {"success":true}`
- ✅ `POST /api/projects/:projectId/import` (OpenAPI file upload) → `{"servicesImported":1,"operationsImported":1,"detectedEnvironments":[...]}`
- ✅ `npx tsc --noEmit` → zero TypeScript errors

## How to Test
1. `cd backend && npm run dev`
2. Navigate to a project workspace → API / Environment / Knowledge / Requirement tabs
3. Create records or import an OpenAPI/Swagger/Postman spec — should succeed without 500 errors