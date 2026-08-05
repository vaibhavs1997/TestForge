# TestForge Installation Guide

**Version:** 1.0.0  
**Last Updated:** 2025-08-05  
**Audience:** System administrators, DevOps engineers, developers

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Methods](#installation-methods)
3. [Docker Installation](#docker-installation)
4. [Manual Installation](#manual-installation)
5. [Configuration](#configuration)
6. [Database Setup](#database-setup)
7. [Verification](#verification)
8. [Post-Installation](#post-installation)
9. [Upgrade](#upgrade)
10. [Uninstallation](#uninstallation)

---

## Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 4 cores (2.0 GHz+)
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **OS**: Linux (Ubuntu 20.04+), Windows Server 2019+, macOS 11.0+

#### Recommended Requirements
- **CPU**: 8+ cores (2.5 GHz+)
- **RAM**: 16 GB
- **Storage**: 100 GB+ NVMe SSD
- **OS**: Ubuntu 22.04 LTS or RHEL 8+

### Software Prerequisites

#### Required
- **Node.js**: 18.x or higher ([Download](https://nodejs.org/))
- **PostgreSQL**: 14.x or higher ([Download](https://www.postgresql.org/download/))
- **Redis**: 7.x or higher ([Download](https://redis.io/download/))
- **Git**: For cloning the repository

#### Optional
- **Docker**: 20.x+ ([Download](https://www.docker.com/get-started))
- **Docker Compose**: 2.x+ ([Download](https://docs.docker.com/compose/install/))
- **Nginx**: For reverse proxy (production)
- **PM2**: For process management (production)

---

## Installation Methods

### Method Comparison

| Method | Complexity | Flexibility | Recommended For |
|--------|-----------|-------------|-----------------|
| Docker | Low | Medium | Production, Quick Start |
| Manual | High | High | Development, Custom Setup |

---

## Docker Installation

### Step 1: Install Docker

#### Linux
```bash
# Update package index
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### Windows
1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Run installer
3. Enable WSL 2 integration if prompted
4. Restart computer

#### macOS
```bash
# Install using Homebrew
brew install --cask docker

# Or download Docker Desktop
# https://www.docker.com/products/docker-desktop/
```

### Step 2: Clone Repository

```bash
# Clone repository
git clone https://github.com/vaibhavs1997/TestForge.git
cd TestForge

# Verify clone
ls -la
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
```

#### Required Configuration

```env
# Database
DATABASE_URL=postgresql://testforge:secure_password@postgres:5432/testforge

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-very-secure-secret-key-change-this-in-production

# Frontend
VITE_API_URL=http://localhost:3000/api
```

### Step 4: Start Services

```bash
# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### Step 5: Verify Installation

```bash
# Check backend health
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","database":"connected","redis":"connected"}

# Check frontend
curl http://localhost:5173

# Expected: HTML page with TestForge title
```

### Step 6: Access Application

1. Open browser
2. Navigate to `http://localhost:5173`
3. Default credentials:
   - Email: `admin@testforge.io`
   - Password: `admin123`

**Important**: Change default password after first login!

---

## Manual Installation

### Step 1: Install System Dependencies

#### Ubuntu/Debian
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js
node --version  # Should show v18.x.x
npm --version

# Install PostgreSQL 14
sudo apt-get install -y postgresql-14 postgresql-contrib-14

# Install Redis
sudo apt-get install -y redis-server

# Install Git
sudo apt-get install -y git
```

#### Windows
1. Install [Node.js 18+](https://nodejs.org/)
2. Install [PostgreSQL 14+](https://www.postgresql.org/download/windows/)
3. Install [Redis](https://redis.io/download/)
4. Install [Git for Windows](https://git-scm.com/download/win)

#### macOS
```bash
# Install using Homebrew
brew install node@18 postgresql@14 redis git

# Link Node.js
brew link --overwrite node@18

# Start PostgreSQL
brew services start postgresql@14

# Start Redis
brew services start redis
```

### Step 2: Clone Repository

```bash
# Clone repository
git clone https://github.com/vaibhavs1997/TestForge.git
cd TestForge
```

### Step 3: Database Setup

#### Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE testforge;
CREATE USER testforge_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE testforge TO testforge_user;
\q
```

#### Configure PostgreSQL

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf

# Update these settings:
listen_addresses = 'localhost'
port = 5432

# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add:
local   testforge    testforge_user    md5
```

#### Restart PostgreSQL

```bash
# Linux
sudo systemctl restart postgresql

# macOS
brew services restart postgresql@14
```

### Step 4: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env

# Required environment variables:
# DATABASE_URL=postgresql://testforge_user:secure_password@localhost:5432/testforge
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-very-secure-secret-key

# Run database migrations
npm run migrate

# (Optional) Seed initial data
npm run seed

# Build application
npm run build

# Start backend
npm start
# Or for development with auto-reload:
npm run dev
```

Backend will start on `http://localhost:3000`

### Step 5: Frontend Setup

```bash
# Open new terminal
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env

# Required environment variables:
# VITE_API_URL=http://localhost:3000/api

# Build application
npm run build

# Start frontend
npm run preview
# Or for development:
npm run dev
```

Frontend will start on `http://localhost:5173`

---

## Configuration

### Environment Variables

#### Backend Configuration

Create `backend/.env`:

```env
# Server
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://testforge_user:secure_password@localhost:5432/testforge
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-very-secure-secret-key-minimum-32-characters
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# AI Providers (Optional)
OPENAI_API_KEY=sk-your-openai-key
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
ANTHROPIC_API_KEY=your-anthropic-key

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@example.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@testforge.io

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=json,csv,xlsx,xml,yaml,yml

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
LOG_MAX_SIZE=10m
LOG_MAX_FILES=14d

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
CORS_CREDENTIALS=true
```

#### Frontend Configuration

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_TITLE=TestForge
VITE_APP_VERSION=1.0.0
```

### Configuration File Locations

```
TestForge/
├── backend/
│   ├── .env                 # Backend configuration
│   └── logs/                # Application logs
├── frontend/
│   └── .env                 # Frontend configuration
└── uploads/                 # Uploaded files
    ├── datasets/
    ├── exports/
    └── backups/
```

---

## Database Setup

### Detailed Database Setup

#### 1. Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE testforge;

# Create user
CREATE USER testforge_user WITH PASSWORD 'secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE testforge TO testforge_user;

# Exit
\q
```

#### 2. Run Migrations

```bash
cd backend

# Run all migrations
npm run migrate

# Verify migration
npm run migrate:status
```

#### 3. Seed Initial Data (Optional)

```bash
# Seed database with initial data
npm run seed

# This creates:
# - Default admin user
# - Sample AI providers
# - Default execution profiles
```

### Database Backup

```bash
# Create backup
pg_dump -U testforge_user testforge > testforge_backup_$(date +%Y%m%d).sql

# Restore backup
psql -U testforge_user testforge < testforge_backup_20250120.sql
```

---

## Verification

### Health Checks

#### Backend Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

#### Database Health

```bash
curl http://localhost:3000/health/database
```

Expected response:
```json
{
  "status": "ok",
  "connection": "active",
  "pool": {
    "active": 2,
    "idle": 5,
    "total": 7
  }
}
```

#### Redis Health

```bash
curl http://localhost:3000/health/redis
```

Expected response:
```json
{
  "status": "ok",
  "connection": "active",
  "memory": {
    "used": "2MB",
    "peak": "3MB"
  }
}
```

### Functional Tests

```bash
# Test API endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@testforge.io",
    "password": "admin123"
  }'

# Expected: JWT token in response
```

### Frontend Verification

1. Open browser: `http://localhost:5173`
2. Verify TestForge dashboard loads
3. Login with default credentials
4. Navigate through main sections

---

## Post-Installation

### Initial Setup

#### 1. Change Default Password

1. Login with default credentials
2. Navigate to **Settings** → **Profile**
3. Click **Change Password**
4. Enter current and new password
5. Save changes

#### 2. Configure AI Providers

1. Navigate to **AI Providers**
2. Click **Add Provider**
3. Configure:
   - **Name**: Provider name
   - **Type**: OpenAI, Azure, etc.
   - **API Key**: Your API key
   - **Model**: GPT-4, etc.
4. Save provider

#### 3. Create First Project

1. Click **Projects** in sidebar
2. Click **Create Project**
3. Enter project name and description
4. Click **Create**

#### 4. Configure Email (Optional)

Edit `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

Restart backend:
```bash
npm restart  # or pm2 restart all
```

#### 5. Configure Backup Schedule

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /usr/bin/node /path/to/TestForge/backend/src/jobs/backup.js
```

### Security Hardening

#### Change JWT Secret

```env
# Generate strong secret
openssl rand -base64 32

# Update in .env
JWT_SECRET=your-generated-secret-here
```

#### Enable HTTPS

```bash
# Generate SSL certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx.key \
  -out nginx.crt

# Configure Nginx
sudo nano /etc/nginx/sites-available/testforge
```

#### Configure Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## Upgrade

### Docker Upgrade

```bash
# Pull latest image
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Run migrations
docker-compose exec backend npm run migrate

# Verify
curl http://localhost:3000/health
```

### Manual Upgrade

```bash
# Backup database
pg_dump -U testforge_user testforge > backup.sql

# Pull latest code
git pull origin main

# Update dependencies
cd backend && npm install
cd ../frontend && npm install

# Run migrations
cd backend
npm run migrate

# Build and restart
npm run build
npm restart
```

---

## Uninstallation

### Docker Uninstallation

```bash
# Stop services
docker-compose down

# Remove volumes (WARNING: Deletes all data)
docker-compose down -v

# Remove images
docker rmi testforge-backend testforge-frontend testforge-postgres testforge-redis
```

### Manual Uninstallation

```bash
# Stop services
pm2 stop all
pm2 delete all

# Remove database
sudo -u postgres psql
DROP DATABASE testforge;
DROP USER testforge_user;
\q

# Remove application
cd /path/to/TestForge
rm -rf /path/to/TestForge

# Remove Node.js modules
npm uninstall -g pm2
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Check port usage
sudo netstat -tlnp | grep 3000

# Kill process
sudo kill -9 <PID>

# Or use different port in .env
PORT=3001
```

#### Database Connection Error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U testforge_user -h localhost testforge

# Verify credentials in .env
```

#### Redis Connection Error

```bash
# Check Redis is running
sudo systemctl status redis

# Test connection
redis-cli ping
# Expected: PONG
```

#### Permission Denied

```bash
# Fix upload directory permissions
sudo chown -R $USER:$USER uploads/
chmod -R 755 uploads/
```

---

## Support

### Getting Help

- **Documentation**: [docs/](.)
- **FAQ**: [FAQ.md](FAQ.md)
- **Troubleshooting**: [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/vaibhavs1997/TestForge/issues)

---

**Last Updated:** 2025-08-05  
**Maintained By:** TestForge Team