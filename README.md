# AI API Validation Platform

## Project Structure

This monorepo contains the frontend and backend for the AI API Validation Platform.

```
ai-validation-platform/
├── frontend/    # React + TypeScript + Vite
├── backend/     # Express + TypeScript
└── package.json # Root workspace configuration
```

## Engineering Standards

- **Architecture**: Feature/module-based architecture
- **Module Independence**: Modules are independent and self-contained
- **Composition over Inheritance**: Prefer composition patterns
- **Separation of Concerns**: UI, business logic, and infrastructure are separated
- **Single Responsibility**: Every file has a single responsibility
- **Barrel Exports**: Every folder exports through `index.ts`
- **Import Order**: External → Constants → Types → Hooks → Services → Components → Styles

## Naming Conventions

| Category      | Convention  | Example              |
|---------------|-------------|----------------------|
| Pages         | PascalCase + Page suffix | `DashboardPage.tsx` |
| Components    | PascalCase  | `DataTable.tsx`     |
| Hooks         | camelCase + use prefix | `useTheme.ts`       |
| Services      | PascalCase + Service suffix | `ProjectService.ts` |
| Stores        | camelCase + Store suffix | `projectStore.ts`   |
| Types         | PascalCase  | `Project.ts`        |
| Enums         | PascalCase  | `ExecutionStatus.ts`|
| Utilities     | lowercase  | `date.ts`           |

## Getting Started

```bash
# Install dependencies
npm install

# Run frontend
npm run dev:frontend

# Run backend
npm run dev:backend
```
