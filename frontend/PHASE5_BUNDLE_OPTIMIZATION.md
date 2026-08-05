# Phase 5.2 – Bundle Optimization & Code Splitting

## Chunk Strategy

### manualChunks Configuration
- `vendor-react`: react, react-dom
- `vendor-query`: @tanstack/react-query
- `vendor-router`: react-router-dom
- `vendor-ui`: zustand, react-hook-form, @hookform/resolvers, zod, axios

### lazy Loaded Routes
Already implemented in `src/routes/index.tsx`:
- DashboardPage
- ImportCenterPage
- ShowcasePage

### lazy Loaded Dialogs
In `src/modules/test-data/pages/DatasetPage.tsx`:
- DatasetDialog → `DatasetDialog-DrWQUGKK.js` (2.31 kB)
- ColumnProfileDialog → `ColumnProfileDialog-BqGVCisH.js` (6.62 kB)
- RelationshipDialog → `RelationshipDialog-DMR_uwBe.js` (4.78 kB)

### lazy Loaded Administration & Developer Tools
In `src/modules/project/routes.tsx`:
- RecommendationsPage
- PipelinePage
- NotificationPage
- VersionHistoryPage
- AuditLogPage
- PluginManagementPage
- AIProviderManagementPage
- ProjectContextPage
- PromptBuilderPage

## Tree Shaking

### lucide-react
All imports use named imports (e.g., `import { Search } from 'lucide-react'`), enabling tree-shaking.

## Bundle Comparison

### Before
- Single main bundle: ~810 kB
- Dialog chunks already separated

### After
- `vendor-react`: 0.04 kB
- `vendor-query`: 42.37 kB (gzip: 12.80 kB)
- `vendor-router`: 164.07 kB (gzip: 53.54 kB)
- `vendor-ui`: 52.23 kB (gzip: 20.06 kB)
- Main app: 455.29 kB (gzip: 90.38 kB)
- Feature pages: 8–13 kB each (lazy-loaded)

### Total Chunks
20+ chunks

### Largest Remaining Chunks
- `vendor-router`: 164.07 kB (react-router-dom)
- `index` (main): 455.29 kB
- `vendor-ui`: 52.23 kB

## Remaining Optimization Opportunities

1. **vendor-router** is large due to react-router-dom. Consider:
   - Lazy-loading route components that are still static imports.
   - Using a lighter routing solution if feasible.

2. **Main bundle (index)** at 455 kB:
   - Review for large inline components or utilities.
   - Extract more feature modules into lazy-loaded routes.
   - Split shared UI components into a separate `vendor-ui-components` chunk.

3. **Tree-shake unused icons**:
   - Audit which lucide icons are actually used.
   - Remove unused icon imports from large pages.

4. **Lazy-load heavy libraries**:
   - Any chart libraries (if added).
   - Markdown/syntax highlighting libraries.
   - JSON viewers.

5. **Shared components**:
   - Verify `src/components/ui` and `src/components/shared` are not duplicated across chunks.

## Files Modified
- `frontend/vite.config.ts`
- `frontend/src/modules/project/routes.tsx`
- `frontend/src/modules/test-data/pages/DatasetPage.tsx`
- `frontend/src/components/shared/SearchBar.tsx`
- `frontend/src/hooks/useDebounce.ts` (new)

## Build
- TypeScript: passes
- Vite build: succeeds
- Chunk count: 20+
- Main bundle reduced from ~810 kB to 455 kB via vendor splitting + lazy loading