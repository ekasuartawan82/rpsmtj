#!/bin/bash

# Test Script untuk RPS Print & PDF Export
# Usage: ./scripts/test-rps-export.sh <rps_id>

RPS_ID=$1
BASE_URL=${2:-"http://localhost:3000"}

if [ -z "$RPS_ID" ]; then
  echo "❌ Error: RPS ID diperlukan"
  echo "Usage: ./scripts/test-rps-export.sh <rps_id> [base_url]"
  echo "Example: ./scripts/test-rps-export.sh abc-123-def http://localhost:3000"
  exit 1
fi

echo "🧪 Testing RPS Print & PDF Export"
echo "=================================="
echo "RPS ID: $RPS_ID"
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Counter
TOTAL=0
PASSED=0
FAILED=0

# Helper function
run_test() {
  local test_name=$1
  local test_command=$2
  local expected=$3

  TOTAL=$((TOTAL + 1))
  echo "Test $TOTAL: $test_name"

  eval "$test_command"
  local result=$?

  if [ $result -eq $expected ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected: $expected, Got: $result)"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# C.1: Export saat RPS draft
echo "### C. PDF Export Tests ###"
echo ""

# C.2: Export saat RPS approved
echo "Testing PDF Export for approved RPS..."
HTTP_STATUS=$(curl -s -o /tmp/rps_export_test.pdf -w "%{http_code}" \
  -X POST \
  "$BASE_URL/api/rps/$RPS_ID/export/pdf")

echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC} - PDF export successful"
  PASSED=$((PASSED + 1))

  # Check file size
  FILE_SIZE=$(wc -c < /tmp/rps_export_test.pdf)
  echo "File size: $FILE_SIZE bytes"

  if [ $FILE_SIZE -gt 1000 ]; then
    echo -e "${GREEN}✓ PASS${NC} - PDF file size reasonable"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} - PDF file too small"
    FAILED=$((FAILED + 1))
  fi
  TOTAL=$((TOTAL + 2))

else
  echo -e "${RED}✗ FAIL${NC} - PDF export failed with HTTP $HTTP_STATUS"
  FAILED=$((FAILED + 1))
  TOTAL=$((TOTAL + 1))
fi
echo ""

# B.1 & B.2: Print Preview
echo "### B. Print Preview Tests ###"
echo ""

echo "Testing Print Preview..."
HTTP_STATUS=$(curl -s -o /tmp/rps_print_test.html -w "%{http_code}" \
  "$BASE_URL/rps/$RPS_ID/print")

echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC} - Print preview accessible"
  PASSED=$((PASSED + 1))

  # Check if HTML contains expected content
  if grep -q "POLITEKNIK TRANSPORTASI DARAT BALI" /tmp/rps_print_test.html; then
    echo -e "${GREEN}✓ PASS${NC} - Header institusi muncul"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} - Header institusi tidak ditemukan"
    FAILED=$((FAILED + 1))
  fi
  TOTAL=$((TOTAL + 2))
else
  echo -e "${RED}✗ FAIL${NC} - Print preview failed with HTTP $HTTP_STATUS"
  FAILED=$((FAILED + 1))
  TOTAL=$((TOTAL + 1))
fi
echo ""

# Summary
echo "=================================="
echo "Test Summary"
echo "=================================="
echo "Total: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

# Cleanup
rm -f /tmp/rps_export_test.pdf /tmp/rps_print_test.html

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Check the output above.${NC}"
  exit 1
fi
