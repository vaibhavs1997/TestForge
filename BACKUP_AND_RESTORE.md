# TestForge Backup & Restore

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Backup & Restore                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Backup       │  │ Export       │  │ Import       │              │
│  │ Manager      │  │ Project      │  │ Project      │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         ▼                 ▼                 ▼                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Backup Directory                         │   │
│  │                    ./data/backups/                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │ backup-     │  │ project-    │  │ import-     │         │   │
│  │  │ timestamp/  │  │ id-time.zip │  │ timestamp/  │         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
./data/
├── backups/
│   ├── backup-2024-01-01T00-00-00/
│   │   ├── backup.json          # Backup metadata
│   │   └── data/                # Full data snapshot
│   │       └── testforge.db     # Database file
│   ├── project-1-2024-01-01T00-00-00.zip  # Project export
│   └── import-1234567890/       # Temporary import directory
├── uploads/                     # Temporary upload directory
└── testforge.db                 # Active database
```

## Backup Retention

- **Default max backups**: 10
- **Configurable via**: `MAX_BACKUPS` environment variable
- **Policy**: Oldest backups are automatically deleted when limit is exceeded
- **Backup directory**: `BACKUP_DIR` environment variable (default: `./data/backups`)

## Export Format

### Project Export (ZIP)
```
project-<projectId>-<timestamp>.zip
├── manifest.json
└── data/
    └── testforge.db
```

### Manifest Structure
```json
{
  "schemaVersion": 1,
  "applicationVersion": "0.1.0",
  "migrationVersion": 1,
  "exportedAt": "2024-01-01T00:00:00.000Z",
  "source": {
    "version": "0.1.0",
    "buildTimestamp": "2024-01-01T00:00:00.000Z",
    "gitCommit": "abc123"
  },
  "project": {
    "id": "1",
    "name": "TestForge Project"
  },
  "collections": [
    "apis", "environments", "knowledge", "datasets", "rows", "relationships",
    "requirements", "strategies", "designs", "assertions", "executionPlans",
    "suites", "executionProfiles", "reports", "versions", "notifications",
    "providers", "plugins", "scheduler", "recommendations", "auditLogs",
    "prompts", "context"
  ]
}
```

## Import Validation

### Validation Checks
1. **File exists** – Import file must be present
2. **Manifest present** – `manifest.json` must exist in archive
3. **Manifest valid** – Must be valid JSON
4. **Schema version** – Must be ≤ current `SCHEMA_VERSION`
5. **Reference consistency** – Data references validated during import

### Import Modes
| Mode | Description |
|------|-------------|
| `replace` | Clears existing data, imports new data |
| `copy` | Imports with new project ID (default) |
| `merge` | Only imports files that don't already exist |

## Restore Flow

1. **Select backup** from backup history
2. **Confirm restore** (destructive action)
3. **Validate backup**:
   - Metadata exists
   - Metadata is valid JSON
   - Schema version compatible
4. **Restore data**:
   - Clear existing data directory
   - Copy backup data
5. **Verify** via health endpoints

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/backups` | Create manual backup |
| GET | `/api/backups` | List all backups |
| POST | `/api/backups/:id/restore` | Restore from backup |
| DELETE | `/api/backups/:id` | Delete backup |
| POST | `/api/projects/:projectId/export` | Export project (ZIP) |
| POST | `/api/projects/import` | Import project (multipart) |

## Migration Strategy

### Version Fields
- **schemaVersion**: Data schema version (increments on breaking changes)
- **applicationVersion**: Application version
- **migrationVersion**: Migration script version

### Migration Process
1. Backup is created with current versions
2. On restore, versions are compared
3. If `schemaVersion` is newer than supported → reject
4. If `schemaVersion` is older → migration scripts can be applied
5. Future migrations increment `migrationVersion`

## Recovery Process

### Scenario 1: Data Corruption
```bash
# 1. List available backups
curl http://localhost:3000/api/backups

# 2. Restore from backup
curl -X POST http://localhost:3000/api/backups/backup-2024-01-01T00-00-00/restore

# 3. Verify health
curl http://localhost:3000/health
```

### Scenario 2: Project Loss
```bash
# 1. Export project
curl -X POST http://localhost:3000/api/projects/1/export \
  -H "Content-Type: application/json" \
  -d '{"projectName": "My Project"}'

# 2. Import project
curl -X POST http://localhost:3000/api/projects/import \
  -F "file=@project-1-2024-01-01T00-00-00.zip" \
  -F "mode=copy"
```

### Scenario 3: Full System Recovery
```bash
# 1. Restore Docker volume
docker run --rm -v testforge-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/testforge-backup.tar.gz -C /

# 2. Start services
docker-compose up -d

# 3. Verify
curl http://localhost:3000/health
```

## Files Created

### Backend
- `backend/src/interfaces/backup/BackupService.ts` – Core backup/restore/export/import service
- `backend/src/interfaces/backup/BackupRoutes.ts` – REST API routes

### Frontend
- `frontend/src/modules/backup/pages/BackupPage.tsx` – Backup & Restore UI

### Documentation
- `BACKUP_AND_RESTORE.md` – This document