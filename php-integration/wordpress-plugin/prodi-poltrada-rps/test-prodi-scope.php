<?php
/**
 * CLI test harness for Prodi Scope Access Control (T1 - T7).
 *
 * Runs without WordPress by mocking $wpdb and helper functions.
 * Tests:
 *   - Test T1: Same-prodi access -> ALLOW (Prodi_Scope_Filter::validate_rps_access)
 *   - Test T2: Cross-prodi access -> DENY (Prodi_Scope_Filter::validate_rps_access)
 *   - Test T3: Admin access -> ALLOW Bypass (Prodi_Scope_Filter::validate_rps_access)
 *   - Test T4: Edge cases & case normalization (Prodi_Scope_Filter)
 *   - Test T5: can_access_rps prodi scoping & fail-closed guards (Prodi_RPS_DB::can_access_rps)
 *   - Test T6: list_rps automatic prodi scoping & defensive clamping (Prodi_RPS_DB::list_rps)
 *   - Test T7: can_edit_rps prodi scoping & immutability guards (Prodi_RPS_DB::can_edit_rps)
 *
 * Usage: php test-prodi-scope.php
 */

if (!defined('ARRAY_A')) {
    define('ARRAY_A', 'ARRAY_A');
}

class MockScopeWPDB {
    public $prefix = 'wp_';
    public $users = 'wp_users';
    public $rps_table = [];
    public $last_query = '';

    public function get_var($query) {
        $this->last_query = $query;
        // Query: SELECT prodi_code FROM wp_prodi_rps WHERE id = %d
        if (preg_match('/SELECT prodi_code FROM .* WHERE id = (\d+)/i', $query, $m)) {
            $id = (int) $m[1];
            return $this->rps_table[$id]['prodi_code'] ?? null;
        }
        return null;
    }

    public function get_results($query, $output = ARRAY_A) {
        $this->last_query = $query;

        // Filter mock RPS table based on generated query
        $results = [];
        $filterProdi = null;
        if (preg_match("/r\.prodi_code = '([^']+)'/", $query, $m)) {
            $filterProdi = strtoupper(trim($m[1]));
        }

        foreach ($this->rps_table as $row) {
            if ($filterProdi !== null) {
                $rowProdi = !empty($row['prodi_code']) ? strtoupper(trim($row['prodi_code'])) : '';
                if ($rowProdi !== $filterProdi) {
                    continue;
                }
            }
            $results[] = $row;
        }

        return $results;
    }

    public function prepare($query, ...$args) {
        if (count($args) === 1 && is_array($args[0])) {
            $args = $args[0];
        }
        foreach ($args as $arg) {
            $val = is_numeric($arg) ? $arg : "'" . addslashes((string) $arg) . "'";
            $query = preg_replace('/%[sdf]/', $val, $query, 1);
        }
        return $query;
    }

    public function esc_like($text) {
        return addcslashes($text, '_%\\');
    }
}

global $wpdb;
$wpdb = new MockScopeWPDB();

// Mock usermeta store (Option B: authoritative source)
global $mock_usermeta;
$mock_usermeta = [
    1   => ['rps_prodi_code' => '',     'rps_role' => 'admin'],
    101 => ['rps_prodi_code' => 'MTJ',  'rps_role' => 'dosen'],
    102 => ['rps_prodi_code' => 'TO',   'rps_role' => 'dosen'],
    103 => ['rps_prodi_code' => 'MLOG', 'rps_role' => 'dosen'],
    104 => ['rps_prodi_code' => 'mtj',  'rps_role' => 'dosen'], // Lowercase test
    201 => ['rps_prodi_code' => 'MTJ',  'rps_role' => 'koordinator_rmk'],
    202 => ['rps_prodi_code' => 'TO',   'rps_role' => 'koordinator_rmk'],
    301 => ['rps_prodi_code' => 'MTJ',  'rps_role' => 'kaprodi'],
    302 => ['rps_prodi_code' => 'TO',   'rps_role' => 'kaprodi'],
    999 => ['rps_prodi_code' => '',     'rps_role' => 'dosen'], // Unassigned
];

if (!function_exists('get_user_meta')) {
    function get_user_meta($user_id, $key, $single = false) {
        global $mock_usermeta;
        return $mock_usermeta[$user_id][$key] ?? '';
    }
}

if (!function_exists('user_can')) {
    function user_can($user, $capability) {
        $userId = is_object($user) ? ($user->ID ?? 0) : (int) $user;
        return $userId === 1; // User 1 is administrator
    }
}

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field($str) {
        return trim((string) $str);
    }
}

if (!function_exists('sanitize_key')) {
    function sanitize_key($key) {
        return strtolower(preg_replace('/[^a-z0-9_-]/i', '', (string) $key));
    }
}

if (!function_exists('absint')) {
    function absint($maybeint) {
        return abs((int) $maybeint);
    }
}

if (!function_exists('current_time')) {
    function current_time($type) {
        return $type === 'mysql' ? '2026-09-06 12:00:00' : '2026-09-06';
    }
}

// Seed mock RPS records
$wpdb->rps_table = [
    1 => [
        'id' => 1,
        'prodi_code' => 'MTJ',
        'dosen_pengembang_user_id' => 101,
        'koordinator_rmk_user_id' => 201,
        'kaprodi_user_id' => 301,
        'workflow_status' => 'draft',
        'status' => 'draft',
    ],
    2 => [
        'id' => 2,
        'prodi_code' => 'TO',
        'dosen_pengembang_user_id' => 102,
        'koordinator_rmk_user_id' => 202,
        'kaprodi_user_id' => 302,
        'workflow_status' => 'draft',
        'status' => 'draft',
    ],
    3 => [
        'id' => 3,
        'prodi_code' => 'MLOG',
        'dosen_pengembang_user_id' => 103,
        'koordinator_rmk_user_id' => 0,
        'kaprodi_user_id' => 0,
        'workflow_status' => 'draft',
        'status' => 'draft',
    ],
    4 => [
        'id' => 4,
        'prodi_code' => null, // Unassigned prodi in database
        'dosen_pengembang_user_id' => 101,
        'koordinator_rmk_user_id' => 201,
        'kaprodi_user_id' => 301,
        'workflow_status' => 'draft',
        'status' => 'draft',
    ],
    5 => [
        'id' => 5,
        'prodi_code' => 'MTJ',
        'dosen_pengembang_user_id' => 105, // Different dosen in same prodi
        'koordinator_rmk_user_id' => 201,
        'kaprodi_user_id' => 301,
        'workflow_status' => 'draft',
        'status' => 'draft',
    ],
    6 => [
        'id' => 6,
        'prodi_code' => 'MTJ',
        'dosen_pengembang_user_id' => 101,
        'koordinator_rmk_user_id' => 201,
        'kaprodi_user_id' => 301,
        'workflow_status' => 'approved',
        'status' => 'approved',
    ],
];

if (!defined('WPINC')) {
    define('WPINC', '1');
}

require_once __DIR__ . '/includes/class-prodi-scope-filter.php';
require_once __DIR__ . '/includes/class-db.php';

$db = new Prodi_RPS_DB();

$passed = 0;
$failed = 0;

function ok(bool $condition, string $label): void {
    global $passed, $failed;
    if ($condition) {
        echo "  ✓ PASS: {$label}\n";
        $passed++;
    } else {
        echo "  ✗ FAIL: {$label}\n";
        $failed++;
    }
}

echo "=== TEST T1: Same-Prodi Access (Dosen MTJ -> RPS MTJ) ===\n";
$t1 = Prodi_Scope_Filter::validate_rps_access(1, 101);
ok($t1 === true, "Dosen MTJ accessing RPS MTJ (ID: 1) is ALLOWED");

echo "\n=== TEST T2: Cross-Prodi Access (Dosen MTJ -> RPS TO & MLOG) ===\n";
$t2_to = Prodi_Scope_Filter::validate_rps_access(2, 101);
ok($t2_to === false, "Dosen MTJ accessing RPS TO (ID: 2) is DENIED (403 expected)");

$t2_mlog = Prodi_Scope_Filter::validate_rps_access(3, 101);
ok($t2_mlog === false, "Dosen MTJ accessing RPS MLOG (ID: 3) is DENIED (403 expected)");

$t2_reverse = Prodi_Scope_Filter::validate_rps_access(1, 102);
ok($t2_reverse === false, "Dosen TO accessing RPS MTJ (ID: 1) is DENIED (403 expected)");

echo "\n=== TEST T3: Admin Access (Admin -> All Prodi RPS) ===\n";
$t3_mtj = Prodi_Scope_Filter::validate_rps_access(1, 1);
ok($t3_mtj === true, "Admin accessing RPS MTJ is ALLOWED (Bypass)");

$t3_to = Prodi_Scope_Filter::validate_rps_access(2, 1);
ok($t3_to === true, "Admin accessing RPS TO is ALLOWED (Bypass)");

$t3_mlog = Prodi_Scope_Filter::validate_rps_access(3, 1);
ok($t3_mlog === true, "Admin accessing RPS MLOG is ALLOWED (Bypass)");

echo "\n=== TEST T4: Edge Cases & Normalization (Prodi_Scope_Filter) ===\n";
$t4_unknown_user = Prodi_Scope_Filter::validate_rps_access(1, 999);
ok($t4_unknown_user === false, "Unassigned user has no prodi -> DENIED (fail-closed)");

$t4_missing_rps = Prodi_Scope_Filter::validate_rps_access(999, 101);
ok($t4_missing_rps === false, "Non-existent RPS -> DENIED");

$t4_unassigned_rps = Prodi_Scope_Filter::validate_rps_access(4, 101);
ok($t4_unassigned_rps === false, "RPS without prodi_code -> DENIED (fail-closed)");

$t4_case_norm = Prodi_Scope_Filter::validate_rps_access(1, 104);
ok($t4_case_norm === true, "User with lowercase 'mtj' matches uppercase 'MTJ' RPS");

echo "\n=== TEST T5: can_access_rps Prodi Scoping & Role Rules (Prodi_RPS_DB) ===\n";
$actor_dosen_mtj = ['id' => 101, 'role' => 'dosen', 'prodi_code' => 'MTJ'];
$actor_dosen_to  = ['id' => 102, 'role' => 'dosen', 'prodi_code' => 'TO'];
$actor_dosen_none= ['id' => 999, 'role' => 'dosen', 'prodi_code' => ''];
$actor_rmk_mtj   = ['id' => 201, 'role' => 'koordinator_rmk', 'prodi_code' => 'MTJ'];
$actor_rmk_to    = ['id' => 202, 'role' => 'koordinator_rmk', 'prodi_code' => 'TO'];
$actor_kap_mtj   = ['id' => 301, 'role' => 'kaprodi', 'prodi_code' => 'MTJ'];
$actor_kap_to    = ['id' => 302, 'role' => 'kaprodi', 'prodi_code' => 'TO'];
$actor_admin     = ['id' => 1,   'role' => 'admin',   'prodi_code' => ''];

$rps_mtj = $wpdb->rps_table[1];
$rps_to  = $wpdb->rps_table[2];
$rps_none= $wpdb->rps_table[4];
$rps_mtj_other = $wpdb->rps_table[5];

// Dosen checks
ok($db->can_access_rps($rps_mtj, $actor_dosen_mtj) === true, "Dosen MTJ can access own MTJ RPS");
ok($db->can_access_rps($rps_to, $actor_dosen_mtj) === false, "Dosen MTJ blocked from TO RPS (prodi mismatch)");
ok($db->can_access_rps($rps_mtj, $actor_dosen_none) === false, "Dosen without prodi blocked from MTJ RPS (fail-closed)");
ok($db->can_access_rps($rps_none, $actor_dosen_mtj) === false, "Dosen MTJ blocked from RPS with NULL prodi (fail-closed)");
ok($db->can_access_rps($rps_mtj_other, $actor_dosen_mtj) === false, "Dosen MTJ blocked from other dosen's MTJ RPS (role guard)");

// RMK checks
ok($db->can_access_rps($rps_mtj, $actor_rmk_mtj) === true, "RMK MTJ can access assigned MTJ RPS");
ok($db->can_access_rps($rps_to, $actor_rmk_mtj) === false, "RMK MTJ blocked from TO RPS (prodi mismatch)");
ok($db->can_access_rps($rps_mtj, $actor_rmk_to) === false, "RMK TO blocked from MTJ RPS (prodi mismatch)");

// Kaprodi checks
ok($db->can_access_rps($rps_mtj, $actor_kap_mtj) === true, "Kaprodi MTJ can access assigned MTJ RPS");
ok($db->can_access_rps($rps_to, $actor_kap_mtj) === false, "Kaprodi MTJ blocked from TO RPS (prodi mismatch)");
ok($db->can_access_rps($rps_mtj, $actor_kap_to) === false, "Kaprodi TO blocked from MTJ RPS (prodi mismatch)");

// Admin check
ok($db->can_access_rps($rps_mtj, $actor_admin) === true, "Admin can access MTJ RPS");
ok($db->can_access_rps($rps_to, $actor_admin) === true, "Admin can access TO RPS");

echo "\n=== TEST T6: list_rps Automatic Prodi Scoping & Clamping (Prodi_RPS_DB) ===\n";
// Dosen MTJ list without filter -> only MTJ
$list_mtj = $db->list_rps($actor_dosen_mtj);
ok(strpos($wpdb->last_query, "r.prodi_code = 'MTJ'") !== false, "list_rps for Dosen MTJ adds WHERE r.prodi_code = 'MTJ'");
ok(count($list_mtj) > 0 && !array_filter($list_mtj, fn($r) => ($r['prodi_code'] ?? '') !== 'MTJ'), "list_rps returned only MTJ records");

// Dosen MTJ maliciously requesting TO filter -> defensively clamped to MTJ
$list_clamped = $db->list_rps($actor_dosen_mtj, ['prodi_code' => 'TO']);
ok(strpos($wpdb->last_query, "r.prodi_code = 'MTJ'") !== false, "list_rps clamps foreign 'TO' filter to actor's own 'MTJ'");
ok(strpos($wpdb->last_query, "r.prodi_code = 'TO'") === false, "list_rps does NOT allow foreign 'TO' in query for non-admin");

// Non-admin without prodi -> fail-closed returns empty array
$list_none = $db->list_rps($actor_dosen_none);
ok($list_none === [], "list_rps for unassigned actor returns [] immediately (fail-closed)");

// Admin list without filter -> no prodi restriction
$list_admin = $db->list_rps($actor_admin);
ok(strpos($wpdb->last_query, "r.prodi_code") === false, "list_rps for Admin without filter has no prodi restriction");
ok(count($list_admin) === count($wpdb->rps_table), "Admin sees all RPS across all prodi");

// Admin list with prodi filter -> respects filter
$list_admin_to = $db->list_rps($actor_admin, ['prodi_code' => 'TO']);
ok(strpos($wpdb->last_query, "r.prodi_code = 'TO'") !== false, "list_rps for Admin with prodi filter queries r.prodi_code = 'TO'");

echo "\n=== TEST T7: can_edit_rps Prodi & Immutability Guards (Prodi_RPS_DB) ===\n";
$rps_approved = $wpdb->rps_table[6];
ok($db->can_edit_rps($rps_mtj, $actor_dosen_mtj) === true, "Dosen MTJ can edit own draft MTJ RPS");
ok($db->can_edit_rps($rps_to, $actor_dosen_mtj) === false, "Dosen MTJ CANNOT edit draft TO RPS (blocked by can_access_rps)");
ok($db->can_edit_rps($rps_approved, $actor_dosen_mtj) === false, "Dosen MTJ CANNOT edit approved MTJ RPS (immutable guard)");
ok($db->can_edit_rps($rps_mtj, $actor_admin) === true, "Admin can edit RPS");

echo "\n=======================================\n";
echo "SUMMARY: Passed: {$passed} | Failed: {$failed}\n";
echo "=======================================\n";

if ($failed > 0) {
    exit(1);
}
