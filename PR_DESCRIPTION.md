# Implement Provider Framework for TestForge

## Summary
Creates a reusable provider framework that allows external systems (Email, SMS, Payment, Storage, Custom) to be plugged into TestForge. Reuses the existing Test Data Library, Execution Engine, and Environment module infrastructure. No AI or scheduling logic was implemented. No external services are called yet — only architecture is prepared.

---

## What's Included

### 🏗️ Backend — Domain
- `ProviderEntity` — entity with `id`, `projectId`, `name`, `category`, `adapter`, `configuration`, `credentials`, `enabled`, `isDefault`, `createdAt`, `updatedAt`
- `ProviderRepository` — domain repository interface
- Categories: **Email, SMS, Payment, Storage, Custom**
- Adapter types: **Mailtrap, MailHog, TempMail, Twilio, StripeSandbox, Custom**

### 📦 Backend — Infrastructure
- **ProviderRepository (file-based)** — persists providers to `data/providers/{projectId}/providers.json`
  - **Credential masking** — API keys/tokens/passwords are masked on read to protect secrets
- **ProviderAdapter interface** — `testConnection`, `validateConfiguration`, `getCapabilities`
- **ProviderAdapterRegistry** — singleton registry mapping adapter types to implementations
- **6 placeholder adapters** — Mailtrap, MailHog, TempMail, Twilio, StripeSandbox, Custom
  - **Do NOT call external services yet**
- **ProviderResolutionService** — resolves providers for the Execution Engine by ID, default, or category

### ⚙️ Backend — Application
- `ManageProviders` — CRUD use case with:
  - Adapter validation on create/extract
  - Default provider management (only one default per project)
  - Update/delete operations

### 🔌 Backend — Interfaces
- `ProviderController` — create, get, list, update, delete, test connection, list adapter types
- `ProviderRoutes` — REST endpoints

### 🎨 Frontend — Test Data Library "Providers" Section
- **Provider Management page integrated into the existing Test Data Library** (not a separate top-level module)
- Features:
  - List providers (card view)
  - Create / Edit / Delete providers
  - Enable / Disable toggle
  - Set Default provider
  - **Test Connection** (placeholder)
  - **Filter by category** (Email, SMS, Payment, Storage, Custom)
  - **Search** by name or adapter

### 🔄 Integration
- **Execution Engine** (`ExecutePlan.ts`) now imports `ProviderRepository` + `ProviderResolutionService` as the integration point for provider resolution — **no execution behavior changed**
- **Test Data generators** can already reference providers via `strategyType: 'Provider'` in `ColumnProfileData`

---

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/adapter-types` | List available adapter types |
| POST | `/api/projects/:projectId/providers` | Create provider |
| GET | `/api/projects/:projectId/providers` | List providers (filter by `?category=`) |
| GET | `/api/projects/:projectId/providers/:providerId` | Get provider |
| PATCH | `/api/projects/:projectId/providers/:providerId` | Update provider |
| DELETE | `/api/projects/:projectId/providers/:providerId` | Delete provider |
| POST | `/api/projects/:projectId/providers/:providerId/test` | Test connection (placeholder) |

---

## Files Created

### Backend
| Path | Purpose |
|------|---------|
| `backend/src/domain/providers/ProviderRepository.ts` | Domain repository interface |
| `backend/src/domain/providers/index.ts` | Domain barrel export |
| `backend/src/infrastructure/providers/ProviderRepository.ts` | File-based repo with credential masking |
| `backend/src/infrastructure/providers/ProviderAdapter.ts` | Adapter interface |
| `backend/src/infrastructure/providers/ProviderResolutionService.ts` | Provider resolution for Execution Engine |
| `backend/src/infrastructure/providers/adapters/index.ts` | Adapters barrel export |
| `backend/src/infrastructure/providers/adapters/ProviderAdapterRegistry.ts` | Adapter registry singleton |
| `backend/src/infrastructure/providers/adapters/MailtrapAdapter.ts` | Mailtrap placeholder |
| `backend/src/infrastructure/providers/adapters/MailHogAdapter.ts` | MailHog placeholder |
| `backend/src/infrastructure/providers/adapters/TempMailAdapter.ts` | Temp Mail placeholder |
| `backend/src/infrastructure/providers/adapters/TwilioAdapter.ts` | Twilio placeholder |
| `backend/src/infrastructure/providers/adapters/StripeSandboxAdapter.ts` | Stripe Sandbox placeholder |
| `backend/src/infrastructure/providers/adapters/CustomProviderAdapter.ts` | Custom placeholder |
| `backend/src/infrastructure/providers/index.ts` | Infrastructure barrel export |
| `backend/src/application/providers/ManageProviders.ts` | CRUD use case |
| `backend/src/application/providers/index.ts` | Application barrel export |
| `backend/src/interfaces/providers/ProviderController.ts` | REST controller |
| `backend/src/interfaces/providers/ProviderRoutes.ts` | Route definitions |
| `backend/src/interfaces/providers/index.ts` | Interfaces barrel export |

### Frontend
| Path | Purpose |
|------|---------|
| `frontend/src/modules/test-data/types/provider.ts` | Provider types |
| `frontend/src/modules/test-data/services/providerService.ts` | API client |
| `frontend/src/modules/test-data/components/ProvidersSection.tsx` | Provider Management UI |

---

## Files Modified

| Path | Change |
|------|--------|
| `backend/src/index.ts` | Registered `providerRoutes` at `/api` |
| `backend/src/application/execution/ExecutePlan.ts` | Added ProviderRepository + ProviderResolutionService imports (integration point, no behavior change) |
| `frontend/src/modules/test-data/pages/DatasetPage.tsx` | Integrated `ProvidersSection` into "Providers" nav, removed "Coming Soon" placeholder |

---

## Build Verification

- **Backend TypeScript**: `cd backend && npx tsc --noEmit`
- **Frontend TypeScript**: `cd frontend && npx tsc --noEmit`
- **Vite build**: `cd frontend && npm run build`

---

## Out of Scope (Not Implemented)
- ❌ AI
- ❌ Scheduling
- ❌ External service calls (adapters are placeholders only)

---

## Next Steps (Future)
- Wire actual external API calls into adapters
- Add provider-based test data generators
- Add Storage provider adapters
- Add connection status monitoring