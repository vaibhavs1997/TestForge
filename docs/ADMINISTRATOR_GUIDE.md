# TestForge Administrator Guide

**Version:** 1.0.0  
**Last Updated:** 2025-08-05  
**Audience:** System administrators, DevOps engineers, IT staff

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [User Management](#user-management)
6. [Project Management](#project-management)
7. [Database Management](#database-management)
8. [Backup & Restore](#backup--restore)
9. [Monitoring](#monitoring)
10. [Security](#security)
11. [Maintenance](#maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Introduction

This guide provides comprehensive instructions for administering TestForge instances. It covers installation, configuration, user management, and ongoing maintenance tasks.

### Administrator Responsibilities

- System installation and configuration
- User account management
- Database administration
- Backup and restore operations
- System monitoring and performance tuning
- Security configuration
- Troubleshooting and support

---

## System Requirements

### Hardware Requirements

#### Minimum
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: 100 Mbps

#### Recommended
- **CPU**: 8+ cores
- **RAM**: 16 GB
- **Storage**: 100 GB+ SSD
- **Network**: 1 Gbps

### Software Requirements

#### Backend
- **Node.js**: 18.x or higher
- **PostgreSQL**: 14.x or higher
- **Redis**: 7.x (for caching and queues)
- **Docker**: 20.x+ (optional, for containerized deployment)

#### Frontend
- **Modern web browser**: Chrome, Firefox, Safari, Edge (latest versions)
- **JavaScript**: Enabled

#### Operating System
- **Linux**: Ubuntu 20.04+, RHEL 8+, Debian 11+
- **Windows**: Windows Server 2019+
- **macOS**: 11.0+ (for development)

---

## Installation

### Docker Installation (Recommended)

#### Prerequisites
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

#### Deploy TestForge

1. **Clone repository**
```bash
git clone https://github.com/vaibhavs1997/TestForge.git
cd TestForge
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
nano .env
```

3. **Start services**
```bash
docker-compose up -d
```

4. **Verify installation**
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f
```

5. **Access application**
```
http://your-server:3000
```

### Manual Installation

#### Backend Setup

1. **Install dependencies**
```bash
cd backend
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Set up database**
```bash
# Create database
psql -U postgres -c "CREATE DATABASE testforge;"

# Run migrations
npm run migrate
```

4. **Build application**
```bash
npm run build
```

5. **Start backend**
```bash
npm start
# Or for development
npm run dev
```

#### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Build application**
```bash
npm run build
```

4. **Start frontend**
```bash
npm run preview
# Or for development
npm run dev
```

---

## Configuration

### Environment Variables

#### Backend (.env)

```env
# Server
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/testforge
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=7d

# AI Providers (Optional)
OPENAI_API_KEY=your-openai-key
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com

# Email (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=your-email-password

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_TITLE=TestForge
```

### Database Configuration

#### PostgreSQL Setup

1. **Create database and user**
```sql
CREATE DATABASE testforge;
CREATE USER testforge_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE testforge TO testforge_user;
```

2. **Run migrations**
```bash
cd backend
npm run migrate
```

3. **Seed initial data** (optional)
```bash
npm run seed
```

### Redis Configuration

Redis is used for:
- Session storage
- Query caching
- Background job queues

#### Redis Setup

```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

---

## User Management

### User Roles

TestForge supports the following roles:

- **Admin**: Full system access
- **Project Manager**: Create and manage projects
- **QA Engineer**: Create and execute tests
- **Viewer**: Read-only access

### Creating Users

#### Via UI

1. Navigate to **Settings** → **Users**
2. Click **Add User**
3. Fill in user details:
   - Name
   - Email
   - Role
   - Password
4. Click **Create**

#### Via CLI

```bash
cd backend
npm run create-user -- --email admin@example.com --name "Admin User" --role admin --password secure123
```

### Managing Users

- **Edit User**: Update user information or role
- **Deactivate User**: Disable account without deleting
- **Delete User**: Permanently remove user
- **Reset Password**: Send password reset email

### User Groups

Organize users into groups for easier management:

1. Navigate to **Settings** → **Groups**
2. Click **Create Group**
3. Add users to group
4. Assign group permissions

---

## Project Management

### Creating Projects

1. Navigate to **Projects**
2. Click **Create Project**
3. Enter project details
4. Click **Create**

### Project Settings

Configure project-specific settings:
- **General**: Name, description, visibility
- **Members**: Add/remove project members
- **Environments**: Configure test environments
- **AI Providers**: Set up AI integration
- **Webhooks**: Configure CI/CD integrations

### Project Deletion

**Warning**: Project deletion is permanent and cannot be undone.

1. Navigate to project settings
2. Click **Delete Project**
3. Confirm deletion
4. Wait for cleanup to complete

---

## Database Management

### Database Backups

#### Automated Backups

Configure automated backups in `.env`:

```env
# Backup configuration
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
BACKUP_DIR=./backups
```

#### Manual Backups

```bash
# Backup database
pg_dump -U postgres testforge > testforge_backup_$(date +%Y%m%d).sql

# Restore database
psql -U postgres testforge < testforge_backup_20250805.sql
```

### Database Maintenance

#### Vacuum and Analyze

```sql
-- Run vacuum
VACUUM ANALYZE;

-- Check database size
SELECT pg_size_pretty(pg_database_size('testforge'));
```

#### Index Optimization

```sql
-- Reindex
REINDEX DATABASE testforge;
```

### Database Monitoring

Monitor database performance:

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'testforge';

-- Slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

-- Table sizes
SELECT tablename, pg_size_pretty(size) FROM (
  SELECT tablename, pg_total_relation_size(tablename) as size
  FROM pg_tables WHERE schemaname = 'public'
) t ORDER BY size DESC;
```

---

## Backup & Restore

### Backup Types

#### Full Backup
- Complete database backup
- Includes all projects, users, configurations
- Recommended frequency: Daily

#### Incremental Backup
- Only changes since last backup
- Faster and smaller
- Recommended frequency: Hourly

### Backup Procedures

#### Using TestForge UI

1. Navigate to **Backup & Restore**
2. Click **Create Backup**
3. Wait for backup to complete
4. Download backup file

#### Using CLI

```bash
cd backend
npm run backup
```

### Restore Procedures

#### Using TestForge UI

1. Navigate to **Backup & Restore**
2. Select backup from list
3. Click **Restore**
4. Confirm restore action

#### Using CLI

```bash
cd backend
npm run restore -- --file backups/testforge_backup_20250805.tar.gz
```

### Backup Verification

Verify backup integrity:

```bash
# Check backup file
tar -tzf testforge_backup_20250805.tar.gz

# Test restore to staging environment
npm run restore -- --file testforge_backup_20250805.tar.gz --staging
```

---

## Monitoring

### Application Monitoring

#### Health Checks

TestForge provides health check endpoints:

```bash
# Backend health
curl http://localhost:3000/health

# Database health
curl http://localhost:3000/health/database

# Redis health
curl http://localhost:3000/health/redis
```

#### Metrics

Monitor key metrics:

- **Request rate**: Requests per second
- **Response time**: Average response time
- **Error rate**: Percentage of errors
- **Database connections**: Active connections
- **Memory usage**: Heap and RSS memory
- **CPU usage**: Processor utilization

### Log Management

#### Log Locations

```
backend/logs/
├── error.log
├── combined.log
└── queries.log

frontend/logs/
└── app.log
```

#### Log Rotation

Configure log rotation in `backend/logging.config.js`:

```javascript
{
  maxSize: '10m',
  maxFiles: '7d',
  compress: true
}
```

#### Log Analysis

```bash
# View recent errors
tail -f backend/logs/error.log

# Search for specific errors
grep "database connection" backend/logs/error.log

# Count errors by type
grep -o "ERROR: .*" backend/logs/error.log | sort | uniq -c | sort -rn
```

### Performance Monitoring

#### Database Performance

```sql
-- Slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Cache hit ratio
SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;
```

#### Application Performance

Monitor with APM tools:
- **New Relic**: Application performance monitoring
- **Datadog**: Infrastructure and application monitoring
- **Prometheus + Grafana**: Open-source monitoring stack

---

## Security

### Authentication

#### JWT Configuration

```env
JWT_SECRET=your-very-secure-secret-key-here
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d
```

#### Password Policy

Configure password requirements:

```env
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_EXPIRY_DAYS=90
```

### Authorization

#### Role-Based Access Control

Configure role permissions in `backend/src/config/roles.js`:

```javascript
export const ROLES = {
  admin: ['*'],
  project_manager: ['projects.*', 'environments.*', 'testdata.*'],
  qa_engineer: ['requirements.*', 'designs.*', 'execution.*'],
  viewer: ['requirements.read', 'designs.read', 'execution.read']
};
```

### API Security

#### Rate Limiting

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

#### CORS Configuration

```env
CORS_ORIGIN=https://testforge.example.com
CORS_CREDENTIALS=true
```

### Data Encryption

#### Encryption at Rest

```env
ENCRYPTION_KEY=your-encryption-key-here
```

#### HTTPS Configuration

Configure SSL/TLS in production:

```bash
# Generate SSL certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout testforge.key -out testforge.crt

# Configure nginx
sudo nano /etc/nginx/sites-available/testforge
```

---

## Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor application logs for errors
- Verify backup completion
- Check disk space usage

#### Weekly
- Review slow query log
- Analyze database performance
- Check for failed executions
- Review user activity logs

#### Monthly
- Update dependencies
- Review and archive old data
- Performance tuning
- Security patches

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Security audit
npm audit
npm audit fix
```

### Database Maintenance

```sql
-- Monthly maintenance
VACUUM ANALYZE;
REINDEX DATABASE testforge;
ANALYZE;
```

### Log Cleanup

```bash
# Delete logs older than 30 days
find backend/logs -name "*.log" -mtime +30 -delete
```

---

## Troubleshooting

### Common Issues

#### Database Connection Errors

**Symptoms**: Cannot connect to database

**Solutions**:
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify connection string in `.env`
3. Check firewall rules
4. Verify database user permissions

#### High Memory Usage

**Symptoms**: Application using excessive memory

**Solutions**:
1. Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`
2. Check for memory leaks
3. Restart application
4. Scale horizontally

#### Slow Performance

**Symptoms**: Application responding slowly

**Solutions**:
1. Check database indexes
2. Review slow query log
3. Increase Redis cache TTL
4. Scale resources
5. Enable query optimization

#### Backup Failures

**Symptoms**: Backups failing or incomplete

**Solutions**:
1. Check disk space
2. Verify database permissions
3. Check backup directory permissions
4. Review error logs

---

## Support

### Getting Help

- **Documentation**: Refer to other guides
- **Logs**: Check application logs for errors
- **Community**: TestForge community forums
- **Commercial Support**: Contact TestForge support team

### Escalation Path

1. Check [Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md)
2. Review logs and error messages
3. Search community forums
4. Contact system administrator
5. Escalate to TestForge support (if applicable)

---

**Last Updated:** 2025-08-05  
**Maintained By:** TestForge Team