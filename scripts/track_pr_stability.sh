#!/bin/bash
# PR Stability Tracker
# Usage: ./scripts/track_pr_stability.sh <PR_NUMBER> <pass|fail>

PR_NUMBER="${1:-}"
PR_STATUS="${2:-}"
STABILITY_FILE="$(git rev-parse --show-toplevel)/.pr_stability_log"

if [ -z "$PR_NUMBER" ] || [ -z "$PR_STATUS" ]; then
  echo "Usage: $0 <PR_NUMBER> <pass|fail>"
  exit 1
fi

if [ "$PR_STATUS" != "pass" ] && [ "$PR_STATUS" != "fail" ]; then
  echo "❌ Status must be 'pass' or 'fail'"
  exit 1
fi

# Init file
if [ ! -f "$STABILITY_FILE" ]; then
  echo "pr_number,status,timestamp" > "$STABILITY_FILE"
fi

# Append record
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "$PR_NUMBER,$PR_STATUS,$TIMESTAMP" >> "$STABILITY_FILE"

# If failed, record reset event
if [ "$PR_STATUS" = "fail" ]; then
  echo "RESET,PR_$PR_NUMBER,$TIMESTAMP" >> "$STABILITY_FILE"
fi

# Count consecutive passes (entries after last RESET or from start)
LAST_RESET_LINE=$(grep -n "^RESET" "$STABILITY_FILE" | tail -1 | cut -d: -f1)
if [ -z "$LAST_RESET_LINE" ]; then
  LAST_RESET_LINE=1
fi

CONSECUTIVE_PASSES=$(tail -n +"$LAST_RESET_LINE" "$STABILITY_FILE" \
  | grep -v "^RESET" \
  | grep -v "^pr_number" \
  | awk -F',' '$2=="pass"' \
  | wc -l | tr -d ' ')

TOTAL_PRS=$(grep -v "^RESET" "$STABILITY_FILE" | grep -v "^pr_number" | wc -l | tr -d ' ')
FAILED_PRS=$(grep -v "^RESET" "$STABILITY_FILE" | grep -v "^pr_number" | awk -F',' '$2=="fail"' | wc -l | tr -d ' ')

echo ""
echo "=============================="
echo "  PR STABILITY DASHBOARD"
echo "=============================="
echo ""
printf "  %-25s %s\n" "Total PRs submitted:" "$TOTAL_PRS"
printf "  %-25s %s\n" "Failed PRs:" "$FAILED_PRS"
printf "  %-25s %s\n" "Consecutive passes:" "$CONSECUTIVE_PASSES / 10"
echo ""

if [ "$CONSECUTIVE_PASSES" -ge 10 ]; then
  echo "  ✅ STABILITY ACHIEVED: 10+ consecutive PRs passed"
elif [ "$PR_STATUS" = "fail" ]; then
  echo "  ❌ STREAK RESET — PR #$PR_NUMBER failed"
  echo "  ⚠️  Isolate root cause before next PR"
else
  echo "  ⏳ IN PROGRESS: $CONSECUTIVE_PASSES/10 consecutive passes"
fi

echo ""

# Red flag detection
if [ "$CONSECUTIVE_PASSES" -eq 0 ] && [ "$TOTAL_PRS" -gt 3 ]; then
  echo "  🚨 RED FLAG: $TOTAL_PRS PRs submitted, zero consecutive passes"
fi
