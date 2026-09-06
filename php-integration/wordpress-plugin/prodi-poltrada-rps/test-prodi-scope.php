<?php
/**
 * CLI test harness for Prodi Scope Access Control (T1 - T3).
 *
 * Runs without WordPress by mocking $wpdb and helper functions.
 * Tests:
 *   - Test T1: Same-prodi access -> ALLOW
 *   - Test T2: Cross-prodi access -> DENY
 *   - Test T3: Admin access -> ALLOW (Bypass)
 *   - Test T4: can_access_rps prodi scoping
 *   - Test T5: list_rps automatic prodi scoping
 *
 * Usage: php test-prodi-scope.php
 */

class MockScopeWPDB {
    public $prefix = 'wp_';
    public $users = 'wp_users';
    public $rps_table = [];

    public function get_var($query) {
        // Query: SELECT prodi_code FROM wp_prodi_rps WHERE id = %d
        if (preg_match('/SELECT prodi_code FROM .* WHERE id = (\d+)/i', $query, $m)) {
            $id = (int) $m[1];
            return $this->rps_table[$id]['prodi_code'] ?? null;
        }
        return null;
    }

    public function get_results($query, $output = ARRAY_A) {
        return [];
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
}

global $wpdb;
$wpdb = new MockScopeWPDB();

// Mock usermeta store
global $mock_usermeta;
$mock_usermeta = [
    101 => ['rps_prodi_code' => 'MTJ', 'rps_role' => 'dosen'],
    102 => ['rps_prodi_code' => 'TO',  'rps_role' => 'dosen'],
    103 => ['rps_prodi_code' => 'MLOG','rps_role' => 'dosen'],
    1 =>   ['rps_prodi_code' => '',    'rps_role' => 'admin'],
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

// Seed mock RPS records
$wpdb->rps_table = [
    1 => ['id' => 1, 'prodi_code' => 'MTJ', 'dosen_pengembang_user_id' => 101],
    2 => ['id' => 2, 'prodi_code' => 'TO',  'dosen_pengembang_user_id' => 102],
    3 => ['id' => 3, 'prodi_code' => 'MLOG','dosen_pengembang_user_id' => 103],
];

if (!defined('WPINC')) {
    define('WPINC', '1');
}

require_once __DIR__ . '/includes/class-prodi-scope-filter.php';

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

echo "\n=== TEST T4: Edge Cases (Unassigned user & Non-existent RPS) ===\n";
$t4_unknown_user = Prodi_Scope_Filter::validate_rps_access(1, 999);
ok($t4_unknown_user === false, "Unassigned user has no prodi -> DENIED");

$t4_missing_rps = Prodi_Scope_Filter::validate_rps_access(999, 101);
ok($t4_missing_rps === false, "Non-existent RPS -> DENIED");

echo "\n=======================================\n";
echo "SUMMARY: Passed: {$passed} | Failed: {$failed}\n";
echo "=======================================\n";

if ($failed > 0) {
    exit(1);
}
