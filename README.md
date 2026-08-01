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

### Backend
- Express.js + TypeScript

## Engineering Standards

- **Architecture**: Feature/module-based architecture with barrel exports
- **Module Independence**: Modules are independent and self-contained
- **Composition over Inheritance**: Prefer composition patterns
- **Separation of Concerns**: UI, business logic, and data access are separated
- **Single Responsibility**: Every file has a single responsibility
- **Barrel Exports**: Every folder exports through `index.ts`
- **Import Order**: External → Constants → Types → Hooks → Services → Components → Styles

## Module Structure

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

## Naming Conventions

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

# Run tests
npm test

# Build for production
npm run build
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
