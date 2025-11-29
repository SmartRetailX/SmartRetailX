# 🚀 SmartRetailX - Complete Setup Guide

Detailed setup and configuration guide for SmartRetailX microservices platform.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [RabbitMQ Setup](#rabbitmq-setup)
6. [Running Services](#running-services)
7. [Mobile App Setup](#mobile-app-setup)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Production Deployment](#production-deployment)

---

## ✅ Prerequisites

### Required Software

| Software       | Version | Purpose             | Download                              |
| -------------- | ------- | ------------------- | ------------------------------------- |
| **Node.js**    | v18+    | Runtime environment | [nodejs.org](https://nodejs.org/)     |
| **pnpm**       | Latest  | Package manager     | `npm install -g pnpm`                 |
| **PostgreSQL** | 14+     | Database            | [neon.tech](https://neon.tech) (free) |
| **RabbitMQ**   | 3.x     | Message queue       | [Docker](#rabbitmq-setup)             |
| **Git**        | Latest  | Version control     | [git-scm.com](https://git-scm.com/)   |

### Optional

- **Docker** - For RabbitMQ (recommended)
- **Expo Go App** - For mobile testing
  ([iOS](https://apps.apple.com/app/expo-go/id982107779) |
  [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- **psql** - PostgreSQL CLI client

### Verify Installation

```bash
node --version    # Should show v18.x or higher
pnpm --version    # Should show 9.x or higher
docker --version  # For RabbitMQ
git --version     # For version control
```

---

## ⚡ Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/smart-retail-x.git
cd smart-retail-x
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for the entire monorepo.

### 3. Start RabbitMQ

**Using Docker (Recommended):**

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management

# Verify it's running
docker ps | grep rabbitmq
```

**Management UI:** http://localhost:15672 (username: `guest`, password: `guest`)

### 4. Setup Database

**Option A: Neon (Free, Recommended)**

1. Go to [neon.tech](https://neon.tech)
2. Create account and new project
3. Copy connection string
4. Save for next step

**Option B: Supabase**

1. Go to [supabase.com](https://supabase.com)
2. Create project
3. Copy pooler connection string

**Option C: Local PostgreSQL**

```bash
# Create database
createdb smartretailx

# Get connection string
# postgresql://user:password@localhost:5432/smartretailx
```

### 5. Configure Environment

Create `.env` in **project root**:

```env
# ============================================
# Global Configuration
# ============================================
NODE_ENV=development

# ============================================
# API Gateway Service
# ============================================
API_GATEWAY_PORT=3000
# Use 0.0.0.0 to allow mobile devices to connect
# Use localhost for local-only access
API_GATEWAY_HOST=0.0.0.0

# ============================================
# PostgreSQL Database
# ============================================
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ============================================
# Authentication (JWT)
# ============================================
# IMPORTANT: Change these to strong secrets (minimum 32 characters)
JWT_SECRET=change-me-to-a-secure-secret-minimum-32-characters-long
JWT_REFRESH_SECRET=change-me-to-another-secure-secret-minimum-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# CORS Configuration
# ============================================
# Comma-separated list of allowed origins
# Use * to allow all origins (development only)
# Mobile apps automatically allowed (no origin header)
CORS_ORIGIN=http://localhost:5173,*

# ============================================
# RabbitMQ Message Queue
# ============================================
# Full connection URI with credentials
RABBITMQ_URI=amqp://guest:guest@localhost:5672

# ============================================
# Assistant Service
# ============================================
ASSISTANT_SERVICE_QUEUE=assistant_queue

# ============================================
# Logging
# ============================================
LOG_LEVEL=info

# ============================================
# Production Base URL (optional)
# ============================================
# BASE_URL=https://your-production-domain.com
```

### 6. Run Database Migrations

```bash
# Using psql
psql "$DATABASE_URL" -f apps/api-gateway/migrations/001_init_better_auth.sql

# Or copy SQL and paste in your database provider's SQL editor
```

**Verify tables created:**

```bash
psql "$DATABASE_URL" -c "\dt"
```

Expected tables: `user`, `session`, `account`, `verification`

### 7. Start Services

```bash
# Start all backend services (api-gateway + assistant-service)
pnpm dev:backend

# Or start everything (backend + web client)
pnpm dev:all
```

### 8. Access Application

- **Web Client:** http://localhost:5173
- **API Gateway:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/api/health
- **RabbitMQ UI:** http://localhost:15672

---

## 🔧 Environment Configuration

### Environment Variables Explained

#### Required Variables

| Variable             | Description                                  | Example                                          |
| -------------------- | -------------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`       | PostgreSQL connection string                 | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET`         | Secret for signing JWT tokens (min 32 chars) | `your-super-secret-jwt-key-at-least-32-chars`    |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (min 32 chars)     | `your-refresh-secret-key-at-least-32-chars`      |
| `RABBITMQ_URI`       | RabbitMQ connection URI                      | `amqp://guest:guest@localhost:5672`              |

#### Optional Variables (with defaults)

| Variable                  | Default                 | Description                                 |
| ------------------------- | ----------------------- | ------------------------------------------- |
| `NODE_ENV`                | `development`           | Environment mode                            |
| `API_GATEWAY_PORT`        | `3000`                  | API Gateway port                            |
| `API_GATEWAY_HOST`        | `localhost`             | API Gateway host (use `0.0.0.0` for mobile) |
| `CORS_ORIGIN`             | `http://localhost:5173` | Allowed CORS origins                        |
| `DATABASE_POOL_MIN`       | `2`                     | Min database connections                    |
| `DATABASE_POOL_MAX`       | `10`                    | Max database connections                    |
| `JWT_EXPIRES_IN`          | `15m`                   | JWT token expiry                            |
| `JWT_REFRESH_EXPIRES_IN`  | `7d`                    | Refresh token expiry                        |
| `LOG_LEVEL`               | `info`                  | Logging level                               |
| `ASSISTANT_SERVICE_QUEUE` | `assistant_queue`       | RabbitMQ queue name                         |

### Important Notes

- All environment variables are **validated at startup** using Zod schema
- Application will not start if required variables are missing or invalid
- JWT secrets must be at least 32 characters long
- DATABASE_URL must start with `postgresql://` or `postgres://`
- For hosted databases (Neon, Supabase), include `?sslmode=require`
- RABBITMQ_URI contains all connection details (no separate host/port/user/pass)

### Generating Secure Secrets

```bash
# Generate random 32-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use openssl
openssl rand -hex 32
```

---

## 🗄️ Database Setup

### Database Schema

The migration creates 4 tables for Better Auth:

1. **`user`** - User accounts
   - id, email, name, emailVerified, image, createdAt, updatedAt

2. **`session`** - Active sessions
   - id, userId, expiresAt, token, ipAddress, userAgent

3. **`account`** - OAuth accounts (for future OAuth integration)
   - id, userId, accountId, providerId, accessToken, refreshToken

4. **`verification`** - Email verification & password reset
   - id, identifier, value, expiresAt

### Running Migrations

**Method 1: Using psql**

```bash
psql "$DATABASE_URL" -f apps/api-gateway/migrations/001_init_better_auth.sql
```

**Method 2: Using database provider's SQL editor**

1. Open your database provider's dashboard (Neon, Supabase, etc.)
2. Navigate to SQL editor
3. Copy contents of `apps/api-gateway/migrations/001_init_better_auth.sql`
4. Paste and execute

### Verify Setup

```bash
# List all tables
psql "$DATABASE_URL" -c "\dt"

# Check user table structure
psql "$DATABASE_URL" -c "\d user"

# Check session table structure
psql "$DATABASE_URL" -c "\d session"
```

### Database Connection String Format

**For Neon:**

```
postgresql://username:password@ep-cool-name.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**For Supabase:**

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

**For Local:**

```
postgresql://username:password@localhost:5432/database
```

---

## 🐰 RabbitMQ Setup

### Using Docker (Recommended)

```bash
# Start RabbitMQ with management plugin
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=guest \
  -e RABBITMQ_DEFAULT_PASS=guest \
  rabbitmq:3-management

# Check if running
docker ps | grep rabbitmq

# View logs
docker logs rabbitmq

# Stop
docker stop rabbitmq

# Remove
docker rm rabbitmq
```

### Management UI

**Access:** http://localhost:15672

**Default Credentials:**

- Username: `guest`
- Password: `guest`

**What to check:**

- **Connections:** Services connecting to RabbitMQ
- **Queues:** `assistant_queue` should appear when services start
- **Exchanges:** Default exchanges available

### CLI Commands

```bash
# Check RabbitMQ status
docker exec rabbitmq rabbitmqctl status

# List queues
docker exec rabbitmq rabbitmqctl list_queues

# List connections
docker exec rabbitmq rabbitmqctl list_connections

# Purge a queue (clear messages)
docker exec rabbitmq rabbitmqctl purge_queue assistant_queue
```

### Using Hosted RabbitMQ

If using a hosted RabbitMQ service (CloudAMQP, etc.):

```env
RABBITMQ_URI=amqp://username:password@host:port/vhost
```

---

## ▶️ Running Services

### Start All Services

```bash
# Backend services only (api-gateway + assistant-service)
pnpm dev:backend

# Backend + web client
pnpm dev:all
```

### Start Individual Services

```bash
# Terminal 1 - API Gateway
nx serve api-gateway

# Terminal 2 - Assistant Service
nx serve assistant-service

# Terminal 3 - Web Client (optional)
nx serve client
```

### Service Startup Order

**Recommended:**

1. RabbitMQ (must be running first)
2. Backend services (can start in any order)
3. Web client

**Why?** Services need RabbitMQ to be available for connection.

### Verify Services Started

```bash
# Check ports
lsof -i:3000  # API Gateway
lsof -i:5173  # Web Client

# Check RabbitMQ connections
# Visit: http://localhost:15672 → Connections tab
```

### Stop Services

- Press `Ctrl+C` in each terminal

**Or force kill:**

```bash
lsof -ti:3000,5173 | xargs kill -9
```

---

## 📱 Mobile App Setup

### Prerequisites

1. **Node.js & pnpm** (already installed)
2. **Expo CLI** (already installed with dependencies)
3. **Expo Go app** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android:
     [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Backend Configuration for Mobile

**CRITICAL:** Mobile devices need network access to your API.

Update root `.env`:

```env
# Allow connections from network (required for mobile)
API_GATEWAY_HOST=0.0.0.0

# Allow mobile app requests
CORS_ORIGIN=http://localhost:5173,*
```

**Restart API Gateway** after changing:

```bash
pnpm dev:backend
```

### Mobile App Configuration

Create `apps/mobile-app/.env`:

```env
# ============================================
# API Configuration
# ============================================
# For iOS Simulator:     http://localhost:3000
# For Android Emulator:  http://10.0.2.2:3000
# For Physical Device:   http://YOUR_MACHINE_IP:3000

EXPO_PUBLIC_API_URL=http://192.168.8.8:3000

# ============================================
# App Metadata (optional)
# ============================================
EXPO_PUBLIC_APP_NAME=SmartRetailX
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_ENV=development
```

### Finding Your Machine's IP

**Linux/macOS:**

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# or
ip addr show | grep "inet " | grep -v 127.0.0.1
```

**Windows:**

```bash
ipconfig | findstr IPv4
```

### Running Mobile App

```bash
# Start Expo dev server
pnpm mobile:start

# Or navigate to directory
cd apps/mobile-app
npx expo start
```

**Scan QR code with:**

- **iOS:** Camera app
- **Android:** Expo Go app

### Platform-Specific URLs

| Platform             | URL Format              | Example                   |
| -------------------- | ----------------------- | ------------------------- |
| **iOS Simulator**    | `http://localhost:3000` | Works as-is               |
| **Android Emulator** | `http://10.0.2.2:3000`  | Android's localhost alias |
| **Physical Device**  | `http://YOUR_IP:3000`   | Your computer's local IP  |

### Troubleshooting Mobile Connection

**Test if API is reachable:**

```bash
# From your terminal (same network)
curl http://YOUR_IP:3000/api/health

# From phone's browser
# Open: http://YOUR_IP:3000/api/health
```

**Common issues:**

1. **Firewall blocking:** Allow port 3000

   ```bash
   # Linux
   sudo ufw allow 3000

   # macOS: System Settings → Network → Firewall
   # Windows: Windows Defender Firewall → Allow app
   ```

2. **Different WiFi networks:** Both devices must be on same network

3. **Guest/public WiFi:** May block device-to-device communication

4. **Wrong IP in .env:** Update with correct IP address

---

## 🧪 Testing

### Health Checks

```bash
# Check all services
curl http://localhost:3000/api/health

# Expected response:
{
  "gateway": {
    "status": "healthy",
    "service": "api-gateway",
    "timestamp": "2025-11-29T..."
  },
  "services": {
    "assistant": {
      "status": "healthy",
      "service": "assistant-service",
      ...
    }
  }
}
```

### Authentication Testing

**Sign Up:**

```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Sign In:**

```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Get Session:**

```bash
curl -b cookies.txt http://localhost:3000/api/auth/session
```

### Voice Assistant Testing

```bash
# Send query
curl -X POST http://localhost:3000/api/assistant/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "මම ජුත්තු එකක් ගන්න අවශ්‍යයි",
    "language": "si"
  }'

# Get capabilities
curl http://localhost:3000/api/assistant/capabilities
```

### Browser Testing

1. Open http://localhost:5173
2. Click "Sign Up" and create account
3. Sign in with credentials
4. Refresh page - should stay logged in
5. Sign out - session should clear

### Database Verification

```bash
# Check users
psql "$DATABASE_URL" -c 'SELECT id, name, email FROM "user";'

# Check sessions
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM session;'

# View session details
psql "$DATABASE_URL" -c 'SELECT * FROM session;'
```

---

## 🐛 Troubleshooting

### RabbitMQ Issues

**Problem:** "Connection refused" error

**Solutions:**

```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# Restart RabbitMQ
docker restart rabbitmq

# Check logs
docker logs rabbitmq

# Verify connection string
echo $RABBITMQ_URI
```

**Problem:** Service not receiving messages

**Check:**

1. Queue name matches in producer and consumer
2. RabbitMQ connection in service logs
3. RabbitMQ UI (http://localhost:15672) for queue stats

---

### Database Issues

**Problem:** "Cannot connect to database"

**Solutions:**

```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Check SSL requirement
# Ensure: ?sslmode=require in connection string for hosted DBs

# URL encode special characters in password
# @ → %40, ! → %21, # → %23
```

**Problem:** "Table does not exist"

**Solutions:**

```bash
# Run migrations
psql "$DATABASE_URL" -f apps/api-gateway/migrations/001_init_better_auth.sql

# Verify tables
psql "$DATABASE_URL" -c "\dt"
```

**Problem:** "Too many connections"

**Solutions:**

- Reduce `DATABASE_POOL_MAX` in `.env`
- Check for connection leaks
- Upgrade database plan for more connections

---

### Port Conflicts

**Problem:** "Port already in use"

**Solutions:**

```bash
# Find process using port
lsof -i:3000

# Kill process
lsof -ti:3000 | xargs kill -9

# Or change port in .env
API_GATEWAY_PORT=3001
```

---

### Mobile App Issues

**Problem:** "Network request failed"

**Solutions:**

1. **Set API_GATEWAY_HOST=0.0.0.0** in root `.env`
2. **Set CORS_ORIGIN=http://localhost:5173,\*** in root `.env`
3. **Restart API Gateway**
4. **Use correct IP** in mobile `.env`:
   - iOS Simulator: `localhost:3000`
   - Android Emulator: `10.0.2.2:3000`
   - Physical Device: `YOUR_IP:3000`
5. **Check firewall** allows port 3000
6. **Verify same WiFi network**

**Problem:** Expo app not loading

**Solutions:**

```bash
# Clear cache
cd apps/mobile-app
rm -rf node_modules .expo
pnpm install
npx expo start --clear

# Update Expo Go app to latest version
```

---

### CORS Errors

**Problem:** "Blocked by CORS policy"

**Solutions:**

1. Check `CORS_ORIGIN` in `.env`
2. Restart API Gateway after changing `.env`
3. Verify client running on correct port (5173)
4. For mobile, ensure `CORS_ORIGIN` includes `*`

---

### Module Not Found

**Problem:** "Cannot find module"

**Solutions:**

```bash
# Clear and reinstall
rm -rf node_modules
pnpm install

# Clear Nx cache
npx nx reset

# Rebuild
npx nx build api-gateway
npx nx build assistant-service
```

---

### Service Not Starting

**Check:**

1. **Environment variables:**

   ```bash
   cat .env
   # Verify all required variables present
   ```

2. **Dependencies installed:**

   ```bash
   pnpm install
   ```

3. **TypeScript compilation:**

   ```bash
   npx nx build api-gateway
   ```

4. **View logs:**
   - Check terminal output for errors
   - Look for validation errors
   - Check database connection errors

---

## 🚀 Production Deployment

### Environment Variables

```env
NODE_ENV=production
DATABASE_URL=postgresql://...  # Production database
RABBITMQ_URI=amqp://...        # Production RabbitMQ
JWT_SECRET=production-secret-minimum-32-characters
JWT_REFRESH_SECRET=production-refresh-secret-minimum-32-chars
CORS_ORIGIN=https://yourdomain.com
API_GATEWAY_HOST=0.0.0.0
API_GATEWAY_PORT=3000
BASE_URL=https://api.yourdomain.com
```

### Security Checklist

- [ ] Change all JWT secrets to strong random values
- [ ] Use hosted PostgreSQL with SSL (sslmode=require)
- [ ] Use hosted RabbitMQ with authentication
- [ ] Set CORS_ORIGIN to specific domain (not \*)
- [ ] Enable HTTPS/TLS
- [ ] Set up rate limiting
- [ ] Configure firewall rules
- [ ] Enable database backups
- [ ] Set up monitoring and logging

### Deployment Options

**Docker (Planned):**

```bash
docker-compose build
docker-compose up -d
```

**Cloud Platforms:**

- Vercel (Web client)
- Railway (Backend services)
- Heroku (Backend services)
- AWS ECS/EKS (Containers)
- Google Cloud Run (Containers)

---

## ✅ Setup Checklist

- [ ] Node.js v18+ installed
- [ ] pnpm installed
- [ ] RabbitMQ running (Docker or hosted)
- [ ] PostgreSQL database created
- [ ] Root `.env` file created and configured
- [ ] Strong JWT secrets generated (32+ chars)
- [ ] Database migrations executed
- [ ] 4 tables verified in database
- [ ] RabbitMQ queues visible in UI
- [ ] All backend services start without errors
- [ ] Health check passes
- [ ] Web client accessible at http://localhost:5173
- [ ] Mobile app connects to API (if testing mobile)
- [ ] Can sign up successfully
- [ ] Can sign in successfully
- [ ] Session persists on refresh
- [ ] Can sign out

---

## 📚 Additional Resources

- **[Better Auth Documentation](https://www.better-auth.com/docs)** -
  Authentication library
- **[NestJS Microservices](https://docs.nestjs.com/microservices/basics)** -
  Microservices guide
- **[RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)** - Message
  queue basics
- **[Expo Documentation](https://docs.expo.dev/)** - Mobile development guide
- **[Nx Documentation](https://nx.dev)** - Monorepo tooling

---

## 🤝 Getting Help

If you encounter issues:

1. Check this troubleshooting section
2. Review environment configuration
3. Check service logs for errors
4. Open an issue on GitHub

---

**Congratulations! Your SmartRetailX microservices platform is ready! 🎉**

_Last Updated: November 29, 2025_
