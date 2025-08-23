#!/bin/bash
# Comprehensive verification script for local Shist deployment
# Assumptions: Environment set up, dependencies installed
# User must: Have .env configured, database running
# Safety: Read-only verification, clear pass/fail reporting

set -e

echo "🔍 Verifying local Shist deployment"
echo "==================================="

ERRORS=0

# Helper function for reporting test results
report_test() {
    local test_name="$1"
    local result="$2"
    local message="$3"
    
    if [ "$result" = "pass" ]; then
        echo "✅ $test_name: $message"
    else
        echo "❌ $test_name: $message"
        ERRORS=$((ERRORS + 1))
    fi
}

# Check 1: Node.js version
echo "1. Checking Node.js installation..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        report_test "Node.js" "pass" "Version $NODE_VERSION (✓ >= 18)"
    else
        report_test "Node.js" "fail" "Version $NODE_VERSION (requires >= 18)"
    fi
else
    report_test "Node.js" "fail" "Not installed"
fi

# Check 2: npm and dependencies
echo "2. Checking npm dependencies..."
if [ -f "package.json" ] && [ -d "node_modules" ]; then
    report_test "Dependencies" "pass" "node_modules directory exists"
else
    report_test "Dependencies" "fail" "Run 'npm install' first"
fi

# Check 3: Environment configuration
echo "3. Checking environment configuration..."
if [ -f ".env" ]; then
    source .env 2>/dev/null || true
    
    if [ -n "$DATABASE_URL" ]; then
        report_test "DATABASE_URL" "pass" "Set"
    else
        report_test "DATABASE_URL" "fail" "Not set in .env"
    fi
    
    if [ -n "$SESSION_SECRET" ]; then
        report_test "SESSION_SECRET" "pass" "Set"
    else
        report_test "SESSION_SECRET" "fail" "Not set in .env"
    fi
    
    if [ "$LOCAL_DEV" = "true" ]; then
        report_test "LOCAL_DEV" "pass" "Enabled for local development"
    else
        report_test "LOCAL_DEV" "fail" "Should be 'true' for local development"
    fi
else
    report_test "Environment" "fail" ".env file not found (copy from .env.example)"
fi

# Check 4: Database availability
echo "4. Checking database connectivity..."
if [ -n "$DATABASE_URL" ] && command -v psql >/dev/null 2>&1; then
    if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        report_test "Database" "pass" "PostgreSQL connection successful"
    else
        report_test "Database" "fail" "Cannot connect to PostgreSQL"
    fi
elif [ -n "$DATABASE_URL" ]; then
    # Try basic port check if psql not available
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
        report_test "Database" "pass" "Database port accessible (install psql for full test)"
    else
        report_test "Database" "fail" "Database port not accessible"
    fi
else
    report_test "Database" "fail" "DATABASE_URL not configured"
fi

# Check 5: Build capability
echo "5. Checking build capability..."
if npm run build >/dev/null 2>&1; then
    report_test "Build" "pass" "Application builds successfully"
else
    report_test "Build" "fail" "Build process failed"
fi

# Check 6: TypeScript compilation
echo "6. Checking TypeScript..."
if npx tsc --noEmit >/dev/null 2>&1; then
    report_test "TypeScript" "pass" "No compilation errors"
else
    report_test "TypeScript" "fail" "TypeScript compilation errors found"
fi

# Run smoke tests if application is running
echo "7. Running smoke tests..."
if ./smoke_test.sh >/dev/null 2>&1; then
    report_test "Smoke tests" "pass" "All smoke tests passed"
else
    if nc -z localhost ${PORT:-5000} 2>/dev/null; then
        report_test "Smoke tests" "fail" "Application running but smoke tests failed"
    else
        report_test "Smoke tests" "fail" "Application not running (start with ./start_local.sh)"
    fi
fi

echo "==================================="

# Final report
if [ $ERRORS -eq 0 ]; then
    echo "🎉 All verifications passed! Your local deployment is ready."
    echo ""
    echo "Next steps:"
    echo "  • Start the application: ./start_local.sh"
    echo "  • Access at: http://localhost:${PORT:-5000}"
    echo "  • Check logs for any runtime issues"
    exit 0
else
    echo "⚠️  $ERRORS verification(s) failed. Please address the issues above."
    echo ""
    echo "Common fixes:"
    echo "  • Install Node.js 18+: https://nodejs.org/"
    echo "  • Install dependencies: npm install"
    echo "  • Configure environment: cp .env.example .env && edit .env"
    echo "  • Start PostgreSQL: sudo systemctl start postgresql"
    exit 1
fi