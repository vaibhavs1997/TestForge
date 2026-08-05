# TestForge API Documentation

**Version:** 1.0.0  
**Last Updated:** 2025-08-05  
**Base URL:** `https://your-testforge-instance.com/api/v1`

---

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Projects](#projects)
4. [Environments](#environments)
5. [Test Data](#test-data)
6. [Requirements](#requirements)
7. [Test Designs](#test-designs)
8. [Executions](#executions)
9. [Reports](#reports)
10. [AI Providers](#ai-providers)
11. [Schedules](#schedules)
12. [Notifications](#notifications)
13. [Versioning](#versioning)
14. [Audit Log](#audit-log)
15. [Backup & Restore](#backup--restore)
16. [Error Handling](#error-handling)
17. [Rate Limiting](#rate-limiting)

---

## Introduction

TestForge provides a comprehensive REST API for programmatic access to all platform features. The API follows RESTful conventions and returns JSON responses.

### API Features

- **RESTful Design**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **JSON Responses**: All responses in JSON format
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Permission-based endpoint protection
- **Pagination**: Large datasets paginated for performance
- **Filtering & Sorting**: Query parameters for data manipulation
- **Error Standards**: Consistent error response format

### Base URL

```
https://your-testforge-instance.com/api/v1
```

---

## Authentication

### JWT Token Authentication

TestForge uses JWT (JSON Web Tokens) for authentication.

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "qa_engineer"
    }
  }
}
```

#### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Using Tokens

Include the JWT token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Projects

### List Projects

```http
GET /projects
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `search` (string): Search in project name/description

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "proj-123",
        "name": "My Project",
        "description": "Project description",
        "createdAt": "2025-01-15T10:00:00Z",
        "updatedAt": "2025-01-20T14:30:00Z",
        "memberCount": 5,
        "environmentCount": 3
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### Create Project

```http
POST /projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "proj-123",
    "name": "My Project",
    "description": "Project description",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
}
```

### Get Project

```http
GET /projects/{projectId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "proj-123",
    "name": "My Project",
    "description": "Project description",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-20T14:30:00Z",
    "context": {
      "baseUrl": "https://api.example.com",
      "authentication": {
        "type": "bearer",
        "token": "***"
      }
    }
  }
}
```

### Update Project

```http
PUT /projects/{projectId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

### Delete Project

```http
DELETE /projects/{projectId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

---

## Environments

### List Environments

```http
GET /projects/{projectId}/environments
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "environments": [
      {
        "id": "env-123",
        "projectId": "proj-123",
        "name": "Production",
        "description": "Production environment",
        "baseUrl": "https://api.production.com",
        "authentication": {
          "type": "bearer",
          "token": "${PROD_API_TOKEN}"
        },
        "variables": {
          "API_KEY": "prod-key-123",
          "TIMEOUT": "5000"
        },
        "timeout": 5000,
        "createdAt": "2025-01-15T10:00:00Z",
        "updatedAt": "2025-01-20T14:30:00Z"
      }
    ]
  }
}
```

### Create Environment

```http
POST /projects/{projectId}/environments
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Production",
  "baseUrl": "https://api.production.com",
  "description": "Production environment",
  "authentication": {
    "type": "bearer",
    "token": "${PROD_API_TOKEN}"
  },
  "variables": {
    "API_KEY": "prod-key-123",
    "TIMEOUT": "5000"
  },
  "timeout": 5000
}
```

### Update Environment

```http
PUT /projects/{projectId}/environments/{environmentId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Environment",
  "baseUrl": "https://api.prod-v2.com"
}
```

### Delete Environment

```http
DELETE /projects/{projectId}/environments/{environmentId}
Authorization: Bearer <token>
```

### Import Environment

```http
POST /projects/{projectId}/environments/import
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <environment-json-file>
mode: "copy" | "replace" | "merge"
```

---

## Test Data

### Datasets

#### List Datasets

```http
GET /projects/{projectId}/datasets
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "datasets": [
      {
        "id": "dataset-123",
        "projectId": "proj-123",
        "name": "Users Dataset",
        "description": "Test user data",
        "fileFormat": "csv",
        "rowCount": 100,
        "columnCount": 10,
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

#### Create Dataset

```http
POST /projects/{projectId}/datasets
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <data-file>
name: "Users Dataset"
description: "Test user data"
```

#### Get Dataset

```http
GET /projects/{projectId}/datasets/{datasetId}
Authorization: Bearer <token>
```

#### Delete Dataset

```http
DELETE /projects/{projectId}/datasets/{datasetId}
Authorization: Bearer <token>
```

### Profiles

#### List Profiles

```http
GET /projects/{projectId}/profiles
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "profile-123",
        "projectId": "proj-123",
        "name": "Default Profile",
        "description": "Default execution profile",
        "failureMode": "continue",
        "timeout": 30000,
        "retryPolicy": {
          "enabled": true,
          "maxRetries": 3,
          "retryDelay": 1000
        },
        "assertionMode": "strict",
        "datasetSelectionStrategy": "sequential",
        "runtimeVariableReset": true,
        "parallelism": {
          "enabled": false,
          "maxConcurrent": 5
        },
        "isDefault": true,
        "enabled": true
      }
    ]
  }
}
```

#### Create Profile

```http
POST /projects/{projectId}/profiles
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Default Profile",
  "description": "Default execution profile",
  "failureMode": "continue",
  "timeout": 30000,
  "retryPolicy": {
    "enabled": true,
    "maxRetries": 3,
    "retryDelay": 1000
  },
  "assertionMode": "strict",
  "datasetSelectionStrategy": "sequential",
  "runtimeVariableReset": true
}
```

---

## Requirements

### List Requirements

```http
GET /projects/{projectId}/requirements
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: Filter by approval status (suggested, approved, rejected, archived)
- `source`: Filter by source (manual, projectanalysis)

**Response:**
```json
{
  "success": true,
  "data": {
    "suggested": [],
    "approved": [
      {
        "id": "req-123",
        "projectId": "proj-123",
        "title": "User Login API",
        "description": "Test user authentication",
        "category": "Security",
        "priority": "High",
        "approvalStatus": "Approved",
        "source": "manual",
        "confidence": 100,
        "acceptanceCriteria": [
          {
            "id": "ac-1",
            "text": "Valid credentials return 200"
          }
        ],
        "createdAt": "2025-01-15T10:00:00Z",
        "updatedAt": "2025-01-20T14:30:00Z"
      }
    ],
    "archived": []
  }
}
```

### Create Requirement

```http
POST /projects/{projectId}/requirements
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "User Login API",
  "description": "Test user authentication",
  "category": "Security",
  "priority": "High",
  "acceptanceCriteria": [
    {
      "text": "Valid credentials return 200"
    }
  ]
}
```

### Get Requirement

```http
GET /projects/{projectId}/requirements/{requirementId}
Authorization: Bearer <token>
```

### Update Requirement

```http
PUT /projects/{projectId}/requirements/{requirementId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "approvalStatus": "Approved"
}
```

### Delete Requirement

```http
DELETE /projects/{projectId}/requirements/{requirementId}
Authorization: Bearer <token>
```

### Generate Requirements from Analysis

```http
POST /projects/{projectId}/requirements/generate-from-analysis
Authorization: Bearer <token>
Content-Type: application/json

{
  "analysisId": "analysis-123"
}
```

---

## Test Designs

### List Test Designs

```http
GET /projects/{projectId}/designs
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "designs": [
      {
        "id": "design-123",
        "projectId": "proj-123",
        "requirementId": "req-123",
        "name": "Login Success Test",
        "priority": "High",
        "status": "Ready",
        "operationId": "op-123",
        "environmentId": "env-123",
        "datasetId": "dataset-123",
        "assertionIds": ["assertion-1", "assertion-2"],
        "runtimeBindings": [
          {
            "variable": "username",
            "source": "dataset",
            "path": "users[0].email"
          }
        ],
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

### Create Test Design

```http
POST /projects/{projectId}/designs
Authorization: Bearer <token>
Content-Type: application/json

{
  "requirementId": "req-123",
  "name": "Login Success Test",
  "priority": "High",
  "operationId": "op-123",
  "environmentId": "env-123",
  "datasetId": "dataset-123",
  "assertionIds": ["assertion-1"],
  "runtimeBindings": [
    {
      "variable": "username",
      "source": "dataset",
      "path": "users[0].email"
    }
  ]
}
```

---

## Executions

### List Executions

```http
GET /projects/{projectId}/executions
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: Filter by status (completed, failed, running, pending, cancelled)
- `startDate`: Filter from date (ISO 8601)
- `endDate`: Filter to date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "executions": [
      {
        "id": "exec-123",
        "projectId": "proj-123",
        "executionPlanId": "plan-123",
        "requirementId": "req-123",
        "status": "Completed",
        "failureMode": "continue",
        "summary": {
          "totalSteps": 5,
          "passed": 4,
          "failed": 1,
          "skipped": 0,
          "duration": 15000,
          "validationPassed": 3,
          "validationFailed": 1,
          "validationWarnings": 0
        },
        "createdAt": "2025-01-15T10:00:00Z",
        "completedAt": "2025-01-15T10:00:15Z"
      }
    ]
  }
}
```

### Start Execution

```http
POST /projects/{projectId}/executions/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "executionPlanId": "plan-123",
  "executionProfileId": "profile-123",
  "failureMode": "continue"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionRunId": "exec-123",
    "status": "Running",
    "startedAt": "2025-01-15T10:00:00Z"
  }
}
```

### Get Execution Details

```http
GET /projects/{projectId}/executions/{executionId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "exec-123",
    "executionPlanId": "plan-123",
    "requirementId": "req-123",
    "status": "Completed",
    "summary": {
      "totalSteps": 5,
      "passed": 4,
      "failed": 1,
      "skipped": 0,
      "duration": 15000
    },
    "stepResults": [
      {
        "stepId": "step-1",
        "executionOrder": 1,
        "status": "Passed",
        "request": {
          "method": "POST",
          "url": "https://api.example.com/login",
          "headers": {},
          "body": {}
        },
        "response": {
          "status": 200,
          "headers": {},
          "body": {},
          "duration": 250
        },
        "assertions": [
          {
            "type": "status",
            "operator": "equals",
            "expected": 200,
            "passed": true
          }
        ],
        "resolvedTestData": {}
      }
    ]
  }
}
```

---

## Reports

### Generate Report

```http
POST /projects/{projectId}/reports/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportType": "execution",
  "executionId": "exec-123",
  "format": "pdf"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "report-123",
    "downloadUrl": "https://testforge.example.com/reports/report-123.pdf",
    "expiresAt": "2025-01-22T10:00:00Z"
  }
}
```

### List Reports

```http
GET /projects/{projectId}/reports
Authorization: Bearer <token>
```

---

## AI Providers

### List AI Providers

```http
GET /projects/{projectId}/ai-providers
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": "provider-123",
        "projectId": "proj-123",
        "name": "OpenAI Production",
        "provider": "openai",
        "model": "gpt-4",
        "isDefault": true,
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

### Create AI Provider

```http
POST /projects/{projectId}/ai-providers
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "OpenAI Production",
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-4",
  "isDefault": true
}
```

---

## Schedules

### List Schedules

```http
GET /projects/{projectId}/schedules
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "id": "schedule-123",
        "projectId": "proj-123",
        "name": "Nightly Regression",
        "description": "Run regression tests nightly",
        "suiteId": "suite-123",
        "executionProfileId": "profile-123",
        "environmentId": "env-123",
        "cronExpression": "0 9 * * *",
        "timezone": "UTC",
        "enabled": true,
        "lastStatus": "passed",
        "nextRun": "2025-01-21T09:00:00Z",
        "lastRun": "2025-01-20T09:00:00Z",
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

### Create Schedule

```http
POST /projects/{projectId}/schedules
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nightly Regression",
  "description": "Run regression tests nightly",
  "suiteId": "suite-123",
  "executionProfileId": "profile-123",
  "cronExpression": "0 9 * * *",
  "timezone": "UTC",
  "enabled": true
}
```

### Trigger Schedule

```http
POST /projects/{projectId}/schedules/{scheduleId}/run-now
Authorization: Bearer <token>
```

---

## Notifications

### List Notifications

```http
GET /projects/{projectId}/notifications
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-123",
        "projectId": "proj-123",
        "name": "Execution Failed Alert",
        "eventType": "ExecutionFailed",
        "providerId": "provider-123",
        "recipients": ["team@example.com"],
        "subjectTemplate": "Test Execution Failed",
        "bodyTemplate": "Execution {{executionRunId}} failed",
        "enabled": true,
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

### Create Notification

```http
POST /projects/{projectId}/notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Execution Failed Alert",
  "eventType": "ExecutionFailed",
  "providerId": "provider-123",
  "recipients": ["team@example.com"],
  "subjectTemplate": "Test Execution Failed",
  "bodyTemplate": "Execution {{executionRunId}} failed",
  "enabled": true
}
```

### Test Notification

```http
POST /projects/{projectId}/notifications/{notificationId}/test
Authorization: Bearer <token>
```

---

## Versioning

### List Versions

```http
GET /projects/{projectId}/versions
Authorization: Bearer <token>
```

**Query Parameters:**
- `resourceType`: Filter by resource (requirement, design, assertion, etc.)
- `resourceId`: Filter by resource ID

**Response:**
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "id": "version-123",
        "projectId": "proj-123",
        "resourceType": "requirement",
        "resourceId": "req-123",
        "version": 3,
        "author": {
          "id": "user-123",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "changeDescription": "Updated acceptance criteria",
        "snapshot": {
          "title": "User Login API",
          "description": "Test user authentication"
        },
        "createdAt": "2025-01-20T14:30:00Z"
      }
    ]
  }
}
```

### Restore Version

```http
POST /projects/{projectId}/versions/{versionId}/restore
Authorization: Bearer <token>
```

---

## Audit Log

### List Audit Logs

```http
GET /projects/{projectId}/audit-logs
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `user`: Filter by user ID
- `action`: Filter by action (create, update, delete, execute)
- `resourceType`: Filter by resource type

**Response:**
```json
{
  "success": true,
  "data": {
    "auditLogs": [
      {
        "id": "audit-123",
        "projectId": "proj-123",
        "user": {
          "id": "user-123",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "action": "update",
        "resourceType": "requirement",
        "resourceId": "req-123",
        "before": {
          "title": "Old Title"
        },
        "after": {
          "title": "New Title"
        },
        "ipAddress": "192.168.1.100",
        "timestamp": "2025-01-20T14:30:00Z"
      }
    ]
  }
}
```

---

## Backup & Restore

### Create Backup

```http
POST /backups
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "backupId": "backup-123",
    "status": "in_progress",
    "createdAt": "2025-01-20T14:30:00Z"
  }
}
```

### List Backups

```http
GET /backups
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "id": "backup-123",
        "version": "1.0.0",
        "buildTimestamp": "2025-01-20T14:30:00Z",
        "gitCommit": "abc123",
        "schemaVersion": 5,
        "applicationVersion": "1.0.0",
        "sizeBytes": 10485760,
        "fileCount": 150,
        "createdAt": "2025-01-20T14:30:00Z"
      }
    ]
  }
}
```

### Restore Backup

```http
POST /backups/{backupId}/restore
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Restore completed successfully"
}
```

### Export Project

```http
POST /projects/{projectId}/export
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://testforge.example.com/exports/project-123.zip",
    "expiresAt": "2025-01-27T14:30:00Z"
  }
}
```

### Import Project

```http
POST /projects/import
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <project-export-file>
mode: "copy" | "replace" | "merge"
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ],
    "timestamp": "2025-01-20T14:30:00Z",
    "requestId": "req-abc123"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (duplicate) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

### Rate Limit Headers

All API responses include rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642680000
```

### Rate Limits

- **Authenticated users**: 100 requests per 15 minutes
- **Unauthenticated**: 10 requests per 15 minutes
- **Premium users**: 1000 requests per 15 minutes

### Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 900

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 15 minutes."
  }
}
```

---

## Webhooks

### Webhook Events

Configure webhooks to receive notifications for events:

- `execution.completed`: Execution finished
- `execution.failed`: Execution failed
- `schedule.completed`: Scheduled execution completed
- `report.generated`: Report ready for download

### Webhook Payload

```json
{
  "event": "execution.completed",
  "timestamp": "2025-01-20T14:30:00Z",
  "data": {
    "executionId": "exec-123",
    "projectId": "proj-123",
    "status": "Completed",
    "summary": {
      "totalSteps": 5,
      "passed": 4,
      "failed": 1
    }
  }
}
```

---

## SDKs & Libraries

### Official SDKs

- **JavaScript/TypeScript**: `@testforge/sdk`
- **Python**: `testforge-python`
- **Java**: `testforge-java`

### Example: JavaScript SDK

```javascript
import { TestForgeClient } from '@testforge/sdk';

const client = new TestForgeClient({
  apiUrl: 'https://testforge.example.com/api/v1',
  token: 'your-jwt-token'
});

// List projects
const projects = await client.projects.list();

// Start execution
const execution = await client.executions.start({
  projectId: 'proj-123',
  executionPlanId: 'plan-123'
});
```

---

## Support

For API support:
- **Documentation**: https://docs.testforge.io
- **API Reference**: https://api.testforge.io/docs
- **Support**: support@testforge.io

---

**API Version:** 1.0.0  
**Last Updated:** 2025-08-05