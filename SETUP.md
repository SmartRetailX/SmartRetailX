# 🚀 SmartRetailX - Setup Guide

Complete setup guide for SmartRetailX with RabbitMQ microservices architecture.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Service Configuration](#service-configuration)
4. [Database Setup](#database-setup)
5. [RabbitMQ Setup](#rabbitmq-setup)
6. [Running Services](#running-services)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### Required Software

- **Node.js** v18 or higher → [Download](https://nodejs.org/)
- **pnpm** → Install: `npm install -g pnpm`
- **PostgreSQL Database** → [Neon](https://neon.tech) (recommended),
  [Supabase](https://supabase.com), or [Railway](https://railway.app)
- **RabbitMQ** → Docker (recommended) or hosted service

### Check Installation

```bash
node --version   # Should show v18.x or higher
pnpm --version   # Should show 9.x or higher
docker --version # For RabbitMQ
```

---

## ⚡ Quick Start

### 1. Clone and Install

```bash
cd smart-retail-x
pnpm install
```

### 2. Start RabbitMQ

```bash
# Using Docker (recommended)
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management

# Verify it's running
docker ps | grep rabbitmq
```

**RabbitMQ Management UI:** http://localhost:15672 (guest/guest)

### 3. Setup PostgreSQL Database

**Option A: Neon (Free, recommended)**

1. Go to [neon.tech](https://neon.tech)
2. Create account and project
3. Copy connection string

**Option B: Supabase**

1. Go to [supabase.com](https://supabase.com)
2. Create project
3. Copy pooler connection string

### 4. Create Environment File

Create `.env` in project root:

```env
# RabbitMQ
RABBITMQ_URI=amqp://guest:guest@localhost:5672

# PostgreSQL Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production

# CORS
CORS_ORIGIN=http://localhost:5173
```

**For Neon database, your URL looks like:**

```env
DATABASE_URL=postgresql://username:password@ep-cool-name.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 5. Run Database Migrations

```bash
# Using psql
psql "$DATABASE_URL" -f apps/auth-service/migrations/001_init_better_auth.sql

# Or copy SQL and paste in your database provider's SQL editor
# File: apps/auth-service/migrations/001_init_better_auth.sql
```

**Verify tables:**

```bash
psql "$DATABASE_URL" -c "\dt"
```

Expected: `user`, `session`, `account`, `verification` tables

### 6. Start All Services

```bash
# Start all backend services
pnpm dev:backend

# Or start everything (backend + frontend)
pnpm dev:all
```

### 7. Access the Application

**Services:**

- **Client:** http://localhost:5173
- **API Gateway:** http://localhost:3000/api
- **Auth Service:** http://localhost:3001/api
- **RabbitMQ UI:** http://localhost:15672

---

## 🔧 Service Configuration

### API Gateway (Port 3000)

**Purpose:** Central HTTP entry point for all client requests

**Environment:** Uses root `.env` file

**Key Config:**

- Proxies `/api/auth/*` to auth-service (HTTP)
- Connects to assistant-service via RabbitMQ
- Handles CORS for client

### Auth Service (Port 3001)

**Purpose:** User authentication and session management

**Environment:** Uses root `.env` file

**Key Config:**

- Runs HTTP server on port 3001 for Better Auth
- Connects to PostgreSQL for user data
- Also listens on RabbitMQ queue: `auth_queue`

**Edit:** `apps/auth-service/src/config/config.service.ts` for custom defaults

### Assistant Service (RabbitMQ only)

**Purpose:** AI voice assistant for Sinhala e-commerce

**Environment:** Uses root `.env` file

**Key Config:**

- Pure RabbitMQ microservice (no HTTP)
- Queue: `assistant_queue`
- Processes: voice queries, speech-to-text, text-to-speech

---

## 🗄️ Database Setup

### Create Database

Most hosted providers auto-create a database. If you need to create one
manually:

```bash
# Connect to PostgreSQL
psql "YOUR_DATABASE_URL"

# Create database
CREATE DATABASE smartretailx;
```

### Run Migrations

```bash
# From project root
psql "$DATABASE_URL" -f apps/auth-service/migrations/001_init_better_auth.sql
```

### Database Schema

The migration creates:

1. **`user` table** - User accounts
   - id, email, name, emailVerified, image, createdAt, updatedAt

2. **`session` table** - Active sessions
   - id, userId, expiresAt, token, ipAddress, userAgent

3. **`account` table** - OAuth accounts (future)
   - id, userId, accountId, providerId, accessToken, refreshToken

4. **`verification` table** - Email verification & password reset
   - id, identifier, value, expiresAt

### Verify Setup

```bash
# List all tables
psql "$DATABASE_URL" -c "\dt"

# Check user table structure
psql "$DATABASE_URL" -c "\d user"

# Count users (should be 0 initially)
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"user\";"
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
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin123 \
  rabbitmq:3-management

# Check logs
docker logs rabbitmq

# Stop
docker stop rabbitmq

# Start again
docker start rabbitmq
```

### Using Hosted RabbitMQ

**CloudAMQP (Free tier):**

1. Go to [cloudamqp.com](https://www.cloudamqp.com/)
2. Create account
3. Create instance
4. Copy AMQP URL

Update `.env`:

```env
RABBITMQ_URI=amqps://user:password@host/vhost
```

### Verify RabbitMQ

**Management UI:** http://localhost:15672

**Login:** guest/guest (or your custom credentials)

**Check:**

- Connections: Should see services connecting
- Queues: `assistant_queue`, `auth_queue`
- Messages: Monitor message flow

**CLI Check:**

```bash
# Test connection
docker exec rabbitmq rabbitmqctl status

# List queues
docker exec rabbitmq rabbitmqctl list_queues
```

---

## ▶️ Running Services

### Start All Services Together

```bash
# Backend only (3 services)
pnpm dev:backend

# Everything (backend + client)
pnpm dev:all
```

### Start Services Individually

```bash
# Terminal 1 - API Gateway
nx serve api-gateway

# Terminal 2 - Auth Service
nx serve auth-service

# Terminal 3 - Assistant Service
nx serve assistant-service

# Terminal 4 - Client (optional)
nx serve client
```

### Service Startup Order

**Best practice:**

1. Start RabbitMQ first
2. Start backend microservices (any order)
3. Start API Gateway
4. Start Client

### Verify Services Started

```bash
# Check ports
lsof -i:3000  # API Gateway
lsof -i:3001  # Auth Service
lsof -i:5173  # Client

# Check RabbitMQ connections
# Visit: http://localhost:15672 → Connections tab
```

### Stop Services

```bash
# Ctrl+C in each terminal

# Or force kill
lsof -ti:3000,3001,5173 | xargs kill -9
```

---

## 🧪 Testing

### Health Checks

```bash
# Check all services
curl http://localhost:3000/api/health

# Expected response:
# {
#   "gateway": { "status": "healthy", ... },
#   "services": {
#     "assistant": { "status": "healthy", ... }
#   }
# }

# Check assistant service only
curl http://localhost:3000/api/assistant/health
```

### Authentication Testing

**Sign Up:**

```bash
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"password123",
    "name":"Test User"
  }'
```

**Sign In:**

```bash
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email":"test@example.com",
    "password":"password123"
  }'
```

**Get Session:**

```bash
curl -b cookies.txt http://localhost:3000/api/auth/session
```

### Voice Assistant Testing

**Send Voice Query:**

```bash
curl -X POST http://localhost:3000/api/assistant/query \
  -H "Content-Type: application/json" \
  -d '{
    "query":"මම ජුත්තු එකක් ගන්න අවශ්යයි",
    "language":"si"
  }'
```

**Get Capabilities:**

```bash
curl http://localhost:3000/api/assistant/capabilities
```

### Browser Testing

1. **Open:** http://localhost:5173
2. **Sign Up:** Create account
3. **Login:** Test credentials
4. **Session:** Refresh page, should stay logged in
5. **Logout:** Test logout functionality

### Database Verification

```bash
# Check users
psql "$DATABASE_URL" -c 'SELECT id, name, email FROM "user";'

# Check sessions
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM session;'
```

### RabbitMQ Verification

**Check Queues:**

1. Open http://localhost:15672
2. Go to **Queues** tab
3. Verify queues exist:
   - `assistant_queue`
   - `auth_queue`

**Send Test Message:**

```bash
# Install rabbitmqadmin
wget http://localhost:15672/cli/rabbitmqadmin
chmod +x rabbitmqadmin

# Send message
./rabbitmqadmin publish \
  routing_key=assistant_queue \
  payload='{"pattern":{"cmd":"health"},"data":{}}'
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

**Solutions:**

1. Check queue name matches in both producer and consumer
2. Verify RabbitMQ connection in service logs
3. Check RabbitMQ UI for queue stats

### Database Issues

**Problem:** "Cannot connect to database"

**Solutions:**

```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Check SSL requirement
# Ensure: ?sslmode=require in connection string

# URL encode special characters in password
# @ → %40, ! → %21, # → %23
```

**Problem:** "Table does not exist"

**Solutions:**

```bash
# Run migrations
psql "$DATABASE_URL" -f apps/auth-service/migrations/001_init_better_auth.sql

# Verify tables
psql "$DATABASE_URL" -c "\dt"
```

### Port Conflicts

**Problem:** "Port already in use"

**Solutions:**

```bash
# Find process
lsof -ti:3000

# Kill process
lsof -ti:3000 | xargs kill -9

# Or change port in code
# Edit apps/api-gateway/src/main.ts: const port = 3001;
```

### CORS Errors

**Problem:** "Blocked by CORS policy"

**Solutions:**

1. Check `CORS_ORIGIN=http://localhost:5173` in `.env`
2. Restart API Gateway after changing .env
3. Verify client is running on port 5173

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
npx nx build auth-service
npx nx build assistant-service
```

### Service Not Starting

**Check:**

```bash
# View logs
nx serve api-gateway --verbose
nx serve auth-service --verbose
nx serve assistant-service --verbose

# Check environment
cat .env

# Verify dependencies
pnpm install
```

---

## 📚 Additional Resources

- **[README.md](./README.md)** - Project overview
- **[ASSISTANT_SERVICE.md](./ASSISTANT_SERVICE.md)** - Voice AI documentation
- **[Better Auth](https://www.better-auth.com/docs)** - Authentication docs
- **[NestJS Microservices](https://docs.nestjs.com/microservices/basics)** -
  Microservices guide
- **[RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)** - Message
  queue basics

---

## ✅ Setup Checklist

- [ ] Node.js v18+ installed
- [ ] pnpm installed
- [ ] RabbitMQ running (Docker or hosted)
- [ ] PostgreSQL database created
- [ ] `.env` file created and configured
- [ ] Database migrations executed
- [ ] 4 tables verified in database
- [ ] RabbitMQ queues created
- [ ] All services start without errors
- [ ] Health check passes
- [ ] Can sign up successfully
- [ ] Can sign in successfully
- [ ] Session persists on refresh
- [ ] Voice query works

---

**Congratulations! Your SmartRetailX microservices platform is ready! 🎉**

For issues, check the [Troubleshooting](#troubleshooting) section or open an
issue on GitHub.
