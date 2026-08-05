# TestForge Troubleshooting Guide

**Version:** 1.0.0  
**Last Updated:** 2025-08-05  
**Audience:** Users, administrators, support staff

---

## Table of Contents

1. [Common Issues](#common-issues)
2. [Installation Problems](#installation-problems)
3. [Configuration Issues](#configuration-issues)
4. [Database Problems](#database-problems)
5. [Performance Issues](#performance-issues)
6. [Authentication & Authorization](#authentication--authorization)
7. [Execution Issues](#execution-issues)
8. [AI Features](#ai-features)
9. [Notifications](#notifications)
10. [Backup & Restore](#backup--restore)
11. [Browser Issues](#browser-issues)
12. [Getting Additional Help](#getting-additional-help)

---

## Common Issues

### Application Won't Start

#### Symptoms
- Application fails to start
- Error messages in logs
- Port already in use

#### Solutions

**Check if port is already in use:**
```bash
# Linux/macOS
sudo lsof -i :3000
sudo netstat -tlnp | grep 3000

# Windows
netstat -ano | findstr :3000

# Kill process
kill -9 <PID>  # Linux/macOS
taskkill /PID <PID> /F  # Windows
```

**Check logs:**
```bash
# Backend logs
tail -f backend/logs/error.log

# Frontend logs
Check browser console (F12)
```

**Verify Node.js version:**
```bash
node --version  # Should be 18.x or higher
npm --version
```

---

## Installation Problems

### Docker Installation Fails

#### Symptoms
- Docker commands fail
- Containers won't start
- Permission errors

#### Solutions

**Fix Docker permissions (Linux):**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Restart docker
sudo systemctl restart docker

# Log out and back in
```

**Check Docker status:**
```bash
# Check if Docker is running
sudo systemctl status docker

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

**Clear Docker cache:**
```bash
# Stop containers
docker-compose down

# Remove volumes (WARNING: Deletes data)
docker-compose down -v

# Remove images
docker system prune -a

# Restart
docker-compose up -d
```

### Manual Installation Fails

#### Symptoms
- npm install fails
- Build errors
- Module not found errors

#### Solutions

**Clear npm cache:**
```bash
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install
```

**Update npm:**
```bash
npm install -g npm@latest
```

**Check Node.js version:**
```bash
# Should be 18.x or higher
node --version

# Update if needed
# Visit https://nodejs.org/
```

---

## Configuration Issues

### Environment Variables Not Loading

#### Symptoms
- Configuration values are undefined
- Application uses default values
- Configuration errors in logs

#### Solutions

**Verify .env file exists:**
```bash
# Check backend
ls -la backend/.env

# Check frontend
ls -la frontend/.env
```

**Verify .env file format:**
```env
# Correct format (no spaces around =)
DATABASE_URL=postgresql://user:pass@localhost:5432/testforge

# Incorrect format
DATABASE_URL = postgresql://user:pass@localhost:5432/testforge
```

**Restart application after changes:**
```bash
# Backend
npm restart

# Frontend
# Stop and restart dev server
```

### Database Connection Fails

#### Symptoms
- Cannot connect to database
- Connection timeout errors
- Authentication failed

#### Solutions

**Verify PostgreSQL is running:**
```bash
# Linux
sudo systemctl status postgresql

# macOS
brew services list | grep postgresql

# Start if not running
sudo systemctl start postgresql  # Linux
brew services start postgresql  # macOS
```

**Test database connection:**
```bash
# Connect to database
psql -U testforge_user -h localhost testforge

# Verify credentials in .env match database user
```

**Check database URL format:**
```env
# Correct
DATABASE_URL=postgresql://user:password@localhost:5432/database

# Check for:
# - Correct username
# - Correct password
# - Correct database name
# - Correct host and port
```

**Verify pg_hba.conf:**
```bash
# Edit PostgreSQL authentication
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add line for your user
local   testforge    testforge_user    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Redis Connection Fails

#### Symptoms
- Redis connection errors
- Cache not working
- Session issues

#### Solutions

**Verify Redis is running:**
```bash
# Check Redis status
redis-cli ping
# Expected: PONG

# Start Redis
sudo systemctl start redis  # Linux
brew services start redis  # macOS
```

**Check Redis configuration:**
```bash
# Test connection
redis-cli -h localhost -p 6379 ping

# Verify REDIS_URL in .env
REDIS_URL=redis://localhost:6379
```

---

## Database Problems

### Migration Fails

#### Symptoms
- Migration errors
- Database schema out of sync
- Table already exists errors

#### Solutions

**Reset database (WARNING: Deletes all data):**
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE testforge;"
psql -U postgres -c "CREATE DATABASE testforge;"

# Run migrations
cd backend
npm run migrate
```

**Check migration status:**
```bash
npm run migrate:status
```

**Run specific migration:**
```bash
npm run migrate:up <migration_number>
```

### Slow Database Queries

#### Symptoms
- Slow page loads
- Timeouts
- High CPU usage

#### Solutions

**Enable query logging:**
```sql
-- In PostgreSQL
ALTER DATABASE testforge SET log_statement = 'all';
```

**Identify slow queries:**
```sql
-- Enable pg_stat_statements
CREATE EXTENSION pg_stat_statements;

-- View slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Add indexes:**
```sql
-- Common indexes
CREATE INDEX idx_requirements_project_id ON requirements(project_id);
CREATE INDEX idx_executions_project_id ON execution_runs(project_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

**Vacuum database:**
```sql
VACUUM ANALYZE;
```

### Database Full

#### Symptoms
- No space left on device
- Cannot write to database
- Backup failures

#### Solutions

**Check database size:**
```sql
SELECT pg_size_pretty(pg_database_size('testforge'));
```

**Clean old data:**
```sql
-- Delete old executions (older than 90 days)
DELETE FROM execution_runs 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete old audit logs (older than 1 year)
DELETE FROM audit_logs 
WHERE timestamp < NOW() - INTERVAL '1 year';

-- Vacuum to reclaim space
VACUUM FULL;
```

**Increase storage:**
```bash
# Add more disk space to server
# Or clean up old backups
```

---

## Performance Issues

### Slow Page Loads

#### Symptoms
- Pages take long time to load
- UI freezes
- Browser timeout

#### Solutions

**Check browser console:**
```
F12 → Console tab → Look for errors
F12 → Network tab → Check request times
```

**Enable React Query DevTools:**
```typescript
// Check for excessive refetching
// Look for stale-while-revalidate behavior
```

**Optimize queries:**
```typescript
// Add pagination
const { data } = useQuery({
  queryKey: ['projects', { page: 1, limit: 20 }],
  queryFn: () => api.listProjects({ page: 1, limit: 20 }),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Clear cache:**
```bash
# Clear browser cache
# Clear React Query cache
queryClient.clear();
```

### High Memory Usage

#### Symptoms
- Application crashes
- System slowdowns
- Out of memory errors

#### Solutions

**Increase Node.js memory:**
```bash
# Backend
NODE_OPTIONS=--max-old-space-size=4096 npm start

# Or in .env
NODE_OPTIONS=--max-old-space-size=4096
```

**Check for memory leaks:**
```bash
# Monitor memory usage
top -p <PID>

# Check heap usage
node --inspect app.js
# Open chrome://inspect in Chrome
```

**Restart application:**
```bash
pm2 restart all
# Or
npm restart
```

---

## Authentication & Authorization

### Login Fails

#### Symptoms
- Cannot login
- Invalid credentials error
- Token expired

#### Solutions

**Verify credentials:**
```bash
# Test login API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@testforge.io","password":"admin123"}'
```

**Check JWT secret:**
```env
# Verify JWT_SECRET is set in .env
JWT_SECRET=your-secret-key

# Restart after changes
npm restart
```

**Clear browser storage:**
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
```

### Permission Denied

#### Symptoms
- 403 Forbidden errors
- Cannot access resources
- Insufficient permissions message

#### Solutions

**Verify user role:**
```sql
-- Check user role in database
SELECT id, email, role FROM users WHERE email = 'user@example.com';
```

**Check role permissions:**
```javascript
// In backend/src/config/roles.js
console.log('User role:', user.role);
console.log('Permissions:', ROLES[user.role]);
```

**Update user role:**
```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

---

## Execution Issues

### Execution Won't Start

#### Symptoms
- Start button disabled
- Execution immediately fails
- No execution created

#### Solutions

**Verify execution profile:**
```bash
# Check if profile exists
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/projects/<projectId>/profiles
```

**Check execution plan:**
```bash
# Verify plan exists and is active
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/projects/<projectId>/execution-plans
```

**Review backend logs:**
```bash
tail -f backend/logs/error.log | grep -i execution
```

### Execution Stuck

#### Symptoms
- Execution shows "Running" indefinitely
- No progress updates
- Polling not working

#### Solutions

**Check execution status:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/projects/<projectId>/executions/<executionId>
```

**Check for running processes:**
```bash
# Check backend processes
ps aux | grep node

# Check for stuck jobs
redis-cli
> KEYS *
> GET <job-key>
```

**Restart backend:**
```bash
pm2 restart all
```

### Test Data Not Loading

#### Symptoms
- No test data in execution
- Dataset not found errors
- Empty values in variables

#### Solutions

**Verify dataset exists:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/projects/<projectId>/datasets
```

**Check dataset mapping:**
```bash
# Verify columns are mapped
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/projects/<projectId>/datasets/<datasetId>
```

**Validate dataset file:**
```bash
# Check file exists
ls -la uploads/datasets/project-<id>/

# Verify file format
file users.csv
head users.csv
```

---

## AI Features

### AI Generation Not Working

#### Symptoms
- AI generation button does nothing
- API errors
- Timeout errors

#### Solutions

**Verify AI provider configuration:**
```bash
# List providers
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/projects/<projectId>/ai-providers
```

**Check API key:**
```env
# Verify API key is set
OPENAI_API_KEY=sk-...

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-..."
```

**Check rate limits:**
```bash
# Review error message
# "Rate limit exceeded" = Wait or upgrade plan
# "Invalid API key" = Check API key
```

**Enable debug logging:**
```env
LOG_LEVEL=debug
```

### AI Generation Returns Poor Results

#### Symptoms
- Irrelevant content generated
- Low confidence scores
- Generic outputs

#### Solutions

**Improve prompts:**
- Add more context to requirements
- Provide examples in descriptions
- Use specific categories and priorities

**Adjust AI settings:**
```env
# Lower temperature for more focused output
AI_TEMPERATURE=0.3

# Increase max tokens for longer responses
AI_MAX_TOKENS=2000
```

**Use better models:**
- GPT-4 instead of GPT-3.5
- Claude 3 instead of Claude 2
- Check model documentation

---

## Notifications

### Notifications Not Sending

#### Symptoms
- No email received
- Notification errors in logs
- Test notification fails

#### Solutions

**Verify email configuration:**
```env
# Check SMTP settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Test connection
telnet smtp.gmail.com 587
```

**Check spam folder:**
- Look in email spam/junk folder
- Add sender to contacts
- Check spam filters

**Review notification logs:**
```bash
grep -i "notification" backend/logs/combined.log
```

**Test with different provider:**
- Try email provider
- Try webhook provider
- Check provider logs

### Notification Templates Not Working

#### Symptoms
- Variables not replaced
- Empty template variables
- Template syntax errors

#### Solutions

**Verify template syntax:**
```json
// Correct
"subject": "Execution {{status}} for {{projectName}}"

// Incorrect
"subject": "Execution {status} for {projectName}"  // Wrong braces
```

**Check available variables:**
- `{{executionRunId}}`
- `{{status}}`
- `{{projectName}}`
- `{{requirementId}}`
- `{{suiteName}}`

**Test template:**
```bash
# Use test notification feature
# Check preview before saving
```

---

## Backup & Restore

### Backup Fails

#### Symptoms
- Backup creation fails
- Incomplete backups
- Permission errors

#### Solutions

**Check disk space:**
```bash
df -h
# Ensure sufficient space for backup
```

**Verify permissions:**
```bash
# Check upload directory
ls -la uploads/backups/

# Fix permissions
sudo chown -R $USER:$USER uploads/
chmod -R 755 uploads/
```

**Check database permissions:**
```bash
# Verify database user can read all tables
psql -U testforge_user testforge -c "\dt"
```

### Restore Fails

#### Symptoms
- Restore process fails
- Data corruption
- Incomplete restore

#### Solutions

**Verify backup file:**
```bash
# Check backup integrity
tar -tzf testforge_backup_20250120.tar.gz

# Check backup size
ls -lh testforge_backup_20250120.tar.gz
```

**Stop application during restore:**
```bash
# Stop backend
pm2 stop all

# Restore
npm run restore -- --file backup.tar.gz

# Restart
pm2 start all
```

**Check database state:**
```bash
# Verify no active connections
psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE datname = 'testforge';"

# Kill connections if needed
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'testforge';"
```

---

## Browser Issues

### UI Not Loading

#### Symptoms
- Blank page
- Loading spinner forever
- JavaScript errors

#### Solutions

**Clear browser cache:**
```
Chrome: Ctrl+Shift+Delete → Clear cache
Firefox: Ctrl+Shift+Delete → Clear cache
Safari: Cmd+Option+E → Empty caches
```

**Check browser console:**
```
F12 → Console tab
Look for errors (red text)
```

**Try incognito mode:**
```
Chrome: Ctrl+Shift+N
Firefox: Ctrl+Shift+P
Safari: Cmd+Shift+N
```

**Disable extensions:**
- Ad blockers may interfere
- Script blockers may block functionality

### Data Not Updating

#### Symptoms
- Stale data displayed
- Changes not reflected
- Need to refresh page

#### Solutions

**Hard refresh:**
```
Chrome/Firefox: Ctrl+Shift+R
Safari: Cmd+Option+R
```

**Clear React Query cache:**
```javascript
// In browser console
window.location.reload(true);
```

**Check network tab:**
```
F12 → Network tab
Check if API calls are being made
Check response status codes
```

---

## Getting Additional Help

### Log Collection

Gather logs before requesting support:

```bash
# Backend logs
tar -czf testforge-logs.tar.gz backend/logs/

# Frontend logs
# Export from browser console (F12 → Console → Export)

# System information
uname -a > system-info.txt
node --version >> system-info.txt
npm --version >> system-info.txt
ps aux >> system-info.txt
```

### Diagnostic Commands

```bash
# System status
docker-compose ps  # Docker
pm2 status  # Manual

# Service health
curl http://localhost:3000/health
curl http://localhost:3000/health/database
curl http://localhost:3000/health/redis

# Database status
psql -U testforge_user -c "SELECT count(*) FROM users;"

# Recent errors
grep -i error backend/logs/error.log | tail -20
```

### Support Channels

- **Documentation**: [docs/](.)
- **FAQ**: [FAQ.md](FAQ.md)
- **GitHub Issues**: https://github.com/vaibhavs1997/TestForge/issues
- **Email Support**: support@testforge.io
- **Community Forum**: https://community.testforge.io

### Reporting Issues

When reporting issues, include:
1. **Description**: What happened
2. **Steps to reproduce**: How to reproduce the issue
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happened
5. **Environment**: OS, Node.js version, browser
6. **Logs**: Relevant error messages
7. **Screenshots**: Visual evidence

---

**Last Updated:** 2025-08-05  
**Maintained By:** TestForge Team