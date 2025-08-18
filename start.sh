#!/bin/bash

# Shist Local Start Script
# Loads environment and starts the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Load environment variables
load_env() {
    if [[ -f .env ]]; then
        log "Loading environment variables from .env..."
        export $(grep -v '^#' .env | xargs)
        log "Environment loaded successfully"
    else
        error ".env file not found. Please run ./install.sh first."
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please run ./install.sh first."
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 20 ]]; then
        error "Node.js version 20+ is required. Current version: $(node --version)"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed. Please run ./install.sh first."
    fi
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL is not installed. Please run ./install.sh first."
    fi
    
    # Check if PostgreSQL is running
    if ! systemctl is-active --quiet postgresql; then
        error "PostgreSQL is not running. Start it with: sudo systemctl start postgresql"
    fi
    
    log "All prerequisites are met"
}

# Test database connection
test_database() {
    log "Testing database connection..."
    
    if [[ -z "$DATABASE_URL" ]]; then
        error "DATABASE_URL is not set in .env file"
    fi
    
    # Test connection using psql
    if ! PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" &> /dev/null; then
        error "Cannot connect to database. Check your .env configuration."
    fi
    
    log "Database connection successful"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    if [[ -f package.json ]] && npm run --silent db:push &> /dev/null; then
        npm run db:push >> logs/migrations.log 2>&1
        log "Database migrations completed"
    else
        warn "No migration command found or migration failed. Check logs/migrations.log"
    fi
}

# Create logs directory if it doesn't exist
create_logs_dir() {
    if [[ ! -d logs ]]; then
        mkdir -p logs
        log "Created logs directory"
    fi
}

# Start the backend server
start_backend() {
    log "Starting backend server..."
    
    # Kill any existing processes on the port
    if command -v lsof &> /dev/null; then
        if lsof -Pi :${PORT:-5000} -sTCP:LISTEN -t >/dev/null 2>&1; then
            warn "Port ${PORT:-5000} is already in use. Killing existing process..."
            lsof -Pi :${PORT:-5000} -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
    fi
    
    # Start the server based on available scripts
    if [[ -f package.json ]]; then
        if npm run --silent dev &> /dev/null; then
            log "Starting with 'npm run dev'..."
            npm run dev >> logs/backend.log 2>&1 &
            BACKEND_PID=$!
        elif npm run --silent start &> /dev/null; then
            log "Starting with 'npm run start'..."
            npm run start >> logs/backend.log 2>&1 &
            BACKEND_PID=$!
        else
            log "Starting with 'node server/index.js'..."
            node server/index.js >> logs/backend.log 2>&1 &
            BACKEND_PID=$!
        fi
    else
        error "No package.json found. Cannot start the application."
    fi
    
    echo $BACKEND_PID > logs/backend.pid
    log "Backend server started with PID: $BACKEND_PID"
}

# Wait for server to be ready
wait_for_server() {
    log "Waiting for server to be ready..."
    
    local port=${PORT:-5000}
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s http://localhost:$port/api/health &> /dev/null || curl -s http://localhost:$port &> /dev/null; then
            log "Server is ready on port $port"
            return 0
        fi
        
        debug "Attempt $attempt/$max_attempts - Server not ready yet..."
        sleep 2
        ((attempt++))
    done
    
    warn "Server may not be fully ready yet. Check logs/backend.log for details."
}

# Monitor server status
monitor_server() {
    log "Server is running. Monitoring status..."
    log "Access the application at: http://localhost:${PORT:-5000}"
    log ""
    log "Useful commands:"
    log "  - View backend logs: tail -f logs/backend.log"
    log "  - Stop the server: ./stop.sh or kill \$(cat logs/backend.pid)"
    log "  - Check server status: curl http://localhost:${PORT:-5000}"
    log ""
    log "Press Ctrl+C to stop monitoring (server will continue running)"
    
    # Monitor the backend process
    while true; do
        if [[ -f logs/backend.pid ]]; then
            local pid=$(cat logs/backend.pid)
            if ! ps -p $pid > /dev/null 2>&1; then
                error "Backend process has stopped. Check logs/backend.log for details."
            fi
        fi
        sleep 10
    done
}

# Cleanup function
cleanup() {
    log "Shutting down..."
    if [[ -f logs/backend.pid ]]; then
        local pid=$(cat logs/backend.pid)
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
            log "Backend process stopped"
        fi
        rm -f logs/backend.pid
    fi
}

# Create stop script
create_stop_script() {
    if [[ ! -f stop.sh ]]; then
        cat > stop.sh << 'EOF'
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
EOF
        chmod +x stop.sh
        log "Created stop.sh script"
    fi
}

# Main start process
main() {
    log "Starting Shist application..."
    
    # Set up signal handlers
    trap cleanup EXIT INT TERM
    
    load_env
    check_prerequisites
    create_logs_dir
    test_database
    run_migrations
    create_stop_script
    start_backend
    wait_for_server
    
    log "Application started successfully!"
    monitor_server
}

# Handle command line arguments
case "${1:-}" in
    --background|-b)
        # Start in background mode
        load_env
        check_prerequisites
        create_logs_dir
        test_database
        run_migrations
        create_stop_script
        start_backend
        wait_for_server
        log "Application started in background. Use './stop.sh' to stop."
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --background, -b    Start in background mode"
        echo "  --help, -h          Show this help message"
        echo ""
        echo "The application will be available at http://localhost:${PORT:-5000}"
        ;;
    *)
        main "$@"
        ;;
esac