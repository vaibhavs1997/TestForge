# TestForge

AI-powered API validation platform for creating, managing, and testing API endpoints with automated test case generation from acceptance criteria.

## Project Structure

This monorepo contains the frontend and backend for TestForge.

```text
TestForge/
|-- frontend/         # React + TypeScript + Vite + Tailwind CSS
|   `-- src/
|       |-- modules/              # Feature modules
|       |   |-- api-execution/    # Standalone API explorer and request runner
|       |   |-- knowledge/        # Documentation and project context
|       |   |-- test-data/        # Datasets, mappings, and runtime test data
|       |   |-- project/          # Project management
|       |   |-- requirements/     # Acceptance criteria and AI test generation
|       |   |-- settings/         # Application settings
|       |   |-- suite/            # Test suites
|       |   `-- testcase/         # Test cases
|       |-- components/           # Shared UI components
|       |-- layouts/              # Layout components
|       |-- store/                # State management
|       `-- utils/                # Utilities
|-- backend/          # Express + TypeScript
`-- package.json      # Root workspace configuration
```

## Key Features

- Project management for testing workspaces
- Standalone API workspace for importing, editing, and executing requests
- OpenAPI, Swagger, Postman, environment, and GraphQL import workflows
- Environment selection with variable substitution and base-URL resolution
- OAuth/Bearer token reuse across authenticated API requests
- Scheduled suite runs with optional automatic bearer-token API generation
- Persistent request configuration, endpoint responses, headers, cookies, and history
- Postman-style API explorer with expandable folders and endpoint names
- Test Data synchronization with API payload fields, mappings, reservations, and runtime generators
- Knowledge documentation import with tagging and API/Test Data project summaries
- Requirements import from Jira/files with AI test generation
- Knowledge-assisted endpoint mapping with deterministic fallback selection
- Test suites for positive, negative, boundary, security, and performance coverage
- Live request-body mutation for mapped test scenarios while preserving untouched fields
- HTML, JSON, CSV, and print-to-PDF report exports
- Project overview cards synchronized with APIs, Test Data, Knowledge, Requirements, Test Review, Execution, and Reports
- Knowledge documents with categories, tags, and replace/remove workflows
- Dark and light theme support

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Lucide React
- Zustand

### Backend
- Express.js + TypeScript
- Clean Architecture (Domain -> Application -> Infrastructure -> Interfaces)
- Mixed persistence depending on module:
  - File-based JSON persistence with per-file locking
  - SQLite-backed repositories for selected data stores
  - In-memory repositories for ephemeral services
- Optional API key / JWT authentication on `/api` routes

## Engineering Standards

### Frontend
- Feature/module-based architecture with barrel exports
- Module independence and self-contained features
- Composition over inheritance
- Separation of concerns
- Single responsibility per file

### Backend
- Clean Architecture with clear layer separation
- Dependency injection for use cases
- Single responsibility per class

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- Docker Desktop (optional, for local PostgreSQL + pgvector)

### Installation

```bash
npm install
npm run dev:frontend
npm run dev:backend
npm run build
```

### Local PostgreSQL + pgvector

The application can run its existing JSON/SQLite persistence without PostgreSQL.
For local pgvector development, start the isolated database service:

```bash
docker compose -f docker-compose.local.yml up -d
```

It exposes PostgreSQL on `localhost:5432` by default, stores data in the
`testforge-postgres-data` Docker volume, and enables the `vector` extension on
first initialization. Override `POSTGRES_PORT`, `POSTGRES_DB`,
`POSTGRES_USER`, and `POSTGRES_PASSWORD` in your local `.env` as needed.

To stop it while preserving data:

```bash
docker compose -f docker-compose.local.yml down
```

### Single-node staging deployment

The supported staging topology serves the frontend behind HTTPS and proxies the
same-origin `/api` path to a private backend container with a persistent volume.
See [the single-node staging deployment guide](docs/single-node-staging-deployment.md)
for the required secrets, startup, health checks, backup location, and upgrade/
rollback procedure. The current JSON/file repositories are deliberately
single-node only.

## API Endpoints

### API Management
- `GET /api/projects/:projectId/services`
- `POST /api/projects/:projectId/services`
- `GET /api/projects/:projectId/services/:serviceId`
- `PATCH /api/projects/:projectId/services/:serviceId`
- `DELETE /api/projects/:projectId/services/:serviceId`
- `GET /api/projects/:projectId/services/:serviceId/apis`
- `POST /api/projects/:projectId/services/:serviceId/apis`
- `GET /api/projects/:projectId/services/:serviceId/apis/:apiId`
- `PATCH /api/projects/:projectId/services/:serviceId/apis/:apiId`
- `DELETE /api/projects/:projectId/services/:serviceId/apis/:apiId`

### Response Format

```json
{
  "success": true,
  "data": { }
}
```

```json
{
  "success": false,
  "message": "Error message",
  "details": null
}
```

## Design System

- Semantic color tokens
- Automatic dark/light mode
- Mobile-first responsive layout
- Semantic HTML and keyboard-friendly interactions

## State Management

- Local state with React hooks
- Server state with TanStack Query
- Project selection with Zustand
- Request, environment, runtime token, and response persistence with `localStorage` where useful
- Backend persistence for datasets, rows, mappings, reservations, and knowledge documents
- Runtime-generated root-level snapshots are ignored and are not source fixtures

## Primary Workflows

### API Workspace

The API workspace is the primary surface for API work. Users can import an API contract and environment files, browse endpoints by their original folder structure, edit request details, select an environment, configure authorization and body formats, execute requests, and inspect response bodies, headers, cookies, and timing information.

### Test Data

Test Data identifies fields used by imported API endpoints and supports reusable datasets, field mappings, runtime value generation, row reservation, and consumption. This allows values such as unique emails or existing login credentials to be supplied without manually editing every request.

### Knowledge

Knowledge is a documentation workspace independent from API contract parsing. Users can import documentation files, organize them with tags, replace or remove documents, and view project-level relationships with imported APIs and Test Data.

The Environment navigation entry now redirects to the API workspace, where environment import and management are available alongside request execution.

### Requirements and mapping

Test-case generation is based on the supplied requirement or Jira content. During
mapping, project knowledge flows and business rules are used to rank candidate
API operations and enrich dependency and fallback decisions. Generated scenarios
retain their API mapping and mutation metadata for execution.

### Execution and scheduling

Execution uses the approved suite and the current API request configuration. For
negative scenarios, only the selected field is mutated while the remaining
request body is preserved. A schedule can optionally point to a token-generation
operation; the scheduler runs that operation first and reuses the resulting token
for the suite requests.

### Project overview and reports

The project overview mirrors the primary sidebar workflow with synchronized
cards for APIs, Test Data, Knowledge, Requirements, Test Review, Execution, and
Reports. Reports can be exported as structured HTML, JSON, CSV, or printed to a
PDF using the browser print dialog.

## Scripts

```bash
npm install
npm run dev:frontend
npm run dev:backend
npm run build
npm test
npm run lint
```

Frontend checks can also be run directly from the frontend workspace:

```bash
cd frontend
npm run lint
npm run typecheck
```

## Maintenance Notes

- API execution, Test Data, and Knowledge are the active project workspaces.
- The legacy standalone environment page now redirects to the API workspace.
- Legacy unused route wrappers, barrels, and dataset hooks have been removed.
- The Test Data row editor implementation is retained for the dataset data-editing workflow.
- Keep API, Test Data, and Knowledge changes project-scoped so imported contracts, datasets, and documents remain synchronized within the selected project.

## Backend Architecture

### Data Flow

```text
HTTP Request -> Route -> Controller -> Use Case -> Repository -> Storage
```

### Persistence Strategy

- Most feature data uses file-based JSON storage under `backend/data/` with per-file locking
- Some repositories use SQLite or in-memory storage depending on the module
- API data is stored per project in paths such as `backend/data/apis/{projectId}/services.json` and `operations.json`

## Deployment Workflow

TestForge follows a dev -> prod branching model with versioned releases.

| Branch | Purpose | Access |
|--------|---------|--------|
| `master` | Development and active integration | PRs merge here, auto-tested |
| `main` | Production releases | Manual promotion only with tags |

### Release Process

1. Create a feature branch and submit a PR to `master`
2. PR is tested automatically
3. PR is merged to `master` after approval
4. When ready to release, go to GitHub Actions -> Release to Production
5. Enter a version like `v1.0.0`
6. The workflow creates a tag and promotes code to `main`
7. Production deployment is triggered from `main`

