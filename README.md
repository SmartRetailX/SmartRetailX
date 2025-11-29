# 🛒 SmartRetailX

**AI-powered e-commerce platform with microservices architecture**

A modern, scalable e-commerce platform featuring AI voice assistance in Sinhala,
built with NestJS microservices, React 19, and React Native.

[![Nx](https://img.shields.io/badge/Nx-Monorepo-143055?style=flat&logo=nx)](https://nx.dev)
[![NestJS](https://img.shields.io/badge/NestJS-Microservices-E0234E?style=flat&logo=nestjs)](https://nestjs.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Message%20Queue-FF6600?style=flat&logo=rabbitmq)](https://www.rabbitmq.com)

---

## 🎯 Key Features

- 🤖 **AI Voice Assistant** - Sinhala language support with SinLlama (planned)
- 🔐 **Secure Authentication** - Better Auth with session management & HTTP-only
  cookies
- 🐰 **Event-Driven Architecture** - RabbitMQ message queue for scalability
- 🌐 **Unified API Gateway** - Single HTTP entry point with integrated
  authentication
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
- **Integrated Authentication** - Better Auth runs directly in API Gateway (no
  separate auth service)
- **Hybrid Communication** - HTTP for clients, RabbitMQ for microservices
- **Session-Based Auth** - Secure HTTP-only cookies, no JWT tokens exposed to
  clients
- **Event-Driven** - Services communicate asynchronously via message queue
- **Independently Scalable** - Each service can scale based on load

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ - [Download](https://nodejs.org/)
- **pnpm** - Install: `npm install -g pnpm`
- **RabbitMQ** - [Docker](https://www.docker.com/) recommended
- **PostgreSQL** - [Neon](https://neon.tech), [Supabase](https://supabase.com),
  or local

### Installation

```bash
# 1. Install dependencies
pnpm install

# 2. Start RabbitMQ (Docker)
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management

# 3. Create .env file (see SETUP.md for details)
cp .env.example .env
# Edit .env with your database and secrets

# 4. Run database migrations
psql "$DATABASE_URL" -f apps/api-gateway/migrations/001_init_better_auth.sql

# 5. Start services
pnpm dev:backend    # Backend only
# or
pnpm dev:all        # Backend + web client

# 6. Access the app
# Web: http://localhost:5173
# API: http://localhost:3000/api
# RabbitMQ UI: http://localhost:15672
```

**📖 For detailed setup instructions, see [SETUP.md](./SETUP.md)**

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
│   ├── assistant-service/        # Voice AI Service (RabbitMQ only)
│   │   └── src/
│   │       ├── app/              # Message handlers
│   │       └── main.ts           # Pure microservice (no HTTP)
│   │
│   ├── client/                   # React Web App (Port 5173)
│   │   └── src/
│   │       ├── lib/              # Auth client, utilities
│   │       ├── components/       # UI components (shadcn/ui)
│   │       ├── providers/        # Auth provider
│   │       └── routes/           # Page components
│   │
│   └── mobile-app/               # Mobile App (Expo/React Native)
│       ├── src/
│       │   ├── lib/              # Auth client, env config
│       │   └── screens/          # Screen components
│       ├── app.json              # Expo configuration
│       └── eas.json              # EAS Build config
│
├── libs/
│   └── shared-types/             # Shared TypeScript types
│
├── .env                          # Environment variables (root)
├── README.md                     # This file
└── SETUP.md                      # Detailed setup guide
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

### Mobile App (Expo)

Cross-platform mobile app for iOS, Android & Web.

---

## 📜 Available Scripts

```bash
# Development
pnpm dev:backend        # Start backend services only
pnpm dev:all            # Start backend + web client

# Individual Services
nx serve api-gateway    # API Gateway only
nx serve assistant-service  # Assistant Service only
nx serve client         # Web client only

# Mobile App
pnpm mobile:start       # Start Expo dev server
pnpm mobile:android     # Run on Android
pnpm mobile:ios         # Run on iOS (macOS only)
pnpm mobile:web         # Run in browser

# Build
nx build api-gateway
nx build assistant-service
nx build client

# Code Quality
pnpm lint               # Lint all projects
pnpm format             # Format with Prettier
pnpm test               # Run tests

# Utilities
nx graph                # View dependency graph
npx nx reset            # Clear Nx cache
```

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

### DevOps

- **Nx** - Monorepo management
- **pnpm** - Package manager
- **Docker** - RabbitMQ containerization

---

## 📱 Mobile App

### Quick Start

```bash
# Start Expo dev server
pnpm mobile:start

# Scan QR code with Expo Go app
# iOS: https://apps.apple.com/app/expo-go/id982107779
# Android: https://play.google.com/store/apps/details?id=host.exp.exponent
```

### Configuration

Create `apps/mobile-app/.env`:

```env
# For iOS Simulator
EXPO_PUBLIC_API_URL=http://localhost:3000

# For Android Emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# For Physical Device (use your computer's IP)
EXPO_PUBLIC_API_URL=http://192.168.8.8:3000
```

**Important:** Set in root `.env` for mobile access:

```env
API_GATEWAY_HOST=0.0.0.0    # Listen on all network interfaces
CORS_ORIGIN=http://localhost:5173,*  # Allow mobile requests
```

---

## 🐛 Common Issues

### Mobile: "Network request failed"

**Solution:**

1. Set `API_GATEWAY_HOST=0.0.0.0` in root `.env`
2. Set `CORS_ORIGIN=http://localhost:5173,*` in root `.env`
3. Restart API Gateway
4. Use correct IP in mobile `.env` (see above)

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

**📖 For detailed troubleshooting, see [SETUP.md](./SETUP.md#troubleshooting)**

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

## 📚 Additional Resources

- **[SETUP.md](./SETUP.md)** - Complete setup and troubleshooting guide
- **[Better Auth Docs](https://www.better-auth.com/docs)** - Authentication
  library
- **[NestJS Microservices](https://docs.nestjs.com/microservices/basics)** -
  Microservices guide
- **[RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)** - Message
  queue basics
- **[Expo Docs](https://docs.expo.dev/)** - Mobile development
- **[Nx Docs](https://nx.dev)** - Monorepo tooling

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
- [Expo](https://expo.dev) - Mobile platform

---

**Built with ❤️ by the SmartRetailX Team**

_Last Updated: November 29, 2025_
