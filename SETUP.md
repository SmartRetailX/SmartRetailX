# 🚀 SmartRetailX - Complete Setup Guide

Complete guide for setting up SmartRetailX with Better Auth authentication
system using a hosted PostgreSQL database.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Running the Project](#running-the-project)
5. [Testing Authentication](#testing-authentication)
6. [Troubleshooting](#troubleshooting)
7. [API Reference](#api-reference)

---

## ✅ Prerequisites

### Required Software

- **Node.js** v18 or higher → [Download](https://nodejs.org/)
- **pnpm** → Install: `npm install -g pnpm`
- **Hosted PostgreSQL Database** → Examples: [Neon](https://neon.tech),
  [Supabase](https://supabase.com), [Railway](https://railway.app)

### Check Your Installation

```bash
node --version   # Should show v18.x or higher
pnpm --version   # Should show 9.x or higher
```

### Get a Hosted Database (Choose One)

**Recommended: Neon (Free Tier)**

1. Go to [neon.tech](https://neon.tech)
2. Sign up for free
3. Create new project
4. Copy connection string

**Alternative: Supabase (Free Tier)**

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy connection string (use "pooler" for production)

**Your connection string will look like:**

```
postgresql://username:password@hostname:5432/database?sslmode=require
```

---

## ⚡ Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
cd /home/shanelka/Documents/Projects/Academic/Research/E-Commerce-Platform/smart-retail-x
pnpm install
```

### 2. Configure Environment

```bash
# Create auth service environment file
cp apps/auth-service/.env.example apps/auth-service/.env

# Create client environment file
cp apps/client/.env.example apps/client/.env
```

**Edit `apps/auth-service/.env`** and update the `DATABASE_URL`:

```env
# Replace with YOUR hosted database connection string
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

**Example with Neon:**

```env
DATABASE_URL=postgresql://neondb_owner:abc123@ep-cool-name.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**The client `.env` file needs no changes** (defaults work perfectly).

### 3. Run Database Migrations

```bash
# Replace YOUR_DATABASE_URL with your actual connection string
psql "YOUR_DATABASE_URL_HERE" -f apps/auth-service/migrations/001_init_better_auth.sql
```

**Don't have `psql` installed?** Use your database provider's SQL editor:

1. Open your database dashboard
2. Find SQL Editor or Query tool
3. Copy contents from `apps/auth-service/migrations/001_init_better_auth.sql`
4. Paste and execute

**Verify tables were created:**

```bash
psql "YOUR_DATABASE_URL" -c "\dt"
```

Expected output should show 4 tables: `user`, `session`, `account`,
`verification`

### 4. Start Services

```bash
# Terminal 1 - Start Backend
npx nx serve auth-service

# Terminal 2 - Start Frontend (open new terminal)
npx nx serve client
```

### 5. Test!

Open browser to: **http://localhost:5173**

✅ You should see the SmartRetailX home page!

---

## 📖 Detailed Setup

### Environment Configuration

#### Auth Service `.env` File

**Location:** `apps/auth-service/.env`

**Required variables:**

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database - UPDATE THIS with your hosted database URL
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# CORS - Must match client URL
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# Better Auth Base URL
BASE_URL=http://localhost:3000

# Logging
LOG_LEVEL=debug

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

**⚠️ Important Notes:**

1. **SSL Required:** Most hosted databases require `?sslmode=require` at the end
2. **Special Characters:** If your password has special characters, URL-encode
   them:
   - `@` → `%40`
   - `!` → `%21`
   - `#` → `%23`
3. **Keep it Secret:** Never commit this file to git (already in `.gitignore`)

#### Client `.env` File

**Location:** `apps/client/.env`

**Default configuration (no changes needed):**

```env
# Application Metadata
PUBLIC_APP_NAME=SmartRetailX
PUBLIC_APP_VERSION=1.0.0
PUBLIC_APP_ENV=development

# API Configuration
PUBLIC_API_BASE_URL=http://localhost:3000/api
PUBLIC_API_TIMEOUT=30000

# Development Features
PUBLIC_ENABLE_DEVTOOLS=true
PUBLIC_ENABLE_ANALYTICS=false
```

### Database Migration Details

The migration file creates these tables:

1. **`user`** - User accounts (email, password hash, name, etc.)
2. **`session`** - Active user sessions
3. **`account`** - OAuth accounts (for future social login)
4. **`verification`** - Email verification and password reset tokens

---

## 🎬 Running the Project

### Start Both Services

**Option 1: Automated Script**

```bash
./scripts/start-services.sh
```

**Option 2: Manual (Recommended for Development)**

Terminal 1:

```bash
npx nx serve auth-service
```

Terminal 2:

```bash
npx nx serve client
```

### Service URLs

| Service      | URL                            | Description              |
| ------------ | ------------------------------ | ------------------------ |
| **Client**   | http://localhost:5173          | React frontend           |
| **Auth API** | http://localhost:3000/api/auth | Authentication endpoints |
| **API Base** | http://localhost:3000/api      | Backend API              |

### Success Indicators

**Auth Service (Terminal 1):**

```
✓ Built successfully
🚀 Application is running on: http://localhost:3000/api
🔐 Auth endpoints available at: http://localhost:3000/api/auth
```

**Client (Terminal 2):**

```
> Local:   http://localhost:5173
✓ ready in XXXXms
```

### Stopping Services

Press `Ctrl+C` in each terminal, or:

```bash
# Force kill if needed
lsof -ti:3000,5173 | xargs kill -9
```

---

## 🧪 Testing Authentication

### Test 1: Sign Up

1. Open http://localhost:5173
2. Click **"Create Account"** button
3. Fill in the form:
   - **Name:** Test User
   - **Email:** test@example.com
   - **Password:** password123
   - **Confirm Password:** password123
4. Click **"Create Account"**

**Expected Result:**

- ✅ Redirects to home page
- ✅ Shows "Welcome back, Test User!"
- ✅ Logout button is visible
- ✅ No errors in browser console (F12)

### Test 2: Logout

1. Click **"Logout"** button

**Expected Result:**

- ✅ Redirects to public home page
- ✅ See "Create Account" and "Sign In" buttons
- ✅ No user info visible

### Test 3: Login

1. Click **"Sign In"** button
2. Enter credentials:
   - **Email:** test@example.com
   - **Password:** password123
3. Click **"Sign In"**

**Expected Result:**

- ✅ Redirects to authenticated home page
- ✅ Shows "Welcome back, Test User!" again
- ✅ Session is active

### Test 4: Session Persistence

1. While logged in, refresh the page (F5 or Ctrl+R)

**Expected Result:**

- ✅ Still logged in (don't need to re-login)
- ✅ User info still displays

### Verify in Database

Check if user was created in your hosted database:

```bash
psql "YOUR_DATABASE_URL" -c "SELECT id, name, email FROM \"user\";"
```

Or use your database provider's web interface to view the `user` table.

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to database"

**Error:** `connection to server failed` or `ECONNREFUSED`

**Solutions:**

1. **Check DATABASE_URL is correct:**

   ```bash
   cat apps/auth-service/.env | grep DATABASE_URL
   ```

2. **Test connection directly:**

   ```bash
   psql "YOUR_DATABASE_URL" -c "SELECT 1;"
   ```

3. **Ensure SSL mode is set:**

   ```env
   DATABASE_URL=postgresql://...?sslmode=require
   ```

4. **Check IP whitelist** (if your provider has one)

### Issue: "Port already in use"

**Error:** `Port 3000 is already in use`

**Solution:**

```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or change port in apps/auth-service/.env
PORT=3001

# Then update client .env too
PUBLIC_API_BASE_URL=http://localhost:3001/api
```

### Issue: "CORS error" in browser

**Error:** `Access to fetch blocked by CORS policy`

**Solutions:**

1. **Verify CORS settings** in `apps/auth-service/.env`:

   ```env
   CORS_ORIGIN=http://localhost:5173
   CORS_CREDENTIALS=true
   ```

2. **Ensure auth-service is running**

3. **Restart auth-service** after changing .env:
   ```bash
   # Ctrl+C in Terminal 1, then:
   npx nx serve auth-service
   ```

### Issue: "Module not found"

**Error:** `Cannot find module '@/...`

**Solution:**

```bash
# Clear and reinstall
rm -rf node_modules
pnpm install

# Clear Nx cache
npx nx reset

# Restart services
```

### Issue: "Authentication failed" when connecting to database

**Possible causes:**

1. Wrong password
2. Special characters in password not encoded
3. Wrong username

**Solution:**

URL-encode special characters in password:

```env
# If password is: p@ss!word
# Encode as: p%40ss%21word
DATABASE_URL=postgresql://user:p%40ss%21word@host/db
```

### Issue: Sign up succeeds but doesn't redirect

**Solutions:**

1. Open browser console (F12) and check for errors
2. Verify cookies are enabled
3. Check auth-service logs for errors
4. Verify session table has records:
   ```bash
   psql "YOUR_DATABASE_URL" -c "SELECT COUNT(*) FROM session;"
   ```

---

## 📡 API Reference

### Base URL

```
http://localhost:3000/api/auth
```

### Endpoints

#### Sign Up

```http
POST /api/auth/sign-up
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "..."
    },
    "session": { ... }
  }
}
```

#### Sign In

```http
POST /api/auth/sign-in
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "data": {
    "user": { ... },
    "session": { ... }
  }
}
```

#### Get Session

```http
GET /api/auth/session
```

**Response (authenticated):**

```json
{
  "data": {
    "user": { ... },
    "session": { ... }
  }
}
```

**Response (not authenticated):**

```json
{
  "data": null
}
```

#### Sign Out

```http
POST /api/auth/sign-out
```

**Response:**

```json
{
  "data": { "success": true }
}
```

### Testing with cURL

```bash
# Sign Up
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Sign In (save cookies)
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'

# Get Session (use saved cookies)
curl -b cookies.txt http://localhost:3000/api/auth/session

# Sign Out
curl -X POST http://localhost:3000/api/auth/sign-out \
  -b cookies.txt
```

---

## 🎯 Project Structure

```
smart-retail-x/
├── apps/
│   ├── auth-service/              # NestJS Backend
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   └── better-auth.ts # Better Auth config
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   └── auth.module.ts
│   │   │   ├── config/            # Environment config
│   │   │   └── main.ts            # Entry point with CORS
│   │   ├── migrations/
│   │   │   └── 001_init_better_auth.sql
│   │   └── .env                   # Your config (create this)
│   │
│   └── client/                    # React Frontend
│       └── src/
│           ├── lib/
│           │   └── auth-client.ts # Auth API client
│           ├── contexts/
│           │   └── auth-context.tsx # Auth state
│           ├── components/
│           │   └── auth/
│           │       └── protected-route.tsx
│           ├── routes/
│           │   ├── login.tsx
│           │   ├── signup.tsx
│           │   └── index.tsx      # Home page
│           └── .env               # Your config (create this)
│
├── scripts/
│   └── start-services.sh          # Start all services
│
├── SETUP.md                       # This file
└── README.md                      # Project overview
```

---

## ✨ Features

### Authentication

- ✅ Email/Password authentication
- ✅ Secure session management (7-day sessions)
- ✅ HttpOnly cookies (XSS protection)
- ✅ Auto session refresh
- ✅ Protected routes
- ✅ Beautiful login/signup pages

### Security

- ✅ Password hashing with Bcrypt
- ✅ CSRF protection
- ✅ SQL injection protection (parameterized queries)
- ✅ Secure cookie settings
- ✅ CORS configuration

### UI/UX

- ✅ Modern gradient design
- ✅ Dark mode support
- ✅ Fully responsive
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling

---

## 🔧 Development Commands

```bash
# Install dependencies
pnpm install

# Start auth service
npx nx serve auth-service

# Start client
npx nx serve client

# Build auth service
npx nx build auth-service

# Build client
npx nx build client

# Lint all
npx nx run-many -t lint

# Format code
pnpm format

# View dependency graph
npx nx graph
```

---

## 🚀 Next Steps

Once authentication is working, you can:

1. **Add Protected Routes**
   - Use `<ProtectedRoute>` component
   - Create dashboard, profile pages

2. **Customize UI**
   - Update branding
   - Add more features
   - Modify themes

3. **Enhance Authentication**
   - Add email verification
   - Implement password reset
   - Add OAuth providers (Google, GitHub)

4. **Deploy to Production**
   - Set `NODE_ENV=production`
   - Use production database
   - Enable HTTPS
   - Configure production URLs

---

## 📞 Support

### Common Resources

- **Better Auth Docs:** https://www.better-auth.com/docs
- **NestJS Docs:** https://docs.nestjs.com
- **React Docs:** https://react.dev
- **TanStack Router:** https://tanstack.com/router

### Quick Checks

```bash
# Check if services are running
lsof -i:3000  # Auth service
lsof -i:5173  # Client

# Check database connection
psql "YOUR_DATABASE_URL" -c "SELECT 1;"

# Check tables exist
psql "YOUR_DATABASE_URL" -c "\dt"

# View environment config (without secrets)
cat apps/auth-service/.env | grep -v PASSWORD | grep -v DATABASE_URL
```

---

## ✅ Setup Checklist

- [ ] Node.js v18+ installed
- [ ] pnpm installed
- [ ] Hosted PostgreSQL database created
- [ ] Connection string obtained
- [ ] Dependencies installed (`pnpm install`)
- [ ] `apps/auth-service/.env` created and configured
- [ ] `apps/client/.env` created
- [ ] Database migrations run
- [ ] 4 tables verified in database
- [ ] Auth service starts without errors
- [ ] Client starts without errors
- [ ] Can access http://localhost:5173
- [ ] Can sign up successfully
- [ ] Can log in successfully
- [ ] Session persists on refresh
- [ ] User visible in database

---

**Congratulations! Your SmartRetailX authentication system is ready! 🎉**

For any issues, check the [Troubleshooting](#troubleshooting) section above.
