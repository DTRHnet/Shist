#!/bin/bash

# Shist Stop Script

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

if [[ -f logs/backend.pid ]]; then
    pid=$(cat logs/backend.pid)
    if ps -p $pid > /dev/null 2>&1; then
        kill $pid
        log "Backend server stopped (PID: $pid)"
    else
        log "Backend process was not running"
    fi
    rm -f logs/backend.pid
else
    log "No PID file found"
fi

# Kill any remaining processes on the port
if command -v lsof &> /dev/null; then
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log "Killing remaining processes on port 5000..."
        lsof -Pi :5000 -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
    fi
fi

log "Shist application stopped"
