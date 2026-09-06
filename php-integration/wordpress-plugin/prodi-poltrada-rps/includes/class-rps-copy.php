<?php

/**
 * RPS Copy-as-Draft
 *
 * Creates a new draft RPS by copying an existing one.
 * READ from source (never modifies approved records).
 * WRITE new record with clean governance state (draft, lock_version=1).
 *
 * Prodi filter validated BEFORE copy — cross-prodi copy is blocked.
 *
 * @package Prodi_Poltrada_RPS
 */

if ( ! defined( 'WPINC' ) ) {
    die;
}

class Prodi_RPS_Copy {

    /**
     * Copy an existing RPS as a new draft for the given actor.
     *
     * @param int $source_rps_id RPS to copy from (any workflow_status, read only)
     * @param int $actor_user_id WordPress user ID performing the copy
     * @return int New RPS ID
     * @throws InvalidArgumentException If source not found or prodi mismatch
     */
    public static function copy_as_draft( int $source_rps_id, int $actor_user_id ): int {
        global $wpdb;

        // Prodi gate — BEFORE any DB write
        if ( ! Prodi_Scope_Filter::validate_rps_access( $source_rps_id, $actor_user_id ) ) {
            throw new InvalidArgumentException(
                "Access denied: actor $actor_user_id cannot copy RPS $source_rps_id (prodi mismatch)"
            );
        }

        $rps_table = $wpdb->prefix . 'prodi_rps';

        $source = $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM `{$rps_table}` WHERE id = %d", $source_rps_id ),
            ARRAY_A
        );

        if ( ! $source ) {
            throw new InvalidArgumentException( "Source RPS $source_rps_id not found" );
        }

        $next_version = ( (int) ( $source['version_number'] ?? 1 ) ) + 1;

        // Insert new RPS — governance state reset to clean draft
        $wpdb->insert( $rps_table, [
            'mata_kuliah_id'            => $source['mata_kuliah_id'],
            'tahun_akademik'            => $source['tahun_akademik'],
            'tanggal_penyusunan'        => current_time( 'Y-m-d' ),
            'dosen_pengembang_user_id'  => $actor_user_id,
            'koordinator_rmk_user_id'   => $source['koordinator_rmk_user_id'],
            'kaprodi_user_id'           => $source['kaprodi_user_id'],
            'deskripsi_singkat'         => $source['deskripsi_singkat'],
            'bahan_kajian'              => $source['bahan_kajian'],
            'catatan_tambahan'          => $source['catatan_tambahan'],
            'prodi_code'                => $source['prodi_code'],
            // Governance reset
            'lock_version'              => 1,
            'workflow_status'           => 'draft',
            'status'                    => 'draft',
            'record_status'             => 'active',
            'current_revision_count'    => 0,
            // Lineage traceability
            'parent_rps_id'             => $source_rps_id,
            'version_number'            => $next_version,
            'is_current'                => 1,
            'created_by'                => $actor_user_id,
            'created_at'                => current_time( 'mysql' ),
            'updated_at'                => current_time( 'mysql' ),
        ] );

        $new_rps_id = (int) $wpdb->insert_id;

        if ( ! $new_rps_id ) {
            throw new RuntimeException( 'Failed to insert new draft RPS: ' . $wpdb->last_error );
        }

        // Mark source as superseded
        $wpdb->update( $rps_table, [ 'is_current' => 0 ], [ 'id' => $source_rps_id ] );

        // Deep copy related content
        self::copy_content( $source_rps_id, $new_rps_id );

        return $new_rps_id;
    }

    /**
     * Copy all relational content from source to new RPS.
     * Performs PHP-level ID remapping for tables with cross-references.
     *
     * @param int $source_id
     * @param int $new_id
     */
    private static function copy_content( int $source_id, int $new_id ): void {
        $cpl_map      = self::copy_rps_cpl( $source_id, $new_id );
        $cpmk_map     = self::copy_rps_cpmk( $source_id, $new_id );
        $sub_cpmk_map = self::copy_rps_sub_cpmk( $source_id, $new_id, $cpmk_map );

        self::copy_rps_cpmk_cpl( $cpmk_map, $cpl_map );
        self::copy_rps_korelasi_cpl( $sub_cpmk_map, $cpl_map );

        $pertemuan_map = self::copy_rps_pertemuan( $source_id, $new_id, $sub_cpmk_map );
        $rtm_map       = self::copy_rps_rtm( $source_id, $new_id, $sub_cpmk_map );

        self::copy_rps_rtm_pertemuan( $rtm_map, $pertemuan_map );
        self::copy_rps_pustaka( $source_id, $new_id );
        self::copy_rps_dosen_pengampu( $source_id, $new_id );
    }

    /** Copy rps_cpl rows. Returns old_id → new_id map. */
    private static function copy_rps_cpl( int $source_id, int $new_id ): array {
        global $wpdb;
        $t = $wpdb->prefix . 'prodi_rps_cpl';

        $rows = $wpdb->get_results(
            $wpdb->prepare( "SELECT * FROM `{$t}` WHERE rps_id = %d", $source_id ),
            ARRAY_A
        );

        $map = [];
        foreach ( $rows as $row ) {
            $wpdb->insert( $t, [
                'rps_id' => $new_id,
                'cpl_id' => $row['cpl_id'],
                'urutan' => $row['urutan'],
            ] );
            $map[ $row['id'] ] = (int) $wpdb->insert_id;
        }
        return $map;
    }

    /** Copy rps_cpmk rows. Returns old_id → new_id map. */
    private static function copy_rps_cpmk( int $source_id, int $new_id ): array {
        global $wpdb;
        $t = $wpdb->prefix . 'prodi_rps_cpmk';

        $rows = $wpdb->get_results(
            $wpdb->prepare( "SELECT * FROM `{$t}` WHERE rps_id = %d ORDER BY urutan", $source_id ),
            ARRAY_A
        );

        $map = [];
        foreach ( $rows as $row ) {
            $wpdb->insert( $t, [
                'rps_id'    => $new_id,
                'kode'      => $row['kode'],
                'deskripsi' => $row['deskripsi'],
                'urutan'    => $row['urutan'],
            ] );
            $map[ $row['id'] ] = (int) $wpdb->insert_id;
        }
        return $map;
    }

    /** Copy rps_cpmk_cpl using remapped cpmk and cpl IDs. */
    private static function copy_rps_cpmk_cpl( array $cpmk_map, array $cpl_map ): void {
        if ( empty( $cpmk_map ) || empty( $cpl_map ) ) {
            return;
        }

        global $wpdb;
        $t = $wpdb->prefix . 'prodi_rps_cpmk_cpl';

        $old_cpmk_ids = implode( ',', array_map( 'intval', array_keys( $cpmk_map ) ) );
        $old_cpl_ids  = implode( ',', array_map( 'intval', array_keys( $cpl_map ) ) );

        $rows = $wpdb->get_results(
            "SELECT * FROM `{$t}` WHERE rps_cpmk_id IN ($old_cpmk_ids) AND rps_cpl_id IN ($old_cpl_ids)",
            ARRAY_A
        );

        foreach ( $rows as $row ) {
            $new_cpmk_id = $cpmk_map[ $row['rps_cpmk_id'] ] ?? null;
            $new_cpl_id  = $cpl_map[ $row['rps_cpl_id'] ] ?? null;

            if ( $new_cpmk_id && $new_cpl_id ) {
                $wpdb->insert( $t, [
                    'rps_cpmk_id' => $new_cpmk_id,
                    'rps_cpl_id'  => $new_cpl_id,
                ] );
            }
        }
    }

    /** Copy rps_sub_cpmk using remapped cpmk IDs. Returns old_id → new_id map. */
    private static function copy_rps_sub_cpmk( int $source_id, int $new_id, array $cpmk_map ): array {
        global $wpdb;
        $t = $wpdb->prefix . 'prodi_rps_sub_cpmk';

        $rows = $wpdb->get_results(
            $wpdb->prepare( "SELECT * FROM `{$t}` WHERE rps_id = %d ORDER BY urutan", $source_id ),
            ARRAY_A
        );

        $map = [];
        foreach ( $rows as $row ) {
            $new_cpmk_id = $cpmk_map[ $row['rps_cpmk_id'] ] ?? null;
            if ( ! $new_cpmk_id ) {
                continue;
            }

            $wpdb->insert( $t, [
                'rps_id'                       => $new_id,
                'rps_cpmk_id'                  => $new_cpmk_id,
                'kode'                         => $row['kode'],
                'deskripsi'                    => $row['deskripsi'],
                'urutan'                       => $row['urutan'],
                'target_ketercapaian_persen'   => $row['target_ketercapaian_persen'] ?? null,
                'aktual_ketercapaian_persen'   => null, // reset for new semester
            ] );
            $map[ $row['id'] ] = (int) $wpdb->insert_id;
        }
        return $map;
    }

    /** Copy rps_korelasi_cpl using remapped sub_cpmk and cpl IDs. */
    private static function copy_rps_korelasi_cpl( array $sub_cpmk_map, array $cpl_map ): void {
        if ( empty( $sub_cpmk_map ) || empty( $cpl_map ) ) {
            return;
        }

        global $wpdb;
        $t = $wpdb->prefix . 'prodi_rps_korelasi_cpl';

        $old_sub_ids = implode( ',', array_map( 'intval', array_keys( $sub_cpmk_map ) ) );
        $old_cpl_ids = implode( ',', array_map( 'intval', array_keys( $cpl_map ) ) );

        $rows = $wpdb->get_results(
            "SELECT * FROM `{$t}` WHERE sub_cpmk_id IN ($old_sub_ids) AND cpl_id IN ($old_cpl_ids)",
            ARRAY_A
        );

        foreach ( $rows as $row ) {
            $new_sub_id = $sub_cpmk_map[ $row['sub_cpmk_id'] ] ?? null;
            $new_cpl_id = $cpl_map[ $row['cpl_id'] ] ?? null;

            if ( $new_sub_id && $new_cpl_id ) {
                $wpdb->insert( $t, [
                    'sub_cpmk_id' => $new_sub_id,
                    'cpl_id'      => $new_cpl_id,
                ] );
            }
        }
    }

    /** Copy rps_pertemuan using remapped sub_cpmk IDs. Returns old_id → new_id map. */
    private static function copy_rps_pertemuan( int $source_id, int $new_id, array $sub_cpmk_map ): array {
        global $wpdb;
        $t = $wpdb->prefix . 'prodi_rps_pertemuan';

        $rows = $wpdb->get_results(
            $wpdb->prepare( "SELECT * FROM `{$t}` WHERE rps_id = %d ORDER BY order_no", $source_id ),
            ARRAY_A
        );

        $map = [];
        foreach ( $rows as $row ) {
            $new_sub_cpmk_id = isset( $row['sub_cpmk_id'] )
                ? ( $sub_cpmk_map[ $row['sub_cpmk_id'] ] ?? null )
                : null;

            $wpdb->insert( $t, [
                'rps_id'                       => $new_id,
                'order_no'                     => $row['order_no'],
                'week_label'                   => $row['week_label'] ?? null,
                'tipe'                         => $row['tipe'],
                'sub_cpmk_id'                  => $new_sub_cpmk_id,
                'sub_cpmk_text'                => $row['sub_cpmk_text'] ?? null,
                'indikator_penilaian'          => $row['indikator_penilaian'] ?? null,
                'teknik_penilaian'             => $row['teknik_penilaian'] ?? null,
                'kriteria_penilaian'           => $row['kriteria_penilaian'] ?? null,
                'bentuk_pembelajaran_luring'   => $row['bentuk_pembelajaran_luring'] ?? null,
                'bentuk_pembelajaran_daring'   => $row['bentuk_pembelajaran_daring'] ?? null,
                'metode_pembelajaran'          => $row['metode_pembelajaran'] ?? null,
                'catatan_penugasan'            => $row['catatan_penugasan'] ?? null,
                'estimasi_waktu_pb'            => $row['estimasi_waktu_pb'] ?? null,
                'estimasi_waktu_pt'            => $row['estimasi_waktu_pt'] ?? null,
                'estimasi_waktu_km'            => $row['estimasi_waktu_km'] ?? null,
                'bentuk_daring'                => $row['bentuk_daring'] ?? null,
                'materi_pembelajaran'          => $row['materi_pembelajaran'] ?? null,
                'bobot_penilaian_persen'       => $row['bobot_penilaian_persen'] ?? 0,
                'deskripsi_evaluasi'           => $row['deskripsi_evaluasi'] ?? null,
                // Runtime fields reset for new semester
                'status_pelaksanaan'           => null,
                'materi_aktual'                => null,
                'catatan_deviasi'              => null,
                'tanggal_pelaksanaan'          => null,
                'pustaka_refs'                 => $row['pustaka_refs'] ?? null,
                'notes'                        => $row['notes'] ?? null,
            ] );
            $map[ $row['id'] ] = (int) $wpdb->insert_id;
        }
        return $map;
    }

    /** Copy rps_pustaka rows. */
    private static function copy_rps_pustaka( int $source_id, int $new_id ): void {
        global $wpdb;
        $t = $wpdb->prefix . 'prodi_rps_pustaka';

        $rows = $wpdb->get_results(
            $wpdb->prepare( "SELECT * FROM `{$t}` WHERE rps_id = %d", $source_id ),
            ARRAY_A
        );

        foreach ( $rows as $row ) {
            $wpdb->insert( $t, [
                'rps_id'        => $new_id,
                'kategori'      => $row['kategori'] ?? 'utama',
                'teks_lengkap'  => $row['teks_lengkap'] ?? '',
                'urutan'        => $row['urutan'] ?? 1,
            ] );
        }
    }

    /** Copy rps_rtm with sub_cpmk_id remapped. Returns old_id → new_id map. */
    private static function copy_rps_rtm( int $source_id, int $new_id, array $sub_cpmk_map ): array {
        global $wpdb;
        $t = $wpdb->prefix . 'prodi_rps_rtm';

        $rows = $wpdb->get_results(
            $wpdb->prepare( "SELECT * FROM `{$t}` WHERE rps_id = %d", $source_id ),
            ARRAY_A
        );

        $map = [];
        foreach ( $rows as $row ) {
            $new_sub_cpmk_id = $sub_cpmk_map[ $row['sub_cpmk_id'] ] ?? $row['sub_cpmk_id'];

            $wpdb->insert( $t, [
                'rps_id'              => $new_id,
                'nomor_tugas'         => $row['nomor_tugas'],
                'judul_tugas'         => $row['judul_tugas'],
                'sub_cpmk_id'         => $new_sub_cpmk_id,
                'metode_penugasan'    => $row['metode_penugasan'],
                'deskripsi'           => $row['deskripsi'],
                'langkah_pengerjaan'  => $row['langkah_pengerjaan'],
                'bentuk_luaran'       => $row['bentuk_luaran'],
                'indikator_penilaian' => $row['indikator_penilaian'],
                'bobot_internal_persen' => $row['bobot_internal_persen'],
                'jadwal_pelaksanaan'  => $row['jadwal_pelaksanaan'],
                'catatan'             => $row['catatan'],
                'daftar_rujukan'      => $row['daftar_rujukan'],
            ] );
            $map[ $row['id'] ] = (int) $wpdb->insert_id;
        }
        return $map;
    }

    /** Copy rps_rtm_pertemuan using remapped rtm and pertemuan IDs. */
    private static function copy_rps_rtm_pertemuan( array $rtm_map, array $pertemuan_map ): void {
        if ( empty( $rtm_map ) || empty( $pertemuan_map ) ) {
            return;
        }

        global $wpdb;
        $t = $wpdb->prefix . 'prodi_rps_rtm_pertemuan';

        $old_rtm_ids = implode( ',', array_map( 'intval', array_keys( $rtm_map ) ) );

        $rows = $wpdb->get_results(
            "SELECT * FROM `{$t}` WHERE rps_rtm_id IN ($old_rtm_ids)",
            ARRAY_A
        );

        foreach ( $rows as $row ) {
            $new_rtm_id       = $rtm_map[ $row['rps_rtm_id'] ] ?? null;
            $new_pertemuan_id = $pertemuan_map[ $row['rps_pertemuan_id'] ] ?? null;

            if ( $new_rtm_id && $new_pertemuan_id ) {
                $wpdb->insert( $t, [
                    'rps_rtm_id'       => $new_rtm_id,
                    'rps_pertemuan_id' => $new_pertemuan_id,
                    'keterangan'       => $row['keterangan'],
                ] );
            }
        }
    }

    /** Copy rps_dosen_pengampu rows. */
    private static function copy_rps_dosen_pengampu( int $source_id, int $new_id ): void {
        global $wpdb;
        $t = $wpdb->prefix . 'prodi_rps_dosen_pengampu';

        $rows = $wpdb->get_results(
            $wpdb->prepare( "SELECT * FROM `{$t}` WHERE rps_id = %d", $source_id ),
            ARRAY_A
        );

        foreach ( $rows as $row ) {
            $wpdb->insert( $t, [
                'rps_id'        => $new_id,
                'user_id'       => $row['user_id'],
                'is_pengembang' => $row['is_pengembang'] ?? 0,
                'urutan'        => $row['urutan'] ?? 1,
            ] );
        }
    }
}
