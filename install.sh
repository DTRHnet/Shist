#!/bin/bash

# Shist Local Linux Installation Script
# Detects Linux distro and installs all prerequisites

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "Please don't run this script as root. It will use sudo when needed."
    fi
}

# Detect Linux distribution
detect_distro() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    else
        error "Cannot detect Linux distribution"
    fi
    
    # Handle Kali Linux specifically
    if [[ "$DISTRO" == "kali" ]]; then
        log "Detected Kali Linux - using Debian-based package management"
        DISTRO="debian"  # Treat Kali as Debian for package management
    fi
    
    log "Detected distribution: $DISTRO $VERSION"
}

# Install Node.js v20+
install_nodejs() {
    log "Installing Node.js..."
    
    # Check if Node.js 20+ is already installed
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $NODE_VERSION -ge 20 ]]; then
            log "Node.js $NODE_VERSION is already installed"
            return
        fi
    fi
    
    # Install Node.js using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    
    case $DISTRO in
        ubuntu|debian|kali)
            sudo apt-get install -y nodejs
            ;;
        fedora|centos|rhel)
            sudo dnf install -y nodejs npm
            ;;
        arch|manjaro)
            sudo pacman -S --noconfirm nodejs npm
            ;;
        *)
            error "Unsupported distribution: $DISTRO"
            ;;
    esac
    
    log "Node.js installed successfully"
}

# Install Python3 with venv
install_python() {
    log "Installing Python3 with venv..."
    
    case $DISTRO in
        ubuntu|debian|kali)
            sudo apt-get update
            sudo apt-get install -y python3 python3-venv python3-pip
            ;;
        fedora|centos|rhel)
            sudo dnf install -y python3 python3-venv python3-pip
            ;;
        arch|manjaro)
            sudo pacman -S --noconfirm python python-virtualenv python-pip
            ;;
        *)
            error "Unsupported distribution: $DISTRO"
            ;;
    esac
    
    log "Python3 with venv installed successfully"
}

# Install PostgreSQL
install_postgresql() {
    log "Installing PostgreSQL..."
    
    case $DISTRO in
        ubuntu|debian|kali)
            sudo apt-get install -y postgresql postgresql-contrib
            ;;
        fedora|centos|rhel)
            sudo dnf install -y postgresql postgresql-server postgresql-contrib
            # Initialize database for RHEL-based systems
            if [[ ! -d /var/lib/pgsql/data/base ]]; then
                sudo postgresql-setup --initdb
            fi
            ;;
        arch|manjaro)
            sudo pacman -S --noconfirm postgresql
            # Initialize database for Arch-based systems
            if [[ ! -d /var/lib/postgres/data/base ]]; then
                sudo -u postgres initdb -D /var/lib/postgres/data
            fi
            ;;
        *)
            error "Unsupported distribution: $DISTRO"
            ;;
    esac
    
    # Start and enable PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    log "PostgreSQL installed and started successfully"
}

# Install build tools and dependencies
install_build_tools() {
    log "Installing build tools and dependencies..."
    
    case $DISTRO in
        ubuntu|debian|kali)
            sudo apt-get install -y git curl build-essential
            ;;
        fedora|centos|rhel)
            sudo dnf groupinstall -y "Development Tools"
            sudo dnf install -y git curl
            ;;
        arch|manjaro)
            sudo pacman -S --noconfirm base-devel git curl
            ;;
        *)
            error "Unsupported distribution: $DISTRO"
            ;;
    esac
    
    log "Build tools installed successfully"
}

# Setup PostgreSQL database
setup_database() {
    log "Setting up PostgreSQL database..."
    
    # Check if .env exists and read values
    if [[ -f .env ]]; then
        source .env
        DB_NAME=${PGDATABASE:-shist}
        DB_USER=${PGUSER:-shist_user}
        DB_PASSWORD=${PGPASSWORD}
    fi
    
    # Prompt for database configuration if not set
    if [[ -z "$DB_NAME" ]]; then
        read -p "Enter database name [shist]: " DB_NAME
        DB_NAME=${DB_NAME:-shist}
    fi
    
    if [[ -z "$DB_USER" ]]; then
        read -p "Enter database user [shist_user]: " DB_USER
        DB_USER=${DB_USER:-shist_user}
    fi
    
    if [[ -z "$DB_PASSWORD" ]]; then
        read -s -p "Enter database password: " DB_PASSWORD
        echo
        if [[ -z "$DB_PASSWORD" ]]; then
            error "Database password cannot be empty"
        fi
    fi
    
    # Create database and user
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || warn "Database $DB_NAME may already exist"
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>/dev/null || warn "User $DB_USER may already exist"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;" # Allow user to create test databases
    
    # Set up connection for the user
    sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
    
    log "Database setup completed successfully"
}

# Configure PostgreSQL for local development
configure_postgresql() {
    log "Configuring PostgreSQL for local development..."
    
    # Find PostgreSQL configuration directory
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
    
    case $DISTRO in
        ubuntu|debian|kali)
            PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"
            ;;
        fedora|centos|rhel)
            PG_CONFIG_DIR="/var/lib/pgsql/data"
            ;;
        arch|manjaro)
            PG_CONFIG_DIR="/var/lib/postgres/data"
            ;;
    esac
    
    # Backup original files
    if [[ -f "$PG_CONFIG_DIR/pg_hba.conf" ]]; then
        sudo cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup" 2>/dev/null || true
    fi
    
    # Configure pg_hba.conf for local development (allow local connections)
    if [[ -f "$PG_CONFIG_DIR/pg_hba.conf" ]]; then
        if ! sudo grep -q "local.*$DB_USER.*md5" "$PG_CONFIG_DIR/pg_hba.conf"; then
            sudo sed -i "/^local.*all.*all.*peer/i local   $DB_NAME    $DB_USER                                md5" "$PG_CONFIG_DIR/pg_hba.conf"
        fi
    fi
    
    # Restart PostgreSQL to apply changes
    sudo systemctl restart postgresql
    
    log "PostgreSQL configured for local development"
}

# Generate .env file
generate_env_file() {
    log "Generating .env file..."
    
    if [[ ! -f .env ]]; then
        cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
PGHOST=localhost
PGPORT=5432
PGDATABASE=$DB_NAME
PGUSER=$DB_USER
PGPASSWORD=$DB_PASSWORD

# Session Configuration
SESSION_SECRET=$(openssl rand -hex 32)

# Application Configuration
NODE_ENV=development
PORT=5000
LOCAL_DEV=true
VITE_LOCAL_DEV=true

# Replit domains (not used in local deployment)
REPLIT_DOMAINS=localhost:5000

# OIDC Configuration (for local development)
ISSUER_URL=https://replit.com/oidc
EOF
        log ".env file created successfully"
    else
        log ".env file already exists, skipping generation"
    fi
}

# Set executable permissions
set_permissions() {
    log "Setting executable permissions..."
    chmod +x install.sh
    chmod +x start.sh
    log "Permissions set successfully"
}

# Install project dependencies
install_dependencies() {
    log "Installing project dependencies..."
    
    if [[ -f package.json ]]; then
        npm install
        
        # Install tsx globally for TypeScript execution if not already installed
        if ! command -v tsx &> /dev/null; then
            log "Installing tsx for TypeScript support..."
            npm install -g tsx
        fi
        
        log "Node.js dependencies installed"
    else
        warn "No package.json found, skipping npm install"
    fi
}

# Create logs directory
create_logs_dir() {
    log "Creating logs directory..."
    mkdir -p logs
    log "Logs directory created"
}

# Main installation process
main() {
    log "Starting Shist local installation..."
    
    check_root
    detect_distro
    install_build_tools
    install_nodejs
    install_python
    install_postgresql
    setup_database
    configure_postgresql
    generate_env_file
    install_dependencies
    create_logs_dir
    set_permissions
    
    log "Installation completed successfully!"
    log ""
    log "Next steps:"
    log "1. Review the .env file and update any configuration as needed"
    log "2. Run './start.sh' to start the application"
    log ""
    log "The application will be available at http://localhost:5000"
}

# Run main function
main "$@"