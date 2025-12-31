# 🛒 SmartRetailX

**AI-powered e-commerce platform with microservices architecture**

A modern, scalable e-commerce platform featuring AI voice assistance in Sinhala,
built with NestJS microservices, React 19, and React Native.

[![Nx](https://img.shields.io/badge/Nx-Monorepo-143055?style=flat&logo=nx)](https://nx.dev)
[![NestJS](https://img.shields.io/badge/NestJS-Microservices-E0234E?style=flat&logo=nestjs)](https://nestjs.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Message%20Queue-FF6600?style=flat&logo=rabbitmq)](https://www.rabbitmq.com)

---

## 📋 Table of Contents

1. [Key Features](#-key-features)
2. [Architecture](#-architecture)
3. [Prerequisites](#-prerequisites)
4. [Quick Start](#-quick-start)
5. [Environment Configuration](#-environment-configuration)
6. [Database Setup](#-database-setup)
7. [RabbitMQ Setup](#-rabbitmq-setup)
8. [Project Structure](#-project-structure)
9. [All Commands Reference](#-all-commands-reference)
10. [Services](#-services)
11. [Mobile App Setup](#-mobile-app-setup)
12. [Testing](#-testing)
13. [Troubleshooting](#-troubleshooting)
14. [Production Deployment](#-production-deployment)
15. [Technology Stack](#-technology-stack)
16. [Roadmap](#-roadmap)

---

## 🎯 Key Features

- 🤖 **AI Voice Assistant** - Sinhala language support with SinLlama (planned)
- 🔐 **Secure Authentication** - Better Auth with session management & HTTP-only cookies
- 🐰 **Event-Driven Architecture** - RabbitMQ message queue for scalability
- 🌐 **Unified API Gateway** - Single HTTP entry point with integrated authentication
- 📦 **Microservices** - Scalable, loosely-coupled architecture
- 🎨 **Modern UI** - React 19 with TailwindCSS and shadcn/ui components
- 📱 **Mobile App** - Cross-platform Expo app for iOS, Android & Web
- 🔒 **Type-Safe** - Full TypeScript with environment validation using Zod

---

## 🏗️ Architecture

```
┌──────────────┐         ┌──────────────┐
│   Web Client │         │  Mobile App  │
│   React 19   │         │   Expo/RN    │
│  Port 5173   │         │ iOS/Android  │
└──────┬───────┘         └──────┬───────┘
       │                        │
       └────────┬───────────────┘
                │ HTTP
                ▼
    ┌───────────────────────┐
    │    API Gateway        │  Port 3000
    │  ┌─────────────────┐  │
    │  │ Better Auth     │  │  Integrated authentication
    │  │ (Session-based) │  │
    │  └─────────────────┘  │
    │  ┌─────────────────┐  │
    │  │ REST Endpoints  │  │  /api/auth/*, /api/assistant/*
    │  └─────────────────┘  │
    │  ┌─────────────────┐  │
    │  │ RabbitMQ Client │  │  Event publisher
    │  └─────────────────┘  │
    └───────────┬───────────┘
                │
                │ AMQP (RabbitMQ)
                ▼
          ┌──────────┐
          │ RabbitMQ │
          │  Broker  │
          └────┬─────┘
               │
               ▼
       ┌───────────────┐
       │  Assistant    │
       │   Service     │
       │  (Voice AI)   │
       └───────────────┘

┌────────────────────────┐
│   PostgreSQL Database  │
│  - Users               │
│  - Sessions            │
│  - Accounts            │
└────────────────────────┘
```

**Architecture Highlights:**

- **Single API Gateway** - Unified HTTP entry point on port 3000
- **Integrated Authentication** - Better Auth runs directly in API Gateway
- **Hybrid Communication** - HTTP for clients, RabbitMQ for microservices
- **Session-Based Auth** - Secure HTTP-only cookies, no JWT tokens exposed
- **Event-Driven** - Services communicate asynchronously via message queue
- **Independently Scalable** - Each service can scale based on load

---

## ✅ Prerequisites

### Required Software

| Software       | Version | Purpose             | Download                              |
| -------------- | ------- | ------------------- | ------------------------------------- |
| **Node.js**    | v18+    | Runtime environment | [nodejs.org](https://nodejs.org/)     |
| **pnpm**       | Latest  | Package manager     | `npm install -g pnpm`                 |
| **PostgreSQL** | 14+     | Database            | [neon.tech](https://neon.tech) (free) |
| **RabbitMQ**   | 3.x     | Message queue       | [Docker](#-rabbitmq-setup)            |
| **Git**        | Latest  | Version control     | [git-scm.com](https://git-scm.com/)   |

### Optional

- **Docker** - For RabbitMQ (recommended)
- **Expo Go App** - For mobile testing ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
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

### 3. Start RabbitMQ

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

**Management UI:** http://localhost:15672 (username: `guest`, password: `guest`)

### 4. Setup Database

**Option A: Neon (Free, Recommended)**

1. Go to [neon.tech](https://neon.tech)
2. Create account and new project
3. Copy connection string

**Option B: Supabase**

1. Go to [supabase.com](https://supabase.com)
2. Create project
3. Copy pooler connection string

**Option C: Local PostgreSQL**

```bash
createdb smartretailx
# Connection: postgresql://user:password@localhost:5432/smartretailx
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
JWT_SECRET=change-me-to-a-secure-secret-minimum-32-characters-long
JWT_REFRESH_SECRET=change-me-to-another-secure-secret-minimum-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# CORS Configuration
# ============================================
CORS_ORIGIN=http://localhost:5173,*

# ============================================
# RabbitMQ Message Queue
# ============================================
RABBITMQ_URI=amqp://guest:guest@localhost:5672

# ============================================
# Assistant Service
# ============================================
ASSISTANT_SERVICE_QUEUE=assistant_queue

# ============================================
# Logging
# ============================================
LOG_LEVEL=info
```

### 6. Run Database Migrations

```bash
psql "$DATABASE_URL" -f apps/api-gateway/migrations/001_init_better_auth.sql
```

### 7. Start Services

```bash
# Start all backend services
pnpm dev:backend

# Or start everything (backend + web client)
pnpm dev:all
```

### 8. Access Application

| Service      | URL                              |
| ------------ | -------------------------------- |
| Web Client   | http://localhost:5173            |
| API Gateway  | http://localhost:3000/api        |
| Health Check | http://localhost:3000/api/health |
| RabbitMQ UI  | http://localhost:15672           |

---

## 🔧 Environment Configuration

### Required Variables

| Variable             | Description                              | Example                                          |
| -------------------- | ---------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`       | PostgreSQL connection string             | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET`         | Secret for signing JWT (min 32 chars)    | `your-super-secret-jwt-key-at-least-32-chars`    |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (min 32 chars) | `your-refresh-secret-key-at-least-32-chars`      |
| `RABBITMQ_URI`       | RabbitMQ connection URI                  | `amqp://guest:guest@localhost:5672`              |

### Optional Variables (with defaults)

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

1. **`user`** - User accounts (id, email, name, emailVerified, image, createdAt, updatedAt)
2. **`session`** - Active sessions (id, userId, expiresAt, token, ipAddress, userAgent)
3. **`account`** - OAuth accounts (id, userId, accountId, providerId, accessToken, refreshToken)
4. **`verification`** - Email verification & password reset (id, identifier, value, expiresAt)

### Running Migrations

```bash
# Using psql
psql "$DATABASE_URL" -f apps/api-gateway/migrations/001_init_better_auth.sql

# Or use your database provider's SQL editor
```

### Verify Setup

```bash
# List all tables
psql "$DATABASE_URL" -c "\dt"

# Check user table structure
psql "$DATABASE_URL" -c "\d user"
```

### Database Connection String Formats

**Neon:**

```
postgresql://username:password@ep-cool-name.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Supabase:**

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

**Local:**

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
**Credentials:** username: `guest`, password: `guest`

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

---

## 📁 Project Structure

```
smart-retail-x/
├── apps/
│   ├── api-gateway/              # Unified API Gateway (Port 3000)
│   │   ├── migrations/           # Database migrations
│   │   └── src/
│   │       ├── app/              # App module & controllers
│   │       ├── auth/             # Authentication module (Better Auth)
│   │       ├── config/           # Type-safe configuration with Zod
│   │       ├── lib/              # Better Auth instance setup
│   │       └── main.ts           # HTTP + RabbitMQ hybrid server
│   │
│   ├── api-gateway-e2e/          # API Gateway E2E tests
│   │
│   ├── assistant-service/        # Voice AI Service (RabbitMQ only)
│   │   └── src/
│   │       ├── app/              # Message handlers
│   │       └── main.ts           # Pure microservice (no HTTP)
│   │
│   ├── assistant-service-e2e/    # Assistant Service E2E tests
│   │
│   ├── client/                   # React Web App (Port 5173)
│   │   └── src/
│   │       ├── lib/              # Auth client, utilities
│   │       ├── components/       # UI components (shadcn/ui)
│   │       ├── providers/        # Auth provider
│   │       └── routes/           # Page components
│   │
│   ├── mobile-app/               # Mobile App (Expo/React Native)
│   │   ├── src/
│   │   │   ├── lib/              # Auth client, env config
│   │   │   └── screens/          # Screen components
│   │   ├── app.json              # Expo configuration
│   │   └── eas.json              # EAS Build config
│   │
│   └── mobile-app-e2e/           # Mobile App E2E tests (Detox)
│
├── libs/
│   └── shared-types/             # Shared TypeScript types
│
├── .env                          # Environment variables (root)
├── nx.json                       # Nx workspace configuration
├── package.json                  # Root package.json
└── tsconfig.base.json            # Base TypeScript config
```

---

## 📜 All Commands Reference

### Root Package Scripts

```bash
# Development
pnpm dev:frontend       # Start web client only
pnpm dev:backend        # Start api-gateway + assistant-service
pnpm dev:all            # Start all services + web client

# Mobile App
pnpm mobile:start       # Start Expo dev server
pnpm mobile:android     # Start with Android
pnpm mobile:ios         # Start with iOS (macOS only)
pnpm mobile:web         # Start in browser
pnpm mobile:test        # Run mobile tests
pnpm mobile:lint        # Lint mobile app
pnpm mobile:export      # Export mobile app

# Code Quality
pnpm lint               # Lint all projects
pnpm lint:fix           # Lint and fix all projects
pnpm format             # Format all files with Prettier
pnpm format:check       # Check formatting
```

### Nx Commands - All Projects

```bash
# Show all projects
nx show projects

# View project graph (interactive visualization)
nx graph

# Reset Nx cache
nx reset

# Run target for all projects
nx run-many -t <target>
nx run-many -t lint
nx run-many -t build
nx run-many -t test

# Run affected projects only (based on git changes)
nx affected -t lint
nx affected -t build
nx affected -t test
```

### API Gateway Commands

```bash
# Development
nx serve api-gateway                              # Start in dev mode
nx serve api-gateway --configuration=production   # Start in prod mode

# Build
nx build api-gateway                              # Production build
nx build api-gateway --configuration=development  # Dev build

# Code Quality
nx lint api-gateway                               # Run ESLint
nx lint api-gateway --fix                         # Lint and fix

# Deployment
nx prune api-gateway                              # Prune lockfile for deployment
nx prune-lockfile api-gateway                     # Generate pruned package.json
nx copy-workspace-modules api-gateway             # Copy workspace modules
```

### Assistant Service Commands

```bash
# Development
nx serve assistant-service                        # Start in dev mode

# Build
nx build assistant-service                        # Production build

# Code Quality
nx lint assistant-service                         # Run ESLint
nx lint assistant-service --fix                   # Lint and fix

# Deployment
nx prune assistant-service                        # Prune for deployment
```

### Client (Web) Commands

```bash
# Development
nx serve client                                   # Start dev server (port 5173)
nx preview client                                 # Preview production build

# Build
nx build client                                   # Production build

# Code Quality
nx lint client                                    # Run ESLint
nx lint:fix client                                # Lint and fix
nx typecheck client                               # TypeScript type checking
nx format client                                  # Format with Prettier
nx format:check client                            # Check formatting
nx check client                                   # Run all checks (typecheck + lint + format)
```

### Mobile App Commands

```bash
# Development
nx start mobile-app                               # Start Expo dev server
nx serve mobile-app                               # Alternative serve command
nx run-ios mobile-app                             # Run on iOS simulator
nx run-android mobile-app                         # Run on Android emulator

# Build
nx build mobile-app                               # EAS build
nx export mobile-app                              # Export for web/static
nx prebuild mobile-app                            # Generate native projects

# Testing
nx test mobile-app                                # Run Jest tests
nx lint mobile-app                                # Run ESLint

# Other
nx install mobile-app                             # Install Expo dependencies
nx submit mobile-app                              # Submit to app stores
```

### Shared Types Library Commands

```bash
# Build
nx build shared-types                             # Build the library

# Code Quality
nx lint shared-types                              # Run ESLint
```

### E2E Testing Commands

```bash
# API Gateway E2E
nx e2e api-gateway-e2e                            # Run E2E tests
nx lint api-gateway-e2e                           # Lint E2E tests

# Assistant Service E2E
nx e2e assistant-service-e2e                      # Run E2E tests
nx lint assistant-service-e2e                     # Lint E2E tests

# Mobile App E2E (Detox)
nx build mobile-app-e2e                           # Build for E2E
nx test mobile-app-e2e                            # Run Detox tests
nx start mobile-app-e2e                           # Start Detox server
nx lint mobile-app-e2e                            # Lint E2E tests
```

### Utility Commands

```bash
# Kill processes on ports
lsof -ti:3000,5173 | xargs kill -9

# Check what's running on ports
lsof -i:3000
lsof -i:5173

# Clear all caches
rm -rf node_modules/.cache
nx reset
pnpm store prune

# Visualize project dependencies
nx graph

# Show project details
nx show project api-gateway
nx show project client
nx show project mobile-app
```

---

## 🛠️ Services

### API Gateway (Port 3000)

Unified HTTP entry point with integrated authentication.

**Key Endpoints:**

| Endpoint                  | Method | Description                   |
| ------------------------- | ------ | ----------------------------- |
| `/api/health`             | GET    | Health check for all services |
| `/api/auth/sign-up/email` | POST   | User registration             |
| `/api/auth/sign-in/email` | POST   | Email/password login          |
| `/api/auth/sign-out`      | POST   | Logout                        |
| `/api/auth/session`       | GET    | Get current session           |
| `/api/assistant/query`    | POST   | Send voice query to AI        |

**Technology:** NestJS, Better Auth, PostgreSQL, RabbitMQ client, Zod validation

### Assistant Service (RabbitMQ only)

AI voice assistant for Sinhala e-commerce queries.

**Technology:** Pure RabbitMQ microservice, SinLlama (planned)

### Web Client (Port 5173)

React 19 web application with TanStack Router and shadcn/ui.

**Technology:** React 19, TailwindCSS, shadcn/ui, TanStack Router, Rsbuild

### Mobile App (Expo)

Cross-platform mobile app for iOS, Android & Web.

**Technology:** React Native, Expo, Gluestack UI

---

## 📱 Mobile App Setup

### Backend Configuration for Mobile

Update root `.env`:

```env
API_GATEWAY_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173,*
```

### Mobile App Configuration

Create `apps/mobile-app/.env`:

```env
# For iOS Simulator:     http://localhost:3000
# For Android Emulator:  http://10.0.2.2:3000
# For Physical Device:   http://YOUR_MACHINE_IP:3000

EXPO_PUBLIC_API_URL=http://192.168.8.8:3000
```

### Finding Your Machine's IP

```bash
# Linux/macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr IPv4
```

### Platform-Specific URLs

| Platform             | URL Format              | Example                   |
| -------------------- | ----------------------- | ------------------------- |
| **iOS Simulator**    | `http://localhost:3000` | Works as-is               |
| **Android Emulator** | `http://10.0.2.2:3000`  | Android's localhost alias |
| **Physical Device**  | `http://YOUR_IP:3000`   | Your computer's local IP  |

### Running Mobile App

```bash
# Start Expo dev server
pnpm mobile:start

# Or with nx
nx start mobile-app
```

Scan QR code with Expo Go app on your device.

---

## 🧪 Testing

### Health Checks

```bash
curl http://localhost:3000/api/health
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
curl -X POST http://localhost:3000/api/assistant/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "මම ජුත්තු එකක් ගන්න අවශ්‍යයි",
    "language": "si"
  }'
```

### Database Verification

```bash
# Check users
psql "$DATABASE_URL" -c 'SELECT id, name, email FROM "user";'

# Check sessions
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM session;'
```

---

## 🐛 Troubleshooting

### Mobile: "Network request failed"

1. Set `API_GATEWAY_HOST=0.0.0.0` in root `.env`
2. Set `CORS_ORIGIN=http://localhost:5173,*` in root `.env`
3. Restart API Gateway
4. Use correct IP in mobile `.env`
5. Check firewall allows port 3000

### Port Already in Use

```bash
lsof -ti:3000,5173 | xargs kill -9
```

### RabbitMQ Connection Failed

```bash
docker ps | grep rabbitmq      # Check if running
docker restart rabbitmq        # Restart
docker logs rabbitmq           # View logs
```

### Database Connection Error

```bash
psql "$DATABASE_URL" -c "SELECT 1;"  # Test connection
```

Ensure URL includes `?sslmode=require` for hosted databases.

### "Table does not exist"

```bash
# Run migrations
psql "$DATABASE_URL" -f apps/api-gateway/migrations/001_init_better_auth.sql

# Verify tables
psql "$DATABASE_URL" -c "\dt"
```

### Module Not Found

```bash
rm -rf node_modules
pnpm install
nx reset
```

### CORS Errors

1. Check `CORS_ORIGIN` in `.env`
2. Restart API Gateway after changing `.env`
3. For mobile, ensure `CORS_ORIGIN` includes `*`

### Expo App Not Loading

```bash
cd apps/mobile-app
rm -rf node_modules .expo
pnpm install
npx expo start --clear
```

---

## 🚀 Production Deployment

### Environment Variables

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
RABBITMQ_URI=amqp://...
JWT_SECRET=production-secret-minimum-32-characters
JWT_REFRESH_SECRET=production-refresh-secret-minimum-32-chars
CORS_ORIGIN=https://yourdomain.com
API_GATEWAY_HOST=0.0.0.0
BASE_URL=https://api.yourdomain.com
```

### Security Checklist

- [ ] Change all JWT secrets to strong random values
- [ ] Use hosted PostgreSQL with SSL
- [ ] Use hosted RabbitMQ with authentication
- [ ] Set CORS_ORIGIN to specific domain (not \*)
- [ ] Enable HTTPS/TLS
- [ ] Set up rate limiting
- [ ] Configure firewall rules
- [ ] Enable database backups
- [ ] Set up monitoring and logging

---

## 🔧 Technology Stack

### Backend

- **NestJS** - Backend framework
- **Better Auth** - Authentication & sessions
- **PostgreSQL** - User data & sessions
- **RabbitMQ** - Message queue
- **Zod** - Environment validation
- **TypeScript** - Type safety

### Frontend

- **React 19** - Web UI framework
- **React Native + Expo** - Mobile framework
- **TanStack Router** - Web routing
- **TailwindCSS** - Styling
- **shadcn/ui** - UI components
- **Rsbuild** - Web bundler

### DevOps

- **Nx** - Monorepo management
- **pnpm** - Package manager
- **Docker** - RabbitMQ containerization

---

## 🗺️ Roadmap

### ✅ Completed

- [x] Authentication with Better Auth
- [x] Unified API Gateway architecture
- [x] RabbitMQ message queue
- [x] Mobile app (iOS, Android, Web)
- [x] Type-safe environment config

### 🚧 In Progress

- [ ] SinLlama AI model integration
- [ ] Voice assistant implementation
- [ ] Speech-to-text/text-to-speech

### 📋 Planned

- [ ] Product catalog microservice
- [ ] Order management microservice
- [ ] Payment gateway integration
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] Monitoring (Prometheus, Grafana)

---

## ✅ Setup Checklist

- [ ] Node.js v18+ installed
- [ ] pnpm installed
- [ ] RabbitMQ running (Docker or hosted)
- [ ] PostgreSQL database created
- [ ] Root `.env` file configured
- [ ] Strong JWT secrets generated (32+ chars)
- [ ] Database migrations executed
- [ ] All backend services start without errors
- [ ] Health check passes
- [ ] Web client accessible at http://localhost:5173
- [ ] Can sign up and sign in successfully

---

## 📚 Additional Resources

- **[Better Auth Docs](https://www.better-auth.com/docs)** - Authentication library
- **[NestJS Microservices](https://docs.nestjs.com/microservices/basics)** - Microservices guide
- **[RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)** - Message queue basics
- **[Expo Docs](https://docs.expo.dev/)** - Mobile development
- **[Nx Docs](https://nx.dev)** - Monorepo tooling

---

## 📄 License

MIT License

---

**Built with ❤️ by the SmartRetailX Team**
