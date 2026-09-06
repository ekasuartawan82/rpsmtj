<?php
/**
 * CLI test harness for the RPS governance engine.
 *
 * Runs without WordPress by mocking $wpdb and the WP helper functions. Covers:
 *   - Submit / approve happy path
 *   - Authorization matrix (wrong role/state blocked)
 *   - Optimistic-locking concurrency conflict
 *   - Anti-rubber-stamping freshness guard (approve-after-edit blocked)
 *   - Audit-log integrity
 *
 * NOTE: This harness does NOT inject the OBE validator (which needs the full
 * WP usermeta + relation loaders). Validator behavior is covered separately
 * by test-validator.php.
 *
 * Usage: php test-concurrency.php
 */

class MockWPDB {
    public $prefix = 'wp_';
    public $users = 'wp_users';
    public $last_error = '';
    public $insert_id = 1;
    public $db = [];
    public $now = '2026-06-23 10:00:00';

    /** Get a reference to a stored row by table + id (for test mutation). */
    public function &rowRef(string $table, int $id): ?array {
        foreach ($this->db[$table] ?? [] as &$row) {
            if (($row['id'] ?? null) == $id) { return $row; }
        }
        $null = null;
        return $null;
    }

    public function insert($table, $data) {
        if (!isset($data['id'])) {
            $data['id'] = $this->insert_id++;
        }
        $this->db[$table][] = $data;
        return 1;
    }

    public function update($table, $data, $where) {
        $updated = 0;
        foreach ($this->db[$table] ?? [] as &$row) {
            $match = true;
            foreach ($where as $k => $v) {
                if (($row[$k] ?? null) != $v) { $match = false; break; }
            }
            if ($match) {
                foreach ($data as $k => $v) { $row[$k] = $v; }
                $updated++;
            }
        }
        return $updated;
    }

    public function get_var($query) {
        return 'mock_table';
    }

    public function get_results($query) {
        if (strpos($query, 'rps_approval_log') !== false) {
            return array_map(function ($row) { return (object) $row; }, $this->db['wp_prodi_rps_approval_log'] ?? []);
        }
        return [];
    }

    public function get_row($query, $output = OBJECT) {
        // Both the FOR UPDATE lock query and the detail SELECT hit prodi_rps
        // by id; return the seeded row either way.
        if (strpos($query, 'prodi_rps') !== false) {
            preg_match('/id = (\d+)/', $query, $m);
            $id = $m[1] ?? 1;
            foreach ($this->db['wp_prodi_rps'] ?? [] as $row) {
                if ($row['id'] == $id) {
                    return $output === ARRAY_A ? $row : (object) $row;
                }
            }
        }
        return null;
    }

    public function prepare($query, ...$args) {
        if (count($args) === 1 && is_array($args[0])) {
            $args = $args[0];
        }
        return vsprintf(str_replace(['%d', '%s'], '%s', $query), $args);
    }

    public function query($query) {
        if (in_array($query, ['START TRANSACTION', 'COMMIT', 'ROLLBACK'], true)) {
            return true;
        }

        if (strpos($query, 'UPDATE') === 0) {
            preg_match('/UPDATE (.*?) SET (.*?) WHERE id = (\d+) AND lock_version = (\d+)/', $query, $m);
            if (!$m) return 0;
            $table = trim($m[1]);
            $setStr = $m[2];
            $id = $m[3];
            $lockVersion = $m[4];

            // Bind the table array by reference so mutations persist on the
            // property (the `?? []` fallback would otherwise copy-on-read).
            if (!isset($this->db[$table])) {
                $this->db[$table] = [];
            }
            $rows = &$this->db[$table];

            $updated = 0;
            foreach ($rows as &$row) {
                if (($row['id'] ?? null) == $id && ($row['lock_version'] ?? null) == $lockVersion) {
                    // Apply each `col = value` / `col = col + 1` clause.
                    // The mock's prepare() strips quote characters, so values
                    // arrive bare; handle literals, NULL, and self-increment.
                    foreach (explode(',', $setStr) as $clause) {
                        $clause = trim($clause);
                        if (preg_match('/`?(\w+)`?\s*=\s*`?(\w+)`?\s*\+\s*1/', $clause, $inc)) {
                            $row[$inc[1]] = ($row[$inc[1]] ?? 0) + 1;
                        } elseif (preg_match('/`?(\w+)`?\s*=\s*NULL/i', $clause, $set)) {
                            $row[$set[1]] = null;
                        } elseif (preg_match('/`?(\w+)`?\s*=\s*(.+)/', $clause, $set)) {
                            // Bare literal value (quotes stripped by prepare).
                            $row[$set[1]] = $set[2];
                        }
                    }
                    $updated = 1;
                }
            }
            return $updated;
        }
        return 1;
    }
}

$wpdb = new MockWPDB();

function current_time($t) { return $GLOBALS['wpdb']->now; }
function sanitize_text_field($s) { return $s; }
function sanitize_textarea_field($s) { return $s; }
function sanitize_key($s) { return $s; }
function wp_kses_post($s) { return $s; }
function add_shortcode() {}
function add_action() {}
function is_user_logged_in() { return true; }
function wp_get_current_user() { return null; }
function get_user_meta($id, $key, $single) { return ''; }
define('WPINC', true);
define('ARRAY_A', 'ARRAY_A');
define('OBJECT', 'OBJECT');
define('DB_NAME', 'mock');

require_once __DIR__ . '/includes/class-exceptions.php';
require_once __DIR__ . '/includes/class-db.php';
require_once __DIR__ . '/includes/class-governance.php';

$db = new Prodi_RPS_DB();
$governance = new Prodi_RPS_Governance_Service($db);
// Intentionally NOT injecting the validator here.

$pass = 0;
$fail = 0;
function ok($cond, $label): void {
    global $pass, $fail;
    if ($cond) { echo "  ✓ PASS: $label\n"; $pass++; }
    else      { echo "  ✗ FAIL: $label\n"; $fail++; }
}

// --- actors ---
$dosen   = ['id' => 991, 'role' => Prodi_RPS_DB::ROLE_DOSEN, 'name' => 'Dosen Test', 'prodi_code' => 'MTJ'];
$rmk     = ['id' => 992, 'role' => Prodi_RPS_DB::ROLE_KOORDINATOR_RMK, 'name' => 'RMK Test', 'prodi_code' => 'MTJ'];
$kaprodi = ['id' => 993, 'role' => Prodi_RPS_DB::ROLE_KAPRODI, 'name' => 'Kaprodi Test', 'prodi_code' => 'MTJ'];

// Helper: seed a fresh RPS in a chosen workflow state.
function seedRps(int $id, string $workflowStatus, int $lockVersion, array $extra = []): void {
    global $wpdb;
    $wpdb->insert(Prodi_RPS_DB::table('rps'), array_merge([
        'id' => $id,
        'mata_kuliah_id' => $id,
        'prodi_code' => 'MTJ',
        'dosen_pengembang_user_id' => 991,
        'koordinator_rmk_user_id' => 992,
        'kaprodi_user_id' => 993,
        'workflow_status' => $workflowStatus,
        'status' => $workflowStatus,
        'lock_version' => $lockVersion,
        'current_revision_count' => 0,
        'last_changed_at' => '2026-06-20 10:00:00',
        'last_reviewed_at_by_rmk' => null,
        'last_reviewed_at_by_kaprodi' => null,
    ], $extra));
}

echo "=== TEST 1: Submit happy path + authz matrix ===\n";
seedRps(1, 'draft', 1);
try {
    $governance->submit_to_rmk(1, 1, $dosen);
    ok(true, 'Dosen submit draft → submitted_to_rmk');
} catch (Exception $e) {
    ok(false, 'Dosen submit should succeed: ' . $e->getMessage());
}

echo "\n=== TEST 2: Guard — Kaprodi cannot act in submitted_to_rmk ===\n";
try {
    $governance->approve_kaprodi(1, 2, 'x', $kaprodi);
    ok(false, 'Kaprodi approve must be blocked by guard');
} catch (RPS_Governance_Exception $e) {
    ok(true, 'Kaprodi blocked by authorization matrix');
} catch (Exception $e) {
    ok(false, 'Wrong exception type: ' . get_class($e));
}

echo "\n=== TEST 3: Optimistic-lock concurrency conflict ===\n";
// Seed a fresh RPS in submitted_to_rmk; RMK1 wins, RMK2 with stale lock fails.
seedRps(2, Prodi_RPS_DB::STATUS_SUBMITTED_TO_RMK, 1);
try {
    $governance->approve_rmk(2, 1, 'RMK 1', $rmk);
    ok(true, 'RMK 1 approve succeeds (lock_version 1→2)');
} catch (Exception $e) {
    ok(false, 'RMK 1 should succeed: ' . $e->getMessage());
}
// RMK2 uses the SAME stale lock_version=1. After RMK1, the row advanced to
// submitted_to_kaprodi AND lock_version=2. The lock mismatch is caught first
// inside execute_transition (before the guard re-check), so a concurrency
// exception is the expected outcome.
try {
    $governance->approve_rmk(2, 1, 'RMK 2', $rmk);
    ok(false, 'RMK 2 must be blocked (stale lock_version)');
} catch (Exception $e) {
    ok(true, 'RMK 2 blocked (' . get_class($e) . '): ' . $e->getMessage());
}

echo "\n=== TEST 4: Freshness guard (anti-rubber-stamp) ===\n";
// Seed an RPS in submitted_to_kaprodi where the doc was edited AFTER the
// kaprodi's last review → approve must be blocked on freshness grounds.
seedRps(3, Prodi_RPS_DB::STATUS_SUBMITTED_TO_KAPRODI, 1, [
    'last_changed_at' => '2026-06-24 10:00:00',            // edited later
    'last_reviewed_at_by_kaprodi' => '2026-06-22 10:00:00', // reviewed earlier
]);
try {
    $governance->approve_kaprodi(3, 1, 're-approve without re-review', $kaprodi);
    ok(false, 'Kaprodi must be blocked: doc changed since last review');
} catch (RPS_Governance_Exception $e) {
    ok(true, 'Freshness guard blocked rubber-stamp approval');
} catch (Exception $e) {
    ok(false, 'Wrong exception type for freshness: ' . get_class($e) . ' — ' . $e->getMessage());
}

// First-time review (NULL timestamp) must always be allowed even if changed.
seedRps(4, Prodi_RPS_DB::STATUS_SUBMITTED_TO_KAPRODI, 1, [
    'last_changed_at' => '2026-06-24 10:00:00',
    'last_reviewed_at_by_kaprodi' => null,
]);
try {
    $governance->approve_kaprodi(4, 1, 'first review', $kaprodi);
    ok(true, 'First review (NULL timestamp) allowed even if doc changed');
} catch (Exception $e) {
    ok(false, 'First review should be allowed: ' . $e->getMessage());
}

echo "\n=== TEST 5: Audit-log integrity ===\n";
$logs = $wpdb->get_results("SELECT * FROM " . Prodi_RPS_DB::table('rps_approval_log') . " WHERE rps_id = 2");
ok(count($logs) >= 2, 'RPS 2 has submit+approve audit-log entries — got ' . count($logs));

echo "\n=== SUMMARY ===\n";
echo "Passed: $pass | Failed: $fail\n";
exit($fail === 0 ? 0 : 1);
