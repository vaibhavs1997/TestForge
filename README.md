# TestForge

AI-powered API validation platform for creating, managing, and testing API endpoints with automated test case generation from acceptance criteria.

## Project Structure

This monorepo contains the frontend and backend for TestForge.

```text
TestForge/
|-- frontend/         # React + TypeScript + Vite + Tailwind CSS
|   `-- src/
|       |-- modules/              # Feature modules
|       |   |-- api/              # API services, endpoints, import/sync
|       |   |-- environment/      # Environment configurations
|       |   |-- knowledge/        # Knowledge base articles
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
- API service CRUD with import from OpenAPI, Swagger, Postman, and GraphQL
- Environment management with variables and secrets
- Requirements import from Jira/files with AI test generation
- Test suites for positive, negative, boundary, security, and performance coverage
- Knowledge base articles with categories and tags
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

### Installation

```bash
npm install
npm run dev:frontend
npm run dev:backend
npm run build
```

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
- Persistence with `localStorage` where useful

## Scripts

```bash
npm install
npm run dev:frontend
npm run dev:backend
npm run build
npm test
npm run lint
```

## Backend Architecture

### Data Flow

```text
HTTP Request -> Route -> Controller -> Use Case -> Repository -> Storage
```

### Persistence Strategy

- Most feature data uses file-based JSON storage under `data/` with per-file locking
- Some repositories use SQLite or in-memory storage depending on the module
- API data is stored per project in paths such as `data/apis/{projectId}/services.json` and `operations.json`

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

