<?php

if (!defined('WPINC')) {
    die;
}

class Prodi_RPS_Frontend {
    private Prodi_RPS_DB $db;
    private Prodi_RPS_Governance_Service $governance;
    private Prodi_RPS_Validator $validator;
    private Prodi_RPS_Pdf $pdf;

    public function __construct(Prodi_RPS_DB $db, Prodi_RPS_Governance_Service $governance, Prodi_RPS_Validator $validator, Prodi_RPS_Pdf $pdf)
    {
        $this->db = $db;
        $this->governance = $governance;
        $this->validator = $validator;
        $this->pdf = $pdf;

        add_shortcode('prodi_rps_app', [$this, 'render_shortcode']);
        add_action('template_redirect', [$this, 'handle_form_actions']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);

        // Register AJAX Endpoints for Governance
        add_action('wp_ajax_prodi_rps_submit_to_rmk', [$this, 'ajax_submit_to_rmk']);
        add_action('wp_ajax_prodi_rps_approve_rmk', [$this, 'ajax_approve_rmk']);
        add_action('wp_ajax_prodi_rps_reject_rmk', [$this, 'ajax_reject_rmk']);
        add_action('wp_ajax_prodi_rps_approve_kaprodi', [$this, 'ajax_approve_kaprodi']);
        add_action('wp_ajax_prodi_rps_reject_kaprodi', [$this, 'ajax_reject_kaprodi']);
        add_action('wp_ajax_prodi_rps_test_state', [$this, 'ajax_test_state']);

        // Copy-as-draft (Slice 5) — outside governance freeze zone
        add_action('wp_ajax_prodi_rps_copy_as_draft', [$this, 'ajax_copy_as_draft']);

        // Version history (Slice 6) — read-only query, outside freeze zone
        add_action('wp_ajax_prodi_rps_version_history', [$this, 'ajax_version_history']);

        // Dashboard filter (Slice 7) — prodi-scoped RPS list query
        add_action('wp_ajax_prodi_rps_dashboard_list', [$this, 'ajax_dashboard_list']);

        // Validation & warnings (Phase 4) — OBE blockers + W-01..W-04
        add_action('wp_ajax_prodi_rps_validate', [$this, 'ajax_validate']);
        add_action('wp_ajax_prodi_rps_warnings', [$this, 'ajax_warnings']);
        add_action('wp_ajax_prodi_rps_acknowledge_warning', [$this, 'ajax_acknowledge_warning']);

        // PDF export (Phase 4) — approved RPS only, streams a download
        add_action('wp_ajax_prodi_rps_export_pdf', [$this, 'ajax_export_pdf']);
    }

    public function enqueue_assets(): void
    {
        wp_enqueue_style(
            'prodi-rps-frontend',
            PRODI_RPS_PLUGIN_URL . 'assets/frontend.css',
            [],
            PRODI_RPS_PLUGIN_VERSION
        );
    }

    public function handle_form_actions(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['prodi_rps_action'])) {
            return;
        }

        if (!isset($_POST['prodi_rps_nonce']) || !wp_verify_nonce((string) $_POST['prodi_rps_nonce'], 'prodi_rps_action')) {
            wp_die(esc_html__('Permintaan tidak valid.', 'prodi-poltrada-rps'), 403);
        }

        $actor = $this->db->current_actor();
        if ($actor === null) {
            auth_redirect();
        }

        $action = sanitize_key((string) $_POST['prodi_rps_action']);
        $redirect = wp_get_referer() ?: home_url('/');
        $success = false;
        $rpsId = isset($_POST['rps_id']) ? absint($_POST['rps_id']) : 0;

        switch ($action) {
            case 'create_rps':
                $createdId = $this->handle_create_rps($actor);
                if ($createdId > 0) {
                    $success = true;
                    $redirect = add_query_arg([
                        'rps_view' => 'detail',
                        'rps_id' => $createdId,
                        'prodi_rps_notice' => 'created',
                    ], remove_query_arg(['prodi_rps_error'], $redirect));
                }
                break;

            case 'update_header':
                $lockVersion = isset($_POST['lock_version']) ? absint($_POST['lock_version']) : 0;
                try {
                    $success = $this->governance->update_rps_header($rpsId, $lockVersion, wp_unslash($_POST), $actor);
                } catch (Exception $e) {
                    $success = false;
                    $redirect = add_query_arg(['prodi_rps_error' => 'governance'], $redirect);
                }
                break;

            case 'add_cpl':
                $success = $this->db->add_cpl_to_rps($rpsId, wp_unslash($_POST), $actor);
                break;

            case 'add_cpmk':
                $success = $this->db->add_cpmk($rpsId, wp_unslash($_POST), $actor);
                break;

            case 'add_sub_cpmk':
                $success = $this->db->add_sub_cpmk($rpsId, wp_unslash($_POST), $actor);
                break;

            case 'add_pertemuan':
                $success = $this->db->add_pertemuan($rpsId, wp_unslash($_POST), $actor);
                break;

            case 'add_pustaka':
                $success = $this->db->add_pustaka($rpsId, wp_unslash($_POST), $actor);
                break;

            case 'transition_status':
                $workflowAction = sanitize_key((string) ($_POST['workflow_action'] ?? ''));
                $note = isset($_POST['catatan_review']) ? sanitize_textarea_field(wp_unslash($_POST['catatan_review'])) : null;
                $lockVersion = isset($_POST['lock_version']) ? absint($_POST['lock_version']) : 0;
                
                try {
                    if ($workflowAction === 'submit_to_rmk') $success = $this->governance->submit_to_rmk($rpsId, $lockVersion, $actor);
                    elseif ($workflowAction === 'approve_rmk') $success = $this->governance->approve_rmk($rpsId, $lockVersion, $note, $actor);
                    elseif ($workflowAction === 'reject_rmk') $success = $this->governance->reject_rmk($rpsId, $lockVersion, $note, $actor);
                    elseif ($workflowAction === 'approve_kaprodi') $success = $this->governance->approve_kaprodi($rpsId, $lockVersion, $note, $actor);
                    elseif ($workflowAction === 'reject_kaprodi') $success = $this->governance->reject_kaprodi($rpsId, $lockVersion, $note, $actor);
                } catch (Exception $e) {
                    $success = false;
                    $redirect = add_query_arg(['prodi_rps_error' => 'governance'], $redirect);
                }
                break;
        }

        $redirect = remove_query_arg(['prodi_rps_notice', 'prodi_rps_error'], $redirect);
        $redirect = add_query_arg($success ? ['prodi_rps_notice' => 'saved'] : ['prodi_rps_error' => 'failed'], $redirect);

        wp_safe_redirect($redirect);
        exit;
    }

    // --- AJAX HANDLERS ---

    public function ajax_submit_to_rmk(): void { $this->handle_ajax_governance_action('submit_to_rmk'); }
    public function ajax_approve_rmk(): void { $this->handle_ajax_governance_action('approve_rmk'); }
    public function ajax_reject_rmk(): void { $this->handle_ajax_governance_action('reject_rmk'); }
    public function ajax_approve_kaprodi(): void { $this->handle_ajax_governance_action('approve_kaprodi'); }
    public function ajax_reject_kaprodi(): void { $this->handle_ajax_governance_action('reject_kaprodi'); }

    private function handle_ajax_governance_action(string $action_name): void {
        if (!is_user_logged_in()) {
            wp_send_json_error(['code' => 'unauthorized', 'message' => 'Silakan login terlebih dahulu.'], 401);
        }

        if (!check_ajax_referer('prodi_rps_ajax', 'nonce', false)) {
            wp_send_json_error(['code' => 'forbidden', 'message' => 'Permintaan tidak valid (nonce mismatch).'], 403);
        }

        $actor = $this->db->current_actor();
        if (!$actor) {
            wp_send_json_error(['code' => 'unauthorized', 'message' => 'Gagal mengidentifikasi peran pengguna.'], 401);
        }

        $rpsId = isset($_POST['rps_id']) ? absint($_POST['rps_id']) : 0;
        $lockVersion = isset($_POST['lock_version']) ? absint($_POST['lock_version']) : 0;
        $note = isset($_POST['note']) ? sanitize_textarea_field(wp_unslash($_POST['note'])) : null;

        // FIXED: Allow lock_version=0 (valid initial state)
        if ($rpsId <= 0 || $lockVersion < 0) {
            wp_send_json_error(['code' => 'bad_request', 'message' => 'Data tidak lengkap (rps_id atau lock_version tidak valid).'], 400);
        }

        // PRODI SCOPE FILTER: Validate actor_prodi === rps_prodi BEFORE governance
        // Injected at query layer — governance engine NOT modified (freeze zone)
        if (!class_exists('Prodi_Scope_Filter')) {
            require_once dirname(__FILE__) . '/class-prodi-scope-filter.php';
        }

        if (!Prodi_Scope_Filter::validate_rps_access($rpsId, $actor['id'])) {
            $actor_prodi = Prodi_Scope_Filter::get_user_prodi($actor['id']);
            $rps_prodi = Prodi_Scope_Filter::get_rps_prodi($rpsId);

            wp_send_json_error([
                'code' => 'forbidden',
                'message' => 'Cross-prodi access denied',
                'details' => sprintf(
                    'Actor prodi (%s) tidak match dengan RPS prodi (%s)',
                    $actor_prodi ?: 'UNASSIGNED',
                    $rps_prodi ?: 'UNKNOWN'
                )
            ], 403);
        }

        try {
            switch ($action_name) {
                case 'submit_to_rmk':
                    $this->governance->submit_to_rmk($rpsId, $lockVersion, $actor);
                    $msg = 'RPS berhasil di-submit ke Koordinator RMK.';
                    break;
                case 'approve_rmk':
                    $this->governance->approve_rmk($rpsId, $lockVersion, $note, $actor);
                    $msg = 'RPS berhasil disetujui oleh Koordinator RMK.';
                    break;
                case 'reject_rmk':
                    $this->governance->reject_rmk($rpsId, $lockVersion, $note, $actor);
                    $msg = 'RPS ditolak oleh Koordinator RMK dan dikembalikan untuk direvisi.';
                    break;
                case 'approve_kaprodi':
                    $this->governance->approve_kaprodi($rpsId, $lockVersion, $note, $actor);
                    $msg = 'RPS berhasil disetujui oleh Kaprodi.';
                    break;
                case 'reject_kaprodi':
                    $this->governance->reject_kaprodi($rpsId, $lockVersion, $note, $actor);
                    $msg = 'RPS ditolak oleh Kaprodi dan dikembalikan untuk direvisi.';
                    break;
                default:
                    throw new Exception("Unknown action.");
            }

            wp_send_json_success([
                'rps_id' => $rpsId,
                'action' => $action_name,
                'message' => $msg
            ]);

        } catch (RPS_Concurrency_Exception $e) {
            wp_send_json_error(['code' => 'concurrency_conflict', 'message' => $e->getMessage()], 409);
        } catch (RPS_Governance_Exception $e) {
            wp_send_json_error(['code' => 'forbidden', 'message' => $e->getMessage()], 403);
        } catch (RPS_Input_Exception $e) {
            wp_send_json_error(['code' => 'bad_request', 'message' => $e->getMessage()], 400);
        } catch (Exception $e) {
            error_log('RPS Governance 500 Error: ' . $e->getMessage());
            wp_send_json_error([
                'code' => 'internal_error',
                'message' => 'Terjadi kesalahan sistem. Silakan hubungi administrator.'
            ], 500);
        }
    }

    public function ajax_test_state(): void {
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            wp_send_json_error(['message' => 'Disabled'], 403);
        }

        if (!check_ajax_referer('prodi_rps_ajax', 'nonce', false)) {
            wp_send_json_error(['message' => 'Nonce failed'], 403);
        }

        $rpsId = isset($_POST['rps_id']) ? absint($_POST['rps_id']) : 0;
        if ($rpsId <= 0) {
            wp_send_json_error(['message' => 'Invalid ID'], 400);
        }

        global $wpdb;
        $table = Prodi_RPS_DB::table('rps');
        $logTable = Prodi_RPS_DB::table('rps_approval_log');

        $rps = $wpdb->get_row($wpdb->prepare("SELECT workflow_status, lock_version FROM {$table} WHERE id = %d", $rpsId));
        if (!$rps) {
            wp_send_json_error(['message' => 'Not found'], 404);
        }

        $logs = $wpdb->get_results($wpdb->prepare("SELECT action, COUNT(*) as cnt FROM {$logTable} WHERE rps_id = %d GROUP BY action", $rpsId), ARRAY_A);
        $logCounts = [];
        if ($logs) {
            foreach ($logs as $l) {
                $logCounts[$l['action']] = (int) $l['cnt'];
            }
        }

        wp_send_json_success([
            'rps_id' => $rpsId,
            'workflow_status' => $rps->workflow_status,
            'lock_version' => (int) $rps->lock_version,
            'logs' => $logCounts
        ]);
    }

    public function render_shortcode($atts = []): string
    {
        $actor = $this->db->current_actor();
        if ($actor === null) {
            return $this->render_login_required();
        }

        $view = sanitize_key((string) ($_GET['rps_view'] ?? 'list'));
        $rpsId = isset($_GET['rps_id']) ? absint($_GET['rps_id']) : 0;

        ob_start();
        echo '<div class="prodi-rps-shell">';
        $this->render_notice();

        if ($view === 'detail' && $rpsId > 0) {
            $this->render_detail($rpsId, $actor);
        } else {
            $this->render_list($actor);
        }

        echo '</div>';

        return (string) ob_get_clean();
    }

    private function handle_create_rps(array $actor): int
    {
        $tahunAkademik = sanitize_text_field((string) ($_POST['tahun_akademik'] ?? ''));
        if (!preg_match('/^\d{4}\/\d{4}$/', $tahunAkademik)) {
            return 0;
        }

        $dosenPengembangId = absint($_POST['dosen_pengembang_user_id'] ?? 0);
        if ($dosenPengembangId <= 0) {
            $dosenPengembangId = (int) $actor['id'];
        }

        return $this->db->create_rps([
            'mata_kuliah_id' => absint($_POST['mata_kuliah_id'] ?? 0),
            'tahun_akademik' => $tahunAkademik,
            'tanggal_penyusunan' => sanitize_text_field((string) ($_POST['tanggal_penyusunan'] ?? '')),
            'dosen_pengembang_user_id' => $dosenPengembangId,
            'koordinator_rmk_user_id' => absint($_POST['koordinator_rmk_user_id'] ?? 0),
            'kaprodi_user_id' => absint($_POST['kaprodi_user_id'] ?? 0),
        ], $actor);
    }

    private function render_login_required(): string
    {
        $loginUrl = wp_login_url((string) (is_singular() ? get_permalink() : home_url('/')));

        return '<div class="prodi-rps-shell"><div class="prodi-rps-card">' .
            '<h2>RPS Prodi</h2>' .
            '<p class="prodi-rps-muted">Silakan login dengan akun WordPress untuk membuka modul RPS.</p>' .
            '<div class="prodi-rps-actions"><a class="prodi-rps-button" href="' . esc_url($loginUrl) . '">Login WordPress</a></div>' .
            '</div></div>';
    }

    private function render_notice(): void
    {
        if (!empty($_GET['prodi_rps_notice'])) {
            echo '<div class="prodi-rps-notice">Perubahan berhasil disimpan.</div>';
        }

        if (!empty($_GET['prodi_rps_error'])) {
            echo '<div class="prodi-rps-notice prodi-rps-notice-error">Permintaan gagal diproses. Periksa hak akses dan kelengkapan data.</div>';
        }
    }

    private function render_list(array $actor): void
    {
        $filters = [
            'status' => sanitize_key((string) ($_GET['status'] ?? '')),
            'tahun_akademik' => sanitize_text_field((string) ($_GET['tahun_akademik'] ?? '')),
            'mata_kuliah_id' => absint($_GET['mata_kuliah_id'] ?? 0),
        ];

        $records = $this->db->list_rps($actor, $filters);
        $mataKuliah = $this->db->get_mata_kuliah_options();
        $allUsers = $this->db->get_user_options();
        $dosenOptions = $this->prefer_role_options(Prodi_RPS_DB::ROLE_DOSEN, $allUsers);
        $rmkOptions = $this->prefer_role_options(Prodi_RPS_DB::ROLE_KOORDINATOR_RMK, $allUsers);
        $kaprodiOptions = $this->prefer_role_options(Prodi_RPS_DB::ROLE_KAPRODI, $allUsers);

        echo '<div class="prodi-rps-header">';
        echo '<div><h2>RPS Prodi</h2>';
        echo '<p>Aktor: ' . esc_html($actor['name']) . ' (' . esc_html($this->db->role_label($actor['role'])) . ')</p></div>';
        echo '<div class="prodi-rps-actions"><a class="prodi-rps-button prodi-rps-button-secondary" href="' . esc_url(remove_query_arg(['status', 'tahun_akademik', 'mata_kuliah_id', 'rps_view', 'rps_id'])) . '">Reset Filter</a></div>';
        echo '</div>';

        echo '<section class="prodi-rps-card">';
        echo '<form method="get" class="prodi-rps-toolbar">';
        $this->preserve_page_query_inputs(['status', 'tahun_akademik', 'mata_kuliah_id']);
        echo '<div class="prodi-rps-field"><label for="tahun_akademik">Tahun akademik</label><input class="prodi-rps-input" id="tahun_akademik" name="tahun_akademik" value="' . esc_attr($filters['tahun_akademik']) . '" placeholder="2026/2027"></div>';
        echo '<div class="prodi-rps-field"><label for="status">Status</label><select class="prodi-rps-select" id="status" name="status">';
        $this->render_status_options((string) $filters['status']);
        echo '</select></div>';
        echo '<div class="prodi-rps-field"><label for="mata_kuliah_id">Mata kuliah</label><select class="prodi-rps-select" id="mata_kuliah_id" name="mata_kuliah_id">';
        echo '<option value="">Semua mata kuliah</option>';
        foreach ($mataKuliah as $mk) {
            printf(
                '<option value="%d"%s>%s - %s</option>',
                (int) $mk['id'],
                selected((int) $filters['mata_kuliah_id'], (int) $mk['id'], false),
                esc_html($mk['kode']),
                esc_html($mk['nama'])
            );
        }
        echo '</select></div>';
        echo '<button class="prodi-rps-button" type="submit">Terapkan</button>';
        echo '</form>';
        echo '</section>';

        if (in_array($actor['role'], [Prodi_RPS_DB::ROLE_ADMIN, Prodi_RPS_DB::ROLE_DOSEN], true)) {
            $this->render_create_form($actor, $mataKuliah, $dosenOptions, $rmkOptions, $kaprodiOptions);
        }

        echo '<section class="prodi-rps-card">';
        echo '<div class="prodi-rps-table-wrap"><table class="prodi-rps-table">';
        echo '<thead><tr><th>Mata Kuliah</th><th>Tahun</th><th>Dosen Pengembang</th><th>Reviewer</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';

        if ($records === []) {
            echo '<tr><td colspan="6">Belum ada RPS yang sesuai filter.</td></tr>';
        }

        foreach ($records as $record) {
            $detailUrl = add_query_arg([
                'rps_view' => 'detail',
                'rps_id' => (int) $record['id'],
            ]);
            echo '<tr>';
            echo '<td><strong>' . esc_html((string) $record['kode_mk']) . '</strong><br>' . esc_html((string) $record['nama_mk']) . '<br><span class="prodi-rps-muted">Versi ' . esc_html((string) $record['version_no']) . ' dari ' . esc_html((string) $record['version_count']) . '</span></td>';
            echo '<td>' . esc_html((string) $record['tahun_akademik']) . '</td>';
            echo '<td>' . esc_html((string) $record['dosen_pengembang_name']) . '</td>';
            echo '<td><span class="prodi-rps-muted">RMK:</span> ' . esc_html((string) $record['koordinator_rmk_name']) . '<br><span class="prodi-rps-muted">Kaprodi:</span> ' . esc_html((string) $record['kaprodi_name']) . '</td>';
            echo '<td>' . $this->status_badge((string) $record['status']) . '</td>';
            echo '<td><a class="prodi-rps-button prodi-rps-button-secondary" href="' . esc_url($detailUrl) . '">Buka</a></td>';
            echo '</tr>';
        }

        echo '</tbody></table></div>';
        echo '</section>';
    }

    private function render_create_form(array $actor, array $mataKuliah, array $dosenOptions, array $rmkOptions, array $kaprodiOptions): void
    {
        echo '<section class="prodi-rps-card">';
        echo '<h3>Buat RPS Baru</h3>';

        if ($mataKuliah === []) {
            echo '<p class="prodi-rps-muted">Tabel kurikulum existing belum tersedia atau belum berisi data. Pastikan tabel <code>wp_prodi_kurikulum</code> sudah ada.</p>';
            echo '</section>';
            return;
        }

        echo '<form method="post">';
        wp_nonce_field('prodi_rps_action', 'prodi_rps_nonce');
        echo '<input type="hidden" name="prodi_rps_action" value="create_rps">';
        echo '<div class="prodi-rps-toolbar">';
        echo '<div class="prodi-rps-field"><label>Mata kuliah</label><select class="prodi-rps-select" name="mata_kuliah_id" required><option value="">Pilih mata kuliah</option>';
        foreach ($mataKuliah as $mk) {
            printf('<option value="%d">%s - %s</option>', (int) $mk['id'], esc_html($mk['kode']), esc_html($mk['nama']));
        }
        echo '</select></div>';
        echo '<div class="prodi-rps-field"><label>Tahun akademik</label><input class="prodi-rps-input" name="tahun_akademik" pattern="[0-9]{4}/[0-9]{4}" placeholder="2026/2027" required></div>';
        echo '<div class="prodi-rps-field"><label>Tanggal penyusunan</label><input class="prodi-rps-input" name="tanggal_penyusunan" type="date" value="' . esc_attr(current_time('Y-m-d')) . '"></div>';
        echo '</div>';

        echo '<div class="prodi-rps-toolbar" style="margin-top:12px">';
        echo '<div class="prodi-rps-field"><label>Dosen pengembang</label>';
        $this->render_user_select('dosen_pengembang_user_id', $dosenOptions, (int) $actor['id']);
        echo '</div>';
        echo '<div class="prodi-rps-field"><label>Koordinator RMK</label>';
        $this->render_user_select('koordinator_rmk_user_id', $rmkOptions, 0);
        echo '</div>';
        echo '<div class="prodi-rps-field"><label>Kaprodi</label>';
        $this->render_user_select('kaprodi_user_id', $kaprodiOptions, 0);
        echo '</div>';
        echo '</div>';

        echo '<div class="prodi-rps-actions"><button class="prodi-rps-button" type="submit">Buat Draft</button></div>';
        echo '</form>';
        echo '</section>';
    }

    private function render_detail(int $rpsId, array $actor): void
    {
        $rps = $this->db->get_rps_detail($rpsId, $actor);

        if (!$rps) {
            echo '<div class="prodi-rps-card"><h2>RPS tidak ditemukan</h2><p class="prodi-rps-muted">Data tidak tersedia atau akun Anda tidak memiliki akses.</p></div>';
            return;
        }

        $canEdit = $this->db->can_edit_rps($rps, $actor);

        echo '<div class="prodi-rps-header">';
        echo '<div><h2>' . esc_html((string) $rps['kode_mk']) . ' - ' . esc_html((string) $rps['nama_mk']) . '</h2>';
        echo '<p>' . esc_html((string) $rps['tahun_akademik']) . ' · ' . $this->status_badge((string) $rps['status']) . '</p></div>';
        echo '<div class="prodi-rps-actions"><a class="prodi-rps-button prodi-rps-button-secondary" href="' . esc_url(remove_query_arg(['rps_view', 'rps_id'])) . '">Kembali</a></div>';
        echo '</div>';

        echo '<section class="prodi-rps-card"><div class="prodi-rps-grid">';
        $this->render_stat('Dosen Pengembang', (string) $rps['dosen_pengembang_name']);
        $this->render_stat('Koordinator RMK', (string) $rps['koordinator_rmk_name']);
        $this->render_stat('Kaprodi', (string) $rps['kaprodi_name']);
        $this->render_stat('SKS', ((int) $rps['sks_teori']) . ' teori / ' . ((int) $rps['sks_praktik']) . ' praktik');
        echo '</div></section>';

        $this->render_workflow_panel($rps, $actor);
        $this->render_header_form($rps, $canEdit);
        $this->render_cpl_panel($rps, $canEdit);
        $this->render_cpmk_panel($rps, $canEdit);
        $this->render_sub_cpmk_panel($rps, $canEdit);
        $this->render_pertemuan_panel($rps, $canEdit);
        $this->render_pustaka_panel($rps, $canEdit);
        $this->render_approval_log_panel($rps);
    }

    private function render_workflow_panel(array $rps, array $actor): void
    {
        $actions = [];
        $status = (string) $rps['status'];

        if (($actor['role'] === Prodi_RPS_DB::ROLE_DOSEN || $actor['role'] === Prodi_RPS_DB::ROLE_ADMIN) && $status === Prodi_RPS_DB::STATUS_DRAFT) {
            $actions['submit_to_rmk'] = 'Submit ke RMK';
        }

        if (($actor['role'] === Prodi_RPS_DB::ROLE_KOORDINATOR_RMK || $actor['role'] === Prodi_RPS_DB::ROLE_ADMIN) && $status === Prodi_RPS_DB::STATUS_SUBMITTED_TO_RMK) {
            $actions['approve_rmk'] = 'Approve RMK';
            $actions['reject_rmk'] = 'Minta Revisi RMK';
        }

        if (($actor['role'] === Prodi_RPS_DB::ROLE_KAPRODI || $actor['role'] === Prodi_RPS_DB::ROLE_ADMIN) && $status === Prodi_RPS_DB::STATUS_SUBMITTED_TO_KAPRODI) {
            $actions['approve_kaprodi'] = 'Approve Kaprodi';
            $actions['reject_kaprodi'] = 'Minta Revisi Kaprodi';
        }

        if ($actions === []) {
            return;
        }

        echo '<section class="prodi-rps-card"><h3>Workflow</h3><form method="post">';
        wp_nonce_field('prodi_rps_action', 'prodi_rps_nonce');
        echo '<input type="hidden" name="prodi_rps_action" value="transition_status">';
        echo '<input type="hidden" name="rps_id" value="' . esc_attr((string) $rps['id']) . '">';
        echo '<input type="hidden" name="lock_version" value="' . esc_attr((string) $rps['lock_version']) . '">';
        echo '<div class="prodi-rps-field"><label>Catatan review</label><textarea class="prodi-rps-textarea" name="catatan_review"></textarea></div>';
        echo '<div class="prodi-rps-actions">';
        foreach ($actions as $value => $label) {
            echo '<button class="prodi-rps-button" type="submit" name="workflow_action" value="' . esc_attr($value) . '">' . esc_html($label) . '</button>';
        }
        echo '</div></form></section>';
    }

    private function render_header_form(array $rps, bool $canEdit): void
    {
        echo '<section class="prodi-rps-card"><h3>Identitas RPS</h3>';
        echo '<form method="post">';
        wp_nonce_field('prodi_rps_action', 'prodi_rps_nonce');
        echo '<input type="hidden" name="prodi_rps_action" value="update_header">';
        echo '<input type="hidden" name="rps_id" value="' . esc_attr((string) $rps['id']) . '">';
        echo '<input type="hidden" name="lock_version" value="' . esc_attr((string) $rps['lock_version']) . '">';
        echo '<div class="prodi-rps-toolbar">';
        echo '<div class="prodi-rps-field"><label>Tanggal penyusunan</label><input class="prodi-rps-input" type="date" name="tanggal_penyusunan" value="' . esc_attr((string) $rps['tanggal_penyusunan']) . '"' . disabled(!$canEdit, true, false) . '></div>';
        echo '</div>';
        echo '<div class="prodi-rps-grid" style="margin-top:12px">';
        $this->render_textarea('Deskripsi singkat', 'deskripsi_singkat', (string) ($rps['deskripsi_singkat'] ?? ''), $canEdit);
        $this->render_textarea('Bahan kajian', 'bahan_kajian', (string) ($rps['bahan_kajian'] ?? ''), $canEdit);
        $this->render_textarea('Catatan tambahan', 'catatan_tambahan', (string) ($rps['catatan_tambahan'] ?? ''), $canEdit);
        echo '</div>';
        if ($canEdit) {
            echo '<div class="prodi-rps-actions"><button class="prodi-rps-button" type="submit">Simpan Identitas</button></div>';
        }
        echo '</form></section>';
    }

    private function render_cpl_panel(array $rps, bool $canEdit): void
    {
        echo '<section class="prodi-rps-card"><h3>CPL Prodi</h3>';
        $this->render_simple_table($rps['cpl_entries'], ['kode' => 'Kode', 'kategori' => 'Kategori', 'deskripsi' => 'Deskripsi']);
        if ($canEdit) {
            echo '<form method="post" class="prodi-rps-toolbar">';
            wp_nonce_field('prodi_rps_action', 'prodi_rps_nonce');
            echo '<input type="hidden" name="prodi_rps_action" value="add_cpl"><input type="hidden" name="rps_id" value="' . esc_attr((string) $rps['id']) . '">';
            echo '<div class="prodi-rps-field"><label>Kode</label><input class="prodi-rps-input" name="kode" required></div>';
            echo '<div class="prodi-rps-field"><label>Kategori</label><select class="prodi-rps-select" name="kategori"><option>S</option><option>P</option><option>KU</option><option>KK</option></select></div>';
            echo '<div class="prodi-rps-field"><label>Urutan</label><input class="prodi-rps-input" name="urutan" type="number" min="1" value="1"></div>';
            echo '<div class="prodi-rps-field"><label>Deskripsi</label><textarea class="prodi-rps-textarea" name="deskripsi" required></textarea></div>';
            echo '<button class="prodi-rps-button" type="submit">Tambah CPL</button>';
            echo '</form>';
        }
        echo '</section>';
    }

    private function render_cpmk_panel(array $rps, bool $canEdit): void
    {
        echo '<section class="prodi-rps-card"><h3>CPMK</h3>';
        $this->render_simple_table($rps['cpmk_entries'], ['kode' => 'Kode', 'deskripsi' => 'Deskripsi', 'urutan' => 'Urutan']);
        if ($canEdit) {
            echo '<form method="post" class="prodi-rps-toolbar">';
            wp_nonce_field('prodi_rps_action', 'prodi_rps_nonce');
            echo '<input type="hidden" name="prodi_rps_action" value="add_cpmk"><input type="hidden" name="rps_id" value="' . esc_attr((string) $rps['id']) . '">';
            echo '<div class="prodi-rps-field"><label>Kode</label><input class="prodi-rps-input" name="kode" placeholder="CPMK-1" required></div>';
            echo '<div class="prodi-rps-field"><label>Urutan</label><input class="prodi-rps-input" name="urutan" type="number" min="1" value="1"></div>';
            echo '<div class="prodi-rps-field"><label>Deskripsi</label><textarea class="prodi-rps-textarea" name="deskripsi" required></textarea></div>';
            echo '<button class="prodi-rps-button" type="submit">Tambah CPMK</button>';
            echo '</form>';
        }
        echo '</section>';
    }

    private function render_sub_cpmk_panel(array $rps, bool $canEdit): void
    {
        echo '<section class="prodi-rps-card"><h3>Sub-CPMK</h3>';
        $this->render_simple_table($rps['sub_cpmk_entries'], ['kode' => 'Kode', 'cpmk_kode' => 'CPMK', 'deskripsi' => 'Deskripsi', 'target_ketercapaian_persen' => 'Target %']);
        if ($canEdit && $rps['cpmk_entries'] !== []) {
            echo '<form method="post" class="prodi-rps-toolbar">';
            wp_nonce_field('prodi_rps_action', 'prodi_rps_nonce');
            echo '<input type="hidden" name="prodi_rps_action" value="add_sub_cpmk"><input type="hidden" name="rps_id" value="' . esc_attr((string) $rps['id']) . '">';
            echo '<div class="prodi-rps-field"><label>CPMK</label><select class="prodi-rps-select" name="rps_cpmk_id">';
            foreach ($rps['cpmk_entries'] as $cpmk) {
                echo '<option value="' . esc_attr((string) $cpmk['id']) . '">' . esc_html((string) $cpmk['kode']) . '</option>';
            }
            echo '</select></div>';
            echo '<div class="prodi-rps-field"><label>Kode</label><input class="prodi-rps-input" name="kode" placeholder="Sub-CPMK-1" required></div>';
            echo '<div class="prodi-rps-field"><label>Urutan</label><input class="prodi-rps-input" name="urutan" type="number" min="1" value="1"></div>';
            echo '<div class="prodi-rps-field"><label>Target %</label><input class="prodi-rps-input" name="target_ketercapaian_persen" type="number" min="0" max="100" step="0.01"></div>';
            echo '<div class="prodi-rps-field"><label>Deskripsi</label><textarea class="prodi-rps-textarea" name="deskripsi" required></textarea></div>';
            echo '<button class="prodi-rps-button" type="submit">Tambah Sub-CPMK</button>';
            echo '</form>';
        }
        echo '</section>';
    }

    private function render_pertemuan_panel(array $rps, bool $canEdit): void
    {
        echo '<section class="prodi-rps-card"><h3>Rencana Pertemuan</h3>';
        $this->render_simple_table($rps['pertemuan_entries'], ['order_no' => 'No', 'week_label' => 'Minggu', 'tipe' => 'Tipe', 'sub_cpmk_kode' => 'Sub-CPMK', 'materi_pembelajaran' => 'Materi', 'bobot_penilaian_persen' => 'Bobot %']);
        if ($canEdit) {
            echo '<form method="post" class="prodi-rps-toolbar">';
            wp_nonce_field('prodi_rps_action', 'prodi_rps_nonce');
            echo '<input type="hidden" name="prodi_rps_action" value="add_pertemuan"><input type="hidden" name="rps_id" value="' . esc_attr((string) $rps['id']) . '">';
            echo '<div class="prodi-rps-field"><label>No</label><input class="prodi-rps-input" name="order_no" type="number" min="1" required></div>';
            echo '<div class="prodi-rps-field"><label>Minggu</label><input class="prodi-rps-input" name="week_label" placeholder="1 atau 4,5" required></div>';
            echo '<div class="prodi-rps-field"><label>Tipe</label><select class="prodi-rps-select" name="tipe"><option value="reguler">Reguler</option><option value="ets">ETS</option><option value="eas">EAS</option></select></div>';
            echo '<div class="prodi-rps-field"><label>Sub-CPMK</label><select class="prodi-rps-select" name="sub_cpmk_id"><option value="">Manual</option>';
            foreach ($rps['sub_cpmk_entries'] as $sub) {
                echo '<option value="' . esc_attr((string) $sub['id']) . '">' . esc_html((string) $sub['kode']) . '</option>';
            }
            echo '</select></div>';
            $this->render_form_textarea('Sub-CPMK manual', 'sub_cpmk_text');
            $this->render_form_textarea('Indikator penilaian (satu per baris)', 'indikator_penilaian');
            $this->render_form_textarea('Metode pembelajaran (satu per baris)', 'metode_pembelajaran');
            $this->render_form_textarea('Materi pembelajaran', 'materi_pembelajaran');
            echo '<div class="prodi-rps-field"><label>Bobot %</label><input class="prodi-rps-input" name="bobot_penilaian_persen" type="number" min="0" max="100" step="0.01"></div>';
            echo '<button class="prodi-rps-button" type="submit">Tambah Pertemuan</button>';
            echo '</form>';
        }
        echo '</section>';
    }

    private function render_pustaka_panel(array $rps, bool $canEdit): void
    {
        echo '<section class="prodi-rps-card"><h3>Pustaka</h3>';
        $this->render_simple_table($rps['pustaka_entries'], ['kategori' => 'Kategori', 'teks_lengkap' => 'Referensi', 'urutan' => 'Urutan']);
        if ($canEdit) {
            echo '<form method="post" class="prodi-rps-toolbar">';
            wp_nonce_field('prodi_rps_action', 'prodi_rps_nonce');
            echo '<input type="hidden" name="prodi_rps_action" value="add_pustaka"><input type="hidden" name="rps_id" value="' . esc_attr((string) $rps['id']) . '">';
            echo '<div class="prodi-rps-field"><label>Kategori</label><select class="prodi-rps-select" name="kategori"><option value="utama">Utama</option><option value="pendukung">Pendukung</option></select></div>';
            echo '<div class="prodi-rps-field"><label>Urutan</label><input class="prodi-rps-input" name="urutan" type="number" min="1" value="1"></div>';
            echo '<div class="prodi-rps-field"><label>Referensi</label><textarea class="prodi-rps-textarea" name="teks_lengkap" required></textarea></div>';
            echo '<button class="prodi-rps-button" type="submit">Tambah Pustaka</button>';
            echo '</form>';
        }
        echo '</section>';
    }

    private function render_approval_log_panel(array $rps): void
    {
        echo '<section class="prodi-rps-card"><h3>Riwayat Approval</h3>';
        $this->render_simple_table($rps['approval_logs'], ['created_at' => 'Waktu', 'actor_name' => 'Aktor', 'actor_role' => 'Role', 'action' => 'Aksi', 'catatan_review' => 'Catatan']);
        echo '</section>';
    }

    private function render_status_options(string $selected): void
    {
        echo '<option value="">Semua status</option>';
        foreach ([Prodi_RPS_DB::STATUS_DRAFT, Prodi_RPS_DB::STATUS_SUBMITTED_TO_RMK, Prodi_RPS_DB::STATUS_REVISION_BY_RMK, Prodi_RPS_DB::STATUS_SUBMITTED_TO_KAPRODI, Prodi_RPS_DB::STATUS_REVISION_BY_KAPRODI, Prodi_RPS_DB::STATUS_APPROVED] as $status) {
            echo '<option value="' . esc_attr($status) . '"' . selected($selected, $status, false) . '>' . esc_html($this->db->status_label($status)) . '</option>';
        }
    }

    private function render_user_select(string $name, array $users, int $selected): void
    {
        echo '<select class="prodi-rps-select" name="' . esc_attr($name) . '" required><option value="">Pilih user</option>';
        foreach ($users as $user) {
            printf(
                '<option value="%d"%s>%s (%s)</option>',
                (int) $user['id'],
                selected($selected, (int) $user['id'], false),
                esc_html((string) $user['name']),
                esc_html($this->db->role_label((string) $user['role']))
            );
        }
        echo '</select>';
    }

    private function prefer_role_options(string $role, array $allUsers): array
    {
        $filtered = array_values(array_filter($allUsers, function ($user) use ($role) {
            return ($user['role'] ?? null) === $role;
        }));

        return $filtered !== [] ? $filtered : $allUsers;
    }

    private function preserve_page_query_inputs(array $skip): void
    {
        foreach ($_GET as $key => $value) {
            if (in_array($key, $skip, true) || is_array($value)) {
                continue;
            }

            echo '<input type="hidden" name="' . esc_attr((string) $key) . '" value="' . esc_attr((string) $value) . '">';
        }
    }

    private function render_stat(string $label, string $value): void
    {
        echo '<div class="prodi-rps-stat"><strong>' . esc_html($label) . '</strong><span>' . esc_html($value) . '</span></div>';
    }

    private function render_textarea(string $label, string $name, string $value, bool $enabled): void
    {
        echo '<div class="prodi-rps-field"><label>' . esc_html($label) . '</label><textarea class="prodi-rps-textarea" name="' . esc_attr($name) . '"' . disabled(!$enabled, true, false) . '>' . esc_textarea($value) . '</textarea></div>';
    }

    private function render_form_textarea(string $label, string $name): void
    {
        echo '<div class="prodi-rps-field"><label>' . esc_html($label) . '</label><textarea class="prodi-rps-textarea" name="' . esc_attr($name) . '"></textarea></div>';
    }

    private function render_simple_table(array $rows, array $columns): void
    {
        echo '<div class="prodi-rps-table-wrap"><table class="prodi-rps-table"><thead><tr>';
        foreach ($columns as $label) {
            echo '<th>' . esc_html($label) . '</th>';
        }
        echo '</tr></thead><tbody>';

        if ($rows === []) {
            echo '<tr><td colspan="' . esc_attr((string) count($columns)) . '">Belum ada data.</td></tr>';
        }

        foreach ($rows as $row) {
            echo '<tr>';
            foreach ($columns as $key => $label) {
                echo '<td>' . nl2br(esc_html((string) ($row[$key] ?? ''))) . '</td>';
            }
            echo '</tr>';
        }

        echo '</tbody></table></div>';
    }

    private function status_badge(string $status): string
    {
        $class = 'prodi-rps-badge';
        if ($status === Prodi_RPS_DB::STATUS_DRAFT) {
            $class .= ' prodi-rps-badge-draft';
        }
        if ($status === Prodi_RPS_DB::STATUS_APPROVED) {
            $class .= ' prodi-rps-badge-approved';
        }

        return '<span class="' . esc_attr($class) . '">' . esc_html($this->db->status_label($status)) . '</span>';
    }

    /**
     * AJAX: Get prodi-filtered RPS list for the dashboard.
     * Action: wp_ajax_prodi_rps_dashboard_list
     * POST: nonce, prodi_code (optional, admin only), status (optional)
     */
    public function ajax_dashboard_list(): void {
        if ( ! check_ajax_referer( 'prodi_rps_ajax', 'nonce', false ) ) {
            wp_send_json_error( [ 'message' => 'Invalid nonce' ], 403 );
            return;
        }

        $actor_user_id   = get_current_user_id();
        if ( ! $actor_user_id ) {
            wp_send_json_error( [ 'message' => 'Not authenticated' ], 401 );
            return;
        }

        $requested_prodi = isset( $_POST['prodi_code'] )
            ? sanitize_text_field( $_POST['prodi_code'] )
            : null;

        $prodi_filter = Prodi_Dashboard_Filter::resolve_prodi_filter( $actor_user_id, $requested_prodi );
        $actor        = Prodi_Dashboard_Filter::get_actor( $actor_user_id );

        $filters = [];
        if ( $prodi_filter ) {
            $filters['prodi_code'] = $prodi_filter;
        }
        if ( ! empty( $_POST['status'] ) ) {
            $filters['status'] = sanitize_key( $_POST['status'] );
        }

        $rps_list = $this->db->list_rps( $actor, $filters );

        wp_send_json_success( [
            'actor_prodi'   => $prodi_filter,
            'prodi_options' => Prodi_Dashboard_Filter::get_prodi_options( $actor_user_id ),
            'total'         => count( $rps_list ),
            'items'         => $rps_list,
        ] );
    }

    /**
     * AJAX: Evaluate OBE hard blockers for an RPS (does not submit).
     * Action: wp_ajax_prodi_rps_validate
     * POST: nonce, rps_id
     */
    public function ajax_validate(): void {
        if (!check_ajax_referer('prodi_rps_ajax', 'nonce', false)) {
            wp_send_json_error(['message' => 'Invalid nonce'], 403);
            return;
        }
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Not authenticated'], 401);
            return;
        }

        $actor = $this->db->current_actor();
        $rpsId = isset($_POST['rps_id']) ? absint($_POST['rps_id']) : 0;
        if ($rpsId <= 0 || !$actor) {
            wp_send_json_error(['message' => 'Data tidak lengkap.'], 400);
            return;
        }

        $violations = $this->validator->collect_violations($rpsId, $actor);
        wp_send_json_success([
            'ready'      => $violations === [],
            'violations' => $violations,
            'count'      => count($violations),
        ]);
    }

    /**
     * AJAX: Compute institutional soft warnings (W-01..W-04) + ack status.
     * Action: wp_ajax_prodi_rps_warnings
     * POST: nonce, rps_id
     */
    public function ajax_warnings(): void {
        if (!check_ajax_referer('prodi_rps_ajax', 'nonce', false)) {
            wp_send_json_error(['message' => 'Invalid nonce'], 403);
            return;
        }
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Not authenticated'], 401);
            return;
        }

        $actor = $this->db->current_actor();
        $rpsId = isset($_POST['rps_id']) ? absint($_POST['rps_id']) : 0;
        if ($rpsId <= 0 || !$actor) {
            wp_send_json_error(['message' => 'Data tidak lengkap.'], 400);
            return;
        }

        $all      = $this->validator->compute_warnings($rpsId, $actor);
        $pending  = $this->validator->unacknowledged_warnings($rpsId, $actor);
        $pendingIds = array_values(array_unique(array_column($pending, 'id')));

        wp_send_json_success([
            'warnings'            => $all,
            'unacknowledged_ids'  => $pendingIds,
            'all_acknowledged'    => $pending === [],
        ]);
    }

    /**
     * AJAX: Acknowledge a single warning id for an RPS.
     * Action: wp_ajax_prodi_rps_acknowledge_warning
     * POST: nonce, rps_id, warning_id
     */
    public function ajax_acknowledge_warning(): void {
        if (!check_ajax_referer('prodi_rps_ajax', 'nonce', false)) {
            wp_send_json_error(['message' => 'Invalid nonce'], 403);
            return;
        }
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Not authenticated'], 401);
            return;
        }

        $actor = $this->db->current_actor();
        $rpsId = isset($_POST['rps_id']) ? absint($_POST['rps_id']) : 0;
        $warningId = isset($_POST['warning_id']) ? sanitize_text_field(wp_unslash($_POST['warning_id'])) : '';
        if ($rpsId <= 0 || $warningId === '' || !$actor) {
            wp_send_json_error(['message' => 'Data tidak lengkap.'], 400);
            return;
        }

        try {
            $this->validator->acknowledge_warning($rpsId, $warningId, $actor);
            wp_send_json_success(['acknowledged' => $warningId]);
        } catch (RPS_Input_Exception $e) {
            wp_send_json_error(['message' => $e->getMessage()], 403);
        }
    }

    /**
     * AJAX: Export an approved RPS to PDF (binary download, not JSON).
     * Action: wp_ajax_prodi_rps_export_pdf
     * POST: nonce, rps_id
     */
    public function ajax_export_pdf(): void {
        if (!check_ajax_referer('prodi_rps_ajax', 'nonce', false)) {
            wp_die('Invalid nonce', 403);
        }
        if (!is_user_logged_in()) {
            wp_die('Not authenticated', 401);
        }

        $actor = $this->db->current_actor();
        $rpsId = isset($_POST['rps_id']) ? absint($_POST['rps_id']) : 0;
        if ($rpsId <= 0 || !$actor) {
            wp_die('Data tidak lengkap.', '', 400);
        }

        try {
            $this->pdf->export_pdf($rpsId, $actor);
            // export_pdf streams the binary and exits; nothing else to do.
        } catch (RPS_Input_Exception $e) {
            wp_die(esc_html($e->getMessage()), '', 403);
        } catch (RuntimeException $e) {
            // mPDF not installed — surface a clear, actionable message.
            wp_die(esc_html($e->getMessage()), '', 500);
        }
    }

    /**
     * AJAX: Get version history for the mata_kuliah lineage of an RPS.
     * Action: wp_ajax_prodi_rps_version_history
     * POST: nonce, rps_id
     */
    public function ajax_version_history(): void {
        if ( ! check_ajax_referer( 'prodi_rps_ajax', 'nonce', false ) ) {
            wp_send_json_error( [ 'message' => 'Invalid nonce' ], 403 );
            return;
        }

        $rps_id = intval( $_POST['rps_id'] ?? 0 );
        if ( $rps_id <= 0 ) {
            wp_send_json_error( [ 'message' => 'rps_id required' ], 400 );
            return;
        }

        $actor_user_id = get_current_user_id();
        if ( ! $actor_user_id ) {
            wp_send_json_error( [ 'message' => 'Not authenticated' ], 401 );
            return;
        }

        try {
            $lineage   = Prodi_RPS_Version_History::get_lineage( $rps_id, $actor_user_id );
            $formatted = Prodi_RPS_Version_History::format_for_api( $lineage, $rps_id );

            wp_send_json_success( [
                'rps_id'   => $rps_id,
                'total'    => count( $formatted ),
                'versions' => $formatted,
            ] );
        } catch ( InvalidArgumentException $e ) {
            wp_send_json_error( [ 'message' => $e->getMessage() ], 403 );
        }
    }

    /**
     * AJAX: Copy existing RPS as new draft.
     * Action: wp_ajax_prodi_rps_copy_as_draft
     * POST: nonce, source_rps_id
     */
    public function ajax_copy_as_draft(): void {
        if ( ! check_ajax_referer( 'prodi_rps_ajax', 'nonce', false ) ) {
            wp_send_json_error( [ 'message' => 'Invalid nonce' ], 403 );
            return;
        }

        $source_rps_id = intval( $_POST['source_rps_id'] ?? 0 );
        if ( $source_rps_id <= 0 ) {
            wp_send_json_error( [ 'message' => 'source_rps_id required' ], 400 );
            return;
        }

        $actor_user_id = get_current_user_id();
        if ( ! $actor_user_id ) {
            wp_send_json_error( [ 'message' => 'Not authenticated' ], 401 );
            return;
        }

        try {
            $new_rps_id = Prodi_RPS_Copy::copy_as_draft( $source_rps_id, $actor_user_id );
            wp_send_json_success( [
                'new_rps_id'    => $new_rps_id,
                'source_rps_id' => $source_rps_id,
                'message'       => "RPS #$source_rps_id copied as new draft #$new_rps_id",
            ] );
        } catch ( InvalidArgumentException $e ) {
            wp_send_json_error( [ 'message' => $e->getMessage() ], 403 );
        } catch ( RuntimeException $e ) {
            wp_send_json_error( [ 'message' => $e->getMessage() ], 500 );
        }
    }
}
