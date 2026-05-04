#!/bin/bash
# Transform raw K6 NDJSON output to evidence/k6_summary.json format
# Usage: ./scripts/transform_k6_output.sh <k6-output.json> <evidence/k6_summary.json>
#
# Required before CI/CD Gate 3 can validate K6 results.
# Run this after each K6 test scenario completes.

K6_OUTPUT="${1:-}"
OUTPUT_FILE="${2:-evidence/k6_summary.json}"

if [ -z "$K6_OUTPUT" ] || [ ! -f "$K6_OUTPUT" ]; then
  echo "Usage: $0 <k6-output-ndjson> <output-summary-json>"
  echo "Example: $0 k6-evidence/k6-output/submit-concurrency-result.json evidence/k6_summary.json"
  exit 1
fi

echo "Parsing K6 output: $K6_OUTPUT"

# K6 NDJSON: each line is a JSON object with "metric" and "data" fields
# Point entries have type="Point" and metric="http_req_duration" with tags.status

HTTP_200=$(grep '"metric":"http_reqs"' "$K6_OUTPUT" | grep '"status":"200"' | wc -l | tr -d ' ')
HTTP_403=$(grep '"metric":"http_reqs"' "$K6_OUTPUT" | grep '"status":"403"' | wc -l | tr -d ' ')
HTTP_409=$(grep '"metric":"http_reqs"' "$K6_OUTPUT" | grep '"status":"409"' | wc -l | tr -d ' ')
HTTP_500=$(grep '"metric":"http_reqs"' "$K6_OUTPUT" | grep '"status":"500"' | wc -l | tr -d ' ')

# delta_lock_version and delta_audit_log must be provided manually after DB state check
# (K6 does not query the database — these come from capture-state.sh)
DELTA_LOCK="${DELTA_LOCK_VERSION:-}"
DELTA_AUDIT="${DELTA_AUDIT_LOG:-}"

if [ -z "$DELTA_LOCK" ] || [ -z "$DELTA_AUDIT" ]; then
  echo ""
  echo "⚠️  DELTA VALUES REQUIRED"
  echo "   Run capture-state.sh before and after K6 test, then set:"
  echo "   export DELTA_LOCK_VERSION=1"
  echo "   export DELTA_AUDIT_LOG=1"
  echo "   Then re-run this script."
  echo ""
  DELTA_LOCK="UNKNOWN"
  DELTA_AUDIT="UNKNOWN"
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

cat > "$OUTPUT_FILE" << EOF
{
  "http_200_count": $HTTP_200,
  "http_403_count": $HTTP_403,
  "http_409_count": $HTTP_409,
  "http_500_count": $HTTP_500,
  "delta_lock_version": $DELTA_LOCK,
  "delta_audit_log": $DELTA_AUDIT,
  "concurrent_users": 10,
  "source_file": "$K6_OUTPUT",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "✅ K6 summary written to: $OUTPUT_FILE"
echo ""
echo "  HTTP 200: $HTTP_200 (expected: 1)"
echo "  HTTP 403: $HTTP_403 (expected: 9)"
echo "  HTTP 409: $HTTP_409"
echo "  HTTP 500: $HTTP_500 (expected: 0)"
echo "  Δlock:    $DELTA_LOCK (expected: 1)"
echo "  Δaudit:   $DELTA_AUDIT (expected: 1)"
