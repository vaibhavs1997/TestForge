# TestForge

AI-powered API validation platform for creating, managing, and testing API endpoints with automated test case generation from acceptance criteria.

## Project Structure

This monorepo contains the frontend and backend for TestForge.

```
TestForge/
├── frontend/         # React + TypeScript + Vite + Tailwind CSS
│   └── src/
│       ├── modules/              # Feature modules
│       │   ├── api/              # API services, endpoints, import/sync
│       │   ├── environment/      # Environment configurations
│       │   ├── knowledge/        # Knowledge base articles
│       │   ├── project/          # Project management
│       │   ├── requirements/     # Acceptance criteria & AI test generation
│       │   ├── settings/         # Application settings
│       │   ├── suite/            # Test suites
│       │   └── testcase/         # Test cases
│       ├── components/           # Shared UI components
│       ├── layouts/              # Layout components
│       ├── store/                # State management
│       └── utils/                # Utilities
├── backend/          # Express + TypeScript
└── package.json      # Root workspace configuration
```

## Key Features

- **Project Management**: Create and manage testing projects
- **API Services**: Organize APIs by service with CRUD operations, import from OpenAPI/Swagger/Postman/GraphQL
- **Environments**: Manage execution environments (Development, Testing, Staging, Production) with variables and secrets
- **Requirements**: Import acceptance criteria from Jira/files and generate comprehensive test cases using AI
- **Test Suites**: Group test cases into suites with configurable types (Positive, Negative, Boundary, Security, Performance)
- **Knowledge Base**: Create and manage documentation articles with categories and tags
- **Dark/Light Theme**: Full theme support with system preference detection

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- React Router (routing)
- TanStack Query (data fetching/caching)
- Lucide React (icons)
- Zustand (state management)

### Backend
- Express.js + TypeScript
- Clean Architecture (Domain → Application → Infrastructure → Interfaces)
- File-based JSON persistence with per-file locking (`proper-lockfile`)
- Optional API key / JWT authentication on `/api` routes

## Engineering Standards

### Frontend
- **Architecture**: Feature/module-based architecture with barrel exports
- **Module Independence**: Modules are independent and self-contained
- **Composition over Inheritance**: Prefer composition patterns
- **Separation of Concerns**: UI, business logic, and data access are separated
- **Single Responsibility**: Every file has a single responsibility
- **Barrel Exports**: Every folder exports through `index.ts`
- **Import Order**: External → Constants → Types → Hooks → Services → Components → Styles

### Backend
- **Clean Architecture**: Domain → Application → Infrastructure → Interfaces
- **Domain Layer**: Entities and repository interfaces
- **Application Layer**: Use cases containing business logic
- **Infrastructure Layer**: Repository implementations (file-based)
- **Interface Layer**: Controllers and Express routes
- **Dependency Injection**: Use cases receive repositories via constructor
- **Single Responsibility**: Each class has one reason to change

## Module Structure

### Frontend Modules
Each feature module follows a consistent structure:

```
modules/{feature}/
├── components/     # Feature-specific UI components
├── pages/          # Page components
├── hooks/          # Custom hooks
├── services/       # Data services/API calls
├── types/          # TypeScript types
├── utils/          # Utilities
├── mock/           # Mock data
├── constants/      # Constants
└── index.ts        # Barrel export
```

### Backend Modules
Each backend feature follows Clean Architecture:

```
backend/src/
├── domain/{feature}/
│   ├── {Feature}Entity.ts           # Domain entity
│   ├── {Feature}Repository.ts       # Repository interface
│   └── index.ts                     # Barrel export
├── application/{feature}/
│   ├── Create{Feature}.ts           # Use case
│   ├── Update{Feature}.ts           # Use case
│   ├── Delete{Feature}.ts           # Use case
│   ├── Get{Feature}.ts              # Use case
│   ├── List{Feature}s.ts            # Use case
│   └── index.ts                     # Barrel export
├── infrastructure/{feature}/
│   ├── {Feature}Repository.ts       # Repository implementation
│   └── index.ts                     # Barrel export
└── interfaces/{feature}/
    ├── {Feature}Controller.ts       # Controller
    ├── {Feature}Routes.ts           # Express routes
    └── index.ts                     # Barrel export
```

## Naming Conventions

### Frontend
| Category      | Convention  | Example              |
|---------------|-------------|----------------------|
| Pages         | PascalCase + Page suffix | `ServiceListPage.tsx` |
| Components    | PascalCase  | `AddApiModal.tsx`     |
| Hooks         | camelCase + use prefix | `useService.ts`       |
| Services      | PascalCase + Service suffix | `ProjectService.ts` |
| Stores        | camelCase + Store suffix | `projectStore.ts`   |
| Types         | PascalCase  | `Service.ts`        |
| Enums         | PascalCase  | `HttpMethod.ts`     |
| Utilities     | lowercase  | `cn.ts`             |

### Backend
| Category      | Convention  | Example              |
|---------------|-------------|----------------------|
| Entities      | PascalCase + Entity suffix | `ApiServiceEntity.ts` |
| Repositories  | PascalCase + Repository suffix | `ApiServiceRepository.ts` |
| Use Cases     | PascalCase + verb prefix | `CreateApiService.ts` |
| Controllers   | PascalCase + Controller suffix | `ApiController.ts` |
| Routes        | PascalCase + Routes suffix | `ApiRoutes.ts` |

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Run frontend dev server
npm run dev:frontend

# Run backend dev server
npm run dev:backend

# Build for production
npm run build
```

## API Endpoints

### API Management
- `GET /api/projects/:projectId/services` - List services
- `POST /api/projects/:projectId/services` - Create service
- `GET /api/projects/:projectId/services/:serviceId` - Get service
- `PATCH /api/projects/:projectId/services/:serviceId` - Update service
- `DELETE /api/projects/:projectId/services/:serviceId` - Delete service
- `GET /api/projects/:projectId/services/:serviceId/apis` - List operations
- `POST /api/projects/:projectId/services/:serviceId/apis` - Create operation
- `GET /api/projects/:projectId/services/:serviceId/apis/:apiId` - Get operation
- `PATCH /api/projects/:projectId/services/:serviceId/apis/:apiId` - Update operation
- `DELETE /api/projects/:projectId/services/:serviceId/apis/:apiId` - Delete operation

### Response Format
```json
// Success
{
  "success": true,
  "data": { ... }
}

// Failure
{
  "success": false,
  "message": "Error message",
  "details": null
}
```

## Design System

- **Colors**: Semantic color tokens (`text-text`, `bg-background`, `border-border`, etc.)
- **Dark/Light Mode**: Automatic theme switching with CSS class-based approach
- **Responsive**: Mobile-first responsive design with Tailwind breakpoints
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation support

## State Management

- **Local State**: React hooks (`useState`, `useMemo`, `useCallback`)
- **Server State**: TanStack Query for data fetching, caching, and synchronization
- **Persistence**: `localStorage` for offline data persistence

## Scripts

```bash
# Install all dependencies
npm install

# Run frontend dev server
npm run dev:frontend

# Run backend dev server
npm run dev:backend

# Build all packages
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Architecture Deep Dive

### Backend Clean Architecture

The backend follows Clean Architecture with four layers:

1. **Domain Layer**: Contains business entities and repository interfaces
   - No dependencies on other layers
   - Pure TypeScript classes and interfaces
   
2. **Application Layer**: Contains use cases (business logic)
   - Depends only on Domain layer
   - Orchestrates business workflows
   - Validates business rules
   
3. **Infrastructure Layer**: Contains repository implementations
   - Implements Domain repository interfaces
   - Handles data persistence (file-based JSON)
   - Independent of Express/framework
   
4. **Interface Layer**: Contains controllers and routes
   - Express controllers and route definitions
   - Handles HTTP request/response
   - Calls Application layer use cases
   - Maps domain errors to HTTP status codes

### Data Flow
```
HTTP Request → Route → Controller → Use Case → Repository → File System
```

### Persistence Strategy
- File-based JSON storage per project
- Location: `data/apis/{projectId}/services.json` and `operations.json`
- Similar to existing project persistence pattern

## Deployment Workflow

TestForge follows a **dev → prod** branching model with versioned releases:

| Branch | Purpose | Access |
|--------|---------|--------|
| `master` | Development (latest features) | PRs merge here, auto-tested |
| `main` | Production (stable releases) | Manual promotion only with tags |

### Release Process

1. **Create a feature branch** and submit a PR to `master`
2. **PR is tested** automatically (lint, typecheck, build)
3. **PR is merged** to `master` after approval
4. **When ready to release**, go to **GitHub Actions → Release to Production**
5. **Enter version** in format `v1.0.0` (e.g., `v1.0.0`, `v1.1.2`)
6. **Workflow creates a tag** and promotes code to `main` with release notes
7. **Production deployment** is triggered from `main`

**Protection:** Direct commits and PRs to `main` are blocked. All production code flows through versioned tags.
