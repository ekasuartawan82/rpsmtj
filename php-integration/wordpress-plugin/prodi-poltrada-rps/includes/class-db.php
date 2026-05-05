<?php

if (!defined('WPINC')) {
    die;
}

class Prodi_RPS_DB {
    public const ROLE_ADMIN = 'admin';
    public const ROLE_DOSEN = 'dosen';
    public const ROLE_KOORDINATOR_RMK = 'koordinator_rmk';
    public const ROLE_KAPRODI = 'kaprodi';

    public const STATUS_DRAFT = 'draft';
    public const STATUS_SUBMITTED_TO_RMK = 'submitted_to_rmk';
    public const STATUS_REVISION_BY_RMK = 'revision_requested_by_rmk';
    public const STATUS_SUBMITTED_TO_KAPRODI = 'submitted_to_kaprodi';
    public const STATUS_REVISION_BY_KAPRODI = 'revision_requested_by_kaprodi';
    public const STATUS_APPROVED = 'approved';

    public static function table(string $name): string
    {
        global $wpdb;

        $map = [
            'rps' => 'prodi_rps',
            'rps_dosen_pengampu' => 'prodi_rps_dosen_pengampu',
            'cpl_prodi' => 'prodi_rps_cpl_prodi',
            'rps_cpl' => 'prodi_rps_cpl',
            'rps_cpmk' => 'prodi_rps_cpmk',
            'rps_cpmk_cpl' => 'prodi_rps_cpmk_cpl',
            'rps_sub_cpmk' => 'prodi_rps_sub_cpmk',
            'rps_korelasi_cpl' => 'prodi_rps_korelasi_cpl',
            'rps_pertemuan' => 'prodi_rps_pertemuan',
            'rps_pustaka' => 'prodi_rps_pustaka',
            'rps_rtm' => 'prodi_rps_rtm',
            'rps_rtm_pertemuan' => 'prodi_rps_rtm_pertemuan',
            'rps_approval_log' => 'prodi_rps_approval_log',
            'rps_notifications' => 'prodi_rps_notifications',
            'whitelist_kko' => 'prodi_rps_whitelist_kko',
            'kurikulum' => 'prodi_kurikulum',
            'dosen' => 'prodi_dosen',
        ];

        return $wpdb->prefix . ($map[$name] ?? $name);
    }

    public static function create_tables(): void
    {
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        global $wpdb;
        $charset = $wpdb->get_charset_collate();

        $tables = [];

        $tables[] = "CREATE TABLE " . self::table('rps') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            mata_kuliah_id BIGINT(20) UNSIGNED NOT NULL,
            tahun_akademik VARCHAR(9) NOT NULL,
            tanggal_penyusunan DATE NOT NULL,
            dosen_pengembang_user_id BIGINT(20) UNSIGNED NOT NULL,
            koordinator_rmk_user_id BIGINT(20) UNSIGNED NOT NULL,
            kaprodi_user_id BIGINT(20) UNSIGNED NOT NULL,
            deskripsi_singkat LONGTEXT NULL,
            bahan_kajian LONGTEXT NULL,
            catatan_tambahan LONGTEXT NULL,
            lock_version INT(11) NOT NULL DEFAULT 1,
            parent_rps_id BIGINT(20) UNSIGNED NULL,
            workflow_status VARCHAR(50) NOT NULL DEFAULT 'draft',
            record_status VARCHAR(30) NOT NULL DEFAULT 'active',
            status VARCHAR(50) NOT NULL DEFAULT 'draft',
            last_changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_reviewed_at_by_rmk DATETIME NULL,
            last_reviewed_at_by_kaprodi DATETIME NULL,
            current_revision_count INT(11) NOT NULL DEFAULT 0,
            created_by BIGINT(20) UNSIGNED NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY mata_kuliah_tahun (mata_kuliah_id, tahun_akademik),
            KEY status (status),
            KEY dosen_pengembang_user_id (dosen_pengembang_user_id),
            KEY koordinator_rmk_user_id (koordinator_rmk_user_id),
            KEY kaprodi_user_id (kaprodi_user_id)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('rps_dosen_pengampu') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            rps_id BIGINT(20) UNSIGNED NOT NULL,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            is_pengembang TINYINT(1) NOT NULL DEFAULT 0,
            urutan INT(11) NULL,
            PRIMARY KEY (id),
            UNIQUE KEY rps_user (rps_id, user_id),
            KEY user_id (user_id)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('cpl_prodi') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            tahun_kurikulum VARCHAR(20) NOT NULL DEFAULT '',
            program_studi VARCHAR(100) NOT NULL DEFAULT '',
            kode VARCHAR(191) NOT NULL,
            kategori VARCHAR(10) NOT NULL,
            deskripsi LONGTEXT NOT NULL,
            urutan INT(11) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY cpl_scope (tahun_kurikulum, program_studi, kode)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('rps_cpl') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            rps_id BIGINT(20) UNSIGNED NOT NULL,
            cpl_id BIGINT(20) UNSIGNED NOT NULL,
            urutan INT(11) NULL,
            PRIMARY KEY (id),
            UNIQUE KEY rps_cpl (rps_id, cpl_id),
            KEY cpl_id (cpl_id)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('rps_cpmk') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            rps_id BIGINT(20) UNSIGNED NOT NULL,
            kode VARCHAR(191) NOT NULL,
            deskripsi LONGTEXT NOT NULL,
            urutan INT(11) NOT NULL DEFAULT 1,
            PRIMARY KEY (id),
            UNIQUE KEY rps_kode (rps_id, kode)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('rps_cpmk_cpl') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            rps_cpmk_id BIGINT(20) UNSIGNED NOT NULL,
            rps_cpl_id BIGINT(20) UNSIGNED NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY cpmk_cpl (rps_cpmk_id, rps_cpl_id),
            KEY rps_cpl_id (rps_cpl_id)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('rps_sub_cpmk') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            rps_id BIGINT(20) UNSIGNED NOT NULL,
            rps_cpmk_id BIGINT(20) UNSIGNED NOT NULL,
            kode VARCHAR(191) NOT NULL,
            deskripsi LONGTEXT NOT NULL,
            urutan INT(11) NOT NULL DEFAULT 1,
            target_ketercapaian_persen DECIMAL(5,2) NULL,
            aktual_ketercapaian_persen DECIMAL(5,2) NULL,
            PRIMARY KEY (id),
            KEY rps_id (rps_id),
            KEY rps_cpmk_id (rps_cpmk_id)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('rps_korelasi_cpl') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            rps_sub_cpmk_id BIGINT(20) UNSIGNED NOT NULL,
            rps_cpl_id BIGINT(20) UNSIGNED NOT NULL,
            persentase DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            PRIMARY KEY (id),
            UNIQUE KEY sub_cpl (rps_sub_cpmk_id, rps_cpl_id)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('rps_pertemuan') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            rps_id BIGINT(20) UNSIGNED NOT NULL,
            order_no INT(11) NOT NULL,
            week_label VARCHAR(191) NOT NULL,
            tipe VARCHAR(30) NOT NULL DEFAULT 'reguler',
            sub_cpmk_id BIGINT(20) UNSIGNED NULL,
            sub_cpmk_text LONGTEXT NULL,
            indikator_penilaian LONGTEXT NULL,
            teknik_penilaian LONGTEXT NULL,
            kriteria_penilaian LONGTEXT NULL,
            bentuk_pembelajaran_luring LONGTEXT NULL,
            bentuk_pembelajaran_daring LONGTEXT NULL,
            metode_pembelajaran LONGTEXT NULL,
            catatan_penugasan LONGTEXT NULL,
            estimasi_waktu_pb VARCHAR(191) NULL,
            estimasi_waktu_pt VARCHAR(191) NULL,
            estimasi_waktu_km VARCHAR(191) NULL,
            bentuk_daring LONGTEXT NULL,
            materi_pembelajaran LONGTEXT NULL,
            bobot_penilaian_persen DECIMAL(5,2) NULL,
            deskripsi_evaluasi LONGTEXT NULL,
            status_pelaksanaan VARCHAR(30) NULL,
            materi_aktual LONGTEXT NULL,
            catatan_deviasi LONGTEXT NULL,
            tanggal_pelaksanaan DATE NULL,
            pustaka_refs LONGTEXT NULL,
            notes LONGTEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY rps_order (rps_id, order_no),
            KEY sub_cpmk_id (sub_cpmk_id)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('rps_pustaka') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            rps_id BIGINT(20) UNSIGNED NOT NULL,
            kategori VARCHAR(30) NOT NULL,
            teks_lengkap LONGTEXT NOT NULL,
            urutan INT(11) NULL,
            PRIMARY KEY (id),
            KEY rps_id (rps_id)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('rps_rtm') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            rps_id BIGINT(20) UNSIGNED NOT NULL,
            nomor_tugas VARCHAR(191) NOT NULL,
            judul_tugas VARCHAR(191) NOT NULL,
            sub_cpmk_id BIGINT(20) UNSIGNED NOT NULL,
            metode_penugasan VARCHAR(30) NOT NULL,
            deskripsi LONGTEXT NULL,
            langkah_pengerjaan LONGTEXT NULL,
            bentuk_luaran LONGTEXT NULL,
            indikator_penilaian LONGTEXT NULL,
            bobot_internal_persen DECIMAL(5,2) NULL,
            jadwal_pelaksanaan LONGTEXT NULL,
            catatan LONGTEXT NULL,
            daftar_rujukan LONGTEXT NULL,
            PRIMARY KEY (id),
            KEY rps_id (rps_id),
            KEY sub_cpmk_id (sub_cpmk_id)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('rps_rtm_pertemuan') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            rps_rtm_id BIGINT(20) UNSIGNED NOT NULL,
            rps_pertemuan_id BIGINT(20) UNSIGNED NOT NULL,
            keterangan VARCHAR(191) NULL,
            PRIMARY KEY (id),
            UNIQUE KEY rtm_pertemuan (rps_rtm_id, rps_pertemuan_id)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('rps_approval_log') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            rps_id BIGINT(20) UNSIGNED NOT NULL,
            lock_version INT(11) NOT NULL,
            actor_user_id BIGINT(20) UNSIGNED NOT NULL,
            actor_role VARCHAR(191) NOT NULL,
            actor_name VARCHAR(191) NOT NULL,
            action VARCHAR(191) NOT NULL,
            catatan_review LONGTEXT NULL,
            revision_round INT(11) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY rps_created (rps_id, created_at)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('rps_notifications') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            recipient_user_id BIGINT(20) UNSIGNED NOT NULL,
            rps_id BIGINT(20) UNSIGNED NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(191) NOT NULL,
            message LONGTEXT NOT NULL,
            href VARCHAR(191) NOT NULL,
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            read_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY recipient_read_created (recipient_user_id, is_read, created_at),
            KEY rps_created (rps_id, created_at)
        ) {$charset};";

        $tables[] = "CREATE TABLE " . self::table('whitelist_kko') . " (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            kata VARCHAR(191) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY kata (kata)
        ) {$charset};";

        foreach ($tables as $sql) {
            dbDelta($sql);
        }
    }

    public function current_actor(): ?array
    {
        if (!is_user_logged_in()) {
            return null;
        }

        $user = wp_get_current_user();
        $role = $this->canonical_role_for_user($user);

        return [
            'id' => (int) $user->ID,
            'name' => $user->display_name ?: $user->user_login,
            'email' => $user->user_email,
            'role' => $role,
        ];
    }

    public function canonical_role_for_user(WP_User $user): string
    {
        $metaRole = (string) get_user_meta($user->ID, 'rps_role', true);
        if ($this->is_canonical_role($metaRole)) {
            return $metaRole;
        }

        $legacyMetaRole = (string) get_user_meta($user->ID, 'prodi_role', true);
        if ($this->is_canonical_role($legacyMetaRole)) {
            return $legacyMetaRole;
        }

        $roleMap = [
            'administrator' => self::ROLE_ADMIN,
            'rps_admin' => self::ROLE_ADMIN,
            'admin' => self::ROLE_ADMIN,
            'kaprodi' => self::ROLE_KAPRODI,
            'koordinator_rmk' => self::ROLE_KOORDINATOR_RMK,
            'dosen' => self::ROLE_DOSEN,
            'author' => self::ROLE_DOSEN,
            'contributor' => self::ROLE_DOSEN,
            'subscriber' => self::ROLE_DOSEN,
        ];

        foreach ((array) $user->roles as $role) {
            if (isset($roleMap[$role])) {
                return $roleMap[$role];
            }
        }

        return user_can($user, 'manage_options') ? self::ROLE_ADMIN : self::ROLE_DOSEN;
    }

    public function is_canonical_role(string $role): bool
    {
        return in_array($role, [self::ROLE_ADMIN, self::ROLE_DOSEN, self::ROLE_KOORDINATOR_RMK, self::ROLE_KAPRODI], true);
    }

    public function role_label(string $role): string
    {
        $labels = [
            self::ROLE_ADMIN => 'Admin',
            self::ROLE_DOSEN => 'Dosen',
            self::ROLE_KOORDINATOR_RMK => 'Koordinator RMK',
            self::ROLE_KAPRODI => 'Kaprodi',
        ];

        return $labels[$role] ?? $role;
    }

    public function status_label(string $status): string
    {
        $labels = [
            self::STATUS_DRAFT => 'Draft',
            self::STATUS_SUBMITTED_TO_RMK => 'Submitted ke RMK',
            self::STATUS_REVISION_BY_RMK => 'Revisi oleh RMK',
            self::STATUS_SUBMITTED_TO_KAPRODI => 'Submitted ke Kaprodi',
            self::STATUS_REVISION_BY_KAPRODI => 'Revisi oleh Kaprodi',
            self::STATUS_APPROVED => 'Approved',
            'superseded' => 'Superseded',
        ];

        return $labels[$status] ?? $status;
    }

    public function get_user_options(?string $role = null): array
    {
        $users = get_users([
            'fields' => ['ID', 'display_name', 'user_email', 'user_login'],
            'orderby' => 'display_name',
            'order' => 'ASC',
        ]);

        $options = [];
        foreach ($users as $user) {
            $wpUser = get_user_by('id', $user->ID);
            if (!$wpUser instanceof WP_User) {
                continue;
            }

            $canonicalRole = $this->canonical_role_for_user($wpUser);
            if ($role !== null && $canonicalRole !== $role) {
                continue;
            }

            $options[] = [
                'id' => (int) $user->ID,
                'name' => $user->display_name ?: $user->user_login,
                'email' => $user->user_email,
                'role' => $canonicalRole,
            ];
        }

        return $options;
    }

    public function get_mata_kuliah_options(): array
    {
        global $wpdb;

        $table = self::table('kurikulum');
        if (!$this->table_exists($table)) {
            return [];
        }

        return $wpdb->get_results(
            "SELECT id, kode_mk AS kode, nama_mk AS nama, program_studi, sks_teori, sks_praktik
             FROM {$table}
             ORDER BY program_studi ASC, nama_mk ASC",
            ARRAY_A
        ) ?: [];
    }

    public function list_rps(array $actor, array $filters = []): array
    {
        global $wpdb;

        $rpsTable = self::table('rps');
        $mkTable = self::table('kurikulum');
        $pengampuTable = self::table('rps_dosen_pengampu');
        $usersTable = $wpdb->users;

        $where = ['1=1'];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = 'r.status = %s';
            $params[] = sanitize_key((string) $filters['status']);
        }

        if (!empty($filters['tahun_akademik'])) {
            $where[] = 'r.tahun_akademik LIKE %s';
            $params[] = '%' . $wpdb->esc_like((string) $filters['tahun_akademik']) . '%';
        }

        if (!empty($filters['mata_kuliah_id'])) {
            $where[] = 'r.mata_kuliah_id = %d';
            $params[] = absint($filters['mata_kuliah_id']);
        }

        // Prodi filter (Slice 7) — applied at query layer, never in governance logic
        if (!empty($filters['prodi_code'])) {
            $where[] = 'r.prodi_code = %s';
            $params[] = strtoupper(sanitize_text_field((string) $filters['prodi_code']));
        }

        if ($actor['role'] === self::ROLE_DOSEN) {
            $where[] = '(r.dosen_pengembang_user_id = %d OR EXISTS (
                SELECT 1 FROM ' . $pengampuTable . ' rp
                WHERE rp.rps_id = r.id AND rp.user_id = %d
            ))';
            $params[] = (int) $actor['id'];
            $params[] = (int) $actor['id'];
        } elseif ($actor['role'] === self::ROLE_KOORDINATOR_RMK) {
            $where[] = 'r.koordinator_rmk_user_id = %d';
            $params[] = (int) $actor['id'];
        } elseif ($actor['role'] === self::ROLE_KAPRODI) {
            $where[] = 'r.kaprodi_user_id = %d';
            $params[] = (int) $actor['id'];
        }

        $sql = "SELECT r.*, mk.kode_mk, mk.nama_mk, mk.program_studi,
                       dev.display_name AS dosen_pengembang_name,
                       rmk.display_name AS koordinator_rmk_name,
                       kap.display_name AS kaprodi_name,
                       (
                           SELECT COUNT(*)
                           FROM {$rpsTable} rv
                           WHERE rv.mata_kuliah_id = r.mata_kuliah_id
                             AND rv.tahun_akademik = r.tahun_akademik
                       ) AS version_count
                FROM {$rpsTable} r
                LEFT JOIN {$mkTable} mk ON mk.id = r.mata_kuliah_id
                LEFT JOIN {$usersTable} dev ON dev.ID = r.dosen_pengembang_user_id
                LEFT JOIN {$usersTable} rmk ON rmk.ID = r.koordinator_rmk_user_id
                LEFT JOIN {$usersTable} kap ON kap.ID = r.kaprodi_user_id
                WHERE " . implode(' AND ', $where) . "
                ORDER BY r.updated_at DESC, r.created_at DESC";

        if ($params !== []) {
            $sql = $wpdb->prepare($sql, $params);
        }

        return $wpdb->get_results($sql, ARRAY_A) ?: [];
    }

    public function create_rps(array $data, array $actor): int
    {
        global $wpdb;

        $rpsTable = self::table('rps');
        $now = current_time('mysql');
        $tanggal = !empty($data['tanggal_penyusunan']) ? $data['tanggal_penyusunan'] : current_time('Y-m-d');

        $wpdb->insert($rpsTable, [
            'mata_kuliah_id' => absint($data['mata_kuliah_id']),
            'tahun_akademik' => sanitize_text_field((string) $data['tahun_akademik']),
            'tanggal_penyusunan' => sanitize_text_field((string) $tanggal),
            'dosen_pengembang_user_id' => absint($data['dosen_pengembang_user_id']),
            'koordinator_rmk_user_id' => absint($data['koordinator_rmk_user_id']),
            'kaprodi_user_id' => absint($data['kaprodi_user_id']),
            'status' => self::STATUS_DRAFT,
            'workflow_status' => self::STATUS_DRAFT,
            'record_status' => 'active',
            'created_by' => (int) $actor['id'],
            'created_at' => $now,
            'updated_at' => $now,
            'last_changed_at' => $now,
        ], ['%d', '%s', '%s', '%d', '%d', '%d', '%s', '%s', '%s', '%d', '%s', '%s', '%s']);

        $id = (int) $wpdb->insert_id;

        if ($id > 0) {
            $this->save_pengampu($id, absint($data['dosen_pengembang_user_id']), true, 1);
            $this->add_approval_log($id, 1, $actor, 'create_draft', null);
        }

        return $id;
    }

    public function get_rps_detail(int $id, array $actor): ?array
    {
        global $wpdb;

        // DEBUG: Log incoming parameters
        error_log("ACCESS DEBUG - get_rps_detail ID=$id, actor_id=" . $actor['id'] . ", actor_role=" . $actor['role']);

        $rpsTable = self::table('rps');
        $usersTable = $wpdb->users;

        // FIX: Removed non-existent wp_prodi_kurikulum table JOIN
        // This table doesn't exist in the database, causing query to return NULL
        $sql = $wpdb->prepare(
            "SELECT r.*,
                    dev.display_name AS dosen_pengembang_name, dev.user_email AS dosen_pengembang_email,
                    rmk.display_name AS koordinator_rmk_name, kap.display_name AS kaprodi_name
             FROM {$rpsTable} r
             LEFT JOIN {$usersTable} dev ON dev.ID = r.dosen_pengembang_user_id
             LEFT JOIN {$usersTable} rmk ON rmk.ID = r.koordinator_rmk_user_id
             LEFT JOIN {$usersTable} kap ON kap.ID = r.kaprodi_user_id
             WHERE r.id = %d
             LIMIT 1",
            $id
        );

        $rps = $wpdb->get_row($sql, ARRAY_A);

        error_log("ACCESS DEBUG - RPS found: " . ($rps ? "YES" : "NO"));
        if ($rps) {
            error_log("ACCESS DEBUG - RPS dosen_pengembang_user_id=" . $rps['dosen_pengembang_user_id']);
        }

        $canAccess = $this->can_access_rps($rps, $actor);
        error_log("ACCESS DEBUG - can_access_rps: " . ($canAccess ? "YES" : "NO"));

        if (!$rps || !$canAccess) {
            return null;
        }

        $rps['cpl_entries'] = $this->get_rps_cpl($id);
        $rps['cpmk_entries'] = $this->get_rps_cpmk($id);
        $rps['sub_cpmk_entries'] = $this->get_rps_sub_cpmk($id);
        $rps['pertemuan_entries'] = $this->get_rps_pertemuan($id);
        $rps['pustaka_entries'] = $this->get_rps_pustaka($id);
        $rps['approval_logs'] = $this->get_approval_logs($id);

        return $rps;
    }

    public function can_access_rps(array $rps, array $actor): bool
    {
        // DEBUG: Log all incoming values before any checks
        error_log('ACCESS DEBUG - can_access_rps() INPUT: ' . json_encode([
            'actor_id' => isset($actor['id']) ? (int)$actor['id'] : 'NOT SET',
            'actor_role' => $actor['role'] ?? 'NOT SET',
            'rps_id' => isset($rps['id']) ? (int)$rps['id'] : 'NOT SET',
            'rps_dosen_id' => isset($rps['dosen_pengembang_user_id']) ? (int)$rps['dosen_pengembang_user_id'] : 'NOT SET',
            'rps_rmk_id' => isset($rps['koordinator_rmk_user_id']) ? (int)$rps['koordinator_rmk_user_id'] : 'NOT SET',
            'rps_kaprodi_id' => isset($rps['kaprodi_user_id']) ? (int)$rps['kaprodi_user_id'] : 'NOT SET',
            'workflow_status' => $rps['workflow_status'] ?? 'NOT SET',
        ]));

        if ($actor['role'] === self::ROLE_ADMIN) {
            error_log('ACCESS DEBUG - ADMIN role detected, returning true');
            return true;
        }

        if ($actor['role'] === self::ROLE_DOSEN) {
            $dosenMatch = (int) $rps['dosen_pengembang_user_id'] === (int) $actor['id'];
            $isPengampu = $this->is_pengampu((int) $rps['id'], (int) $actor['id']);
            error_log("ACCESS DEBUG - DOSEN role: dosen_match=" . ($dosenMatch ? "YES" : "NO") . ", is_pengampu=" . ($isPengampu ? "YES" : "NO"));
            return $dosenMatch || $isPengampu;
        }

        if ($actor['role'] === self::ROLE_KOORDINATOR_RMK) {
            $rmkMatch = (int) $rps['koordinator_rmk_user_id'] === (int) $actor['id'];
            error_log("ACCESS DEBUG - KOORDINATOR_RMK role: rmk_match=" . ($rmkMatch ? "YES" : "NO"));
            return $rmkMatch;
        }

        if ($actor['role'] === self::ROLE_KAPRODI) {
            $kaprodiMatch = (int) $rps['kaprodi_user_id'] === (int) $actor['id'];
            error_log("ACCESS DEBUG - KAPRODI role: kaprodi_match=" . ($kaprodiMatch ? "YES" : "NO"));
            return $kaprodiMatch;
        }

        error_log('ACCESS DEBUG - No matching role, returning false');
        return false;
    }

    public function can_edit_rps(array $rps, array $actor): bool
    {
        if ($actor['role'] === self::ROLE_ADMIN) {
            return true;
        }

        $editableStatuses = [self::STATUS_DRAFT, self::STATUS_REVISION_BY_RMK, self::STATUS_REVISION_BY_KAPRODI];

        return $actor['role'] === self::ROLE_DOSEN
            && (int) $rps['dosen_pengembang_user_id'] === (int) $actor['id']
            && in_array((string) $rps['workflow_status'], $editableStatuses, true);
    }

    public function update_rps_header(int $id, array $data, array $actor): bool
    {
        global $wpdb;

        $rps = $this->get_rps_detail($id, $actor);
        if (!$rps || !$this->can_edit_rps($rps, $actor)) {
            return false;
        }

        $result = $wpdb->update(self::table('rps'), [
            'tanggal_penyusunan' => sanitize_text_field((string) $data['tanggal_penyusunan']),
            'deskripsi_singkat' => wp_kses_post((string) $data['deskripsi_singkat']),
            'bahan_kajian' => wp_kses_post((string) $data['bahan_kajian']),
            'catatan_tambahan' => wp_kses_post((string) $data['catatan_tambahan']),
            'last_changed_at' => current_time('mysql'),
        ], ['id' => $id], ['%s', '%s', '%s', '%s', '%s'], ['%d']);

        if ($result !== false) {
            $this->add_approval_log($id, (int) $rps['version_no'], $actor, 'update_header', null);
        }

        return $result !== false;
    }

    public function add_cpl_to_rps(int $rpsId, array $data, array $actor): bool
    {
        global $wpdb;

        $rps = $this->get_rps_detail($rpsId, $actor);
        if (!$rps || !$this->can_edit_rps($rps, $actor)) {
            return false;
        }

        $cplId = absint($data['cpl_id'] ?? 0);
        if ($cplId <= 0 && !empty($data['kode']) && !empty($data['deskripsi'])) {
            $wpdb->insert(self::table('cpl_prodi'), [
                'tahun_kurikulum' => sanitize_text_field((string) $rps['tahun_akademik']),
                'program_studi' => sanitize_text_field((string) ($rps['program_studi'] ?? '')),
                'kode' => sanitize_text_field((string) $data['kode']),
                'kategori' => sanitize_text_field((string) $data['kategori']),
                'deskripsi' => wp_kses_post((string) $data['deskripsi']),
                'urutan' => absint($data['urutan'] ?? 1),
            ], ['%s', '%s', '%s', '%s', '%s', '%d']);
            $cplId = (int) $wpdb->insert_id;
        }

        if ($cplId <= 0) {
            return false;
        }

        $inserted = $wpdb->replace(self::table('rps_cpl'), [
            'rps_id' => $rpsId,
            'cpl_id' => $cplId,
            'urutan' => absint($data['urutan'] ?? 1),
        ], ['%d', '%d', '%d']);

        return $inserted !== false;
    }

    public function add_cpmk(int $rpsId, array $data, array $actor): bool
    {
        global $wpdb;

        $rps = $this->get_rps_detail($rpsId, $actor);
        if (!$rps || !$this->can_edit_rps($rps, $actor)) {
            return false;
        }

        $result = $wpdb->replace(self::table('rps_cpmk'), [
            'rps_id' => $rpsId,
            'kode' => sanitize_text_field((string) $data['kode']),
            'deskripsi' => wp_kses_post((string) $data['deskripsi']),
            'urutan' => absint($data['urutan'] ?? 1),
        ], ['%d', '%s', '%s', '%d']);

        return $result !== false;
    }

    public function add_sub_cpmk(int $rpsId, array $data, array $actor): bool
    {
        global $wpdb;

        $rps = $this->get_rps_detail($rpsId, $actor);
        if (!$rps || !$this->can_edit_rps($rps, $actor)) {
            return false;
        }

        $result = $wpdb->replace(self::table('rps_sub_cpmk'), [
            'rps_id' => $rpsId,
            'rps_cpmk_id' => absint($data['rps_cpmk_id']),
            'kode' => sanitize_text_field((string) $data['kode']),
            'deskripsi' => wp_kses_post((string) $data['deskripsi']),
            'urutan' => absint($data['urutan'] ?? 1),
            'target_ketercapaian_persen' => $this->nullable_decimal($data['target_ketercapaian_persen'] ?? null),
        ], ['%d', '%d', '%s', '%s', '%d', '%f']);

        return $result !== false;
    }

    public function add_pertemuan(int $rpsId, array $data, array $actor): bool
    {
        global $wpdb;

        $rps = $this->get_rps_detail($rpsId, $actor);
        if (!$rps || !$this->can_edit_rps($rps, $actor)) {
            return false;
        }

        $result = $wpdb->replace(self::table('rps_pertemuan'), [
            'rps_id' => $rpsId,
            'order_no' => absint($data['order_no']),
            'week_label' => sanitize_text_field((string) $data['week_label']),
            'tipe' => sanitize_key((string) ($data['tipe'] ?? 'reguler')),
            'sub_cpmk_id' => !empty($data['sub_cpmk_id']) ? absint($data['sub_cpmk_id']) : null,
            'sub_cpmk_text' => wp_kses_post((string) ($data['sub_cpmk_text'] ?? '')),
            'indikator_penilaian' => $this->lines_to_json($data['indikator_penilaian'] ?? ''),
            'teknik_penilaian' => wp_kses_post((string) ($data['teknik_penilaian'] ?? '')),
            'kriteria_penilaian' => wp_kses_post((string) ($data['kriteria_penilaian'] ?? '')),
            'metode_pembelajaran' => $this->lines_to_json($data['metode_pembelajaran'] ?? ''),
            'catatan_penugasan' => wp_kses_post((string) ($data['catatan_penugasan'] ?? '')),
            'estimasi_waktu_pb' => sanitize_text_field((string) ($data['estimasi_waktu_pb'] ?? '')),
            'estimasi_waktu_pt' => sanitize_text_field((string) ($data['estimasi_waktu_pt'] ?? '')),
            'estimasi_waktu_km' => sanitize_text_field((string) ($data['estimasi_waktu_km'] ?? '')),
            'materi_pembelajaran' => wp_kses_post((string) ($data['materi_pembelajaran'] ?? '')),
            'bobot_penilaian_persen' => $this->nullable_decimal($data['bobot_penilaian_persen'] ?? null),
        ], ['%d', '%d', '%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%f']);

        return $result !== false;
    }

    public function add_pustaka(int $rpsId, array $data, array $actor): bool
    {
        global $wpdb;

        $rps = $this->get_rps_detail($rpsId, $actor);
        if (!$rps || !$this->can_edit_rps($rps, $actor)) {
            return false;
        }

        $result = $wpdb->insert(self::table('rps_pustaka'), [
            'rps_id' => $rpsId,
            'kategori' => sanitize_key((string) $data['kategori']),
            'teks_lengkap' => wp_kses_post((string) $data['teks_lengkap']),
            'urutan' => absint($data['urutan'] ?? 1),
        ], ['%d', '%s', '%s', '%d']);

        return $result !== false;
    }

    private function get_rps_cpl(int $rpsId): array
    {
        global $wpdb;

        $sql = $wpdb->prepare(
            "SELECT rc.*, c.kode, c.kategori, c.deskripsi
             FROM " . self::table('rps_cpl') . " rc
             INNER JOIN " . self::table('cpl_prodi') . " c ON c.id = rc.cpl_id
             WHERE rc.rps_id = %d
             ORDER BY COALESCE(rc.urutan, c.urutan, 999), c.kode ASC",
            $rpsId
        );

        return $wpdb->get_results($sql, ARRAY_A) ?: [];
    }

    private function get_rps_cpmk(int $rpsId): array
    {
        global $wpdb;

        $sql = $wpdb->prepare(
            "SELECT * FROM " . self::table('rps_cpmk') . " WHERE rps_id = %d ORDER BY urutan ASC, kode ASC",
            $rpsId
        );

        return $wpdb->get_results($sql, ARRAY_A) ?: [];
    }

    private function get_rps_sub_cpmk(int $rpsId): array
    {
        global $wpdb;

        $sql = $wpdb->prepare(
            "SELECT s.*, c.kode AS cpmk_kode
             FROM " . self::table('rps_sub_cpmk') . " s
             LEFT JOIN " . self::table('rps_cpmk') . " c ON c.id = s.rps_cpmk_id
             WHERE s.rps_id = %d
             ORDER BY s.urutan ASC, s.kode ASC",
            $rpsId
        );

        return $wpdb->get_results($sql, ARRAY_A) ?: [];
    }

    private function get_rps_pertemuan(int $rpsId): array
    {
        global $wpdb;

        $sql = $wpdb->prepare(
            "SELECT p.*, s.kode AS sub_cpmk_kode
             FROM " . self::table('rps_pertemuan') . " p
             LEFT JOIN " . self::table('rps_sub_cpmk') . " s ON s.id = p.sub_cpmk_id
             WHERE p.rps_id = %d
             ORDER BY p.order_no ASC",
            $rpsId
        );

        return $wpdb->get_results($sql, ARRAY_A) ?: [];
    }

    private function get_rps_pustaka(int $rpsId): array
    {
        global $wpdb;

        $sql = $wpdb->prepare(
            "SELECT * FROM " . self::table('rps_pustaka') . " WHERE rps_id = %d ORDER BY COALESCE(urutan, 999), id ASC",
            $rpsId
        );

        return $wpdb->get_results($sql, ARRAY_A) ?: [];
    }

    private function get_approval_logs(int $rpsId): array
    {
        global $wpdb;

        $sql = $wpdb->prepare(
            "SELECT * FROM " . self::table('rps_approval_log') . " WHERE rps_id = %d ORDER BY created_at DESC",
            $rpsId
        );

        return $wpdb->get_results($sql, ARRAY_A) ?: [];
    }

    private function save_pengampu(int $rpsId, int $userId, bool $isPengembang, int $urutan): void
    {
        global $wpdb;

        $wpdb->replace(self::table('rps_dosen_pengampu'), [
            'rps_id' => $rpsId,
            'user_id' => $userId,
            'is_pengembang' => $isPengembang ? 1 : 0,
            'urutan' => $urutan,
        ], ['%d', '%d', '%d', '%d']);
    }

    private function is_pengampu(int $rpsId, int $userId): bool
    {
        global $wpdb;

        $found = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM " . self::table('rps_dosen_pengampu') . " WHERE rps_id = %d AND user_id = %d LIMIT 1",
            $rpsId,
            $userId
        ));

        return $found !== null;
    }


    private function table_exists(string $table): bool
    {
        global $wpdb;

        return $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table;
    }

    private function nullable_decimal($value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (float) $value;
    }

    private function lines_to_json($value): string
    {
        $lines = preg_split('/\r\n|\r|\n/', (string) $value);
        $clean = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line !== '') {
                $clean[] = sanitize_text_field($line);
            }
        }

        return wp_json_encode($clean);
    }
}
