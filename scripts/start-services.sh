#!/bin/bash

# SmartRetailX - Start All Services
# This script starts api-gateway, assistant-service, and client

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

# Check if RabbitMQ is running
if ! command -v rabbitmq-server &> /dev/null; then
    echo "⚠️  Warning: RabbitMQ not found. Please ensure it's installed and running."
fi

# Check if .env files exist
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env not found in project root"
    echo "   Create .env file with required environment variables"
fi

echo ""
echo "🚀 Starting services..."
echo ""
echo "┌────────────────────────────────────────────────────┐"
echo "│  API Gateway:        http://localhost:3000/api    │"
echo "│    → Auth:           /api/auth/*                  │"
echo "│    → Assistant:      /api/assistant/*             │"
echo "│  Client:             http://localhost:5173        │"
echo "│  Assistant Service:  RabbitMQ (background)        │"
echo "└────────────────────────────────────────────────────┘"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Run all services
npx nx run-many -t serve -p api-gateway,assistant-service,client
