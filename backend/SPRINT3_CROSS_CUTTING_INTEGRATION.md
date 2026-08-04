# Sprint 3 – Cross-Cutting Integration

## Summary

This sprint improves the integration between existing frameworks (EventBus, Audit, Versioning, Cache Invalidation, Notification, Recommendation Refresh, Pipeline Refresh) without adding new features, UI changes, or API changes.

**Key principle:** Every entity mutation publishes an event through the central `EventPublisher`. Cross-cutting subscribers listening on the `EventBus` automatically trigger the full chain:

```
EventBus → Audit Log → Versioning → Cache Invalidation → Recommendation Refresh → Pipeline Refresh → Notification
```

## Files Modified

### Cross-Cutting Infrastructure

| File | Change |
|------|--------|
| `backend/src/application/pipeline/PipelineRefreshSubscriber.ts` | Fixed broken merge conflict marker (`>>>>>>`). File now compiles. |
| `backend/src/domain/audit/AuditLogEntity.ts` | Extended `AuditModule` type to include `Plugin`, `AI`, `AuditLog`. |

### ApplicationContainer Wiring

| File | Change |
|------|--------|
| `backend/src/application/ApplicationContainer.ts` | Wired 4 missing cross-cutting subscribers: `CacheInvalidationService`, `VersionEventListener`, `RecommendationRefreshSubscriber`, `PipelineRefreshSubscriber`. Updated service constructors to pass `EventPublisher` instead of `EventBus`. |

### Duplicated Publish Logic → Centralized

| File | Change |
|------|--------|
| `backend/src/infrastructure/requirements/RequirementRepository.ts` | Removed duplicated manual `versionService.create()` calls (now handled by `VersionEventListener`). Replaced direct `eventBus.publish()` with `EventPublisher.created()/updated()/deleted()`. |
| `backend/src/application/execution/ExecutePlan.ts` | Replaced direct `eventBus.publish()` with `EventPublisher.executed()`. |
| `backend/src/application/scheduler/SchedulerService.ts` | Replaced direct `eventBus.publish()` with `EventPublisher.executed()`. |
| `backend/src/application/report/GenerateReport.ts` | Replaced direct `eventBus.publish()` with `EventPublisher.generated()`. Fixed module from `recommendation` → `report`. |
| `backend/src/application/requirements/GenerateRequirementsWithAI.ts` | Removed duplicated manual `versionService.create()` calls. Added `EventPublisher.generated()` for AI generation events. |
| `backend/src/application/requirements/GenerateTestStrategyWithAI.ts` | Removed duplicated manual `versionService.create()` calls. Added `EventPublisher.generated()` for AI generation events. |
| `backend/src/application/requirements/GenerateTestDesignWithAI.ts` | Removed duplicated manual `versionService.create()` calls. Added `EventPublisher.generated()` for AI generation events. |
| `backend/src/application/assertion/GenerateAssertionsWithAI.ts` | Removed duplicated manual `versionService.create()` calls. Added `EventPublisher.generated()` for AI generation events. |
| `backend/src/application/requirements/GenerateExecutionPlanWithAI.ts` | Removed duplicated manual `versionService.create()` calls. Added `EventPublisher.generated()` for AI generation events. |
| `backend/src/application/suite/GenerateTestSuiteWithAI.ts` | Removed duplicated manual `versionService.create()` calls. Added `EventPublisher.generated()` for AI generation events. |
| `backend/src/application/prompt/PromptBuilderService.ts` | Removed duplicated manual `versionService.create()` calls. Added `EventPublisher.created()` for prompt generation events. |

### New Event Publishing (Previously Missing)

| File | Change |
|------|--------|
| `backend/src/application/api/CreateApiService.ts` | Added `EventPublisher` dependency. Publishes `CREATED` event on API service creation. |
| `backend/src/application/api/UpdateApiService.ts` | Added `EventPublisher` dependency. Publishes `UPDATED` event on API service update. |
| `backend/src/application/api/DeleteApiService.ts` | Added `EventPublisher` dependency. Publishes `DELETED` event on API service deletion. |
| `backend/src/application/plugin/PluginService.ts` | Added `EventPublisher` dependency. Publishes `CREATED`, `UPDATED`, `DELETED`, `ENABLED`, `DISABLED` events for plugin lifecycle. |
| `backend/src/application/requirements/UpdateRequirement.ts` | Added `EventPublisher` dependency. Publishes `APPROVED`/`REJECTED` events when approval status changes. |
| `backend/src/infrastructure/requirements/TestStrategyRepository.ts` | Added `EventPublisher` dependency. Publishes `CREATED`, `UPDATED`, `DELETED` events for test strategies. |

### Route Wiring Updates

| File | Change |
|------|--------|
| `backend/src/interfaces/api/ApiRoutes.ts` | Passes `eventPublisher` to `CreateApiService`, `UpdateApiService`, `DeleteApiService`. |
| `backend/src/interfaces/report/ReportRoutes.ts` | Passes `eventPublisher` to `GenerateReport`. |
| `backend/src/interfaces/execution/ExecutionRoutes.ts` | Uses container's `executePlan` (already wired with `EventPublisher`) instead of constructing a duplicate. |
| `backend/src/interfaces/requirements/RequirementRoutes.ts` | Passes `eventPublisher` to `UpdateRequirement` for APPROVE/REJECT events. |

## Coverage Matrix

Legend: ✅ = Covered (event published → full chain triggers) | ⚠️ = Partially covered (event published by repository, not service) | ❌ = Gap (no event published)

### Cross-Cutting Chain Verification

| Subscriber | Wired in Container | Subscribes To | Status |
|-----------|-------------------|---------------|--------|
| `AuditLogService` | ✅ Yes | ALL modules × ALL events | ✅ |
| `VersionEventListener` | ✅ Yes (Sprint 3) | ALL modules × versionable events | ✅ |
| `CacheInvalidationService` | ✅ Yes (Sprint 3) | Entity change events → publishes `INVALIDATED` | ✅ |
| `NotificationService` | ✅ Yes | Execution, Scheduler, Report events | ✅ |
| `RecommendationRefreshSubscriber` | ✅ Yes (Sprint 3) | `INVALIDATED` / `recommendation` | ✅ |
| `PipelineRefreshSubscriber` | ✅ Yes (Sprint 3) | `INVALIDATED` / `pipeline` | ✅ |

### Entity × Operation Coverage

| Entity | CREATE | UPDATE | DELETE | GENERATE | EXECUTE | APPROVE | REJECT | RESTORE | ENABLE | DISABLE |
|--------|--------|--------|--------|----------|---------|---------|--------|---------|--------|---------|
| **Requirements** | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ❌ | — | — |
| **Strategies** | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| **Designs** | ⚠️¹ | ⚠️¹ | ⚠️¹ | ✅ | — | — | — | — | — | — |
| **Assertions** | ⚠️¹ | ⚠️¹ | ⚠️¹ | ✅ | — | — | — | — | ⚠️¹ | ⚠️¹ |
| **Execution Plans** | ⚠️¹ | ⚠️¹ | ⚠️¹ | ✅ | ✅ | — | — | — | — | — |
| **Suites** | ⚠️¹ | ⚠️¹ | ⚠️¹ | ✅ | — | — | — | — | — | — |
| **Execution Profiles** | ⚠️¹ | ⚠️¹ | ⚠️¹ | — | — | — | — | — | — | — |
| **Datasets** | ⚠️¹ | ⚠️¹ | ⚠️¹ | — | — | — | — | — | — | — |
| **Knowledge** | ⚠️¹ | ⚠️¹ | ⚠️¹ | — | — | — | — | — | — | — |
| **Environment** | ⚠️¹ | ⚠️¹ | ⚠️¹ | — | — | — | — | — | — | — |
| **Providers** | ⚠️¹ | ⚠️¹ | ⚠️¹ | — | — | — | — | — | — | — |
| **Plugins** | ✅ | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ |
| **Reports** | — | — | — | ✅ | — | — | — | — | — | — |
| **Scheduler** | — | — | — | — | ✅ | — | — | — | — | — |
| **AI Pipeline** | — | — | — | ✅ | — | — | — | — | — | — |
| **AI Generation** | — | — | — | ✅ | — | — | — | — | — | — |
| **API Services** | ✅ | ✅ | ✅ | — | — | — | — | — | — | — |

### Notes

1. **⚠️¹ Repository-level events**: For entities like Designs, Assertions, Execution Plans, Suites, Execution Profiles, Datasets, Knowledge, Environment, and Providers, events are not yet published by their repositories. These entities use simple repository classes without `EventPublisher` wiring. The `CacheInvalidationService` has subscriptions for these modules, but no events are being published to trigger them. **Gap**: These repositories need `EventPublisher` wiring similar to `RequirementRepository` and `TestStrategyRepository`.

2. **❌ RESTORE operation**: No entity currently publishes a `RESTORED` event. The `VersionService.restore()` method exists but doesn't publish events.

3. **✅ AI Generation**: All 6 AI generation use cases now publish `GENERATED` events:
   - `GenerateRequirementsWithAI` → `generated('ai', ...)`
   - `GenerateTestStrategyWithAI` → `generated('strategy', ...)`
   - `GenerateTestDesignWithAI` → `generated('design', ...)`
   - `GenerateAssertionsWithAI` → `generated('assertion', ...)`
   - `GenerateExecutionPlanWithAI` → `generated('execution', ...)`
   - `GenerateTestSuiteWithAI` → `generated('suite', ...)`

4. **✅ Prompts**: `PromptBuilderService` publishes `CREATED` events for built prompts.

## Remaining Gaps

### High Priority

1. **Repository-level event publishing**: The following repositories do not publish events:
   - `TestDesignRepository` (Designs) - next in queue
   - `AssertionRepository` (Assertions)
   - `ExecutionPlanRepository` (Execution Plans)
   - `TestSuiteRepository` (Suites)
   - `ExecutionProfileRepository` (Execution Profiles)
   - `DatasetRepository` (Datasets)
   - `KnowledgeFlowRepository`, `BusinessRuleRepository`, etc. (Knowledge)
   - `EnvironmentRepository` (Environment)
   - `ProviderRepository` (Providers)

   These repositories need `EventPublisher` wiring similar to `TestStrategyRepository`.

2. **RESTORE operation**: No entity currently publishes a `RESTORED` event. The `VersionService.restore()` method exists but doesn't publish events.

### Medium Priority

3. **NotificationService CRUD**: The `NotificationService` creates/updates/deletes notification configurations but doesn't publish events for its own CRUD operations.

## Build Results

```
> ai-validation-backend@0.1.0 build
> tsc
```

**Status: ✅ BUILD SUCCEEDED (0 errors)**

## Sprint 3.2 Completion Summary

**Goal:** Every entity mutation must publish through the central EventPublisher.

**Achieved:**
- ✅ Removed all duplicated `versionService.create()` calls from AI generation use cases (6 files)
- ✅ All 6 AI generation use cases now publish `GENERATED` events through `EventPublisher`
- ✅ `PromptBuilderService` now publishes `CREATED` events
- ✅ `TestStrategyRepository` now publishes CREATED/UPDATED/DELETED events
- ✅ All cross-cutting subscribers wired in `ApplicationContainer`
- ✅ Added 'prompt' to `ModuleName` type
- ✅ Build passes with 0 errors

**Remaining Technical Debt:**
- Repository-level event publishing for Designs, Assertions, Execution Plans, Suites, Execution Profiles, Datasets, Knowledge, Environment, Providers
- RESTORE operation event publishing
- NotificationService CRUD event publishing