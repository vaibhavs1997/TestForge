# TestForge Architecture Guide

**Version:** 1.0.0  
**Last Updated:** 2025-08-05  
**Audience:** Developers, architects, technical leads

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Design](#database-design)
7. [API Design](#api-design)
8. [Authentication & Authorization](#authentication--authorization)
9. [Caching Strategy](#caching-strategy)
10. [Message Queue](#message-queue)
11. [File Storage](#file-storage)
12. [AI Integration](#ai-integration)
13. [Security Architecture](#security-architecture)
14. [Performance Considerations](#performance-considerations)
15. [Scalability](#scalability)

---

## Introduction

TestForge is built on modern, scalable architecture patterns designed for performance, maintainability, and extensibility. This guide provides a comprehensive overview of the system architecture.

### Architecture Highlights

- **Microservices-ready**: Modular design enabling independent scaling
- **React + TypeScript**: Modern frontend with type safety
- **Node.js + Express**: High-performance backend API
- **PostgreSQL**: Reliable relational database
- **Redis**: High-performance caching and session management
- **JWT Authentication**: Secure, stateless authentication
- **React Query**: Optimistic UI and efficient data fetching
- **AI Integration**: Extensible AI provider system

---

## System Overview

### High-Level Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │    │   Mobile    │    │     API     │
│  (React)    │    │   Client    │    │  Clients    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                    ┌─────▼─────┐
                    │   Nginx   │
                    │ (Reverse  │
                    │  Proxy)   │
                    └─────┬─────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │ Frontend  │   │ Backend   │   │   Redis   │
    │  (Vite)   │   │  (Node)   │   │  Cache    │
    └───────────┘   └─────┬─────┘   └───────────┘
                          │
                    ┌─────▼─────┐
                    │PostgreSQL │
                    │ Database  │
                    └───────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **UI Components**: Custom component library with Tailwind CSS
- **Icons**: Lucide React

#### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Logging**: Winston
- **File Upload**: Multer

#### Infrastructure
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Queue**: Bull (Redis-based)
- **File Storage**: Local filesystem (S3-compatible)
- **Email**: Nodemailer
- **AI Integration**: OpenAI SDK, Azure SDK

---

## Architecture Principles

### 1. Separation of Concerns

- **Frontend**: Presentation layer, user interactions
- **Backend**: Business logic, data access, API endpoints
- **Database**: Data persistence and integrity

### 2. RESTful API Design

- Standard HTTP methods (GET, POST, PUT, DELETE)
- Resource-based URLs
- Consistent response formats
- Proper HTTP status codes

### 3. Stateless Authentication

- JWT tokens for authentication
- No server-side session storage
- Scalable across multiple instances

### 4. Caching Strategy

- Multi-level caching (client, server, database)
- Cache invalidation on mutations
- Optimistic UI updates

### 5. Modular Design

- Feature-based module structure
- Reusable components and hooks
- Shared utilities and services

---

## Frontend Architecture

### Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (Button, Card, etc.)
│   │   ├── shared/         # Shared components (Toast, Modal, etc.)
│   │   ├── tables/         # Table components
│   │   ├── forms/          # Form components
│   │   └── layout/         # Layout components
│   ├── modules/            # Feature modules
│   │   ├── dashboard/      # Dashboard module
│   │   ├── project/        # Project management
│   │   ├── environment/    # Environment management
│   │   ├── test-data/      # Test data management
│   │   ├── requirements/   # Requirements management
│   │   ├── execution/      # Execution module
│   │   ├── report/         # Reporting module
│   │   ├── ai-provider/    # AI provider management
│   │   ├── notification/   # Notifications
│   │   ├── scheduler/      # Scheduling
│   │   ├── versioning/     # Version control
│   │   ├── audit/          # Audit log
│   │   ├── backup/         # Backup & restore
│   │   └── pipeline/       # Pipeline management
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API service layers
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── constants/          # Application constants
│   ├── store/              # State management
│   ├── routes/             # Route definitions
│   └── App.tsx             # Root component
```

### State Management

#### React Query (TanStack Query)

React Query manages server state:

```typescript
// Example: useExecution hook
export const useExecution = (projectId?: string) => {
  const queryClient = useQueryClient();
  
  const { data: runs = [], isLoading, isError } = useQuery({
    queryKey: ['executions', projectId],
    queryFn: () => executionService.list(projectId),
    refetchInterval: 3000, // Poll for updates
  });

  const startMutation = useMutation({
    mutationFn: (data) => executionService.start(data),
    onSuccess: () => queryClient.invalidateQueries(['executions', projectId]),
  });

  return { runs, isLoading, startExecution: startMutation.mutate };
};
```

**Benefits:**
- Automatic caching and background refetching
- Optimistic updates
- Deduplication of requests
- DevTools for debugging

### Component Architecture

#### Component Hierarchy

```
App
├── Layout
│   ├── Sidebar
│   ├── Header
│   └── Content
│       └── Module Pages
│           ├── DashboardPage
│           ├── EnvironmentPage
│           ├── RequirementsPage
│           └── ...
└── Modals
    ├── EnvironmentDialog
    ├── ConfirmDialog
    └── ...
```

#### Component Patterns

**Container Components**: Manage state and logic
```typescript
const EnvironmentPage: React.FC = () => {
  const { environments, isLoading, create, update, remove } = useEnvironments(projectId);
  // State management and handlers
  return <EnvironmentList environments={environments} onEdit={...} />;
};
```

**Presentational Components**: Display UI
```typescript
const EnvironmentList: React.FC<{ environments: Environment[], onEdit: (id: string) => void }> = ({
  environments,
  onEdit
}) => {
  return (
    <table>
      {environments.map(env => (
        <tr key={env.id}>
          <td>{env.name}</td>
          <button onClick={() => onEdit(env.id)}>Edit</button>
        </tr>
      ))}
    </table>
  );
};
```

### Routing

#### Route Structure

```typescript
const routes = [
  { path: '/projects/:projectId/dashboard', component: DashboardPage },
  { path: '/projects/:projectId/environments', component: EnvironmentPage },
  { path: '/projects/:projectId/requirements', component: RequirementsPage },
  { path: '/projects/:projectId/execution', component: ExecutionPage },
  // ...
];
```

#### Navigation Flow

```
/projects
  └── /projects/:projectId
      ├── /dashboard
      ├── /environments
      ├── /test-data
      │   ├── /datasets
      │   └── /profiles
      ├── /requirements
      ├── /execution
      ├── /reports
      ├── /ai-providers
      ├── /notifications
      ├── /schedules
      ├── /versioning
      ├── /audit
      └── /backup
```

---

## Backend Architecture

### Project Structure

```
backend/
├── src/
│   ├── routes/           # API route handlers
│   │   ├── auth.ts
│   │   ├── projects.ts
│   │   ├── environments.ts
│   │   ├── requirements.ts
│   │   └── ...
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   ├── errorHandler.ts
│   │   └── ...
│   ├── models/           # Data models
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities
│   ├── config/           # Configuration
│   ├── jobs/             # Background jobs
│   └── index.ts          # Entry point
```

### Request Flow

```
Request → Nginx → Express
  ├── Middleware (auth, validation, logging)
  ├── Controller (request parsing)
  ├── Service (business logic)
  ├── Model (database operations)
  └── Response
```

### Service Layer Pattern

```typescript
// services/environmentService.ts
export class EnvironmentService {
  async list(projectId: string): Promise<Environment[]> {
    return prisma.environment.findMany({ where: { projectId } });
  }

  async create(projectId: string, data: CreateEnvironmentDto): Promise<Environment> {
    return prisma.environment.create({
      data: { ...data, projectId }
    });
  }

  async update(id: string, data: UpdateEnvironmentDto): Promise<Environment> {
    return prisma.environment.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.environment.delete({ where: { id } });
  }
}
```

### Middleware Stack

```typescript
app.use(cors());
app.use(express.json());
app.use(compression());
app.use(morgan('combined'));

// Authentication
app.use('/api', authMiddleware);

// Validation
app.use('/api', validationMiddleware);

// Rate limiting
app.use('/api', rateLimitMiddleware);

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/environments', environmentRoutes);
// ...

// Error handling
app.use(errorHandler);
```

---

## Database Design

### Schema Overview

```
projects
  ├── environments
  ├── datasets
  ├── profiles
  ├── requirements
  ├── test_designs
  ├── execution_plans
  ├── execution_runs
  ├── schedules
  ├── notifications
  ├── ai_providers
  ├── versions
  ├── audit_logs
  └── backups
```

### Key Tables

#### Projects
```sql
CREATE TABLE projects (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  context JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Requirements
```sql
CREATE TABLE requirements (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) REFERENCES projects(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority VARCHAR(50),
  approval_status VARCHAR(50) DEFAULT 'suggested',
  source VARCHAR(50),
  confidence INTEGER,
  acceptance_criteria JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Executions
```sql
CREATE TABLE execution_runs (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) REFERENCES projects(id),
  execution_plan_id VARCHAR(255),
  requirement_id VARCHAR(255),
  status VARCHAR(50),
  failure_mode VARCHAR(50),
  summary JSONB,
  step_results JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_requirements_project_id ON requirements(project_id);
CREATE INDEX idx_requirements_status ON requirements(approval_status);
CREATE INDEX idx_executions_project_id ON execution_runs(project_id);
CREATE INDEX idx_executions_status ON execution_runs(status);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

---

## API Design

### RESTful Endpoints

#### Resource Naming
- Plural nouns: `/projects`, `/environments`, `/requirements`
- Nested resources: `/projects/:projectId/environments`
- Actions: `/projects/:projectId/executions/start`

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [ ... ]
  }
}
```

### Pagination

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Filtering

```
GET /projects?status=active&search=test&page=1&limit=20
```

---

## Authentication & Authorization

### JWT Authentication Flow

```
1. User logs in with credentials
2. Server validates credentials
3. Server generates JWT token
4. Client stores token (localStorage/httpOnly cookie)
5. Client sends token in Authorization header
6. Server validates token on each request
```

### Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-123",
    "email": "user@example.com",
    "role": "qa_engineer",
    "iat": 1642680000,
    "exp": 1642683600
  }
}
```

### Role-Based Access Control

```typescript
const ROLES = {
  admin: ['*'],
  project_manager: [
    'projects.*',
    'environments.*',
    'testdata.*',
    'requirements.*'
  ],
  qa_engineer: [
    'requirements.read',
    'requirements.create',
    'designs.*',
    'execution.*'
  ],
  viewer: [
    'requirements.read',
    'designs.read',
    'execution.read'
  ]
};
```

---

## Caching Strategy

### Multi-Level Caching

1. **Client Cache**: Browser cache for static assets
2. **CDN**: Static assets and public API responses
3. **Application Cache**: Redis for frequently accessed data
4. **Database Cache**: PostgreSQL query cache

### Cache Invalidation

```typescript
// Invalidate on mutation
const mutation = useMutation({
  mutationFn: updateEnvironment,
  onSuccess: () => {
    queryClient.invalidateQueries(['environments']);
    queryClient.invalidateQueries(['projects']);
  }
});
```

### Cache Keys

```typescript
queryKeys = {
  projects: (projectId) => ['projects', projectId],
  environments: (projectId) => ['environments', projectId],
  requirements: (projectId, status) => ['requirements', projectId, status],
}
```

---

## Message Queue

### Bull Queue Architecture

```
Producer → Redis Queue → Consumer
                        ├── Process job
                        ├── Update status
                        └── Store result
```

### Job Types

- **Email Notifications**: Send notification emails
- **Report Generation**: Generate PDF reports
- **Backup Operations**: Create system backups
- **AI Generation**: Async AI operations

### Job Flow

```typescript
// Add job to queue
await notificationQueue.add('send-email', {
  to: 'user@example.com',
  subject: 'Test Completed',
  body: '...'
});

// Process job
notificationQueue.process(async (job) => {
  await sendEmail(job.data);
});
```

---

## File Storage

### Storage Strategy

#### Local Storage (Default)
```
uploads/
├── datasets/
│   ├── project-123/
│   │   ├── users.csv
│   │   └── products.json
├── exports/
│   └── project-123-export.zip
└── backups/
    └── testforge-backup-20250120.tar.gz
```

#### S3-Compatible Storage (Optional)

```typescript
// Configure S3
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  bucket: 'testforge-uploads'
});

// Upload file
await s3.upload(file).promise();
```

---

## AI Integration

### AI Provider Architecture

```
AI Providers (OpenAI, Azure, etc.)
         ↓
  AI Service Layer
         ↓
  Feature Modules (Requirements, Designs, etc.)
```

### AI Generation Flow

```
1. User clicks "Generate with AI"
2. Frontend sends request to backend
3. Backend constructs prompt with context
4. Backend calls AI provider API
5. AI returns generated content
6. Backend parses and validates response
7. Backend stores generated content
8. Frontend displays results
```

### Provider Configuration

```typescript
interface AIProvider {
  id: string;
  name: string;
  provider: 'openai' | 'azure' | 'anthropic';
  apiKey: string;
  endpoint?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
}
```

---

## Security Architecture

### Security Layers

1. **Network Security**: Firewall, HTTPS, CORS
2. **Application Security**: Authentication, authorization, validation
3. **Data Security**: Encryption at rest, secure connections
4. **Access Control**: Role-based permissions

### Security Measures

#### HTTPS
- TLS 1.3+
- Strong cipher suites
- HSTS enabled

#### Authentication
- JWT tokens with secure secrets
- Token expiration and refresh
- Password hashing (bcrypt)

#### Authorization
- Role-based access control
- Resource-level permissions
- API rate limiting

#### Input Validation
- Request validation (Zod)
- SQL injection prevention (Prisma)
- XSS prevention (sanitization)
- CSRF protection

---

## Performance Considerations

### Frontend Performance

#### Code Splitting
```typescript
const EnvironmentPage = lazy(() => import('./modules/environment/pages/EnvironmentPage'));
const RequirementsPage = lazy(() => import('./modules/requirements/pages/RequirementsPage'));
```

#### Image Optimization
- WebP format
- Lazy loading
- Responsive images

#### Bundle Optimization
- Tree shaking
- Minification
- Gzip compression

### Backend Performance

#### Database Optimization
- Connection pooling
- Query optimization
- Indexing strategy
- Connection limits

#### Caching Strategy
- Redis for frequent queries
- Query result caching
- Static asset caching

#### API Optimization
- Response compression
- Pagination
- Field selection
- Batch operations

---

## Scalability

### Horizontal Scaling

```
Load Balancer (Nginx)
    ├── Backend Instance 1
    ├── Backend Instance 2
    └── Backend Instance 3
         ↓
    PostgreSQL (Primary + Read Replicas)
         ↓
    Redis Cluster
```

### Scaling Strategies

#### Database Scaling
- Read replicas for read-heavy workloads
- Connection pooling
- Query optimization

#### Application Scaling
- Stateless backend instances
- Load balancing
- Session sharing via Redis

#### File Storage Scaling
- S3-compatible storage
- CDN for static assets
- Distributed file systems

---

## Development Workflow

### Local Development

```bash
# Start all services
docker-compose up -d

# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

### Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Deployment

```bash
# Build
npm run build

# Deploy
docker-compose up -d --build
```

---

## Monitoring & Observability

### Logging

- Application logs (Winston)
- Access logs (Morgan)
- Error tracking (Sentry)
- Audit logs (database)

### Metrics

- Request metrics (response time, throughput)
- Database metrics (query time, connections)
- System metrics (CPU, memory, disk)
- Business metrics (executions, users)

### Health Checks

```bash
GET /health
GET /health/database
GET /health/redis
```

---

## Future Considerations

### Planned Improvements

1. **Microservices**: Split into smaller services
2. **GraphQL**: Add GraphQL API option
3. **Real-time**: WebSocket support for live updates
4. **Mobile Apps**: Native mobile applications
5. **Plugin System**: Extensible plugin architecture
6. **Multi-tenancy**: Enhanced multi-tenant support

---

**Document Owner:** Architecture Team  
**Last Reviewed:** 2025-08-05  
**Next Review:** 2025-11-05