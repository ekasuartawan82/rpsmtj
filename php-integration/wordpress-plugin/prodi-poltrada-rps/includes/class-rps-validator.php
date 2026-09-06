<?php
/**
 * RPS Validator — OBE compliance checks and institutional soft warnings.
 *
 * Two layers:
 *  - Hard blockers (assert_ready_for_submission): 12 OBE rules that MUST pass
 *    before an RPS can be submitted to review. Throws RPS_Input_Exception with
 *    a `violations` array.
 *  - Soft warnings (compute_warnings / acknowledge_warning): W-01..W-04,
 *    advisory issues the author must acknowledge (one approval-log row per
 *    warning id) before submit. assert_active_warnings_acknowledged() enforces
 *    this at submit time.
 *
 * Ported from the TypeScript source:
 *   src/services/rps-workflow/submit.ts        (assertRpsReadyForSubmission)
 *   src/services/rps-validation/warnings.ts     (computeWarnings)
 *
 * @package Prodi_Poltrada_RPS
 */

if (!defined('WPINC')) {
    die;
}

class Prodi_RPS_Validator
{
    private Prodi_RPS_DB $db;

    /** Minimum word count for an assessment indicator (W-01). */
    private const MIN_INDICATOR_WORDS = 8;
    /** Bobot threshold for a single sub-CPMK to be "disproportionate" (W-04). */
    private const DISPROPORTIONATE_BOBOT = 25.0;
    /** Tolerance (percentage points) for the sum-of-bobot = 100 rule. */
    private const BOBOT_SUM_TOLERANCE = 0.01;

    public function __construct(Prodi_RPS_DB $db)
    {
        $this->db = $db;
    }

    // =====================================================================
    // HARD BLOCKERS — pre-submit OBE compliance
    // =====================================================================

    /**
     * Assert the RPS is complete enough to submit. Throws on the first
     * violated rule. Use collect_violations() to get the full list instead.
     *
     * @param int   $rpsId
     * @param array $actor Actor performing the check (ownership-scoped).
     * @throws RPS_Input_Exception when any hard blocker is violated.
     */
    public function assert_ready_for_submission(int $rpsId, array $actor): void
    {
        $violations = $this->collect_violations($rpsId, $actor);

        if ($violations !== []) {
            $messages = array_column($violations, 'message');
            $exc = new RPS_Input_Exception(
                'RPS belum memenuhi syarat submit: ' . implode(' | ', $messages)
            );
            $exc->violations = $violations;
            throw $exc;
        }
    }

    /**
     * Evaluate all 12 hard blockers and return every violation (does not
     * throw). Each violation is ['rule' => string, 'message' => string].
     */
    public function collect_violations(int $rpsId, array $actor): array
    {
        $rps = $this->db->get_rps_detail($rpsId, $actor);
        if (!$rps) {
            return [['rule' => 'not_found', 'message' => 'RPS tidak ditemukan atau akses ditolak.']];
        }

        $violations = [];

        // 1. Header completeness.
        if (empty($rps['tanggal_penyusunan'])) {
            $violations[] = ['rule' => 'header_tanggal', 'message' => 'Tanggal penyusunan wajib diisi.'];
        }
        if (empty(trim((string) ($rps['deskripsi_singkat'] ?? '')))) {
            $violations[] = ['rule' => 'header_deskripsi', 'message' => 'Deskripsi singkat mata kuliah wajib diisi.'];
        }
        if (empty(trim((string) ($rps['bahan_kajian'] ?? '')))) {
            $violations[] = ['rule' => 'header_bahan', 'message' => 'Bahan kajian wajib diisi.'];
        }

        $cpls      = $rps['cpl_entries'] ?? [];
        $cpmks     = $rps['cpmk_entries'] ?? [];
        $subCpmks  = $rps['sub_cpmk_entries'] ?? [];
        $pertemuans = $rps['pertemuan_entries'] ?? [];

        $cpmkIds    = array_map(fn($c) => (int) $c['id'], $cpmks);
        $subCpmkIds = array_map(fn($s) => (int) $s['id'], $subCpmks);

        // 2. At least one CPL.
        if (count($cpls) < 1) {
            $violations[] = ['rule' => 'min_cpl', 'message' => 'Minimal satu CPL harus dipilih.'];
        }

        // 3. At least one CPMK.
        if (count($cpmks) < 1) {
            $violations[] = ['rule' => 'min_cpmk', 'message' => 'Minimal satu CPMK harus dibuat.'];
        }

        // 4. Every CPMK mapped to >=1 CPL (OBE principle).
        $cpmkCplLinks = $this->load_cpmk_cpl_links($cpmkIds);
        foreach ($cpmks as $cpmk) {
            if (empty($cpmkCplLinks[(int) $cpmk['id']])) {
                $violations[] = [
                    'rule' => 'cpmk_cpl_mapping',
                    'message' => sprintf('CPMK "%s" belum dipetakan ke CPL manapun.', $cpmk['kode'] ?? '?'),
                ];
            }
        }

        // 5. Every CPMK has >=1 Sub-CPMK.
        $subCpmkByCpmk = [];
        foreach ($subCpmks as $sc) {
            $subCpmkByCpmk[(int) $sc['rps_cpmk_id']][] = $sc;
        }
        foreach ($cpmks as $cpmk) {
            if (empty($subCpmkByCpmk[(int) $cpmk['id']])) {
                $violations[] = [
                    'rule' => 'cpmk_sub_cpmk',
                    'message' => sprintf('CPMK "%s" belum memiliki Sub-CPMK.', $cpmk['kode'] ?? '?'),
                ];
            }
        }

        // 6. At least one Pertemuan.
        if (count($pertemuans) < 1) {
            $violations[] = ['rule' => 'min_pertemuan', 'message' => 'Minimal satu pertemuan harus dibuat.'];
        }

        // 7. Every Sub-CPMK has a CPL korelasi with persen > 0.
        $korelasi = $this->load_korelasi($subCpmkIds);
        foreach ($subCpmks as $sc) {
            $hasPositive = false;
            foreach ($korelasi[(int) $sc['id']] ?? [] as $persen) {
                if ((float) $persen > 0) {
                    $hasPositive = true;
                    break;
                }
            }
            if (!$hasPositive) {
                $violations[] = [
                    'rule' => 'sub_cpmk_korelasi',
                    'message' => sprintf('Sub-CPMK "%s" belum memiliki korelasi CPL (> 0%%).', $sc['kode'] ?? '?'),
                ];
            }
        }

        // 8. Every Sub-CPMK referenced in a reguler pertemuan (and vice-versa:
        //    every reguler pertemuan must reference a sub-CPMK).
        $regulerPertemuans = array_filter($pertemuans, fn($p) => ($p['tipe'] ?? 'reguler') === 'reguler');
        $referencedSubCpmks = [];
        foreach ($regulerPertemuans as $p) {
            if (!empty($p['sub_cpmk_id'])) {
                $referencedSubCpmks[(int) $p['sub_cpmk_id']] = true;
            }
        }
        foreach ($subCpmks as $sc) {
            if (!isset($referencedSubCpmks[(int) $sc['id']])) {
                $violations[] = [
                    'rule' => 'sub_cpmk_pertemuan',
                    'message' => sprintf('Sub-CPMK "%s" belum dirujuk pada pertemuan reguler manapun.', $sc['kode'] ?? '?'),
                ];
            }
        }

        // 9. Sum of bobot_penilaian_persen over reguler pertemuans = 100.
        $bobotSum = 0.0;
        foreach ($regulerPertemuans as $p) {
            $bobotSum += (float) ($p['bobot_penilaian_persen'] ?? 0);
        }
        if (abs($bobotSum - 100.0) > self::BOBOT_SUM_TOLERANCE) {
            $violations[] = [
                'rule' => 'bobot_sum',
                'message' => sprintf('Total bobot penilaian pertemuan reguler = %.2f%% (harus 100%%).', $bobotSum),
            ];
        }

        // 10. Every catatan_penugasan on a pertemuan must match an RTM nomor_tugas.
        $rtmNumbers = $this->load_rtm_nomor_tugas($rpsId);
        foreach ($pertemuans as $p) {
            $catatan = trim((string) ($p['catatan_penugasan'] ?? ''));
            if ($catatan === '') {
                continue;
            }
            // catatan_penugasan may be a comma/newline list of tugas numbers.
            $tokens = preg_split('/[\s,]+/', $catatan) ?: [];
            foreach ($tokens as $tok) {
                $tok = trim($tok);
                if ($tok !== '' && !isset($rtmNumbers[$tok])) {
                    $violations[] = [
                        'rule' => 'penugasan_rtm',
                        'message' => sprintf('Catatan penugasan "%s" tidak cocok dengan nomor tugas RTM manapun.', $tok),
                    ];
                }
            }
        }

        // 11. Every RTM linked to >=1 pertemuan.
        $orphanedRtms = $this->load_orphaned_rtms($rpsId);
        foreach ($orphanedRtms as $rtmNomor) {
            $violations[] = [
                'rule' => 'rtm_pertemuan',
                'message' => sprintf('RTM "%s" belum ditautkan ke pertemuan manapun.', $rtmNomor),
            ];
        }

        // 12. Pertemuan ets/eas at week 8/16 (institutional rule).
        $byTipe = [];
        foreach ($pertemuans as $p) {
            $byTipe[$p['tipe'] ?? 'reguler'][] = (int) ($p['order_no'] ?? 0);
        }
        if (!empty($byTipe['ets']) && min($byTipe['ets']) !== 8) {
            $violations[] = ['rule' => 'ets_week', 'message' => 'Pertemuan UTS (ets) harus berada di minggu ke-8.'];
        }
        if (!empty($byTipe['eas']) && min($byTipe['eas']) !== 16) {
            $violations[] = ['rule' => 'eas_week', 'message' => 'Pertemuan UAS (eas) harus berada di minggu ke-16.'];
        }

        return $violations;
    }

    // =====================================================================
    // SOFT WARNINGS — W-01..W-04
    // =====================================================================

    /**
     * Compute the 4 institutional soft warnings. Returns a list of
     * ['id' => 'W-0x', 'severity' => 'warning', 'message' => string, 'detail' => string].
     */
    public function compute_warnings(int $rpsId, array $actor): array
    {
        $rps = $this->db->get_rps_detail($rpsId, $actor);
        if (!$rps) {
            return [];
        }

        $warnings = [];
        $whitelist = $this->load_kko_whitelist();
        $pustakaTitles = $this->extract_pustaka_titles($rps['pustaka_entries'] ?? []);

        foreach ($rps['pertemuan_entries'] ?? [] as $p) {
            $week = (int) ($p['order_no'] ?? 0);
            $weekLabel = $p['week_label'] ?? ('Minggu ' . $week);

            // W-01: each indikator_penilaian should be >= MIN_INDICATOR_WORDS.
            foreach ($this->lines_from_json($p['indikator_penilaian'] ?? '') as $indikator) {
                $wordCount = str_word_count($indikator);
                if ($wordCount > 0 && $wordCount < self::MIN_INDICATOR_WORDS) {
                    $warnings[] = [
                        'id' => 'W-01',
                        'severity' => 'warning',
                        'message' => sprintf('Indikator penilaian pada %s terlalu singkat (%d kata, minimal %d).', $weekLabel, $wordCount, self::MIN_INDICATOR_WORDS),
                        'detail' => $indikator,
                    ];
                }

                // W-02: should contain a whitelisted operational verb (kata kerja operasional).
                if ($wordCount > 0 && !$this->contains_whitelist_verb($indikator, $whitelist)) {
                    $warnings[] = [
                        'id' => 'W-02',
                        'severity' => 'warning',
                        'message' => sprintf('Indikator penilaian pada %s tidak memuat kata kerja operasional dari whitelist KKO.', $weekLabel),
                        'detail' => $indikator,
                    ];
                }
            }

            // W-03: materi_pembelajaran should reference a pustaka (fuzzy title match).
            $materi = trim((string) ($p['materi_pembelajaran'] ?? ''));
            if ($materi !== '' && $pustakaTitles !== []) {
                if (!$this->materi_references_pustaka($materi, $pustakaTitles)) {
                    $warnings[] = [
                        'id' => 'W-03',
                        'severity' => 'warning',
                        'message' => sprintf('Materi pembelajaran %s tidak merujuk pustaka yang terdaftar.', $weekLabel),
                        'detail' => mb_substr($materi, 0, 120),
                    ];
                }
            }
        }

        // W-04: a single sub-CPMK's weekly bobot > DISPROPORTIONATE_BOBOT.
        $bobotBySubCpmk = [];
        foreach ($rps['pertemuan_entries'] ?? [] as $p) {
            if (($p['tipe'] ?? 'reguler') !== 'reguler' || empty($p['sub_cpmk_id'])) {
                continue;
            }
            $sid = (int) $p['sub_cpmk_id'];
            $bobotBySubCpmk[$sid] = ($bobotBySubCpmk[$sid] ?? 0.0) + (float) ($p['bobot_penilaian_persen'] ?? 0);
        }
        $subCpmkLabels = [];
        foreach ($rps['sub_cpmk_entries'] ?? [] as $sc) {
            $subCpmkLabels[(int) $sc['id']] = $sc['kode'] ?? '?';
        }
        foreach ($bobotBySubCpmk as $sid => $totalBobot) {
            if ($totalBobot > self::DISPROPORTIONATE_BOBOT) {
                $warnings[] = [
                    'id' => 'W-04',
                    'severity' => 'warning',
                    'message' => sprintf('Sub-CPMK "%s" menanggung bobot %.2f%% (>%d%%) — dianggap berlebihan.', $subCpmkLabels[$sid] ?? '?', $totalBobot, (int) self::DISPROPORTIONATE_BOBOT),
                    'detail' => sprintf('sub_cpmk_id=%d total=%.2f', $sid, $totalBobot),
                ];
            }
        }

        return $warnings;
    }

    /**
     * Acknowledge a warning (persisted as an approval-log row so it survives
     * re-evaluation). Idempotent: re-acknowledging the same warning is a no-op
     * within the current lock_version.
     */
    public function acknowledge_warning(int $rpsId, string $warningId, array $actor): void
    {
        global $wpdb;

        $rps = $this->db->get_rps_detail($rpsId, $actor);
        if (!$rps) {
            throw new RPS_Input_Exception('RPS tidak ditemukan atau akses ditolak.');
        }

        $wpdb->insert(Prodi_RPS_DB::table('rps_approval_log'), [
            'rps_id' => $rpsId,
            'lock_version' => (int) ($rps['lock_version'] ?? 0),
            'actor_user_id' => (int) $actor['id'],
            'actor_role' => sanitize_text_field($actor['role']),
            'actor_name' => sanitize_text_field($actor['name']),
            'action' => 'acknowledge_warning',
            'catatan_review' => sanitize_text_field($warningId),
            'revision_round' => (int) ($rps['current_revision_count'] ?? 0),
            'created_at' => current_time('mysql'),
        ], ['%d', '%d', '%d', '%s', '%s', '%s', '%s', '%d', '%s']);
    }

    /**
     * Assert every currently-active warning has been acknowledged. Called at
     * submit time. A warning is "active" if there is no acknowledge_warning
     * log row for its id at or after the document's last_changed_at.
     *
     * @throws RPS_Input_Exception listing unacknowledged warning ids.
     */
    public function assert_active_warnings_acknowledged(int $rpsId, array $actor): void
    {
        $active = $this->unacknowledged_warnings($rpsId, $actor);
        if ($active === []) {
            return;
        }
        $ids = array_unique(array_column($active, 'id'));
        throw new RPS_Input_Exception(
            'Ada peringatan institusional yang belum di-acknowledge: ' . implode(', ', $ids)
        );
    }

    /**
     * Return the subset of current warnings not yet acknowledged since the
     * document last changed.
     */
    public function unacknowledged_warnings(int $rpsId, array $actor): array
    {
        $current = $this->compute_warnings($rpsId, $actor);
        if ($current === []) {
            return [];
        }

        $rps = $this->db->get_rps_detail($rpsId, $actor);
        if (!$rps) {
            return $current;
        }

        // Latest acknowledge timestamp per warning id.
        $acks = $this->load_acknowledgements($rpsId);
        $lastChanged = (string) ($rps['last_changed_at'] ?? '');

        return array_values(array_filter($current, function (array $w) use ($acks, $lastChanged): bool {
            $ackAt = $acks[$w['id']] ?? null;
            // Unacknowledged if never acked, or acked before the last change.
            return $ackAt === null
                || ($lastChanged !== '' && strtotime($ackAt) < strtotime($lastChanged));
        }));
    }

    // =====================================================================
    // Data loaders (direct $wpdb — these relations have no DB-class getter)
    // =====================================================================

    /**
     * Load the CPMK↔CPL link map for the given CPMK ids. Reads the link table
     * once (single-table query — mockable) and filters locally by id set.
     *
     * @param int[] $cpmkIds CPMK ids belonging to the RPS.
     * @return array<int, int[]> cpmk_id => [cpl_id, ...]
     */
    private function load_cpmk_cpl_links(array $cpmkIds): array
    {
        global $wpdb;
        if ($cpmkIds === []) { return []; }

        $rows = $wpdb->get_results(
            "SELECT rps_cpmk_id, rps_cpl_id FROM " . Prodi_RPS_DB::table('rps_cpmk_cpl'),
            ARRAY_A
        ) ?: [];

        $out = [];
        foreach ($rows as $row) {
            $cpmkId = (int) $row['rps_cpmk_id'];
            if (!in_array($cpmkId, $cpmkIds, true)) { continue; }
            $out[$cpmkId][] = (int) $row['rps_cpl_id'];
        }
        return $out;
    }

    /**
     * Load the Sub-CPMK↔CPL korelasi map for the given Sub-CPMK ids.
     *
     * @param int[] $subCpmkIds Sub-CPMK ids belonging to the RPS.
     * @return array<int, float[]> sub_cpmk_id => [persentase, ...]
     */
    private function load_korelasi(array $subCpmkIds): array
    {
        global $wpdb;
        if ($subCpmkIds === []) { return []; }

        $rows = $wpdb->get_results(
            "SELECT rps_sub_cpmk_id, persentase FROM " . Prodi_RPS_DB::table('rps_korelasi_cpl'),
            ARRAY_A
        ) ?: [];

        $out = [];
        foreach ($rows as $row) {
            $sid = (int) $row['rps_sub_cpmk_id'];
            if (!in_array($sid, $subCpmkIds, true)) { continue; }
            $out[$sid][] = (float) $row['persentase'];
        }
        return $out;
    }

    /** @return array<string, true> nomor_tugas => true */
    private function load_rtm_nomor_tugas(int $rpsId): array
    {
        global $wpdb;
        $rows = $wpdb->get_col($wpdb->prepare(
            "SELECT nomor_tugas FROM " . Prodi_RPS_DB::table('rps_rtm') . " WHERE rps_id = %d",
            $rpsId
        )) ?: [];

        $out = [];
        foreach ($rows as $nomor) {
            $out[trim((string) $nomor)] = true;
        }
        return $out;
    }

    /** @return string[] nomor_tugas of RTMs with no pertemuan link. */
    private function load_orphaned_rtms(int $rpsId): array
    {
        global $wpdb;
        return $wpdb->get_col($wpdb->prepare(
            "SELECT r.nomor_tugas
             FROM " . Prodi_RPS_DB::table('rps_rtm') . " r
             WHERE r.rps_id = %d
               AND NOT EXISTS (
                   SELECT 1 FROM " . Prodi_RPS_DB::table('rps_rtm_pertemuan') . " rp
                   WHERE rp.rps_rtm_id = r.id
               )",
            $rpsId
        )) ?: [];
    }

    /** @return array<string, string> warning_id => acknowledged_at */
    private function load_acknowledgements(int $rpsId): array
    {
        global $wpdb;
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT catatan_review AS wid, MAX(created_at) AS ack_at
             FROM " . Prodi_RPS_DB::table('rps_approval_log') . "
             WHERE rps_id = %d AND action = 'acknowledge_warning'
             GROUP BY catatan_review",
            $rpsId
        ), ARRAY_A) ?: [];

        $out = [];
        foreach ($rows as $row) {
            $out[trim((string) $row['wid'])] = (string) $row['ack_at'];
        }
        return $out;
    }

    /** @return string[] lowercased operational verbs from the KKO whitelist. */
    private function load_kko_whitelist(): array
    {
        global $wpdb;
        $rows = $wpdb->get_col("SELECT kata FROM " . Prodi_RPS_DB::table('whitelist_kko')) ?: [];
        return array_values(array_filter(array_map(
            static fn($v) => is_string($v) ? strtolower(trim($v)) : '',
            $rows
        )));
    }

    // =====================================================================
    // Text helpers
    // =====================================================================

    /** @return string[] */
    private function lines_from_json(string $json): array
    {
        if ($json === '') {
            return [];
        }
        $decoded = json_decode($json, true);
        if (is_array($decoded)) {
            return array_values(array_filter(array_map('trim', $decoded), fn($s) => $s !== ''));
        }
        // Fall back to newline-split for legacy plain-text storage.
        return array_values(array_filter(array_map('trim', explode("\n", $json)), fn($s) => $s !== ''));
    }

    /** @return string[] candidate title fragments extracted from pustaka entries. */
    private function extract_pustaka_titles(array $pustakaEntries): array
    {
        $titles = [];
        foreach ($pustakaEntries as $p) {
            $text = trim((string) ($p['teks_lengkap'] ?? ''));
            if ($text === '') {
                continue;
            }
            // Use the first ~6 words of each pustaka as a fuzzy title token.
            $words = preg_split('/\s+/', $text) ?: [];
            $fragment = implode(' ', array_slice($words, 0, 6));
            if ($fragment !== '') {
                $titles[] = strtolower($fragment);
            }
        }
        return $titles;
    }

    private function contains_whitelist_verb(string $text, array $whitelist): bool
    {
        if ($whitelist === []) {
            // No whitelist configured → do not flag (avoid false positives).
            return true;
        }
        $lower = strtolower($text);
        foreach ($whitelist as $verb) {
            if ($verb !== '' && strpos($lower, $verb) !== false) {
                return true;
            }
        }
        return false;
    }

    private function materi_references_pustaka(string $materi, array $pustakaTitles): bool
    {
        $lower = strtolower($materi);
        foreach ($pustakaTitles as $title) {
            if ($title !== '' && strpos($lower, $title) !== false) {
                return true;
            }
        }
        return false;
    }
}
