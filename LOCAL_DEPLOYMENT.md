# Shist - Local Linux Deployment Guide

This guide helps you deploy Shist on your local Linux machine using the provided installation scripts.

## Prerequisites

- A Linux machine running Ubuntu/Debian, Fedora/CentOS/RHEL, or Arch/Manjaro
- Internet connection for downloading packages
- Sudo privileges for installing system packages

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd shist
   ```

2. **Run the installation script:**
   ```bash
   ./install.sh
   ```

3. **Start the application:**
   ```bash
   ./start.sh
   ```

4. **Access the application:**
   Open your browser and navigate to `http://localhost:5000`

## Installation Script (install.sh)

The installation script automatically:

### System Detection
- Detects your Linux distribution (Ubuntu/Debian, Fedora/CentOS/RHEL, Arch/Manjaro)
- Installs distribution-specific packages

### Software Installation
- **Node.js v20+** - Runtime for the application
- **Python3 with venv** - For potential Python dependencies
- **PostgreSQL** - Database server
- **Build tools** - git, curl, build-essential (or distro equivalents)

### Database Setup
- Creates a PostgreSQL database and user
- Prompts for database configuration:
  - Database name (default: `shist`)
  - Database user (default: `shist_user`)
  - Database password (required)
- Configures PostgreSQL for local development access
- Updates `pg_hba.conf` for authentication

### Environment Configuration
- Generates a `.env` file with database connection details
- Creates secure session secrets
- Sets up development environment variables

### Project Setup
- Installs Node.js dependencies via `npm install`
- Creates logs directory
- Sets executable permissions on scripts

## Start Script (start.sh)

The start script handles:

### Environment Loading
- Loads variables from `.env` file
- Validates required configuration

### Prerequisites Check
- Verifies Node.js v20+ is installed
- Confirms PostgreSQL is running
- Tests database connectivity

### Database Migrations
- Runs `npm run db:push` to apply schema changes
- Logs migration output to `logs/migrations.log`

### Server Management
- Kills any existing processes on the configured port
- Starts the backend server using `npm run dev`
- Monitors server health and readiness
- Provides real-time status monitoring

### Process Management
- Creates PID files for process tracking
- Generates a `stop.sh` script for clean shutdown
- Handles graceful shutdown on Ctrl+C

## Usage Options

### Foreground Mode (Default)
```bash
./start.sh
```
- Runs with real-time monitoring
- Shows server status and logs
- Press Ctrl+C to stop monitoring (server continues)

### Background Mode
```bash
./start.sh --background
```
- Starts server in background
- Returns control to terminal immediately
- Use `./stop.sh` to stop the server

### Help
```bash
./start.sh --help
```
- Shows available options and usage

## File Structure

After installation, your project will have:

```
shist/
├── install.sh          # Installation script
├── start.sh            # Start script  
├── stop.sh             # Stop script (auto-generated)
├── .env                # Environment variables
├── logs/               # Application logs
│   ├── backend.log     # Server logs
│   ├── migrations.log  # Database migration logs
│   └── backend.pid     # Process ID file
└── ... (project files)
```

## Environment Variables

The `.env` file contains:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
PGHOST=localhost
PGPORT=5432
PGDATABASE=shist
PGUSER=shist_user
PGPASSWORD=your_password

# Session Configuration
SESSION_SECRET=randomly_generated_secret

# Application Configuration
NODE_ENV=development
PORT=5000
REPLIT_DOMAINS=localhost:5000

# OIDC Configuration
ISSUER_URL=https://replit.com/oidc
```

## Stopping the Application

### Using the stop script:
```bash
./stop.sh
```

### Manual cleanup:
```bash
# Kill the process
kill $(cat logs/backend.pid)

# Or kill by port
lsof -ti:5000 | xargs kill -9
```

## Troubleshooting

### Installation Issues

**Permission denied:**
```bash
chmod +x install.sh start.sh
```

**Package installation fails:**
- Ensure you have sudo privileges
- Update package repositories: `sudo apt update` (Ubuntu/Debian)

**PostgreSQL service not starting:**
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### Runtime Issues

**Database connection fails:**
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify database credentials in `.env`
- Test connection manually: `psql -h localhost -U shist_user -d shist`

**Port already in use:**
- The script automatically kills existing processes
- Manual cleanup: `lsof -ti:5000 | xargs kill -9`

**Node.js version issues:**
- Ensure Node.js v20+ is installed: `node --version`
- Reinstall Node.js if needed

### Log Files

Check these log files for detailed error information:

- `logs/backend.log` - Server application logs
- `logs/migrations.log` - Database migration logs
- `/var/log/postgresql/` - PostgreSQL logs (if needed)

## Security Notes

### Development vs Production

This setup is intended for **local development only**. For production deployment:

- Use environment-specific secrets
- Configure proper firewall rules
- Set up SSL/TLS certificates
- Use a reverse proxy (nginx/Apache)
- Configure proper PostgreSQL authentication
- Set `NODE_ENV=production`

### Default Configuration

The scripts configure PostgreSQL for local development with:
- Local connections allowed
- MD5 password authentication
- Database user with full privileges

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review log files in the `logs/` directory
3. Ensure all prerequisites are installed correctly
4. Verify database connectivity and permissions

## Additional Configuration

### Custom Database Settings

Edit the `.env` file to modify:
- Database host/port
- Connection timeouts
- SSL settings

### Application Settings

Modify these variables in `.env`:
- `PORT` - Change the application port
- `NODE_ENV` - Set to `production` for production builds
- `SESSION_SECRET` - Use a secure, random string

### PostgreSQL Tuning

For better performance, consider tuning PostgreSQL:
- Edit `/etc/postgresql/*/main/postgresql.conf`
- Adjust `shared_buffers`, `work_mem`, etc.
- Restart PostgreSQL: `sudo systemctl restart postgresql`