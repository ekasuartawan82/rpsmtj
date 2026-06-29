<?php
/**
 * CLI test harness for the RPS OBE validator (hard blockers + warnings).
 *
 * Runs without WordPress by mocking $wpdb with a richer store that serves
 * sub-entity SELECTs. Each scenario builds a complete RPS fixture, then
 * asserts the validator reports the expected violations / warnings.
 *
 * Usage: php test-validator.php
 */

class VMockWPDB {
    public $prefix = 'wp_';
    public $users = 'wp_users';
    public $last_error = '';
    public $insert_id = 1;
    public $db = [];

    public function insert($t, $d) {
        if (!isset($d['id'])) { $d['id'] = $this->insert_id++; }
        $this->db[$t][] = $d;
        return 1;
    }
    public function update($t, $d, $w) { return 1; }
    public function replace($t, $d) { return $this->insert($t, $d); }
    public function get_var($q) { return null; }

    public function get_row($q, $o = OBJECT) {
        // Detail SELECT for prodi_rps by id.
        if (strpos($q, 'prodi_rps') !== false && strpos($q, 'WHERE r.id') !== false) {
            preg_match('/id = (\d+)/', $q, $m);
            $id = $m[1] ?? 1;
            foreach ($this->db['wp_prodi_rps'] ?? [] as $row) {
                if ($row['id'] == $id) {
                    $row['cpl_entries'] = $this->collect('wp_prodi_rps_cpl', $id, 'rps_id');
                    $row['cpmk_entries'] = $this->collect('wp_prodi_rps_cpmk', $id, 'rps_id');
                    $row['sub_cpmk_entries'] = $this->collect('wp_prodi_rps_sub_cpmk', $id, 'rps_id');
                    $row['pertemuan_entries'] = $this->collect('wp_prodi_rps_pertemuan', $id, 'rps_id');
                    $row['pustaka_entries'] = $this->collect('wp_prodi_rps_pustaka', $id, 'rps_id');
                    $row['approval_logs'] = [];
                    return $o === ARRAY_A ? $row : (object) $row;
                }
            }
        }
        return null;
    }

    /**
     * Resolve a SELECT against the mock store. SQL parsing is intentionally
     * narrow: identify the FIRST FROM table (skipping JOINs), parse the
     * leading WHERE <col> = <n> predicate, and filter that table's rows.
     * JOINed tables contribute nothing (the validator only needs the primary
     * table's rows; relations are seeded directly).
     */
    public function get_results($q, $o = ARRAY_A) {
        // FROM <table>  (first occurrence, before any JOIN/INNER JOIN)
        if (!preg_match('/\bFROM\s+(\S+)/i', $q, $from)) {
            return [];
        }
        $table = trim($from[1], '` ');
        if (!isset($this->db[$table])) {
            return [];
        }
        $rows = $this->db[$table];

        // First WHERE <[alias.]col> = <n> predicate on the primary table.
        // Strip a leading table alias (e.g. "p.rps_id" -> "rps_id").
        if (preg_match('/WHERE\s+(?:\w+\.)?(\w+)\s*=\s*(\d+)/i', $q, $m)) {
            $col = $m[1];
            $val = $m[2];
            $rows = array_values(array_filter($rows, fn($r) => ($r[$col] ?? null) == $val));
        }

        // NOT EXISTS (SELECT 1 FROM <child> WHERE <fk> = <parent_pk>):
        // keep only rows whose id is referenced in the child table. The
        // orphaned-RTM loader uses rps_rtm_pertemuan.rps_rtm_id = rps_rtm.id.
        if (preg_match('/NOT EXISTS\s*\(\s*SELECT 1 FROM\s+(\S+)\s+.*?(\w+)\s*=\s*(\w+)/is', $q, $ne)) {
            $childTable = trim($ne[1], '` ');
            $childFk = $ne[2];
            $parentPk = $ne[3];
            $childIds = array_map(fn($r) => $r[$childFk] ?? null, $this->db[$childTable] ?? []);
            $rows = array_values(array_filter(
                $rows,
                fn($r) => in_array($r[$parentPk] ?? null, $childIds, true)
            ));
        }
        return $rows;
    }

    public function get_col($q) {
        $rows = $this->get_results($q, ARRAY_A);
        if (preg_match('/SELECT\s+(\w+)/i', $q, $m)) {
            $col = $m[1];
            return array_map(fn($r) => $r[$col] ?? null, $rows);
        }
        return [];
    }

    private function collect(string $table, int $rpsId, string $col): array {
        return array_values(array_filter(
            $this->db[$table] ?? [],
            fn($r) => ($r[$col] ?? null) == $rpsId
        ));
    }

    public function prepare($q, ...$a) {
        if (count($a) === 1 && is_array($a[0])) { $a = $a[0]; }
        return vsprintf(str_replace(['%d', '%s'], '%s', $q), $a);
    }
    public function query($q) { return 1; }
}

$wpdb = new VMockWPDB();

function current_time($t) { return '2026-06-23 10:00:00'; }
function sanitize_text_field($s) { return $s; }
function sanitize_textarea_field($s) { return $s; }
function sanitize_key($s) { return $s; }
function sanitize_email($s) { return $s; }
function wp_kses_post($s) { return $s; }
function get_user_meta($id, $k, $s) { return ''; }
function get_userdata($id) { return null; }
function get_user_by($f, $v) { return null; }
function update_user_meta($id, $k, $v) { return true; }
function is_user_logged_in() { return true; }
function user_can($id, $cap) { return false; }
function absint($v) { return (int) $v; }
define('WPINC', true);
define('ARRAY_A', 'ARRAY_A');
define('OBJECT', 'OBJECT');
define('DB_NAME', 'mock');

require_once __DIR__ . '/includes/class-exceptions.php';
require_once __DIR__ . '/includes/class-db.php';
require_once __DIR__ . '/includes/class-rps-validator.php';

$db = new Prodi_RPS_DB();
$validator = new Prodi_RPS_Validator($db);

$dosen = ['id' => 1, 'role' => Prodi_RPS_DB::ROLE_DOSEN, 'name' => 'Dosen'];

$pass = 0; $fail = 0;
function ok($cond, $label): void {
    global $pass, $fail;
    if ($cond) { echo "  ✓ PASS: $label\n"; $pass++; }
    else      { echo "  ✗ FAIL: $label\n"; $fail++; }
}

function rulesOf(array $violations): array { return array_column($violations, 'rule'); }

// ---------------------------------------------------------------------
echo "=== SCENARIO 1: Empty RPS → all foundational blockers fire ===\n";
seedRpsHeader(10, ['deskripsi_singkat' => '', 'bahan_kajian' => '', 'tanggal_penyusunan' => null]);
$v = $validator->collect_violations(10, $dosen);
$rules = rulesOf($v);
ok(in_array('header_tanggal', $rules, true), 'header_tanggal flagged');
ok(in_array('header_deskripsi', $rules, true), 'header_deskripsi flagged');
ok(in_array('header_bahan', $rules, true), 'header_bahan flagged');
ok(in_array('min_cpl', $rules, true), 'min_cpl flagged');
ok(in_array('min_cpmk', $rules, true), 'min_cpmk flagged');
ok(in_array('min_pertemuan', $rules, true), 'min_pertemuan flagged');
ok(in_array('bobot_sum', $rules, true), 'bobot_sum flagged (0% != 100%)');

// ---------------------------------------------------------------------
echo "\n=== SCENARIO 2: CPMK without CPL mapping → cpmk_cpl_mapping fires ===\n";
seedRpsHeader(11);
addRow('rps_cpmk', ['id' => 1101, 'rps_id' => 11, 'kode' => 'CPMK-1', 'deskripsi' => 'd', 'urutan' => 1]);
$v = $validator->collect_violations(11, $dosen);
ok(in_array('cpmk_cpl_mapping', rulesOf($v), true), 'cpmk_cpl_mapping flagged (CPMK has no CPL)');
ok(in_array('cpmk_sub_cpmk', rulesOf($v), true), 'cpmk_sub_cpmk flagged (CPMK has no Sub-CPMK)');

// ---------------------------------------------------------------------
echo "\n=== SCENARIO 3: bobot sum = 99% → bobot_sum fires ===\n";
seedRpsHeader(12);
addRow('rps_cpl', ['id' => 1201, 'rps_id' => 12, 'cpl_id' => 1, 'urutan' => 1]);
addRow('rps_cpmk', ['id' => 1202, 'rps_id' => 12, 'kode' => 'C1', 'deskripsi' => 'd', 'urutan' => 1]);
addRow('rps_sub_cpmk', ['id' => 1203, 'rps_id' => 12, 'rps_cpmk_id' => 1202, 'kode' => 'SC1', 'deskripsi' => 'd', 'urutan' => 1]);
addRow('rps_pertemuan', ['id' => 1204, 'rps_id' => 12, 'order_no' => 1, 'tipe' => 'reguler', 'sub_cpmk_id' => 1203, 'bobot_penilaian_persen' => 99, 'indikator_penilaian' => '[]']);
$v = $validator->collect_violations(12, $dosen);
ok(in_array('bobot_sum', rulesOf($v), true), 'bobot_sum flagged (99% != 100%)');

// ---------------------------------------------------------------------
echo "\n=== SCENARIO 4: Complete OBE-compliant RPS → no violations ===\n";
seedRpsHeader(13);
addRow('rps_cpl', ['id' => 1301, 'rps_id' => 13, 'cpl_id' => 1, 'urutan' => 1]);
addRow('rps_cpmk', ['id' => 1302, 'rps_id' => 13, 'kode' => 'C1', 'deskripsi' => 'd', 'urutan' => 1]);
addRow('rps_sub_cpmk', ['id' => 1303, 'rps_id' => 13, 'rps_cpmk_id' => 1302, 'kode' => 'SC1', 'deskripsi' => 'd', 'urutan' => 1]);
addRow('rps_cpmk_cpl', ['id' => 1, 'rps_cpmk_id' => 1302, 'rps_cpl_id' => 1301]);
addRow('rps_korelasi_cpl', ['id' => 1, 'rps_sub_cpmk_id' => 1303, 'rps_cpl_id' => 1301, 'persentase' => 100]);
addRow('rps_rtm', ['id' => 1, 'rps_id' => 13, 'nomor_tugas' => 'T1', 'judul_tugas' => 'tugas']);
addRow('rps_rtm_pertemuan', ['id' => 1, 'rps_rtm_id' => 1, 'rps_pertemuan_id' => 1304]);
addRow('rps_pertemuan', ['id' => 1304, 'rps_id' => 13, 'order_no' => 1, 'tipe' => 'reguler', 'sub_cpmk_id' => 1303, 'bobot_penilaian_persen' => 100, 'catatan_penugasan' => 'T1', 'indikator_penilaian' => '[]']);
$v = $validator->collect_violations(13, $dosen);
if ($v !== []) {
    echo "  Violations remaining: " . implode(', ', rulesOf($v)) . "\n";
}
ok($v === [], 'Complete OBE RPS has zero violations');

// ---------------------------------------------------------------------
echo "\n=== SCENARIO 5: W-04 disproportionate bobot warning fires ===\n";
seedRpsHeader(14);
addRow('rps_cpl', ['id' => 1401, 'rps_id' => 14, 'cpl_id' => 1, 'urutan' => 1]);
addRow('rps_cpmk', ['id' => 1402, 'rps_id' => 14, 'kode' => 'C1', 'deskripsi' => 'd', 'urutan' => 1]);
addRow('rps_sub_cpmk', ['id' => 1403, 'rps_id' => 14, 'rps_cpmk_id' => 1402, 'kode' => 'SC1', 'deskripsi' => 'd', 'urutan' => 1]);
// Single sub-CPMK carries 100% across one pertemuan → > 25% threshold.
addRow('rps_pertemuan', ['id' => 1404, 'rps_id' => 14, 'order_no' => 1, 'tipe' => 'reguler', 'sub_cpmk_id' => 1403, 'bobot_penilaian_persen' => 100, 'indikator_penilaian' => '["Menjelaskan konsep dasar transportasi secara komprehensif"]']);
$w = $validator->compute_warnings(14, $dosen);
$ids = array_column($w, 'id');
ok(in_array('W-04', $ids, true), 'W-04 disproportionate bobot warning fires');

// ---------------------------------------------------------------------
echo "\n=== SCENARIO 6: W-01 short indicator (<8 words) fires ===\n";
// 3-word indicator must trip W-01 (MIN_INDICATOR_WORDS = 8).
seedRpsHeader(15);
addRow('rps_pertemuan', ['id' => 1504, 'rps_id' => 15, 'order_no' => 1, 'tipe' => 'reguler', 'sub_cpmk_id' => null, 'bobot_penilaian_persen' => 0, 'indikator_penilaian' => '["Nilai ujian"]']);
$w = $validator->compute_warnings(15, $dosen);
$ids = array_column($w, 'id');
ok(in_array('W-01', $ids, true), 'W-01 fires for 3-word indicator');

// ---------------------------------------------------------------------
echo "\n=== SCENARIO 7: W-02 indicator without KKO verb fires ===\n";
// Seed the KKO whitelist so contains_whitelist_verb actually evaluates.
addRow('whitelist_kko', ['id' => 1, 'kata' => 'menjelaskan']);
addRow('whitelist_kko', ['id' => 2, 'kata' => 'menganalisis']);
seedRpsHeader(16);
// 9-word indicator (≥8 → no W-01) but no whitelisted verb → W-02 fires.
addRow('rps_pertemuan', ['id' => 1604, 'rps_id' => 16, 'order_no' => 1, 'tipe' => 'reguler', 'sub_cpmk_id' => null, 'bobot_penilaian_persen' => 0, 'indikator_penilaian' => '["Mengingat daftar rumus matematika dari awal sampai akhir"]']);
$w = $validator->compute_warnings(16, $dosen);
$ids = array_column($w, 'id');
ok(!in_array('W-01', $ids, true), 'W-01 does NOT fire (indicator ≥8 words)');
ok(in_array('W-02', $ids, true), 'W-02 fires (no whitelisted verb in indicator)');

// ---------------------------------------------------------------------
echo "\n=== SCENARIO 8: W-03 materi not referencing pustaka fires ===\n";
// Non-empty materi + a registered pustaka whose title fragment is absent
// from the materi text → W-03 fires.
seedRpsHeader(17);
addRow('rps_pustaka', ['id' => 1701, 'rps_id' => 17, 'kategori' => 'utama', 'teks_lengkap' => 'Buku Ajar Rekayasa Jalan Raya, Penerbit PT, 2022', 'urutan' => 1]);
addRow('rps_pertemuan', ['id' => 1704, 'rps_id' => 17, 'order_no' => 1, 'tipe' => 'reguler', 'sub_cpmk_id' => null, 'bobot_penilaian_persen' => 0, 'materi_pembelajaran' => 'Pengantar teori antrian dan model simulasi diskrit']);
$w = $validator->compute_warnings(17, $dosen);
$ids = array_column($w, 'id');
ok(in_array('W-03', $ids, true), 'W-03 fires (materi references no pustaka title)');

// ---------------------------------------------------------------------
echo "\n=== SCENARIO 9: Negative — clean indicator+verb+materi → no W-01/02/03 ===\n";
seedRpsHeader(18);
addRow('rps_pustaka', ['id' => 1801, 'rps_id' => 18, 'kategori' => 'utama', 'teks_lengkap' => 'Buku Ajar Rekayasa Jalan Raya', 'urutan' => 1]);
// ≥8 words AND contains whitelisted verb 'menjelaskan'.
addRow('rps_pertemuan', ['id' => 1804, 'rps_id' => 18, 'order_no' => 1, 'tipe' => 'reguler', 'sub_cpmk_id' => null, 'bobot_penilaian_persen' => 0, 'indikator_penilaian' => '["Menjelaskan konsep rekayasa jalan raya kepada mahasiswa tingkat akhir"]', 'materi_pembelajaran' => 'Tinjauan Buku Ajar Rekayasa Jalan Raya bab 1']);
$w = $validator->compute_warnings(18, $dosen);
$ids = array_column($w, 'id');
ok(!in_array('W-01', $ids, true), 'no W-01 (indicator ≥8 words)');
ok(!in_array('W-02', $ids, true), 'no W-02 (contains whitelisted verb)');
ok(!in_array('W-03', $ids, true), 'no W-03 (materi references pustaka title)');

// ---------------------------------------------------------------------
// Helpers
function seedRpsHeader(int $id, array $override = []): void {
    global $wpdb;
    $wpdb->insert(Prodi_RPS_DB::table('rps'), array_merge([
        'id' => $id,
        'mata_kuliah_id' => $id,
        'dosen_pengembang_user_id' => 1,
        'koordinator_rmk_user_id' => 2,
        'kaprodi_user_id' => 3,
        'workflow_status' => 'draft',
        'status' => 'draft',
        'lock_version' => 1,
        'tanggal_penyusunan' => '2026-06-01',
        'deskripsi_singkat' => 'Mata kuliah pengantar.',
        'bahan_kajian' => 'Konsep dasar, teori, aplikasi.',
        'last_changed_at' => '2026-06-20 10:00:00',
    ], $override));
}
function addRow(string $logicalTable, array $data): void {
    global $wpdb;
    if (!isset($data['id'])) { $data['id'] = $wpdb->insert_id++; }
    $wpdb->db[Prodi_RPS_DB::table($logicalTable)][] = $data;
}

echo "\n=== SUMMARY ===\n";
echo "Passed: $pass | Failed: $fail\n";
exit($fail === 0 ? 0 : 1);
