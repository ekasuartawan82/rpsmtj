#!/bin/bash
# Script: Prodi Scope Validation (Option B: Usermeta Architecture)
# Purpose: Validate prodi-based access control & usermeta configuration
# Usage: ./scripts/check_prodi_scope.sh

set -e

echo "🔍 Prodi Scope Validation"
echo "======================="
echo ""

# 1. Check prodi_code columns exist in domain tables
echo "1. Checking prodi_code columns in domain tables..."

# Check wp_prodi_rps
RPS_COLUMN=$(docker exec rps_mysql mysql -uwordpress -pwordpress wordpress -e "
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = 'wordpress' 
  AND table_name = 'wp_prodi_rps' 
  AND column_name = 'prodi_code';
" 2>&1 | grep -o '[0-9]*' | tail -1)

if [ "$RPS_COLUMN" -eq 1 ]; then
  echo "  ✓ wp_prodi_rps.prodi_code exists"
else
  echo "  ✗ FAIL - wp_prodi_rps.prodi_code not found"
  exit 1
fi

# Check wp_prodi_kurikulum
KURIKULUM_COLUMN=$(docker exec rps_mysql mysql -uwordpress -pwordpress wordpress -e "
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = 'wordpress' 
  AND table_name = 'wp_prodi_kurikulum' 
  AND column_name = 'prodi_code';
" 2>&1 | grep -o '[0-9]*' | tail -1)

if [ "$KURIKULUM_COLUMN" -eq 1 ]; then
  echo "  ✓ wp_prodi_kurikulum.prodi_code exists"
else
  echo "  ✗ FAIL - wp_prodi_kurikulum.prodi_code not found"
  exit 1
fi

echo ""

# 2. Check user prodi mapping in wp_usermeta
echo "2. Checking user prodi mappings in wp_usermeta (meta_key = 'rps_prodi_code')..."

META_COUNT=$(docker exec rps_mysql mysql -uwordpress -pwordpress wordpress -e "
  SELECT COUNT(*) FROM wp_usermeta WHERE meta_key = 'rps_prodi_code';
" 2>&1 | grep -o '[0-9]*' | tail -1)

if [ "$META_COUNT" -ge 3 ]; then
  echo "  ✓ User prodi assignments found in usermeta: $META_COUNT"
else
  echo "  ⚠ WARNING - Expected at least 3 user prodi assignments, found: $META_COUNT"
  echo "    Tip: Run wp eval-file sql/seed-test-users.php to populate test users"
fi

echo ""

# 3. Check prodi distribution in wp_usermeta
echo "3. Checking prodi distribution across users..."

PRODI_DIST=$(docker exec rps_mysql mysql -uwordpress -pwordpress wordpress -e "
  SELECT meta_value as prodi_code, COUNT(*) as count 
  FROM wp_usermeta 
  WHERE meta_key = 'rps_prodi_code'
  GROUP BY meta_value;
" 2>&1 | column -t)

echo "$PRODI_DIST" | while read -r line; do
  echo "  $line"
done

echo ""

# Expected: MTJ, TO present
if echo "$PRODI_DIST" | grep -q "MTJ"; then
  echo "  ✓ MTJ profile found in usermeta"
else
  echo "  ⚠ WARNING - MTJ profile not found in usermeta"
fi

if echo "$PRODI_DIST" | grep -q "TO"; then
  echo "  ✓ TO profile found in usermeta"
else
  echo "  ⚠ WARNING - TO profile not found in usermeta"
fi

echo ""
echo "======================="
echo "✅ PRODI SCOPE CHECK: COMPLETE"
echo ""
echo "Next steps:"
echo "1. Test same-prodi access (T1)"
echo "2. Test cross-prodi access (T2)"
echo "3. Test admin access (T3)"
echo "4. Run K6 smoke test (T4)"
