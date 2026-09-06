#!/bin/bash
# Capture RPS state snapshot from database
# Usage: ./scripts/capture-state.sh <rps_id> <output_file> <label>

RPS_ID="${1:-1}"
OUTPUT_FILE="${2:-state.json}"
LABEL="${3:-state}"

MYSQL_HOST="127.0.0.1"
MYSQL_PORT="3307"
MYSQL_USER="wordpress"
MYSQL_PASS="wordpress"
MYSQL_DB="wordpress"

echo "Capturing state for RPS ID=$RPS_ID as $LABEL..."

# Query RPS state
if command -v mysql &> /dev/null; then
  MYSQL_CMD=(mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" -N -s -e)
else
  MYSQL_CMD=(docker exec rps_mysql mysql -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" -N -s -e)
fi

"${MYSQL_CMD[@]}" "
  SELECT JSON_OBJECT(
    'rps_id', id,
    'workflow_status', workflow_status,
    'lock_version', lock_version,
    'current_revision_count', current_revision_count,
    'last_changed_at', last_changed_at,
    'last_reviewed_at_by_rmk', last_reviewed_at_by_rmk,
    'last_reviewed_at_by_kaprodi', last_reviewed_at_by_kaprodi,
    'timestamp_captured', NOW()
  ) as state
  FROM wp_prodi_rps
  WHERE id = $RPS_ID;
" > "$OUTPUT_FILE"

if [ -s "$OUTPUT_FILE" ]; then
    echo "✓ State captured to $OUTPUT_FILE"
    cat "$OUTPUT_FILE" | jq . 2>/dev/null || cat "$OUTPUT_FILE"
else
    echo "✗ Failed to capture state or RPS not found"
    exit 1
fi
