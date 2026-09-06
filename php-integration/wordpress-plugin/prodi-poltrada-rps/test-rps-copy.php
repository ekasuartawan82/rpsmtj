<?php
/**
 * CLI test harness for RPS Copy-as-Draft (Langkah 5).
 *
 * Runs without WordPress by mocking $wpdb and helper functions.
 * Tests:
 *   - Test C1: Same-prodi copy succeeds, sets draft state & lock_version=1
 *   - Test C2: Lineage tracking (parent_rps_id, version_number incremented)
 *   - Test C3: Immutability of approved source (source workflow_status unchanged)
 *   - Test C4: Cross-prodi copy blocked (InvalidArgumentException / 403)
 *   - Test C5: Deep copy of child entities (CPL, CPMK, Sub-CPMK, Pertemuan, Pustaka)
 *
 * Usage: php test-rps-copy.php
 */

if (!defined('ARRAY_A')) {
    define('ARRAY_A', 'ARRAY_A');
}

class MockCopyWPDB {
    public $prefix = 'wp_';
    public $users = 'wp_users';
    public $insert_id = 100;
    public $last_error = '';
    public $tables = [];

    public function insert($table, $data) {
        if (!isset($data['id'])) {
            $data['id'] = ++$this->insert_id;
        }
        $this->tables[$table][$data['id']] = $data;
        return 1;
    }

    public function update($table, $data, $where) {
        if (!isset($this->tables[$table])) {
            return 0;
        }
        foreach ($this->tables[$table] as $id => &$row) {
            $match = true;
            foreach ($where as $k => $v) {
                if (($row[$k] ?? null) != $v) {
                    $match = false;
                    break;
                }
            }
            if ($match) {
                foreach ($data as $k => $v) {
                    $row[$k] = $v;
                }
            }
        }
        return 1;
    }

    public function get_var($query) {
        if (preg_match('/SELECT prodi_code FROM .* WHERE id = (\d+)/i', $query, $m)) {
            $id = (int) $m[1];
            $row = $this->tables[$this->prefix . 'prodi_rps'][$id] ?? null;
            return $row['prodi_code'] ?? null;
        }
        return null;
    }

    public function get_row($query, $output = ARRAY_A) {
        if (preg_match('/SELECT \* FROM `?(\w+)`? WHERE id = (\d+)/i', $query, $m)) {
            $table = $m[1];
            $id = (int) $m[2];
            return $this->tables[$table][$id] ?? null;
        }
        return null;
    }

    public function get_results($query, $output = ARRAY_A) {
        if (preg_match('/SELECT \* FROM `?(\w+)`? WHERE rps_id = (\d+)/i', $query, $m)) {
            $table = $m[1];
            $rpsId = (int) $m[2];
            $results = [];
            foreach ($this->tables[$table] ?? [] as $row) {
                if (($row['rps_id'] ?? null) == $rpsId) {
                    $results[] = $row;
                }
            }
            return $results;
        }

        if (preg_match('/SELECT \* FROM `?(\w+)`? WHERE rps_cpmk_id IN \(([^)]+)\) AND rps_cpl_id IN \(([^)]+)\)/i', $query, $m)) {
            $table = $m[1];
            $cpmkIds = array_map('intval', explode(',', $m[2]));
            $cplIds = array_map('intval', explode(',', $m[3]));
            $results = [];
            foreach ($this->tables[$table] ?? [] as $row) {
                if (in_array((int)$row['rps_cpmk_id'], $cpmkIds, true) && in_array((int)$row['rps_cpl_id'], $cplIds, true)) {
                    $results[] = $row;
                }
            }
            return $results;
        }

        if (preg_match('/SELECT \* FROM `?(\w+)`? WHERE rps_sub_cpmk_id IN \(([^)]+)\) AND rps_cpl_id IN \(([^)]+)\)/i', $query, $m)) {
            $table = $m[1];
            $subIds = array_map('intval', explode(',', $m[2]));
            $cplIds = array_map('intval', explode(',', $m[3]));
            $results = [];
            foreach ($this->tables[$table] ?? [] as $row) {
                if (in_array((int)$row['rps_sub_cpmk_id'], $subIds, true) && in_array((int)$row['rps_cpl_id'], $cplIds, true)) {
                    $results[] = $row;
                }
            }
            return $results;
        }

        if (preg_match('/SELECT \* FROM `?(\w+)`? WHERE rtm_id IN \(([^)]+)\) AND pertemuan_id IN \(([^)]+)\)/i', $query, $m)) {
            $table = $m[1];
            $rtmIds = array_map('intval', explode(',', $m[2]));
            $pertIds = array_map('intval', explode(',', $m[3]));
            $results = [];
            foreach ($this->tables[$table] ?? [] as $row) {
                if (in_array((int)$row['rtm_id'], $rtmIds, true) && in_array((int)$row['pertemuan_id'], $pertIds, true)) {
                    $results[] = $row;
                }
            }
            return $results;
        }

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
$wpdb = new MockCopyWPDB();

// Mock usermeta store
global $mock_usermeta;
$mock_usermeta = [
    1   => ['rps_prodi_code' => '',     'rps_role' => 'admin'],
    101 => ['rps_prodi_code' => 'MTJ',  'rps_role' => 'dosen'],
    102 => ['rps_prodi_code' => 'TO',   'rps_role' => 'dosen'],
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

if (!function_exists('current_time')) {
    function current_time($type) {
        return $type === 'mysql' ? '2026-09-06 12:00:00' : '2026-09-06';
    }
}

if (!defined('WPINC')) {
    define('WPINC', '1');
}

require_once __DIR__ . '/includes/class-prodi-scope-filter.php';
require_once __DIR__ . '/includes/class-rps-copy.php';

// Seed source RPS (Approved in MTJ)
$wpdb->tables['wp_prodi_rps'][1] = [
    'id' => 1,
    'mata_kuliah_id' => 10,
    'tahun_akademik' => '2025/2026',
    'prodi_code' => 'MTJ',
    'dosen_pengembang_user_id' => 101,
    'koordinator_rmk_user_id' => 201,
    'kaprodi_user_id' => 301,
    'deskripsi_singkat' => 'Deskripsi lama',
    'bahan_kajian' => 'Bahan lama',
    'catatan_tambahan' => 'Catatan lama',
    'workflow_status' => 'approved',
    'status' => 'approved',
    'lock_version' => 4,
    'version_number' => 2,
    'is_current' => 1,
    'current_revision_count' => 1,
    'created_by' => 101,
];

// Seed related content
$wpdb->tables['wp_prodi_rps_cpl'][11] = [
    'id' => 11,
    'rps_id' => 1,
    'cpl_id' => 50,
    'urutan' => 1,
];

$wpdb->tables['wp_prodi_rps_cpmk'][21] = [
    'id' => 21,
    'rps_id' => 1,
    'kode' => 'CPMK-1',
    'deskripsi' => 'CPMK Desc',
    'urutan' => 1,
];

$wpdb->tables['wp_prodi_rps_cpmk_cpl'][31] = [
    'id' => 31,
    'rps_cpmk_id' => 21,
    'rps_cpl_id' => 11,
];

$wpdb->tables['wp_prodi_rps_sub_cpmk'][41] = [
    'id' => 41,
    'rps_id' => 1,
    'rps_cpmk_id' => 21,
    'kode' => 'Sub-1',
    'deskripsi' => 'Sub Desc',
    'bobot_persen' => 20,
    'urutan' => 1,
];

$wpdb->tables['wp_prodi_rps_korelasi_cpl'][51] = [
    'id' => 51,
    'rps_sub_cpmk_id' => 41,
    'rps_cpl_id' => 11,
    'persentase' => 20.00,
];

$wpdb->tables['wp_prodi_rps_pertemuan'][61] = [
    'id' => 61,
    'rps_id' => 1,
    'order_no' => 1,
    'tipe' => 'reguler',
    'sub_cpmk_id' => 41,
    'materi_pembelajaran' => 'Materi 1',
    'bobot_penilaian_persen' => 20,
    'metode_pembelajaran' => 'Kuliah',
    'pengalaman_belajar' => 'Diskusi',
    'indikator_penilaian' => '[]',
    'kriteria_penilaian' => 'Rubrik',
];

$wpdb->tables['wp_prodi_rps_pustaka'][71] = [
    'id' => 71,
    'rps_id' => 1,
    'kategori' => 'utama',
    'teks_lengkap' => 'Buku Referensi MTJ',
    'urutan' => 1,
];

$wpdb->tables['wp_prodi_rps_dosen_pengampu'][81] = [
    'id' => 81,
    'rps_id' => 1,
    'user_id' => 101,
    'is_pengembang' => 1,
    'urutan' => 1,
];

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

echo "=== TEST C1: Same-Prodi Copy (Dosen MTJ copying Approved MTJ RPS) ===\n";
$new_rps_id = Prodi_RPS_Copy::copy_as_draft(1, 101);
$new_rps = $wpdb->tables['wp_prodi_rps'][$new_rps_id] ?? null;

ok($new_rps !== null, "New draft RPS was created with ID: $new_rps_id");
ok($new_rps['workflow_status'] === 'draft', "New RPS workflow_status is 'draft'");
ok($new_rps['status'] === 'draft', "New RPS status is 'draft'");
ok((int)$new_rps['lock_version'] === 1, "New RPS lock_version is reset to 1");
ok((int)$new_rps['current_revision_count'] === 0, "New RPS current_revision_count is reset to 0");
ok($new_rps['prodi_code'] === 'MTJ', "New RPS prodi_code matches source 'MTJ'");
ok((int)$new_rps['is_current'] === 1, "New RPS is marked as current");

echo "\n=== TEST C2: Lineage & Immutability Traceability ===\n";
$source_rps = $wpdb->tables['wp_prodi_rps'][1];
ok((int)$new_rps['parent_rps_id'] === 1, "Lineage tracked: parent_rps_id points to source ID 1");
ok((int)$new_rps['version_number'] === 3, "Version incremented from source version 2 to 3");
ok($source_rps['workflow_status'] === 'approved', "Source RPS workflow_status remains 'approved' (IMMUTABLE)");
ok($source_rps['lock_version'] === 4, "Source RPS lock_version untouched (concurrency guard intact)");
ok((int)$source_rps['is_current'] === 0, "Source RPS is superseded (is_current = 0)");

echo "\n=== TEST C3: Cross-Prodi Copy Guard (Dosen TO copying MTJ RPS) ===\n";
$cross_blocked = false;
try {
    Prodi_RPS_Copy::copy_as_draft(1, 102); // Dosen TO
} catch (InvalidArgumentException $e) {
    $cross_blocked = true;
}
ok($cross_blocked === true, "Cross-prodi copy attempt is BLOCKED with InvalidArgumentException (403)");

echo "\n=== TEST C4: Deep Copy Verification ===\n";
$cpl_copied = $wpdb->get_results("SELECT * FROM wp_prodi_rps_cpl WHERE rps_id = $new_rps_id");
ok(count($cpl_copied) === 1, "CPL copied to new RPS");

$cpmk_copied = $wpdb->get_results("SELECT * FROM wp_prodi_rps_cpmk WHERE rps_id = $new_rps_id");
ok(count($cpmk_copied) === 1, "CPMK copied to new RPS");

$sub_cpmk_copied = $wpdb->get_results("SELECT * FROM wp_prodi_rps_sub_cpmk WHERE rps_id = $new_rps_id");
ok(count($sub_cpmk_copied) === 1, "Sub-CPMK copied to new RPS");

$pertemuan_copied = $wpdb->get_results("SELECT * FROM wp_prodi_rps_pertemuan WHERE rps_id = $new_rps_id");
ok(count($pertemuan_copied) === 1, "Pertemuan copied to new RPS");

$pustaka_copied = $wpdb->get_results("SELECT * FROM wp_prodi_rps_pustaka WHERE rps_id = $new_rps_id");
ok(count($pustaka_copied) === 1, "Pustaka copied to new RPS");

// Verify CPMK-CPL mapping copied and remapped
$new_cpmk_id = $cpmk_copied[0]['id'] ?? null;
$new_cpl_id  = $cpl_copied[0]['id'] ?? null;
$cpmk_cpl_rows = array_values(array_filter(
    $wpdb->tables['wp_prodi_rps_cpmk_cpl'] ?? [],
    fn($r) => ($r['rps_cpmk_id'] ?? null) == $new_cpmk_id && ($r['rps_cpl_id'] ?? null) == $new_cpl_id
));
ok(count($cpmk_cpl_rows) === 1, "CPMK-CPL mapping copied and remapped to new IDs");

// Verify Sub-CPMK Korelasi CPL and persentase copied and remapped
$new_sub_cpmk_id = $sub_cpmk_copied[0]['id'] ?? null;
$korelasi_rows = array_values(array_filter(
    $wpdb->tables['wp_prodi_rps_korelasi_cpl'] ?? [],
    fn($r) => ($r['rps_sub_cpmk_id'] ?? null) == $new_sub_cpmk_id
));
ok(count($korelasi_rows) === 1, "Korelasi CPL copied: row count (1) matches source");
ok(
    isset($korelasi_rows[0]) && (int)$korelasi_rows[0]['rps_cpl_id'] === (int)$new_cpl_id,
    "Korelasi CPL remapped: rps_cpl_id points to new CPL ID ({$new_cpl_id})"
);
ok(
    isset($korelasi_rows[0]) && (float)$korelasi_rows[0]['persentase'] === 20.00,
    "Korelasi CPL persentase preserved: value is 20.00% (not dropped or 0)"
);

// Verify Dosen Pengampu copied
$pengampu_rows = array_values(array_filter(
    $wpdb->tables['wp_prodi_rps_dosen_pengampu'] ?? [],
    fn($r) => ($r['rps_id'] ?? null) == $new_rps_id
));
ok(count($pengampu_rows) === 1, "Dosen Pengampu copied to new RPS");

echo "\n=======================================\n";
echo "SUMMARY: Passed: {$passed} | Failed: {$failed}\n";
echo "=======================================\n";

if ($failed > 0) {
    exit(1);
}
