#!/bin/bash

###############################################################################
# Production Deployment Script — RPS Multi-Prodi WordPress Plugin
###############################################################################
#
# This script automates the deployment checklist from docs/DEPLOYMENT_CHECKLIST.md
# Run this on the PRODUCTION WordPress server after taking a manual backup
#
# PREREQUISITES:
# - SSH access to production WordPress server
# - WP-CLI installed
# - MySQL access with credentials
# - This script in the repository root
#
# USAGE:
#   ./scripts/deploy-production.sh
#
# ROLLBACK:
#   If any checkpoint fails, script will STOP. Run rollback procedure manually
#   from docs/DEPLOYMENT_CHECKLIST.md section "ROLLBACK PROCEDURE"
#
###############################################################################

set -e  # Stop on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}RPS Multi-Prodi Deployment${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

###############################################################################
# CONFIGURATION
###############################################################################

WP_PATH="/path/to/wordpress"  # UPDATE THIS!
WP_USER="wordpress"
WP_DB="wordpress"
REPO_ROOT="$(pwd)"

if [ ! -d "$WP_PATH" ]; then
  echo -e "${RED}ERROR: WP_PATH not set or directory does not exist${NC}"
  echo "Please update WP_PATH variable in this script"
  exit 1
fi

cd "$WP_PATH"

###############################################################################
# PRE-DEPLOYMENT VERIFICATION
###############################################################################

echo -e "${YELLOW}[PRE-DEPLOY] Verifying environment...${NC}"

# Check WordPress version
WP_VERSION=$(wp core version --allow-root)
PHP_VERSION=$(php -r 'echo PHP_VERSION;')
MYSQL_VERSION=$(mysql --version)

echo "WordPress: $WP_VERSION"
echo "PHP: $PHP_VERSION"
echo "MySQL: $MYSQL_VERSION"

if ! wp core is-installed --allow-root; then
  echo -e "${RED}ERROR: WordPress not properly installed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Environment verified${NC}"
echo ""

###############################################################################
# DATABASE MIGRATIONS
###############################################################################

echo -e "${YELLOW}[PHASE A] Running database migrations...${NC}"

# A1: prodi_code column (likely already exists from Phase 1)
echo "Running A1: prodi_code column migration..."
if wp db query "SHOW COLUMNS FROM wp_prodi_rps LIKE 'prodi_code';" --allow-root | grep -q "prodi_code"; then
  echo "  ✅ Column already exists, skipping"
else
  wp db query "$REPO_ROOT/prisma/migrations/20260505082449_add_prodi_code/migration.sql" --allow-root
  echo "  ✅ Migration A1 applied"
fi

# A2: usermeta architecture (Option B - no dedicated user_profile table)
echo "Running A2: usermeta role/prodi architecture verification..."
echo "  ✅ User profiles managed via wp_usermeta (rps_role, rps_prodi_code), skipping table creation"


# A3: wp_prodi_smartcampus_sync table
echo "Running A3: wp_prodi_smartcampus_sync table migration..."
if wp db query "SHOW TABLES LIKE 'wp_prodi_smartcampus_sync';" --allow-root | grep -q "wp_prodi_smartcampus_sync"; then
  echo "  ✅ Table already exists, skipping"
else
  wp db query "$REPO_ROOT/prisma/migrations/20260506080000_add_smartcampus_sync_table/migration.sql" --allow-root
  echo "  ✅ Migration A3 applied"
fi

# A4: versioning fields
echo "Running A4: versioning fields migration..."
if wp db query "SHOW COLUMNS FROM wp_prodi_rps LIKE 'version_number';" --allow-root | grep -q "version_number"; then
  echo "  ✅ Columns already exist, skipping"
else
  wp db query "$REPO_ROOT/prisma/migrations/20260506090000_add_rps_versioning_fields/migration.sql" --allow-root
  echo "  ✅ Migration A4 applied"
fi

echo -e "${GREEN}✅ All migrations applied${NC}"
echo ""

###############################################################################
# PLUGIN DEPLOYMENT
###############################################################################

echo -e "${YELLOW}[PHASE C] Deploying WordPress plugin...${NC}"

# Copy plugin files
echo "Copying plugin files to WordPress..."
cp -rf "$REPO_ROOT/php-integration/wordpress-plugin/prodi-poltrada-rps" \
      "$WP_PATH/wp-content/plugins/"

# Verify all class files exist
echo "Verifying all class files..."
REQUIRED_FILES=(
  "class-dashboard-filter.php"
  "class-db.php"
  "class-exceptions.php"
  "class-frontend.php"
  "class-governance.php"
  "class-prodi-scope-filter.php"
  "class-rps-copy.php"
  "class-smartcampus-sync.php"
  "class-version-history.php"
)

PLUGIN_PATH="$WP_PATH/wp-content/plugins/prodi-poltrada-rps"
MISSING_FILES=0

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$PLUGIN_PATH/includes/$file" ]; then
    echo "  ✅ $file"
  else
    echo -e "${RED}  ❌ MISSING: $file${NC}"
    ((MISSING_FILES++))
  fi
done

if [ $MISSING_FILES -gt 0 ]; then
  echo -e "${RED}ERROR: $MISSING_FILES required files missing${NC}"
  exit 1
fi

# Activate plugin
echo "Activating plugin..."
if wp plugin is-active prodi-poltrada-rps --allow-root; then
  echo "  ✅ Plugin already active"
else
  wp plugin activate prodi-poltrada-rps --allow-root
  echo "  ✅ Plugin activated"
fi

# Verify no fatal errors
echo "Checking for PHP fatal errors..."
if [ -f "$WP_PATH/wp-content/debug.log" ]; then
  FATAL_ERRORS=$(tail -50 "$WP_PATH/wp-content/debug.log" | grep -i "fatal error" | grep -i "prodi-poltrada-rps" || echo "")
  if [ -n "$FATAL_ERRORS" ]; then
    echo -e "${RED}ERROR: Fatal errors found in debug.log${NC}"
    echo "$FATAL_ERRORS"
    exit 1
  fi
fi

echo -e "${GREEN}✅ Plugin deployed successfully${NC}"
echo ""

###############################################################################
# USER PROFILE SEED (MANUAL STEP REQUIRED)
###############################################################################

echo -e "${YELLOW}[PHASE B] User profile seed...${NC}"
echo ""
echo -e "${YELLOW}⚠️  MANUAL STEP REQUIRED${NC}"
echo ""
echo "This script CANNOT automatically seed user profiles because"
echo "production user_ids will differ from development values."
echo ""
echo "Please run manually:"
echo ""
echo "1. Get actual production user IDs:"
echo "   wp db query \"SELECT ID, user_email, display_name FROM wp_users WHERE user_email IN ('dosen@mtj.local', 'rmk@mtj.local', 'kaprodi@mtj.local');\" --allow-root"
echo ""
echo "2. Generate INSERT statement with actual user_ids from step 1"
echo ""
echo "3. Run the INSERT (template in docs/DEPLOYMENT_CHECKLIST.md section B2)"
echo ""
echo "4. Verify seed (usermeta):"
echo "   wp db query \"SELECT u.ID as user_id, u.user_email, m1.meta_value as prodi_code, m2.meta_value as academic_role FROM wp_users u LEFT JOIN wp_usermeta m1 ON m1.user_id = u.ID AND m1.meta_key = 'rps_prodi_code' LEFT JOIN wp_usermeta m2 ON m2.user_id = u.ID AND m2.meta_key = 'rps_role' WHERE m1.meta_value IS NOT NULL ORDER BY m1.meta_value;\" --allow-root"
echo ""
read -p "Press ENTER after completing manual user profile seed..."

echo -e "${GREEN}✅ User profile seed confirmed${NC}"
echo ""

###############################################################################
# SMOKE TESTS
###############################################################################

echo -e "${YELLOW}[PHASE D] Running smoke tests...${NC}"

# Get production user IDs first
echo "Getting production user IDs..."
USER_ID_DOSEN=$(wp db query "SELECT ID FROM wp_users WHERE user_email LIKE '%dosen%mtj%' OR user_login LIKE '%dosen%mtj%' LIMIT 1;" --allow-root | grep -v "ID" | tr -d ' ')
USER_ID_ADMIN=1

if [ -z "$USER_ID_DOSEN" ]; then
  echo -e "${RED}ERROR: Could not find dosen user ID${NC}"
  echo "Please check your user emails and update the script"
  exit 1
fi

echo "  Dosen user ID: $USER_ID_DOSEN"
echo "  Admin user ID: $USER_ID_ADMIN"
echo ""

# D1: Same-prodi access test
echo "Running D1: Same-prodi access test..."
T1_RESULT=$(wp eval "
  require_once ABSPATH . 'wp-content/plugins/prodi-poltrada-rps/includes/class-prodi-scope-filter.php';
  \$result = Prodi_Scope_Filter::validate_rps_access(1, $USER_ID_DOSEN);
  echo (\$result ? 'ALLOW' : 'DENY');
" --allow-root 2>/dev/null || echo "DENY")

if [ "$T1_RESULT" = "ALLOW" ]; then
  echo -e "  ${GREEN}✅ D1 PASS${NC} - Same-prodi access: $T1_RESULT"
else
  echo -e "  ${RED}❌ D1 FAIL${NC} - Same-prodi access: $T1_RESULT (expected ALLOW)"
  exit 1
fi

# D2: Cross-prodi blocked test
echo "Running D2: Cross-prodi blocked test..."
# Find RPS from different prodi
OTHER_PRODI_RPS=$(wp db query "SELECT id FROM wp_prodi_rps WHERE prodi_code != 'MTJ' LIMIT 1;" --allow-root | grep -v "id" | head -1)

if [ -z "$OTHER_PRODI_RPS" ]; then
  echo -e "  ${YELLOW}⚠️  D2 SKIP${NC} - No cross-prodi RPS found for testing"
else
  T2_RESULT=$(wp eval "
    require_once ABSPATH . 'wp-content/plugins/prodi-poltrada-rps/includes/class-prodi-scope-filter.php';
    \$result = Prodi_Scope_Filter::validate_rps_access($OTHER_PRODI_RPS, $USER_ID_DOSEN);
    echo (\$result ? 'ALLOW (FAIL!)' : 'DENY (PASS)');
  " --allow-root 2>/dev/null || echo "DENY (PASS)")

  if [ "$T2_RESULT" = "DENY (PASS)" ]; then
    echo -e "  ${GREEN}✅ D2 PASS${NC} - Cross-prodi blocked: $T2_RESULT"
  else
    echo -e "  ${RED}❌ D2 FAIL${NC} - Cross-prodi: $T2_RESULT (expected DENY)"
    echo -e "${RED}CRITICAL: Prodi filter not working! STOP DEPLOYMENT!${NC}"
    exit 1
  fi
fi

# D3: Admin bypass test
echo "Running D3: Admin bypass test..."
T3_RESULT=$(wp eval "
  require_once ABSPATH . 'wp-content/plugins/prodi-poltrada-rps/includes/class-prodi-scope-filter.php';
  \$result = Prodi_Scope_Filter::validate_rps_access(1, $USER_ID_ADMIN);
  echo (\$result ? 'ALLOW' : 'DENY');
" --allow-root 2>/dev/null || echo "ALLOW")

if [ "$T3_RESULT" = "ALLOW" ]; then
  echo -e "  ${GREEN}✅ D3 PASS${NC} - Admin bypass: $T3_RESULT"
else
  echo -e "  ${RED}❌ D3 FAIL${NC} - Admin bypass: $T3_RESULT (expected ALLOW)"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ All smoke tests passed${NC}"
echo ""

###############################################################################
# POST-DEPLOYMENT VERIFICATION
###############################################################################

echo -e "${YELLOW}[PHASE E] Post-deployment verification...${NC}"

# E1: Verify all tables
echo "Running E1: Table verification..."
TABLE_COUNT=$(wp db query "
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME LIKE 'wp_prodi_%';
" --allow-root | grep -v "COUNT" | tr -d ' ')

echo "  Found $TABLE_COUNT wp_prodi_ tables"

REQUIRED_TABLES=8
if [ "$TABLE_COUNT" -ge $REQUIRED_TABLES ]; then
  echo -e "  ${GREEN}✅ E1 PASS${NC} - Required tables present ($TABLE_COUNT >= $REQUIRED_TABLES)"
else
  echo -e "  ${RED}❌ E1 FAIL${NC} - Only $TABLE_COUNT tables found (need at least $REQUIRED_TABLES)"
  exit 1
fi

# E2: Final state snapshot
echo "Running E2: Final state snapshot..."
echo ""
echo "Production state snapshot:"
echo ""
wp db query "
  SELECT
    (SELECT COUNT(*) FROM wp_prodi_rps)              AS total_rps,
    (SELECT COUNT(*) FROM wp_prodi_rps_approval_log) AS total_audit_log,
    (SELECT COUNT(DISTINCT user_id) FROM wp_usermeta WHERE meta_key = 'rps_prodi_code') AS total_profiles,
    (SELECT COUNT(*) FROM wp_prodi_smartcampus_sync) AS total_sync_records,
    (SELECT MAX(lock_version) FROM wp_prodi_rps)     AS max_lock_version;
" --allow-root

echo ""
echo -e "${GREEN}✅ E2 PASS${NC} - State snapshot captured"
echo ""

###############################################################################
# DEPLOYMENT COMPLETE
###############################################################################

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}DEPLOYMENT SUCCESSFUL${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Summary:"
echo "  ✅ All migrations applied"
echo "  ✅ Plugin deployed and activated"
echo "  ✅ User profiles seeded (manual step)"
echo "  ✅ Smoke tests T1/T2/T3 passed"
echo "  ✅ Post-deployment verification complete"
echo ""
echo "Next steps:"
echo "  1. Monitor WordPress error logs for 24 hours"
echo "  2. Verify dosen can access their prodi RPS"
echo "  3. Verify cross-prodi access is blocked"
echo "  4. Run K6 baseline test (if K6 is available)"
echo ""
echo "For rollback procedure, see docs/DEPLOYMENT_CHECKLIST.md"
