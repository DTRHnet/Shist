#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"
EMAIL="${EMAIL:-demo@shist.local}"
PHONE="${PHONE:-+15555550123}"
CODE="${CODE:-${SMS_TEST_CODE:-000000}}"

echo "Testing /api/auth/user (expect 401)"
curl -s -i -c cookies.txt -b cookies.txt "$BASE_URL/api/auth/user" | head -n 1

echo "Requesting SMS OTP"
curl -s -X POST -H 'Content-Type: application/json' -d "{\"phone\":\"$PHONE\"}" "$BASE_URL/api/auth/sms/request" | jq .

echo "Logging in via Credentials (SMS)"
curl -s -i -c cookies.txt -b cookies.txt -X POST -H 'Content-Type: application/json' \
  -d "{\"callbackUrl\":\"/\",\"json\":true,\"csrfToken\":\"\",\"provider\":\"credentials\",\"phone\":\"$PHONE\",\"code\":\"$CODE\"}" \
  "$BASE_URL/api/auth/callback/credentials" | head -n 15

sleep 1

echo "Fetching /api/auth/user (expect 200)"
curl -s -i -c cookies.txt -b cookies.txt "$BASE_URL/api/auth/user" | head -n 1

echo "Done"