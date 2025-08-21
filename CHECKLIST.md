# Local Deployment Checklist for Shist

This checklist guides you through reproducing the Replit environment locally on Ubuntu/Debian systems.

## Prerequisites

### 1. Install Node.js 20+
```bash
# Option A: Using NodeSource repository (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Option B: Using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### 2. Install PostgreSQL
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
postgres=# CREATE DATABASE shist;
postgres=# CREATE USER shist WITH PASSWORD 'your_secure_password';
postgres=# GRANT ALL PRIVILEGES ON DATABASE shist TO shist;
postgres=# \q
```

### 3. Install Development Tools
```bash
sudo apt install git curl wget build-essential netcat-openbsd
```

## Setup Steps

### 4. Clone and Setup Project
```bash
git clone <your-repo-url> shist
cd shist
npm install
```

### 5. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your values
nano .env
```

Required environment variables:
- `DATABASE_URL=postgresql://shist:your_password@localhost:5432/shist`
- `SESSION_SECRET=your_secure_random_string` (generate with `openssl rand -hex 32`)
- `LOCAL_DEV=true`
- `NODE_ENV=development`
- `PORT=5000`

### 6. Initialize Database
```bash
# Run database migrations
npm run db:push
```

### 7. Verify Installation
```bash
# Make scripts executable
chmod +x start_local.sh smoke_test.sh verify_local.sh

# Run verification
./verify_local.sh
```

### 8. Start Application
```bash
# Development mode with hot reload
./start_local.sh

# Or manually
npm run dev
```

### 9. Test Application
```bash
# In another terminal
./smoke_test.sh
```

Access the application at: http://localhost:5000

## Alternative: Docker Deployment

### Option 1: Docker Compose (Recommended)
```bash
# Create .env file as above
cp .env.example .env
# Edit DATABASE_URL to: postgresql://shist:your_password@db:5432/shist

# Build and start
docker-compose up --build

# Run in background
docker-compose up -d
```

### Option 2: Manual Docker
```bash
# Build image
docker build -t shist .

# Run with PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_DB=shist \
  -e POSTGRES_USER=shist \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:16-alpine

# Run application
docker run -d --name shist \
  --link postgres:db \
  -e DATABASE_URL=postgresql://shist:your_password@db:5432/shist \
  -e SESSION_SECRET=your_secret \
  -e LOCAL_DEV=true \
  -p 5000:5000 \
  shist
```

## Production Deployment

### Systemd Service
```bash
# Copy application
sudo cp -r . /opt/shist
sudo chown -R shist:shist /opt/shist

# Install service
sudo cp shist.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable shist
sudo systemctl start shist
```

## Troubleshooting

### Common Issues

1. **Port 5000 already in use**
   ```bash
   sudo lsof -i :5000
   sudo kill -9 <PID>
   ```

2. **Database connection failed**
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -c "SELECT 1"
   ```

3. **Permission denied for scripts**
   ```bash
   chmod +x *.sh
   ```

4. **Node.js version too old**
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

### Verification Commands
```bash
# Check all services
./verify_local.sh

# Check individual components
node --version
psql --version
nc -z localhost 5000  # Test port
curl http://localhost:5000  # Test HTTP
```

### Log Locations
- Application logs: `stdout/stderr` (when run manually)
- Systemd logs: `sudo journalctl -u shist -f`
- PostgreSQL logs: `/var/log/postgresql/`

## Development Workflow

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Run database migrations**
   ```bash
   npm run db:push
   ```

3. **Build for production**
   ```bash
   npm run build
   npm run start
   ```

4. **Run tests**
   ```bash
   ./smoke_test.sh
   ./verify_local.sh
   ```

## Security Notes

- Change default passwords in production
- Use strong SESSION_SECRET (32+ characters)
- Enable firewall for production deployments
- Regular PostgreSQL updates and backups
- Use HTTPS in production (add reverse proxy like nginx)