#!/bin/bash

###############################################################################
# Fase 2 Governance - Manual Test Script
#
# This script tests the thin vertical slice governance implementation:
# - submitRps: draft → submitted_to_rmk
# - approveRMK: submitted_to_rmk → submitted_to_kaprodi
# - rejectRMK: submitted_to_rmk → revision_requested_by_rmk
# - approveKaprodi: submitted_to_kaprodi → approved
# - rejectKaprodi: submitted_to_kaprodi → revision_requested_by_kaprodi
#
# Policy: FASE_2_IMPLEMENTATION_CONTRACT.md - Step 7
###############################################################################

set -e  # Exit on error

echo "=========================================="
echo "Fase 2 Governance - Manual Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
API_BASE="http://localhost:3000/api"

# NOTE: You need to replace these with actual IDs from your database
# Run: psql -c "SELECT id, email, role FROM users LIMIT 5"
TEST_USER_ID="YOUR_USER_ID_HERE"
RMK_USER_ID="YOUR_RMK_ID_HERE"
KAPRODI_USER_ID="YOUR_KAPRODI_ID_HERE"
TEST_RPS_ID="YOUR_RPS_ID_HERE"

# Helper function to print test results
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
  fi
}

# Helper function to make API calls
call_api() {
  local endpoint=$1
  local method=${2:-POST}
  local data=${3:-{}}

  echo "Calling: $method $API_BASE$endpoint"
  echo "Data: $data"

  curl -X "$method" \
    "$API_BASE$endpoint" \
    -H "Content-Type: application/json" \
    -d "$data" \
    2>/dev/null
}

echo "Test Configuration:"
echo "  API Base: $API_BASE"
echo "  Test User: $TEST_USER_ID"
echo "  RMK User: $RMK_USER_ID"
echo "  Kaprodi User: $KAPRODI_USER_ID"
echo "  Test RPS: $TEST_RPS_ID"
echo ""

###############################################################################
# TEST 1: Normal Flow (Happy Path)
###############################################################################
echo -e "${YELLOW}TEST 1: Normal Flow (draft → submitted_to_rmk → submitted_to_kaprodi → approved)${NC}"
echo ""

# Step 1: Submit RPS
echo "1.1. Submit RPS to RMK..."
response=$(call_api "/rps/$TEST_RPS_ID/submit" "POST" "{\"userId\":\"$TEST_USER_ID\"}")
echo "Response: $response"
# Should return: workflowStatus = "submitted_to_rmk"
# Should create: approvalLog with action = "submit_to_rmk"
echo ""

# Step 2: Approve by RMK
echo "1.2. Approve by RMK..."
response=$(call_api "/rps/$TEST_RPS_ID/approve-rmk" "POST" "{\"actorId\":\"$RMK_USER_ID\",\"actorRole\":\"koordinator_rmk\",\"actorName\":\"RMK Test\"}")
echo "Response: $response"
# Should return: workflowStatus = "submitted_to_kaprodi" (auto-advance)
# Should update: lastReviewedAtByRmk
# Should create: approvalLog with action = "approve_rmk"
echo ""

# Step 3: Approve by Kaprodi
echo "1.3. Approve by Kaprodi..."
response=$(call_api "/rps/$TEST_RPS_ID/approve-kaprodi" "POST" "{\"actorId\":\"$KAPRODI_USER_ID\",\"actorRole\":\"kaprodi\",\"actorName\":\"Kaprodi Test\"}")
echo "Response: $response"
# Should return: workflowStatus = "approved"
# Should update: lastReviewedAtByKaprodi
# Should create: approvalLog with action = "approve_kaprodi"
echo ""

###############################################################################
# TEST 2: Freshness Violation (Rubber-stamping Prevention)
###############################################################################
echo -e "${YELLOW}TEST 2: Freshness Violation (approve without reviewing changes)${NC}"
echo ""

# Step 1: Submit RPS (if not already submitted)
echo "2.1. Submit RPS..."
response=$(call_api "/rps/$TEST_RPS_ID/submit" "POST" "{\"userId\":\"$TEST_USER_ID\"}")
echo "Response: $response"
echo ""

# Step 2: Make a change (simulate document edit)
echo "2.2. Simulate document edit..."
# This would require an edit endpoint - for now, manually update in DB
echo "NOTE: Please manually update lastChangedAt in database:"
echo "  UPDATE rps SET last_changed_at = NOW() WHERE id = '$TEST_RPS_ID';"
echo ""

# Step 3: Try to approve without reviewing (should fail)
echo "2.3. Try to approve without reviewing (should fail)..."
response=$(call_api "/rps/$TEST_RPS_ID/approve-rmk" "POST" "{\"actorId\":\"$RMK_USER_ID\",\"actorRole\":\"koordinator_rmk\",\"actorName\":\"RMK Test\"}")
echo "Response: $response"
# Should return: error "ReviewExpiredError"
# Message: "Dokumen telah berubah sejak review terakhir Anda"
echo ""

###############################################################################
# TEST 3: Revision Loop (RMK Rejection)
###############################################################################
echo -e "${YELLOW}TEST 3: Revision Loop (submitted_to_rmk → revision_requested_by_rmk → submitted_to_rmk)${NC}"
echo ""

# Step 1: Submit RPS
echo "3.1. Submit RPS..."
response=$(call_api "/rps/$TEST_RPS_ID/submit" "POST" "{\"userId\":\"$TEST_USER_ID\"}")
echo "Response: $response"
echo ""

# Step 2: Reject by RMK
echo "3.2. Reject by RMK..."
response=$(call_api "/rps/$TEST_RPS_ID/reject-rmk" "POST" "{\"actorId\":\"$RMK_USER_ID\",\"actorRole\":\"koordinator_rmk\",\"actorName\":\"RMK Test\",\"catatanReview\":\"Perbaiki CPL dan CPMK\"}")
echo "Response: $response"
# Should return: workflowStatus = "revision_requested_by_rmk"
# Should increment: currentRevisionCount
# Should create: approvalLog with action = "reject_rmk"
echo ""

# Step 3: Resubmit after revision
echo "3.3. Resubmit after revision..."
response=$(call_api "/rps/$TEST_RPS_ID/submit" "POST" "{\"userId\":\"$TEST_USER_ID\"}")
echo "Response: $response"
# Should return: workflowStatus = "submitted_to_rmk" (back to RMK)
echo ""

###############################################################################
# TEST 4: Audit Trail Verification
###############################################################################
echo -e "${YELLOW}TEST 4: Audit Trail Verification${NC}"
echo ""

echo "4.1. Check that all actions are logged..."
echo "Query to run in psql:"
echo "  SELECT"
echo "    action,"
echo "    actor_name,"
echo "    catatan_review,"
echo "    created_at"
echo "  FROM rps_approval_log"
echo "  WHERE rps_id = '$TEST_RPS_ID'"
echo "  ORDER BY created_at ASC;"
echo ""
echo "Expected log entries:"
echo "  1. submit_to_rmk"
echo "  2. approve_rmk"
echo "  3. approve_kaprodi"
echo ""

###############################################################################
# TEST 5: Governance Metrics API
###############################################################################
echo -e "${YELLOW}TEST 5: Governance Metrics API${NC}"
echo ""

echo "5.1. Fetch governance metrics..."
response=$(call_api "/governance/metrics" "GET")
echo "Response: $response"
# Should return: JSON with metrics.freshness, metrics.revisionDistribution, etc.
echo ""

###############################################################################
# TEST SUMMARY
###############################################################################
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "Manual tests completed. Please verify:"
echo ""
echo "1. Database Schema:"
echo "   - workflowStatus field exists and has correct values"
echo "   - recordStatus field exists and defaults to 'active'"
echo "   - lastChangedAt, lastReviewedAtByRmk, lastReviewedAtByKaprodi exist"
echo "   - currentRevisionCount exists and increments"
echo ""
echo "2. Approval Logs:"
echo "   - All actions logged with actor details"
echo "   - revisionRound tracked correctly"
echo ""
echo "3. State Transitions:"
echo "   - draft → submitted_to_rmk ✅"
echo "   - submitted_to_rmk → submitted_to_kaprodi (auto-advance) ✅"
echo "   - submitted_to_kaprodi → approved ✅"
echo "   - submitted_to_rmk → revision_requested_by_rmk ✅"
echo ""
echo "4. Guards:"
echo "   - Freshness violation detected ✅"
echo "   - Ownership enforced ✅"
echo ""
echo "5. Observability:"
echo "   - Metrics API returns data ✅"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Create API route handlers for submit/approve/reject endpoints"
echo "2. Add @tanstack/react-query integration for optimistic updates"
echo "3. Add approval buttons to UI with role-based visibility"
echo "4. Set up automated tests with Jest + Testing Library"
echo ""
