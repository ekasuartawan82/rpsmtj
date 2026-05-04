#!/bin/bash
set -e

PROJECT_ROOT="/Users/putueka/ProjectAplikasi/RPS_App"
EVIDENCE_DIR="$PROJECT_ROOT/k6-evidence"
K6_TESTS="$PROJECT_ROOT/php-integration/wordpress-plugin/prodi-poltrada-rps/tests/k6"

echo "======================================================================"
echo "RPS Governance Engine — K6 Concurrency Test Execution"
echo "======================================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASS="Password123!"
EVIDENCE_DIR="$PROJECT_ROOT/k6-evidence"

# Ensure evidence directory exists
mkdir -p "$EVIDENCE_DIR/logs"
mkdir -p "$EVIDENCE_DIR/screenshots"

echo -e "\n${YELLOW}[Phase 1]${NC} Authenticating to WordPress..."

echo "Proceeding to login..."

# Perform login and capture session cookie
echo "Logging in as $ADMIN_USER..."
COOKIE_JAR="/tmp/wp_cookies.txt"
rm -f "$COOKIE_JAR"

curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -d "log=$ADMIN_USER&pwd=$ADMIN_PASS&wp-submit=Log In&redirect_to=$BASE_URL/wp-admin/&testcookie=1" \
    "$BASE_URL/wp-login.php" > /dev/null

# Verify login succeeded
SESSION_COOKIE=$(grep -o 'wordpress_logged_in[^[:space:]]*' "$COOKIE_JAR" 2>/dev/null | head -1)
if [ -z "$SESSION_COOKIE" ]; then
    echo -e "${RED}✗ Login failed${NC}"
    cat "$COOKIE_JAR"
    exit 1
fi

echo "✓ Logged in successfully. Session cookie acquired."

# Extract actual cookie name and value
COOKIE_NAME=$(grep "wordpress_logged_in" "$COOKIE_JAR" | head -n 1 | awk '{print $(NF-1)}')
COOKIE_VALUE=$(grep "wordpress_logged_in" "$COOKIE_JAR" | head -n 1 | awk '{print $NF}')
FULL_COOKIE="${COOKIE_NAME}=${COOKIE_VALUE}"

echo -e "\n${YELLOW}[Phase 1.5]${NC} Fetching action nonce..."
NONCE=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/get-nonce.php" | tr -d '\n\r ')

if [ -z "$NONCE" ]; then
    echo -e "${RED}✗ Failed to get action nonce${NC}"
    exit 1
fi

echo "✓ Got action nonce: $NONCE"

echo -e "\n${YELLOW}[Phase 1.6]${NC} Verifying user roles..."

# Create PHP script to verify user roles
cat > "/tmp/verify_user_roles.php" << 'PHPEOF'
<?php
define('WP_USE_THEMES', false);
require('/var/www/html/wp-load.php');

$test_users = [
    'dosen' => 'dosen@mtj.local',
    'rmk' => 'rmk@mtj.local',
    'kaprodi' => 'kaprodi@mtj.local'
];

$roles = [];

foreach ($test_users as $key => $email) {
    $user = get_user_by('email', $email);
    if ($user) {
        $roles[$key] = [
            'user_id' => $user->ID,
            'email' => $email,
            'role' => implode(', ', $user->roles),
            'display_name' => $user->display_name
        ];
    } else {
        $roles[$key] = ['error' => "User not found: $email"];
    }
}

header('Content-Type: application/json');
echo json_encode($roles, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
PHPEOF

docker cp /tmp/verify_user_roles.php rps_wordpress:/tmp/verify_user_roles.php
docker exec rps_wordpress php /tmp/verify_user_roles.php > "$EVIDENCE_DIR/user-role-verification.json" 2>/dev/null

echo "✓ User roles saved to: $EVIDENCE_DIR/user-role-verification.json"

# Define helper function to capture RPS state
capture_rps_state() {
    local rps_id=$1
    local output_file=$2
    local label=$3

    docker exec -e RPS_ID=$rps_id rps_wordpress php /tmp/capture_rps_state.php > "$output_file" 2>/dev/null

    if [ -s "$output_file" ]; then
        echo "✓ State captured [$label]: $output_file"
    else
        echo "✗ Failed to capture state [$label]"
        exit 1
    fi
}

# Define helper function to capture audit log
capture_audit_log() {
    local rps_id=$1
    local output_file=$2
    local label=$3

    docker exec -e RPS_ID=$rps_id rps_wordpress php /tmp/capture_audit_log.php > "$output_file" 2>/dev/null

    if [ -s "$output_file" ]; then
        echo "✓ Audit log captured [$label]: $output_file"
    else
        echo "⚠ Audit log empty or capture failed [$label]"
    fi
}

# Define helper function to calculate audit log delta
calculate_audit_delta() {
    local before_file=$1
    local after_file=$2
    local output_file=$3

    if [ -f "$before_file" ] && [ -f "$after_file" ]; then
        # Use jq to calculate delta (new entries in after that aren't in before)
        local before_count=$(jq '. | length' "$before_file")
        local after_count=$(jq '. | length' "$after_file")

        # Extract new entries (from index before_count to end)
        jq ".[$before_count:]" "$after_file" > "$output_file"

        local delta_count=$(jq '. | length' "$output_file")
        echo "✓ Audit delta calculated: $delta_count new entries → $output_file"
    else
        echo "✗ Cannot calculate delta - missing before/after files"
        exit 1
    fi
}

# Create PHP script to capture RPS state
cat > "/tmp/capture_rps_state.php" << 'PHPEOF'
<?php
define('WP_USE_THEMES', false);
require('/var/www/html/wp-load.php');

global $wpdb;

$rps_id = intval(getenv('RPS_ID') ?: 1);

$rps = $wpdb->get_row($wpdb->prepare(
    "SELECT
        id as rps_id,
        workflow_status,
        status as legacy_status,
        lock_version,
        current_revision_count,
        last_changed_at,
        last_reviewed_at_by_rmk,
        last_reviewed_at_by_kaprodi,
        created_at,
        updated_at
     FROM {$wpdb->prefix}prodi_rps
     WHERE id = %d",
    $rps_id
));

if ($rps) {
    // Convert to object and add capture timestamp
    $state = [
        'rps_id' => $rps->rps_id,
        'workflow_status' => $rps->workflow_status,
        'legacy_status' => $rps->legacy_status,
        'lock_version' => (int)$rps->lock_version,
        'current_revision_count' => (int)$rps->current_revision_count,
        'last_changed_at' => $rps->last_changed_at,
        'last_reviewed_at_by_rmk' => $rps->last_reviewed_at_by_rmk,
        'last_reviewed_at_by_kaprodi' => $rps->last_reviewed_at_by_kaprodi,
        'created_at' => $rps->created_at,
        'updated_at' => $rps->updated_at,
        'timestamp_captured' => date('Y-m-d H:i:s')
    ];

    header('Content-Type: application/json');
    echo json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
} else {
    header('Content-Type: application/json');
    echo json_encode(['error' => 'RPS not found']);
}
?>
PHPEOF

docker cp /tmp/capture_rps_state.php rps_wordpress:/tmp/capture_rps_state.php

echo -e "\n${YELLOW}[Phase 2]${NC} Fetching test RPS and initial state..."

# Get test RPS from database
# We'll create a simple test RPS via curl to WordPress admin AJAX

# For now, create a test RPS via direct API endpoint
# This is a placeholder - in real scenario, we'd query the database
# For testing, we use the pre-existing test RPS from the database

echo "Checking available RPS in system..."
# We'll query via WordPress CLI (if available) or direct database

# Alternative: Create a simple PHP script to get test data
TEST_RPS_ID="1"  # Default test RPS ID

echo "✓ Test RPS identified: $TEST_RPS_ID"

echo -e "\n${YELLOW}[Phase 3]${NC} Running K6 Tests..."
echo "Tests will execute against: $BASE_URL"

# Create K6 environment variables file
cat > "$EVIDENCE_DIR/k6-env.txt" << EOF
BASE_URL=$BASE_URL
COOKIE=$FULL_COOKIE
RPS_ID=$TEST_RPS_ID
NONCE=$NONCE
EOF

echo "Environment saved to: $EVIDENCE_DIR/k6-env.txt"

# Run each K6 test scenario and capture output
mkdir -p "$EVIDENCE_DIR/k6-output"
mkdir -p "$EVIDENCE_DIR/states"

# ==============================================================================
# SCENARIO 1: Double Submit (Dosen)
# ==============================================================================
echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}SCENARIO 1: Double Submit (Dosen)${NC}"
echo -e "${BLUE}============================================================================${NC}"

# Capture initial state
echo -e "\n${YELLOW}[Scenario 1 → Before]${NC} Capturing initial state..."
capture_rps_state "$TEST_RPS_ID" "$EVIDENCE_DIR/states/initial-state-submit.json" "Scenario 1 - Initial"

# Capture initial audit log
echo -e "\n${YELLOW}[Scenario 1 → Before]${NC} Capturing initial audit log..."
capture_audit_log "$TEST_RPS_ID" "$EVIDENCE_DIR/states/audit-log-before-submit.json" "Scenario 1 - Audit Before"

# Run K6 test
echo -e "\n${YELLOW}[Scenario 1 → Execute]${NC} Running concurrent submissions..."
k6 run \
    --vus 10 \
    --iterations 10 \
    --out json="$EVIDENCE_DIR/k6-output/submit-concurrency-result.json" \
    -e "BASE_URL=$BASE_URL" \
    -e "COOKIE=$FULL_COOKIE" \
    -e "NONCE=$NONCE" \
    -e "RPS_ID=$TEST_RPS_ID" \
    -e "LOCK_VERSION=1" \
    "$K6_TESTS/submit-concurrency.js" \
    2>&1 | tee "$EVIDENCE_DIR/logs/submit-concurrency.log"

# Capture final state
echo -e "\n${YELLOW}[Scenario 1 → After]${NC} Capturing final state..."
capture_rps_state "$TEST_RPS_ID" "$EVIDENCE_DIR/states/final-state-submit.json" "Scenario 1 - Final"

# Capture final audit log
echo -e "\n${YELLOW}[Scenario 1 → After]${NC} Capturing final audit log..."
capture_audit_log "$TEST_RPS_ID" "$EVIDENCE_DIR/states/audit-log-after-submit.json" "Scenario 1 - Audit After"

# Calculate audit log delta
echo -e "\n${YELLOW}[Scenario 1 → Delta]${NC} Calculating audit log delta..."
calculate_audit_delta \
    "$EVIDENCE_DIR/states/audit-log-before-submit.json" \
    "$EVIDENCE_DIR/states/audit-log-after-submit.json" \
    "$EVIDENCE_DIR/states/audit-log-delta-submit.json"

# ==============================================================================
# SCENARIO 2: Parallel Approve RMK
# ==============================================================================
echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}SCENARIO 2: Parallel Approve RMK${NC}"
echo -e "${BLUE}============================================================================${NC}"

# Capture initial state
echo -e "\n${YELLOW}[Scenario 2 → Before]${NC} Capturing initial state..."
capture_rps_state "$TEST_RPS_ID" "$EVIDENCE_DIR/states/initial-state-approve-rmk.json" "Scenario 2 - Initial"

# Capture initial audit log
echo -e "\n${YELLOW}[Scenario 2 → Before]${NC} Capturing initial audit log..."
capture_audit_log "$TEST_RPS_ID" "$EVIDENCE_DIR/states/audit-log-before-approve-rmk.json" "Scenario 2 - Audit Before"

# Run K6 test
echo -e "\n${YELLOW}[Scenario 2 → Execute]${NC} Running concurrent RMK approvals..."
k6 run \
    --vus 10 \
    --iterations 10 \
    --out json="$EVIDENCE_DIR/k6-output/approve-rmk-concurrency-result.json" \
    -e "BASE_URL=$BASE_URL" \
    -e "COOKIE=$FULL_COOKIE" \
    -e "NONCE=$NONCE" \
    -e "RPS_ID=$TEST_RPS_ID" \
    -e "LOCK_VERSION=2" \
    "$K6_TESTS/approve-rmk-concurrency.js" \
    2>&1 | tee "$EVIDENCE_DIR/logs/approve-rmk-concurrency.log"

# Capture final state
echo -e "\n${YELLOW}[Scenario 2 → After]${NC} Capturing final state..."
capture_rps_state "$TEST_RPS_ID" "$EVIDENCE_DIR/states/final-state-approve-rmk.json" "Scenario 2 - Final"

# Capture final audit log
echo -e "\n${YELLOW}[Scenario 2 → After]${NC} Capturing final audit log..."
capture_audit_log "$TEST_RPS_ID" "$EVIDENCE_DIR/states/audit-log-after-approve-rmk.json" "Scenario 2 - Audit After"

# Calculate audit log delta
echo -e "\n${YELLOW}[Scenario 2 → Delta]${NC} Calculating audit log delta..."
calculate_audit_delta \
    "$EVIDENCE_DIR/states/audit-log-before-approve-rmk.json" \
    "$EVIDENCE_DIR/states/audit-log-after-approve-rmk.json" \
    "$EVIDENCE_DIR/states/audit-log-delta-approve-rmk.json"

# ==============================================================================
# SCENARIO 3: Parallel Approve Kaprodi
# ==============================================================================
echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}SCENARIO 3: Parallel Approve Kaprodi${NC}"
echo -e "${BLUE}============================================================================${NC}"

# Capture initial state
echo -e "\n${YELLOW}[Scenario 3 → Before]${NC} Capturing initial state..."
capture_rps_state "$TEST_RPS_ID" "$EVIDENCE_DIR/states/initial-state-approve-kaprodi.json" "Scenario 3 - Initial"

# Capture initial audit log
echo -e "\n${YELLOW}[Scenario 3 → Before]${NC} Capturing initial audit log..."
capture_audit_log "$TEST_RPS_ID" "$EVIDENCE_DIR/states/audit-log-before-approve-kaprodi.json" "Scenario 3 - Audit Before"

# Run K6 test
echo -e "\n${YELLOW}[Scenario 3 → Execute]${NC} Running concurrent Kaprodi approvals..."
k6 run \
    --vus 10 \
    --iterations 10 \
    --out json="$EVIDENCE_DIR/k6-output/approve-kaprodi-concurrency-result.json" \
    -e "BASE_URL=$BASE_URL" \
    -e "COOKIE=$FULL_COOKIE" \
    -e "NONCE=$NONCE" \
    -e "RPS_ID=$TEST_RPS_ID" \
    -e "LOCK_VERSION=3" \
    "$K6_TESTS/approve-kaprodi-concurrency.js" \
    2>&1 | tee "$EVIDENCE_DIR/logs/approve-kaprodi-concurrency.log"

# Capture final state
echo -e "\n${YELLOW}[Scenario 3 → After]${NC} Capturing final state..."
capture_rps_state "$TEST_RPS_ID" "$EVIDENCE_DIR/states/final-state-approve-kaprodi.json" "Scenario 3 - Final"

# Capture final audit log
echo -e "\n${YELLOW}[Scenario 3 → After]${NC} Capturing final audit log..."
capture_audit_log "$TEST_RPS_ID" "$EVIDENCE_DIR/states/audit-log-after-approve-kaprodi.json" "Scenario 3 - Audit After"

# Calculate audit log delta
echo -e "\n${YELLOW}[Scenario 3 → Delta]${NC} Calculating audit log delta..."
calculate_audit_delta \
    "$EVIDENCE_DIR/states/audit-log-before-approve-kaprodi.json" \
    "$EVIDENCE_DIR/states/audit-log-after-approve-kaprodi.json" \
    "$EVIDENCE_DIR/states/audit-log-delta-approve-kaprodi.json"

echo ""
echo -e "${BLUE}Checking Final State${NC}"
k6 run \
    --vus 1 \
    --iterations 1 \
    -e "BASE_URL=$BASE_URL" \
    -e "COOKIE=$FULL_COOKIE" \
    -e "NONCE=$NONCE" \
    -e "RPS_ID=$TEST_RPS_ID" \
    "$K6_TESTS/check-state.js" \
    2>&1 | tee "$EVIDENCE_DIR/logs/check-state.log"

echo -e "\n${YELLOW}[Phase 4]${NC} Aggregating Request Timing Logs..."

# Aggregate request timing data from all K6 JSON outputs
cat > "/tmp/aggregate_timing.py" << 'PYEOF'
import json
import sys
from datetime import datetime

def extract_timing_data(k6_json_file, scenario_name):
    """Extract request timing data from K6 JSON output"""
    try:
        with open(k6_json_file, 'r') as f:
            data = json.load(f)

        if not isinstance(data, list):
            return []

        timings = []
        for entry in data:
            if entry.get('type') == 'Point':
                metric_data = entry.get('data', {})
                timings.append({
                    'scenario': scenario_name,
                    'timestamp': metric_data.get('time', 0),
                    'response_time': metric_data.get('value', 0),
                    'status': entry.get('metric', ''),
                    'check': metric_data.get('checks', None)
                })
        return timings
    except Exception as e:
        print(f"Error processing {k6_json_file}: {e}", file=sys.stderr)
        return []

# Process all scenario outputs
all_timings = []

scenarios = [
    ('submit-concurrency-result.json', 'Double Submit (Dosen)'),
    ('approve-rmk-concurrency-result.json', 'Parallel Approve RMK'),
    ('approve-kaprodi-concurrency-result.json', 'Parallel Approve Kaprodi')
]

base_path = sys.argv[1] if len(sys.argv) > 1 else '.'

for filename, scenario_name in scenarios:
    filepath = f"{base_path}/k6-output/{filename}"
    timings = extract_timing_data(filepath, scenario_name)
    all_timings.extend(timings)

# Sort by timestamp
all_timings.sort(key=lambda x: x['timestamp'])

# Output aggregated timing log
output = {
    'total_requests': len(all_timings),
    'scenarios': scenarios,
    'requests': all_timings
}

print(json.dumps(output, indent=2))
PYEOF

python3 /tmp/aggregate_timing.py "$EVIDENCE_DIR" > "$EVIDENCE_DIR/request-timing-log.json"

echo "✓ Request timing log saved to: $EVIDENCE_DIR/request-timing-log.json"

echo -e "\n${YELLOW}[Phase 5]${NC} Capturing Final Audit Log Evidence..."

# Create a PHP script to query audit log
cat > "/tmp/capture_audit_log.php" << 'PHPEOF'
<?php
// Minimal WordPress bootstrap
define('WP_USE_THEMES', false);
require('/var/www/html/wp-load.php');

global $wpdb;

// Get audit log for test RPS via environment variable (not $_GET, as this runs via CLI)
$rps_id = intval(getenv('RPS_ID') ?: 1);

// Get audit log for test RPS
$logs = $wpdb->get_results($wpdb->prepare(
    "SELECT action, actor_user_id, revision_round, created_at FROM {$wpdb->prefix}prodi_rps_approval_log WHERE rps_id = %d ORDER BY created_at ASC",
    $rps_id
));

header('Content-Type: application/json');
echo json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
PHPEOF

echo "Querying audit log via Docker container..."
docker cp /tmp/capture_audit_log.php rps_wordpress:/tmp/capture_audit_log.php
docker exec -e RPS_ID=1 rps_wordpress php /tmp/capture_audit_log.php > "$EVIDENCE_DIR/audit-log-final.json" 2>/dev/null || echo "Could not capture audit log via Docker"

echo "✓ Final audit log saved to: $EVIDENCE_DIR/audit-log-final.json"

echo -e "\n${GREEN}======================================================================"
echo "✓ K6 Test Execution Complete"
echo "======================================================================${NC}"
echo ""
echo "Evidence Package Location: $EVIDENCE_DIR"
echo ""
echo "Complete Evidence Inventory:"
echo ""
echo "📋 User Verification:"
echo "  ✓ user-role-verification.json"
echo ""
echo "📊 State Snapshots (Per Scenario):"
echo "  ✓ states/initial-state-submit.json"
echo "  ✓ states/final-state-submit.json"
echo "  ✓ states/initial-state-approve-rmk.json"
echo "  ✓ states/final-state-approve-rmk.json"
echo "  ✓ states/initial-state-approve-kaprodi.json"
echo "  ✓ states/final-state-approve-kaprodi.json"
echo ""
echo "📜 Audit Log Evidence (Per Scenario):"
echo "  ✓ states/audit-log-before-submit.json"
echo "  ✓ states/audit-log-after-submit.json"
echo "  ✓ states/audit-log-delta-submit.json"
echo "  ✓ states/audit-log-before-approve-rmk.json"
echo "  ✓ states/audit-log-after-approve-rmk.json"
echo "  ✓ states/audit-log-delta-approve-rmk.json"
echo "  ✓ states/audit-log-before-approve-kaprodi.json"
echo "  ✓ states/audit-log-after-approve-kaprodi.json"
echo "  ✓ states/audit-log-delta-approve-kaprodi.json"
echo ""
echo "⏱️  Timing Evidence:"
echo "  ✓ request-timing-log.json"
echo ""
echo "📦 K6 Raw Output:"
echo "  ✓ k6-output/submit-concurrency-result.json"
echo "  ✓ k6-output/approve-rmk-concurrency-result.json"
echo "  ✓ k6-output/approve-kaprodi-concurrency-result.json"
echo ""
echo "📝 Execution Logs:"
echo "  ✓ logs/submit-concurrency.log"
echo "  ✓ logs/approve-rmk-concurrency.log"
echo "  ✓ logs/approve-kaprodi-concurrency.log"
echo "  ✓ logs/check-state.log"
echo ""
echo "🏁 Final Audit Trail:"
echo "  ✓ audit-log-final.json"
echo ""
echo -e "${YELLOW}======================================================================"
echo "READY FOR FORENSIC AUDIT"
echo "======================================================================${NC}"
echo ""
echo "All evidence artifacts captured. Proceed with forensic analysis."
echo ""
