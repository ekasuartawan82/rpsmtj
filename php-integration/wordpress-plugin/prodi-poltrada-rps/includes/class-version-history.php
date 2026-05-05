<?php

/**
 * RPS Version History
 *
 * Queries version lineage for a given RPS — all versions sharing the same
 * mata_kuliah_id, ordered from newest to oldest. Prodi-gated: non-admin
 * actors may only view versions within their own prodi.
 *
 * @package Prodi_Poltrada_RPS
 */

if ( ! defined( 'WPINC' ) ) {
    die;
}

class Prodi_RPS_Version_History {

    /**
     * Get the full version history for the mata_kuliah lineage containing $rps_id.
     *
     * @param int $rps_id Any RPS ID in the lineage
     * @param int $actor_user_id Actor requesting the history (prodi-gated)
     * @return array[] Rows with id, version_number, tahun_akademik, workflow_status,
     *                 is_current, parent_rps_id, created_at, dosen_pengembang_name
     * @throws InvalidArgumentException If RPS not found or cross-prodi access
     */
    public static function get_lineage( int $rps_id, int $actor_user_id ): array {
        global $wpdb;

        $rps_table  = $wpdb->prefix . 'prodi_rps';
        $users_table = $wpdb->users;

        // Load the anchor RPS to get mata_kuliah_id + prodi_code
        $anchor = $wpdb->get_row(
            $wpdb->prepare( "SELECT id, mata_kuliah_id, prodi_code FROM `{$rps_table}` WHERE id = %d", $rps_id ),
            ARRAY_A
        );

        if ( ! $anchor ) {
            throw new InvalidArgumentException( "RPS $rps_id not found" );
        }

        // Prodi gate — admin sees all
        if ( ! user_can( $actor_user_id, 'administrator' ) ) {
            $actor_prodi = Prodi_Scope_Filter::get_user_prodi( $actor_user_id );
            if ( $actor_prodi !== $anchor['prodi_code'] ) {
                throw new InvalidArgumentException(
                    "Access denied: actor prodi ($actor_prodi) does not match RPS prodi ({$anchor['prodi_code']})"
                );
            }
        }

        $mata_kuliah_id = (int) $anchor['mata_kuliah_id'];

        return $wpdb->get_results( $wpdb->prepare(
            "SELECT
               r.id,
               r.version_number,
               r.tahun_akademik,
               r.workflow_status,
               r.is_current,
               r.parent_rps_id,
               r.lock_version,
               r.created_at,
               r.updated_at,
               u.display_name AS dosen_pengembang_name
             FROM `{$rps_table}` r
             LEFT JOIN `{$users_table}` u ON u.ID = r.dosen_pengembang_user_id
             WHERE r.mata_kuliah_id = %d
               AND r.record_status = 'active'
             ORDER BY COALESCE(r.version_number, 1) DESC, r.created_at DESC",
            $mata_kuliah_id
        ), ARRAY_A ) ?: [];
    }

    /**
     * Get the root (oldest) ancestor of an RPS by walking the parent_rps_id chain.
     *
     * @param int $rps_id
     * @return int Root RPS ID
     */
    public static function get_root_id( int $rps_id ): int {
        global $wpdb;
        $table  = $wpdb->prefix . 'prodi_rps';
        $depth  = 0;
        $max    = 20; // guard against cycles
        $cursor = $rps_id;

        while ( $depth++ < $max ) {
            $parent = $wpdb->get_var( $wpdb->prepare(
                "SELECT parent_rps_id FROM `{$table}` WHERE id = %d",
                $cursor
            ) );

            if ( ! $parent ) {
                break;
            }
            $cursor = (int) $parent;
        }

        return $cursor;
    }

    /**
     * Format lineage records for JSON API response.
     *
     * @param array[] $lineage From get_lineage()
     * @param int     $current_rps_id The RPS ID the actor is viewing
     * @return array[]
     */
    public static function format_for_api( array $lineage, int $current_rps_id ): array {
        return array_map( static function ( array $row ) use ( $current_rps_id ) {
            return [
                'id'                    => (int) $row['id'],
                'version_number'        => (int) ( $row['version_number'] ?? 1 ),
                'tahun_akademik'        => $row['tahun_akademik'],
                'workflow_status'       => $row['workflow_status'],
                'is_current'            => (bool) $row['is_current'],
                'is_viewing'            => (int) $row['id'] === $current_rps_id,
                'parent_rps_id'         => $row['parent_rps_id'] ? (int) $row['parent_rps_id'] : null,
                'lock_version'          => (int) $row['lock_version'],
                'dosen_pengembang_name' => $row['dosen_pengembang_name'] ?? '',
                'created_at'            => $row['created_at'],
                'updated_at'            => $row['updated_at'],
                'can_copy'              => $row['workflow_status'] !== 'draft',
            ];
        }, $lineage );
    }
}
