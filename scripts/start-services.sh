#!/bin/bash

# SmartRetailX - Start All Services
# This script starts both auth-service and client

set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║        SmartRetailX Service Launcher              ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

echo "🔍 Checking prerequisites..."
echo ""

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "⚠️  Warning: PostgreSQL not found. Please ensure it's installed and running."
fi

# Check if .env files exist
if [ ! -f "apps/auth-service/.env" ]; then
    echo "⚠️  Warning: apps/auth-service/.env not found"
    echo "   Run: cp apps/auth-service/.env.example apps/auth-service/.env"
fi

if [ ! -f "apps/client/.env" ]; then
    echo "⚠️  Warning: apps/client/.env not found"  
    echo "   Run: cp apps/client/.env.example apps/client/.env"
fi

echo ""
echo "🚀 Starting services..."
echo ""
echo "┌────────────────────────────────────────────────────┐"
echo "│  Auth Service: http://localhost:3000/api          │"
echo "│  Client:       http://localhost:5173              │"
echo "└────────────────────────────────────────────────────┘"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Run both services
npx nx run-many -t serve -p auth-service,client
