# Sprint 4.4 – React Query & State Consistency Guidelines

## 1. Query Key Conventions

All query keys are centralized in `frontend/src/constants/queryKeys.ts`.

### Hierarchy Rules

- **List queries**: `[resource, projectId]`
- **Detail queries**: `[resource, projectId, entityId]`
- **Nested list queries**: `[resource, projectId, subResource]`
- **Sub-resource detail**: `[resource, projectId, subResource, entityId]`
- **Global (non-project) queries**: `[resource]` or `[resource, 'scope']`

### Examples

```ts
queryKeys.projects                // ['projects']
queryKeys.project(projectId)      // ['projects', projectId]
queryKeys.requirements(projectId) // ['requirements', projectId]
queryKeys.requirement(projectId, requirementId) // ['requirements', projectId, requirementId]
```

## 2. Mutation Conventions

Every CRUD operation must use a React Query mutation.

### Pattern

```ts
const mutation = useMutation({
  mutationFn: (payload) => service.doSomething(payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey });
  },
});
```

### Naming

- `createMutation`
- `updateMutation`
- `deleteMutation`
- `enableMutation` / `disableMutation`
- Custom actions: `runNowMutation`, `restartMutation`, etc.

## 3. Invalidation Rules

- **Create** → invalidate the list query
- **Update** → invalidate the list query + any affected detail query
- **Delete** → invalidate the list query
- **Enable/Disable** → invalidate the list query

Avoid broad invalidation. Invalidate only the affected queries.

## 4. Optimistic Update Rules

Use optimistic updates only for **safe, non-destructive** operations:

- Rename
- Enable / Disable
- Status change (approval, flags)
- Reorder

Do NOT use optimistic updates for:

- Delete
- Create
- Any destructive operation

### Pattern

```ts
const updateMutation = useMutation({
  mutationFn: (data) => service.update(data),
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<T[]>(queryKey);
    if (previous) {
      queryClient.setQueryData<T[]>(queryKey, (old) =>
        (old || []).map((item) => (item.id === newData.id ? { ...item, ...newData } : item))
      );
    }
    return { previous };
  },
  onError: (_err, _vars, context) => {
    if (context?.previous) {
      queryClient.setQueryData(queryKey, context.previous);
    }
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey }),
});
```

## 5. Remove Duplicated State

Search for and replace:

- `useEffect(() => { fetch... }, [])`
- Manual `useState` + `axios` calls
- `reload()` or `window.location.reload()`
- Manual refresh buttons that reload the page

Replace with React Query `useQuery` and `useMutation`.

## 6. Error Handling

Every query must handle errors consistently.

### Pattern

```ts
const { data, isLoading, isError, error } = useQuery({
  queryKey,
  queryFn: () => service.list(),
});

if (isError) {
  return <ErrorAlert message={error?.message} onRetry={refetch} />;
}
```

Use the shared `ErrorAlert` component from `frontend/src/components/shared/ErrorAlert.tsx`.

## 7. Loading States

Every query must render:

- **Loading** – show skeleton or spinner
- **Error** – show `ErrorAlert`
- **Empty** – show `EmptyState`
- **Success** – show data

Use shared components:

- `frontend/src/components/ui/EmptyState.tsx`
- `frontend/src/components/ui/LoadingSpinner.tsx` (if available)

## 8. Query Key Consistency

Always use the centralized `queryKeys` object.

❌ **Bad**:
```ts
const queryKey = ['requirements', projectId];
```

✅ **Good**:
```ts
import { queryKeys } from '../../../constants';
const queryKey = queryKeys.requirements(projectId);
```

## 9. Stale Time & Cache Time

- Default `staleTime`: `0` (always refetch on mount)
- For static/reference data (AI provider types, adapters): `staleTime: 10 * 60 * 1000`
- For frequently updating data (pipeline status): use `refetchInterval`
- `gcTime` (formerly `cacheTime`): default `5 * 60 * 1000`

## 10. Enabled Flags

Use `enabled` to prevent queries from running until required params are available:

```ts
const { data } = useQuery({
  queryKey: queryKeys.versions(projectId),
  queryFn: () => versionService.list(projectId),
  enabled: !!projectId,
});
```

## 11. Module Migration Checklist

When migrating a module:

1. [ ] Create/replace hook file with `useQuery` + `useMutation`
2. [ ] Use centralized `queryKeys`
3. [ ] Add optimistic updates where safe
4. [ ] Replace manual `useState`/`useEffect` with React Query
5. [ ] Replace `window.location.reload()` with `queryClient.invalidateQueries()`
6. [ ] Standardize loading/error/empty states
7. [ ] Update page components to use new hook API
8. [ ] Run `tsc --noEmit` and fix type errors
9. [ ] Run `vite build` and fix build errors

## 12. Completed Migrations

| Module | Hook File | Optimistic Updates | Status |
|--------|-----------|-------------------|--------|
| Audit | `audit/hooks/index.ts` | No | ✅ |
| Analysis | `analysis/hooks/index.ts` | Yes (status) | ✅ |
| Environment | `environment/hooks/useEnvironments.ts` | Yes (update) | ✅ |
| Requirements | `requirements/hooks/useRequirements.ts` | Yes (status/approval) | ✅ |
| Scheduler | `scheduler/hooks/index.ts` | Yes (enable/disable) | ✅ |
| Assertion | `assertion/hooks/useAssertions.ts` | Yes (toggle) | ✅ |
| AI Provider | `ai-provider/hooks/index.ts` | Yes (enable/disable) | ✅ |
| Plugin | `plugin/hooks/index.ts` | Yes (enable/disable) | ✅ |
| Versioning | `versioning/hooks/index.ts` | No | ✅ |
| Prompt | `prompt/hooks/index.ts` | No | ✅ |
| Context | `context/hooks/index.ts` | No | ✅ |
| Pipeline | `pipeline/hooks/usePipeline.ts` | No | ✅ |
| Test Data - Datasets | `test-data/hooks/useDatasets.ts` | No | ✅ |
| Test Data - Columns | `test-data/hooks/useColumns.ts` | No | ✅ |
| Test Data - Rows | `test-data/hooks/useRows.ts` | No | ✅ |
| Test Data - Profiles | `test-data/hooks/useProfiles.ts` | No | ✅ |
| Test Data - Mappings | `test-data/hooks/useMappings.ts` | No | ✅ |
| Knowledge | `knowledge/hooks/index.ts` | No | ✅ |
| Report | `report/hooks/index.ts` | No | ✅ |
| Suite | `suite/hooks/index.ts` | No | ✅ |
| Execution | `execution/hooks/useExecution.ts` | No | ✅ |
| API | `api/hooks/useService.ts` | No | ✅ |
| Recommendation | `recommendation/hooks/index.ts` | No | ✅ |
| Notification | `notification/hooks/index.ts` | No | ✅ |
| Dashboard | `dashboard/pages/DashboardPage.tsx` | No | ✅ |

---

## Appendix: Common Patterns

### Query with Loading/Error/Empty States

```tsx
const { data: items = [], isLoading, isError, error } = useQuery({
  queryKey: queryKeys.items(projectId),
  queryFn: () => itemService.list(projectId),
  enabled: !!projectId,
});

if (isLoading) return <div>Loading...</div>;
if (isError) return <ErrorAlert message={error?.message} onRetry={refetch} />;

if (items.length === 0) {
  return <EmptyState title="No items" description="Create your first item." />;
}

return <div>{/* render items */}</div>;
```

### Mutation with Toast Feedback

```tsx
const mutation = useMutation({
  mutationFn: (data) => service.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey });
    toast.success('Created successfully');
  },
  onError: (err) => {
    toast.error(err?.message || 'Failed to create');
  },
});
```

### Polling for Real-time Data

```ts
const { data } = useQuery({
  queryKey: queryKeys.executions(projectId),
  queryFn: () => executionService.list(projectId),
  enabled: !!projectId,
  refetchInterval: 2000, // Poll every 2 seconds
});