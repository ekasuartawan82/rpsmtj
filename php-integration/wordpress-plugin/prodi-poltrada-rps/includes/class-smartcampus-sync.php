<?php

/**
 * Smartcampus Sync
 *
 * Imports dosen data from Smartcampus CSV into wp_prodi_smartcampus_sync,
 * then links matched rows to wp_user_id and upserts wp_prodi_user_profile.
 *
 * MVP: file import only. API sync = future slice.
 *
 * @package Prodi_Poltrada_RPS
 */

if ( ! defined( 'WPINC' ) ) {
    die;
}

class Prodi_Smartcampus_Sync {

    /**
     * Required CSV columns (case-insensitive header match)
     */
    private const REQUIRED_COLUMNS = [ 'nidn', 'nama_lengkap', 'email', 'prodi_code' ];

    /**
     * Import a Smartcampus CSV file into wp_prodi_smartcampus_sync.
     *
     * @param string $csv_path Absolute path to uploaded CSV file
     * @return array { imported: int, skipped: int, errors: string[] }
     */
    public static function import_csv( string $csv_path ): array {
        global $wpdb;

        if ( ! is_readable( $csv_path ) ) {
            return [ 'imported' => 0, 'skipped' => 0, 'errors' => [ "File not readable: $csv_path" ] ];
        }

        $handle = fopen( $csv_path, 'r' );
        if ( $handle === false ) {
            return [ 'imported' => 0, 'skipped' => 0, 'errors' => [ 'Failed to open CSV' ] ];
        }

        $header = fgetcsv( $handle );
        if ( $header === false ) {
            fclose( $handle );
            return [ 'imported' => 0, 'skipped' => 0, 'errors' => [ 'Empty CSV file' ] ];
        }

        // Normalize header keys to lowercase
        $header = array_map( 'strtolower', array_map( 'trim', $header ) );
        $col    = array_flip( $header );

        // Validate required columns
        $missing = array_diff( self::REQUIRED_COLUMNS, $header );
        if ( ! empty( $missing ) ) {
            fclose( $handle );
            return [
                'imported' => 0,
                'skipped'  => 0,
                'errors'   => [ 'Missing CSV columns: ' . implode( ', ', $missing ) ],
            ];
        }

        $imported = 0;
        $skipped  = 0;
        $errors   = [];
        $row_num  = 1;

        $sync_table    = $wpdb->prefix . 'prodi_smartcampus_sync';
        $profile_table = $wpdb->prefix . 'prodi_user_profile';

        while ( ( $row = fgetcsv( $handle ) ) !== false ) {
            $row_num++;

            $nidn        = trim( $row[ $col['nidn'] ] ?? '' );
            $nama        = trim( $row[ $col['nama_lengkap'] ] ?? '' );
            $email       = sanitize_email( $row[ $col['email'] ] ?? '' );
            $prodi_code  = strtoupper( trim( $row[ $col['prodi_code'] ] ?? '' ) );

            if ( empty( $nidn ) || empty( $nama ) || empty( $prodi_code ) ) {
                $errors[] = "Row $row_num: nidn, nama_lengkap, prodi_code required — skipped";
                $skipped++;
                continue;
            }

            $valid_prodi = [ 'MTJ', 'TO', 'MLOG' ];
            if ( ! in_array( $prodi_code, $valid_prodi, true ) ) {
                $errors[] = "Row $row_num: invalid prodi_code '$prodi_code' — skipped";
                $skipped++;
                continue;
            }

            // Find linked WordPress user by email
            $wp_user_id = null;
            if ( ! empty( $email ) ) {
                $user = get_user_by( 'email', $email );
                if ( $user ) {
                    $wp_user_id = $user->ID;
                }
            }

            $raw_data = json_encode( array_combine( $header, $row ) );

            // Upsert into sync table
            $result = $wpdb->query( $wpdb->prepare(
                "INSERT INTO `{$sync_table}`
                   (nidn, nama_lengkap, email, prodi_code, wp_user_id, sync_source, raw_data)
                 VALUES (%s, %s, %s, %s, %d, 'manual', %s)
                 ON DUPLICATE KEY UPDATE
                   nama_lengkap = VALUES(nama_lengkap),
                   email        = VALUES(email),
                   prodi_code   = VALUES(prodi_code),
                   wp_user_id   = VALUES(wp_user_id),
                   raw_data     = VALUES(raw_data),
                   last_synced  = CURRENT_TIMESTAMP",
                $nidn,
                $nama,
                $email,
                $prodi_code,
                $wp_user_id ?? 0,
                $raw_data
            ) );

            if ( $result === false ) {
                $errors[] = "Row $row_num: DB error — " . $wpdb->last_error;
                $skipped++;
                continue;
            }

            // If linked to a WP user, upsert wp_prodi_user_profile
            if ( $wp_user_id ) {
                $wpdb->query( $wpdb->prepare(
                    "INSERT INTO `{$profile_table}` (user_id, prodi_code, academic_role)
                     VALUES (%d, %s, 'dosen')
                     ON DUPLICATE KEY UPDATE
                       prodi_code    = VALUES(prodi_code),
                       is_active     = 1",
                    $wp_user_id,
                    $prodi_code
                ) );
            }

            $imported++;
        }

        fclose( $handle );

        return compact( 'imported', 'skipped', 'errors' );
    }

    /**
     * Get all sync records, optionally filtered by prodi.
     *
     * @param string|null $prodi_code Filter by prodi (null = all)
     * @return array[]
     */
    public static function get_sync_records( ?string $prodi_code = null ): array {
        global $wpdb;

        $table = $wpdb->prefix . 'prodi_smartcampus_sync';

        if ( $prodi_code ) {
            return $wpdb->get_results(
                $wpdb->prepare( "SELECT * FROM `{$table}` WHERE prodi_code = %s ORDER BY nidn", $prodi_code ),
                ARRAY_A
            );
        }

        return $wpdb->get_results( "SELECT * FROM `{$table}` ORDER BY prodi_code, nidn", ARRAY_A );
    }
}
