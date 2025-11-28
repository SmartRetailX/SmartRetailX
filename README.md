# 🛒 SmartRetailX

AI-powered e-commerce platform with Better Auth authentication system.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp apps/auth-service/.env.example apps/auth-service/.env
cp apps/client/.env.example apps/client/.env
# Edit apps/auth-service/.env and add your hosted database URL

# 3. Run migrations
psql "YOUR_DATABASE_URL" -f apps/auth-service/migrations/001_init_better_auth.sql

# 4. Start services
npx nx serve auth-service  # Terminal 1
npx nx serve client        # Terminal 2
```

**Open:** http://localhost:5173

**📖 Full Setup Guide:** See [SETUP.md](./SETUP.md)

---

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup & testing guide
- **[.env.example](./apps/auth-service/.env.example)** - Environment
  configuration template
- **[.env.example](./apps/client/.env.example)** - Client configuration template

---

## 🏗️ Project Structure

```
smart-retail-x/
├── apps/
│   ├── auth-service/       # NestJS Backend (Port 3000)
│   │   ├── src/
│   │   │   ├── lib/        # Better Auth config
│   │   │   ├── auth/       # Auth module
│   │   │   └── config/     # Environment config
│   │   └── migrations/     # Database migrations
│   │
│   ├── client/             # React Frontend (Port 5173)
│   │   └── src/
│   │       ├── lib/        # Auth client
│   │       ├── contexts/   # Auth context
│   │       ├── components/ # UI components
│   │       └── routes/     # Pages (login, signup, etc.)
│   │
│   └── auth-service-e2e/   # E2E tests
│
└── scripts/
    └── start-services.sh   # Start all services
```

---

## ✨ Features

### Authentication

- ✅ Email/Password authentication
- ✅ Secure session management (7-day sessions)
- ✅ HttpOnly cookies for security
- ✅ Protected routes
- ✅ Auto session refresh

### UI/UX

- ✅ Modern gradient design
- ✅ Dark mode support
- ✅ Fully responsive
- ✅ Form validation
- ✅ Loading states

### Tech Stack

- **Backend:** NestJS + Better Auth + PostgreSQL
- **Frontend:** React 19 + TanStack Router + Tailwind CSS
- **UI:** shadcn/ui components
- **Monorepo:** Nx
- **Package Manager:** pnpm

---

## 🎯 Service URLs

| Service      | URL                            | Description              |
| ------------ | ------------------------------ | ------------------------ |
| **Client**   | http://localhost:5173          | React frontend           |
| **Auth API** | http://localhost:3000/api/auth | Authentication endpoints |

---

## 🧪 Testing

1. Open http://localhost:5173
2. Click "Create Account"
3. Sign up with test credentials
4. Verify redirect and welcome message
5. Test logout and login

See [SETUP.md](./SETUP.md#testing-authentication) for detailed testing guide.

---

## 🔧 Development Commands

```bash
# Install dependencies
pnpm install

# Start auth service
npx nx serve auth-service

# Start client
npx nx serve client

# Start both (automated)
./scripts/start-services.sh

# Build
npx nx build auth-service
npx nx build client

# Lint
npx nx run-many -t lint

# Format
pnpm format

# View dependency graph
npx nx graph
```

---

## 📋 Prerequisites

- Node.js v18+
- pnpm
- Hosted PostgreSQL database (Neon, Supabase, Railway, etc.)

---

## 🐛 Troubleshooting

**Port in use:**

```bash
lsof -ti:3000,5173 | xargs kill -9
```

**Database connection error:**

- Verify DATABASE_URL in `apps/auth-service/.env`
- Ensure `?sslmode=require` is added for hosted databases

**CORS error:**

- Check `CORS_ORIGIN=http://localhost:5173` in `apps/auth-service/.env`
- Restart auth-service

See [SETUP.md](./SETUP.md#troubleshooting) for more solutions.

---

## 📞 Support

- **Setup Help:** [SETUP.md](./SETUP.md)
- **Better Auth:** https://www.better-auth.com/docs
- **NestJS:** https://docs.nestjs.com
- **React:** https://react.dev

---

## 📄 License

MIT License

---

**Built with ❤️ for SmartRetailX**
