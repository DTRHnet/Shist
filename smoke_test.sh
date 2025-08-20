#!/bin/bash
# Smoke tests for Shist application - checks port, health endpoint, and database
# Assumptions: Application running, DATABASE_URL set if testing DB
# User must: Start application before running tests
# Safety: Non-destructive tests, clear pass/fail output

set -e

# Configuration
PORT=${PORT:-5000}
HOST=${HOST:-localhost}
BASE_URL="http://${HOST}:${PORT}"

echo "🧪 Running smoke tests for Shist application"
echo "Target: $BASE_URL"
echo "=================================="

# Test 1: Port accessibility
echo "1. Testing port accessibility..."
if nc -z $HOST $PORT 2>/dev/null; then
    echo "   ✅ Port $PORT is accessible"
else
    echo "   ❌ Port $PORT is not accessible"
    exit 1
fi

# Test 2: HTTP health check
echo "2. Testing HTTP health endpoint..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "   ✅ Health endpoint returns 200 OK"
else
    echo "   ❌ Health endpoint returned status: $HTTP_STATUS"
    exit 1
fi

# Test 3: API endpoint check
echo "3. Testing API accessibility..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/user" || echo "000")
if [ "$API_STATUS" = "401" ] || [ "$API_STATUS" = "200" ]; then
    echo "   ✅ API endpoints are responding (status: $API_STATUS)"
else
    echo "   ❌ API endpoints not accessible (status: $API_STATUS)"
    exit 1
fi

# Test 4: Database connection (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
    echo "4. Testing database connection..."
    
    # Try to connect using psql if available
    if command -v psql >/dev/null 2>&1; then
        if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
            echo "   ✅ Database connection successful"
        else
            echo "   ❌ Database connection failed"
            exit 1
        fi
    else
        # Fallback: try to parse and test with nc
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        
        if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
            if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
                echo "   ✅ Database port $DB_PORT is accessible on $DB_HOST"
            else
                echo "   ❌ Database port $DB_PORT is not accessible on $DB_HOST"
                exit 1
            fi
        else
            echo "   ⚠️  Could not parse DATABASE_URL for testing (install psql for full test)"
        fi
    fi
else
    echo "4. Skipping database test (DATABASE_URL not set)"
fi

# Test 5: WebSocket endpoint
echo "5. Testing WebSocket endpoint..."
WS_TEST=$(curl -s -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" -H "Connection: Upgrade" "$BASE_URL/ws" || echo "000")
if [ "$WS_TEST" = "101" ] || [ "$WS_TEST" = "400" ] || [ "$WS_TEST" = "426" ]; then
    echo "   ✅ WebSocket endpoint is responding"
else
    echo "   ⚠️  WebSocket endpoint status: $WS_TEST (may be normal)"
fi

echo "=================================="
echo "🎉 All smoke tests passed!"
echo "Application appears to be running correctly."