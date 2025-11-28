# 🛒 SmartRetailX

**AI-powered e-commerce platform with microservices architecture**

[![Nx](https://img.shields.io/badge/Nx-Monorepo-143055?style=flat&logo=nx)](https://nx.dev)
[![NestJS](https://img.shields.io/badge/NestJS-Microservices-E0234E?style=flat&logo=nestjs)](https://nestjs.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Message%20Queue-FF6600?style=flat&logo=rabbitmq)](https://www.rabbitmq.com)

---

## 🎯 Features

- 🤖 **AI Voice Assistant** - Sinhala language support with SinLlama
- 🔐 **Secure Authentication** - Better Auth with session management
- 🐰 **Event-Driven** - RabbitMQ message queue for scalability
- 🌐 **API Gateway** - Centralized entry point with HTTP + RabbitMQ
- 📦 **Microservices** - Scalable, loosely-coupled architecture
- 🎨 **Modern UI** - React 19 with TailwindCSS and shadcn/ui

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │  (Port 5173)
│ React 19    │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────────────┐
│   API Gateway       │  (Port 3000)
│  REST + RabbitMQ    │
└─────────┬───────────┘
          │
    ┌─────┴──────┬──────────────┐
    │ HTTP Proxy │   RabbitMQ   │
    ▼            ▼              │
┌────────┐  ┌──────────┐       │
│  Auth  │  │ RabbitMQ │       │
│Service │  │  Broker  │       │
│(3001)  │  └────┬─────┘       │
└────────┘       │              │
                 ▼              ▼
           ┌─────────────┐
           │ Assistant   │
           │   Service   │
           │ (Voice AI)  │
           └─────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+
- **pnpm** package manager
- **RabbitMQ** (Docker or hosted)
- **PostgreSQL** (hosted: Neon, Supabase, etc.)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start RabbitMQ

```bash
# Using Docker
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### 3. Configure Environment

Create `.env` file in the root:

```env
# RabbitMQ
RABBITMQ_URI=amqp://guest:guest@localhost:5672

# Database
DATABASE_URL=postgresql://user:password@host:5432/smartretailx

# Auth
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret

# CORS
CORS_ORIGIN=http://localhost:5173
```

### 4. Run Database Migrations

```bash
psql "$DATABASE_URL" -f apps/auth-service/migrations/001_init_better_auth.sql
```

### 5. Start All Services

```bash
# Start all backend services
pnpm dev:backend

# Or start everything (backend + client)
pnpm dev:all
```

**URLs:**

- Client: http://localhost:5173
- API Gateway: http://localhost:3000
- Auth Service: http://localhost:3001
- RabbitMQ UI: http://localhost:15672 (guest/guest)

---

## 📁 Project Structure

```
smart-retail-x/
├── apps/
│   ├── api-gateway/          # API Gateway (Port 3000)
│   │   └── src/
│   │       ├── app/          # Controllers, Services
│   │       └── main.ts       # HTTP + RabbitMQ client
│   │
│   ├── auth-service/         # Authentication (Port 3001)
│   │   └── src/
│   │       ├── lib/          # Better Auth config
│   │       ├── auth/         # Auth module
│   │       ├── config/       # Environment config
│   │       └── main.ts       # HTTP + RabbitMQ hybrid
│   │
│   ├── assistant-service/    # Voice AI (RabbitMQ)
│   │   └── src/
│   │       ├── app/          # Message handlers
│   │       └── main.ts       # Pure RabbitMQ microservice
│   │
│   └── client/               # React Frontend (Port 5173)
│       └── src/
│           ├── lib/          # Auth client
│           ├── contexts/     # React contexts
│           ├── components/   # UI components
│           └── routes/       # Pages
│
├── ASSISTANT_SERVICE.md      # Voice AI docs
├── SETUP.md                  # Detailed setup guide
└── README.md                 # This file
```

---

## 🛠️ Services

### 1. API Gateway (Port 3000)

**Purpose:** Central HTTP entry point for all client requests

**Endpoints:**

- `GET /api/health` - Check all services
- `POST /api/auth/*` - Authentication (proxied to auth-service)
- `POST /api/assistant/query` - AI voice queries
- `GET /api/assistant/capabilities` - Get AI features

### 2. Auth Service (Port 3001)

**Purpose:** User authentication and session management

**Technology:** Better Auth + PostgreSQL **Communication:** HTTP (for cookies) +
RabbitMQ

### 3. Assistant Service (RabbitMQ)

**Purpose:** AI voice assistant for Sinhala e-commerce

**Technology:** SinLlama (to be integrated) **Queue:** `assistant_queue`
**Features:**

- Voice queries (Sinhala/English)
- Speech-to-text
- Text-to-speech
- Product search assistance

---

## 🧪 Testing

### Health Checks

```bash
# Check all services
curl http://localhost:3000/api/health

# Check assistant service
curl http://localhost:3000/api/assistant/health
```

### Authentication

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Sign in
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Voice Assistant

```bash
# Send voice query
curl -X POST http://localhost:3000/api/assistant/query \
  -H "Content-Type: application/json" \
  -d '{"query":"මම ජුත්තු එකක් ගන්න අවශ්යයි","language":"si"}'

# Get capabilities
curl http://localhost:3000/api/assistant/capabilities
```

---

## 📜 Available Scripts

```bash
# Development
pnpm dev:backend      # Start all backend services
pnpm dev:all          # Start backend + client

# Individual services
nx serve api-gateway
nx serve auth-service
nx serve assistant-service
nx serve client

# Build
nx build api-gateway
nx build auth-service
nx build assistant-service
nx build client

# Code quality
pnpm lint             # Lint all projects
pnpm lint:fix         # Fix linting issues
pnpm format           # Format code with Prettier

# Utilities
nx graph              # View dependency graph
nx affected:test      # Test affected projects
```

---

## 🔧 Technology Stack

### Backend

- **Framework:** NestJS
- **Authentication:** Better Auth
- **Database:** PostgreSQL
- **Message Queue:** RabbitMQ
- **Microservices:** @nestjs/microservices

### Frontend

- **Framework:** React 19
- **Routing:** TanStack Router
- **Styling:** TailwindCSS
- **UI Components:** shadcn/ui
- **State Management:** React Context

### DevOps

- **Monorepo:** Nx
- **Package Manager:** pnpm
- **Containerization:** Docker (for RabbitMQ)

---

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup and configuration guide
- **[ASSISTANT_SERVICE.md](./ASSISTANT_SERVICE.md)** - Voice AI service
  documentation
- **[Better Auth Docs](https://www.better-auth.com/docs)** - Authentication
  library
- **[NestJS Microservices](https://docs.nestjs.com/microservices/basics)** -
  Microservices guide
- **[RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)** - Message
  queue basics

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill processes on ports 3000, 3001, 5173
lsof -ti:3000,3001,5173 | xargs kill -9
```

### RabbitMQ Connection Failed

```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# Restart RabbitMQ
docker restart rabbitmq

# Check connection string
echo $RABBITMQ_URI
```

### Database Connection Error

- Verify `DATABASE_URL` in `.env`
- Ensure `?sslmode=require` for hosted databases
- Check database is accessible

### Service Not Receiving Messages

1. Check RabbitMQ UI: http://localhost:15672
2. Verify queue names match in producer and consumer
3. Check service logs for errors

See [SETUP.md](./SETUP.md#troubleshooting) for more solutions.

---

## 🚀 Deployment

### Environment Variables

Ensure these are set in production:

```env
NODE_ENV=production
RABBITMQ_URI=amqp://user:password@production-host:5672
DATABASE_URL=postgresql://...
JWT_SECRET=production-secret-key
JWT_REFRESH_SECRET=production-refresh-key
CORS_ORIGIN=https://yourdomain.com
```

### Docker Deployment (Coming Soon)

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d
```

---

## 🗺️ Roadmap

- [x] Authentication system with Better Auth
- [x] RabbitMQ message queue integration
- [x] API Gateway with hybrid communication
- [x] Voice assistant service structure
- [ ] SinLlama model integration
- [ ] Speech-to-text service
- [ ] Text-to-speech service
- [ ] Product catalog microservice
- [ ] Order management microservice
- [ ] Payment gateway integration
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] Monitoring and logging (Prometheus, Grafana)

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

- [Better Auth](https://www.better-auth.com) - Authentication
- [NestJS](https://nestjs.com) - Backend framework
- [RabbitMQ](https://www.rabbitmq.com) - Message broker
- [Nx](https://nx.dev) - Monorepo tooling
- [shadcn/ui](https://ui.shadcn.com) - UI components

---

**Built with ❤️ by the SmartRetailX Team**
