#!/bin/bash
# Script: K6 Smoke Pattern Validation
# Purpose: Validate K6 smoke test matches RUN #4 baseline pattern
# Usage: ./scripts/check_k6_smoke.sh <k6-output.json>

set -e

K6_OUTPUT=$1

if [ -z "$K6_OUTPUT" ]; then
  echo "❌ Usage: $0 <k6-output.json>"
  exit 1
fi

if [ ! -f "$K6_OUTPUT" ]; then
  echo "❌ Error: File not found: $K6_OUTPUT"
  exit 1
fi

echo "🔍 K6 Smoke Pattern Validation"
echo "================================"
echo "File: $K6_OUTPUT"
echo ""

# Count status codes from http_reqs metrics
STATUS_200=$(grep -o '"metric":"http_reqs"[^}]*"status":"200"' "$K6_OUTPUT" | wc -l | tr -d ' ')
STATUS_403=$(grep -o '"metric":"http_reqs"[^}]*"status":"403"' "$K6_OUTPUT" | wc -l | tr -d ' ')
STATUS_409=$(grep -o '"metric":"http_reqs"[^}]*"status":"409"' "$K6_OUTPUT" | wc -l | tr -d ' ')
STATUS_500=$(grep -o '"metric":"http_reqs"[^}]*"status":"500"' "$K6_OUTPUT" | wc -l | tr -d ' ')

# Total requests (http_reqs data points with status)
TOTAL_REQUESTS=$(grep -c '"metric":"http_reqs".*"status"' "$K6_OUTPUT")

echo "📊 HTTP Status Distribution:"
echo "  HTTP 200: $STATUS_200"
echo "  HTTP 403: $STATUS_403"
echo "  HTTP 409: $STATUS_409"
echo "  HTTP 500: $STATUS_500"
echo "  Total Requests: $TOTAL_REQUESTS"
echo ""

# Expected pattern (baseline RUN #4)
# 1× HTTP 200, 9× HTTP 403/409
EXPECTED_SUCCESS=1
EXPECTED_FAILURE=9
TOTAL_EXPECTED=10

# Validation
PASS=true

echo "✅ VALIDATION RESULTS:"
echo "===================="

# Check 1: Exactly 1 success
if [ "$STATUS_200" -eq "$EXPECTED_SUCCESS" ]; then
  echo "  ✓ Success count: $STATUS_200 (expected: $EXPECTED_SUCCESS)"
else
  echo "  ✗ FAIL - Success count: $STATUS_200 (expected: $EXPECTED_SUCCESS)"
  PASS=false
fi

# Check 2: N-1 failures (403 or 409)
TOTAL_FAILURES=$((STATUS_403 + STATUS_409))
if [ "$TOTAL_FAILURES" -eq "$EXPECTED_FAILURE" ]; then
  echo "  ✓ Failure count: $TOTAL_FAILURES (expected: $EXPECTED_FAILURE)"
else
  echo "  ✗ FAIL - Failure count: $TOTAL_FAILURES (expected: $EXPECTED_FAILURE)"
  PASS=false
fi

# Check 3: No HTTP 500
if [ "$STATUS_500" -eq 0 ]; then
  echo "  ✓ HTTP 500: 0 (good)"
else
  echo "  ✗ FAIL - HTTP 500 found: $STATUS_500 (must be 0)"
  PASS=false
fi

# Check 4: Total requests
if [ "$TOTAL_REQUESTS" -eq "$TOTAL_EXPECTED" ]; then
  echo "  ✓ Total requests: $TOTAL_REQUESTS (expected: $TOTAL_EXPECTED)"
else
  echo "  ✗ FAIL - Total requests: $TOTAL_REQUESTS (expected: $TOTAL_EXPECTED)"
  PASS=false
fi

echo ""
echo "================================"

if [ "$PASS" = true ]; then
  echo "✅ K6 SMOKE TEST: PASS"
  echo "Pattern matches RUN #4 baseline"
  exit 0
else
  echo "❌ K6 SMOKE TEST: FAIL"
  echo "Pattern does NOT match RUN #4 baseline"
  echo ""
  echo "⚠️  ACTION REQUIRED:"
  echo "1. Stop implementation"
  echo "2. Read FIRST_FAILURE_RESPONSE.md"
  echo "3. Identify root cause"
  echo "4. Fix before proceeding"
  exit 1
fi
