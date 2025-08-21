#!/bin/bash
# chmod +x start_local.sh
# Robust startup script for Shist app - handles environment loading, database setup, and service startup
# Assumptions: Node.js 20+, PostgreSQL available, environment variables in .env
# User must: Create .env file with DATABASE_URL, SESSION_SECRET, and LOCAL_DEV=true

set -e  # Exit on any error

# Detect Linux distribution for future package management
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
    echo "Detected Linux distribution: $DISTRO"
fi

# Load environment variables if .env exists
if [ -f .env ]; then
    echo "Loading environment from .env file..."
    export $(grep -v '^#' .env | xargs)
else
    echo "Warning: .env file not found. Using system environment variables only."
fi

# Set default PORT if not specified
export PORT=${PORT:-5000}
export NODE_ENV=${NODE_ENV:-production}

echo "Starting Shist application..."
echo "Port: $PORT"
echo "Environment: $NODE_ENV"
echo "Local dev mode: ${LOCAL_DEV:-false}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

# Run database migrations if in development
if [ "$NODE_ENV" = "development" ] || [ "$LOCAL_DEV" = "true" ]; then
    echo "Running database migrations..."
    npm run db:push 2>/dev/null || echo "Migration skipped (database may not be ready)"
fi

# Build if production and dist doesn't exist
if [ "$NODE_ENV" = "production" ] && [ ! -d "dist" ]; then
    echo "Building application for production..."
    npm run build
fi

# Start the application based on environment
if [ "$NODE_ENV" = "development" ] || [ "$LOCAL_DEV" = "true" ]; then
    echo "Starting in development mode with hot reload..."
    exec npm run dev
else
    echo "Starting in production mode..."
    exec npm run start
fi