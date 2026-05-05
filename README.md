# 🛒 SmartRetailX

**AI-powered e-commerce platform with microservices architecture**

A modern, scalable e-commerce platform featuring AI voice assistance in Sinhala,
built with NestJS microservices, React 18, and React Native.

[![Nx](https://img.shields.io/badge/Nx-Monorepo-143055?style=flat&logo=nx)](https://nx.dev)
[![NestJS](https://img.shields.io/badge/NestJS-Microservices-E0234E?style=flat&logo=nestjs)](https://nestjs.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
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
11. [Personalized Promotion Engine](#-personalized-promotion-engine)
12. [Mobile App Setup](#-mobile-app-setup)
13. [Testing](#-testing)
14. [Troubleshooting](#-troubleshooting)
15. [Production Deployment](#-production-deployment)
16. [Technology Stack](#-technology-stack)
17. [Roadmap](#-roadmap)

---

## 🎯 Key Features

- 🤖 **AI Voice Assistant** - Sinhala language support with SinLlama (planned)
- 🎯 **Personalized Promotion Engine** - AI-powered targeted marketing with ML-based customer predictions
- 🔐 **Secure Authentication** - Better Auth with session management & HTTP-only cookies
- 🐰 **Event-Driven Architecture** - RabbitMQ message queue for scalability
- 🌐 **Unified API Gateway** - Single HTTP entry point with integrated authentication
- 📦 **Microservices** - Scalable, loosely-coupled architecture
- 🎨 **Modern UI** - React 18 with TailwindCSS and shadcn/ui components
- 📱 **Mobile App** - Cross-platform Expo app for iOS, Android & Web
- 🔒 **Type-Safe** - Full TypeScript with environment validation using Zod

---

## 🏗️ Architecture

```
┌──────────────┐         ┌──────────────┐
│   Web Client │         │  Mobile App  │
│   React 18   │         │   Expo/RN    │
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
       ┌───────────────┐       ┌──────────────────────┐
       │  Assistant    │       │  Promotion Engine    │
       │   Service     │       │  ML Service          │
       │  (Voice AI)   │       │  (Python/FastAPI)    │
       └───────────────┘       └──────────────────────┘

┌────────────────────────┐
│   PostgreSQL Database  │
│  - Users               │
│  - Sessions            │
│  - Accounts            │
│  - Customers           │
│  - Products            │
│  - Transactions        │
│  - Promotions          │
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
# Authentication (Better Auth)
# ============================================
BETTER_AUTH_SECRET=change-me-to-a-secure-secret-minimum-32-characters-long
BETTER_AUTH_URL=http://localhost:3000

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

### Remote Container Development

This repo includes a VS Code-compatible devcontainer in `.devcontainer/`.
Opening the project in a remote container gives you Node.js, pnpm, Python,
PostgreSQL, RabbitMQ, Docker CLI access, and the ports used by the services.

```bash
# Runs automatically when the devcontainer is created:
pnpm install --frozen-lockfile
pnpm exec prisma generate --schema libs/database/prisma/schema.prisma
```

The devcontainer starts PostgreSQL and RabbitMQ as sidecar containers. Run app
services from the workspace container:

```bash
pnpm dev:backend
pnpm dev:frontend
pnpm biml:serve
pnpm dev:ml
```

### Access From Windows + Mobile (Same Network)

When the dev container runs on a cloud/remote host, `localhost:5173` works only
on the machine where the port is forwarded. For cross-device access:

1. Open the app from both devices using the same reachable host:
`http://<SERVER_IP_OR_DNS>:5173`
2. Open the API from that same host:
`http://<SERVER_IP_OR_DNS>:3000`
3. Keep `API_GATEWAY_HOST=0.0.0.0` in backend env.
4. Keep `CORS_ORIGIN` broad enough for your real frontend origin(s), for example:
`CORS_ORIGIN=http://localhost:5173,http://<SERVER_IP_OR_DNS>:5173,*`
5. Leave `PUBLIC_BASE_URL` empty to auto-resolve API base URL from the active
browser host.

If you must keep using a local forwarded URL on Windows (`http://localhost:5173`)
and want mobile access through your Windows LAN IP, create local port forwarding
on Windows from `0.0.0.0:5173 -> 127.0.0.1:5173` and `0.0.0.0:3000 -> 127.0.0.1:3000`.

---

## 🔧 Environment Configuration

### Required Variables

| Variable             | Description                                  | Example                                          |
| -------------------- | -------------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`       | PostgreSQL connection string                 | `postgresql://user:pass@host/db?sslmode=require` |
| `BETTER_AUTH_SECRET` | Better Auth session secret (min 32 chars)    | `your-super-secret-key-at-least-32-chars`        |
| `RABBITMQ_URI`       | RabbitMQ connection URI                      | `amqp://guest:guest@localhost:5672`              |

### Optional Variables (with defaults)

| Variable                  | Default                 | Description                                 |
| ------------------------- | ----------------------- | ------------------------------------------- |
| `NODE_ENV`                | `development`           | Environment mode                            |
| `API_GATEWAY_PORT`        | `3000`                  | API Gateway port                            |
| `API_GATEWAY_HOST`        | `localhost`             | API Gateway host (use `0.0.0.0` for mobile) |
| `CORS_ORIGIN`             | `http://localhost:5173` | Allowed CORS origins                        |
| `DATABASE_POOL_MIN`       | `2`                     | Min database connections                    |
| `DATABASE_POOL_MAX`       | `10`                    | Max database connections                    |
| `LOG_LEVEL`               | `info`                  | Logging level                               |
| `CORE_SERVICE_QUEUE`      | `core_queue`            | Core service RabbitMQ queue                 |
| `BI_DASHBOARD_SERVICE_QUEUE` | `bi_dashboard_queue` | BI dashboard RabbitMQ queue                 |
| `WEBSOCKET_SERVICE_QUEUE` | `websocket_queue`       | WebSocket service RabbitMQ queue            |

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
├── .devcontainer/               # Remote container development workspace
├── docker/                      # Reusable production Dockerfiles and Nginx config
├── apps/
│   ├── api-gateway/              # Unified API Gateway (Port 3000)
│   │   ├── migrations/           # Database migrations
│   │   └── src/
│   │       ├── app/              # App module & controllers
│   │       ├── auth/             # Authentication module (Better Auth)
│   │       ├── lib/              # Better Auth instance setup
│   │       └── main.ts           # HTTP API server
│   │
│   ├── agent-service/            # FastAPI voice agent (HTTP + TCP)
│   ├── bi-dashboard-services-gateway/     # BI NestJS gateway (HTTP + RabbitMQ)
│   ├── bi-dashboard-ml-service/           # Forecasting/XAI FastAPI service
│   ├── core-service/             # Catalog, cart, and order RabbitMQ service
│   ├── personalized-promotion-engine-ml-service/  # Promotion ML FastAPI service
│   ├── segmentation-service/     # Customer segmentation FastAPI service
│   ├── web/                      # React web app (Port 5173)
│   └── websocket-service/        # Socket.IO + RabbitMQ bridge
│
├── libs/
│   ├── config/                   # Shared NestJS environment validation
│   ├── database/                 # Shared Prisma client/module
│   ├── messaging/                # RabbitMQ helpers
│   └── shared-types/             # Shared TypeScript contracts
│
├── .env                          # Environment variables (root)
├── .env.production.example       # Production compose environment template
├── docker-compose.prod.yml       # Production deployment compose file
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
pnpm dev:backend        # Start API, core, BI, websocket, and agent services
pnpm dev:all            # Start all services + web client
pnpm biml:serve         # Start BI dashboard ML service
pnpm dev:ml             # Start personalized promotion engine

# Production Docker
pnpm docker:prod:config # Validate production compose config
pnpm docker:prod:build  # Build production images
pnpm docker:prod:up     # Start production stack
pnpm docker:prod:down   # Stop production stack

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

### Agent Service Commands

```bash
# Development
nx run agent-service:install                      # Create venv and install deps
nx serve agent-service                            # Start FastAPI HTTP + TCP service
```

### Web Commands

```bash
# Development
nx run web:dev                                    # Start dev server (port 5173)
nx run web:preview                                # Preview production build

# Build
nx build web                                      # Production build

# Code Quality
nx lint web                                       # Run ESLint
nx run web:typecheck                              # TypeScript type checking
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
# BI Dashboard Services Gateway E2E
nx e2e bi-dashboard-services-gateway-e2e          # Run E2E tests
nx lint bi-dashboard-services-gateway-e2e         # Lint E2E tests
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
nx show project web
nx show project core-service
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

### Personalized Promotion Engine ML Service

AI-powered system that predicts customer purchase behavior and generates targeted promotion campaigns.

**Key Capabilities:**
- Purchase probability prediction using Random Forest
- Collaborative filtering for product recommendations
- Dynamic discount optimization
- Promotion fatigue detection
- Cross-category recommendations
- ROI prediction and campaign optimization

**Technology:** Python, Scikit-learn, LightGBM, FastAPI, Pandas, NumPy

### Web Client (Port 5173)

React 18 web application with TanStack Router and shadcn/ui.

**Technology:** React 18, TailwindCSS, shadcn/ui, TanStack Router, Rsbuild

### Mobile App (Expo)

Cross-platform mobile app for iOS, Android & Web.

**Technology:** React Native, Expo, Gluestack UI

---

## 🎯 Personalized Promotion Engine

### Overview

An AI-powered system that revolutionizes e-commerce marketing by predicting which customers will buy specific products and generating highly targeted promotion campaigns.

### Problem & Solution

**Traditional Approach (Current supermarket systems):**

```
Bread is 15% off
→ Send SMS to ALL 10,000 customers
→ Only 500 buy bread (5% conversion)
→ Wasted: 9,500 SMS, discounts to customers who won't buy
→ High marketing cost, low ROI
```

**AI-Powered Approach (Our System):**

```
Bread is 15% off
→ AI analyzes: Who buys bread regularly?
→ Predicts top 1,000 most likely customers
→ Send targeted promotions to these 1,000
→ 400 buy bread (40% conversion vs 5%)
→ Saved: 9,000 SMS, 75% cost reduction
→ 8x better conversion rate
```

### How It Works

**Step 1: Learn Customer Patterns**

```
AI analyzes historical data:
- Customer A buys bread every week → High affinity
- Customer B never bought bread → Low priority
- Customer C bought bread when discounted → Price-sensitive
```

**Step 2: Predict Future Behavior**

```
For new bread promotion:
- Customer A: 90% purchase probability (high priority)
- Customer B: 5% purchase probability (skip)
- Customer C: 60% if discount >15% (target with 20% discount)
```

**Step 3: Optimize Campaign**

```
System decides:
- Who to target (top 1000 customers)
- Personalized discount per customer (5-25%)
- When to send (morning vs evening)
- What to bundle (bread + butter recommendations)
```

### Core ML Models

1. **Purchase Prediction (Random Forest)**
   - Predicts probability of customer buying specific product
   - Features: Purchase frequency, recency, customer segment, product affinity
   - Accuracy: ROC AUC ~0.75-0.80

2. **Collaborative Filtering (Matrix Factorization)**
   - Finds similar customers and products
   - User-based and item-based recommendations
   - Matrix factorization using SVD

3. **Promotion Optimizer**
   - Personalized discount calculation
   - Promotion fatigue detection
   - ROI prediction before sending

4. **Causal Inference (Research Novelty)**
   - Uplift modeling to measure true promotion impact
   - Identifies "persuadables" vs "sure things"
   - Calculates incremental ROI

### Dataset Specifications

| Dataset      | Size   | Details                          |
| ------------ | ------ | -------------------------------- |
| Customers    | 1,000  | Age, gender, location, segments  |
| Products     | 250    | 15 categories, realistic pricing |
| Stores       | 10     | Sri Lankan cities                |
| Promotions   | 200    | Various discounts, durations     |
| Transactions | 50,000 | 18 months of realistic purchases |

**Realistic Features:**
- ✅ Customer segments (frequent, regular, occasional, rare)
- ✅ Product affinities (bread → butter, jam)
- ✅ Seasonal patterns (December = more purchases)
- ✅ Promotion responses (price-sensitive vs not)
- ✅ Time-based patterns (weekday vs weekend)

### Performance Metrics

- **Precision@100**: ~60% (60% of targeted customers buy)
- **Recall@100**: ~45% (find 45% of potential buyers)
- **ROC AUC**: ~0.75-0.80 (good discrimination)
- **Conversion Rate**: 25% vs 10% (traditional)
- **Cost Reduction**: 75% fewer marketing messages

### Advanced Features (Research Contributions)

1. **Multi-Armed Bandit Optimization** - Real-time learning of best promotions
2. **Promotion Fatigue Detection** - Identify over-contacted customers
3. **Cross-Category Recommendations** - "Bread buyers get butter discount"
4. **Dynamic Discount Optimization** - ML-based optimal discount per customer
5. **Customer Lifetime Value** - Prioritize high-value customers
6. **Temporal Pattern Recognition** - Send at optimal time (day/hour)
7. **Explainable AI (XAI)** - Why customer received specific promotion
8. **Fairness Analysis** - Ensure no demographic discrimination

### Technology Stack

- **ML Models**: Scikit-learn, LightGBM, TensorFlow
- **Data Processing**: Pandas, NumPy, SciPy
- **Recommendation**: Surprise, Implicit
- **Data Generation**: Faker (realistic synthetic data)
- **Visualization**: Matplotlib, Seaborn, Plotly
- **API**: FastAPI
- **Deployment**: Docker (optional)

### Project Structure

```
personalized-promotion-engine-ml-service/
├── data/
│   ├── raw/                    # Generated datasets (CSV)
│   └── processed/              # ML-ready features
├── data_generation/            # Dataset creation scripts
│   ├── config.py              # Configure parameters
│   ├── generate_customers.py
│   ├── generate_products.py
│   ├── generate_transactions.py
│   └── generate_all_datasets.py  # Master script
├── data_analysis/
│   └── preprocessing.py        # Feature engineering (RFM, interactions)
├── models/
│   ├── purchase_prediction.py    # [CORE] Random Forest
│   ├── collaborative_filtering.py # CF + Matrix Factorization
│   ├── promotion_optimizer.py    # Discount optimization
│   ├── causal_inference.py       # Uplift modeling
│   └── promotion_engine.py       # Complete integration
├── evaluation/
│   ├── model_evaluation.py
│   └── results/               # Metrics, charts, reports
├── campaign_outputs/          # Generated campaigns (CSV)
├── notebooks/                 # Jupyter analysis
├── demo_campaign_generator.py # Auto demo
└── interactive_demo.py        # Interactive campaign creator
```

### Quick Start

```bash
# Navigate to the service
cd apps/personalized-promotion-engine-ml-service

# Install dependencies
pip install -r requirements.txt

# Generate synthetic datasets
python data_generation/generate_all_datasets.py

# Process data and create features
python data_analysis/preprocessing.py

# Train ML models
python models/purchase_prediction.py
python models/collaborative_filtering.py

# Generate demo campaign
python demo_campaign_generator.py

# Or use interactive mode
python interactive_demo.py
```

### Output Files

| File                            | Contains                      | Use For                    |
| ------------------------------- | ----------------------------- | -------------------------- |
| `campaign_outputs/campaign_*.csv` | Targeted customer lists       | Email/SMS campaigns        |
| `campaign_outputs/crosssell_*.csv` | Cross-sell recommendations  | Upselling strategies       |
| `evaluation/results/*.txt`      | Performance metrics           | Research papers            |
| `models/*.pkl`                  | Trained ML models             | Production deployment      |

### Research Contributions

1. **Personalized vs Broadcast** - Quantitative comparison with traditional methods
2. **Multi-Model Ensemble** - Combining multiple ML approaches
3. **Real-time Adaptation** - Online learning from responses
4. **Explainability** - Transparent AI decision-making
5. **Fairness Analysis** - Bias detection and mitigation

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

### Docker Compose

Production container configuration lives at the repo root and under `docker/`:

```bash
cp .env.production.example .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml config
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Default services:

- `web` - Nginx-served React build
- `api-gateway`, `core-service`, `bi-dashboard-services-gateway`, `websocket-service`
- `agent-service`, `bi-dashboard-ml-service`, `promotion-engine`, `segmentation-service`
- `postgres`, `rabbitmq`

Optional large model service:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml --profile assistant-model up -d --build assistant-model
```

### Kubernetes

Production Kubernetes manifests are available in `k8s/prod`:

```bash
cp k8s/prod/secret.example.yaml k8s/prod/secret.yaml
# update secret values, then swap secret.example.yaml -> secret.yaml in k8s/prod/kustomization.yaml
kubectl apply -k k8s/prod
```

### Environment Variables

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
RABBITMQ_URI=amqp://...
BETTER_AUTH_SECRET=production-secret-minimum-32-characters
BETTER_AUTH_URL=https://api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com
API_GATEWAY_HOST=0.0.0.0
BASE_URL=https://api.yourdomain.com
PUBLIC_BASE_URL=https://api.yourdomain.com
```

### Security Checklist

- [ ] Change all Better Auth, PostgreSQL, and RabbitMQ secrets to strong random values
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

### Machine Learning

- **Python** - ML development language
- **Scikit-learn** - ML algorithms (Random Forest, etc.)
- **LightGBM** - Gradient boosting framework
- **TensorFlow** - Deep learning (planned)
- **Pandas & NumPy** - Data processing
- **Surprise & Implicit** - Recommendation systems
- **FastAPI** - ML service API

### Frontend

- **React 18** - Web UI framework
- **React Native + Expo** - Mobile framework
- **TanStack Router** - Web routing
- **TailwindCSS** - Styling
- **shadcn/ui** - UI components
- **Rsbuild** - Web bundler

### DevOps

- **Nx** - Monorepo management
- **pnpm** - Package manager
- **Docker** - Development container and production deployment

---

## 🗺️ Roadmap

### ✅ Completed

- [x] Authentication with Better Auth
- [x] Unified API Gateway architecture
- [x] RabbitMQ message queue
- [x] Mobile app (iOS, Android, Web)
- [x] Type-safe environment config
- [x] Personalized Promotion Engine ML Service
  - [x] Purchase prediction models (Random Forest)
  - [x] Collaborative filtering system
  - [x] Promotion optimizer with dynamic discounts
  - [x] Causal inference for uplift modeling
  - [x] Campaign generator and evaluation tools

### 🚧 In Progress

- [ ] SinLlama AI model integration
- [ ] Voice assistant implementation
- [ ] Speech-to-text/text-to-speech

### 📋 Planned

- [ ] Product catalog microservice
- [ ] Order management microservice
- [ ] Payment gateway integration
- [x] Docker containerization
- [ ] Kubernetes deployment
- [ ] Monitoring (Prometheus, Grafana)

---

## ✅ Setup Checklist

- [ ] Node.js v18+ installed
- [ ] pnpm installed
- [ ] RabbitMQ running (Docker or hosted)
- [ ] PostgreSQL database created
- [ ] Root `.env` file configured
- [ ] Strong Better Auth secret generated (32+ chars)
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
