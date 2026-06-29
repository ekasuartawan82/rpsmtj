<?php

/**
 * Dashboard Prodi Filter
 *
 * Applies prodi scoping to the RPS list query used by the dashboard.
 * Non-admin actors are automatically filtered to their own prodi.
 * Admin actors may specify any prodi or view all.
 *
 * This is a query-layer concern — governance logic is untouched.
 *
 * @package Prodi_Poltrada_RPS
 */

if ( ! defined( 'WPINC' ) ) {
    die;
}

class Prodi_Dashboard_Filter {

    /**
     * Build the prodi_code filter value for a given actor.
     *
     * @param int         $actor_user_id WordPress user ID
     * @param string|null $requested_prodi Prodi requested (admin only; null = all)
     * @return string|null Prodi code to filter by, or null for no filter (admin all-view)
     */
    public static function resolve_prodi_filter( int $actor_user_id, ?string $requested_prodi ): ?string {
        if ( user_can( $actor_user_id, 'administrator' ) ) {
            // Admin: use requested prodi if provided, else no filter (see all)
            return $requested_prodi
                ? strtoupper( sanitize_text_field( $requested_prodi ) )
                : null;
        }

        // Non-admin: always scoped to their own prodi (ignore requested_prodi)
        $actor_prodi = Prodi_Scope_Filter::get_user_prodi( $actor_user_id );
        return $actor_prodi ?: null;
    }

    /**
     * Get available prodi options for the filter dropdown.
     * Admin sees all three; non-admin sees only their own.
     *
     * @param int $actor_user_id
     * @return array[] [ ['code' => 'MTJ', 'label' => 'Manajemen Transportasi Jalan'], ... ]
     */
    public static function get_prodi_options( int $actor_user_id ): array {
        $all = [
            [ 'code' => 'MTJ',  'label' => 'Manajemen Transportasi Jalan' ],
            [ 'code' => 'TO',   'label' => 'Teknik Otomotif' ],
            [ 'code' => 'MLOG', 'label' => 'Manajemen Logistik' ],
        ];

        if ( user_can( $actor_user_id, 'administrator' ) ) {
            return $all;
        }

        $actor_prodi = Prodi_Scope_Filter::get_user_prodi( $actor_user_id );
        if ( ! $actor_prodi ) {
            return [];
        }

        return array_values( array_filter( $all, fn( $p ) => $p['code'] === $actor_prodi ) );
    }

    /**
     * Get the actor array expected by Prodi_RPS_DB::list_rps().
     *
     * Reads role from wp_usermeta (meta_key = 'rps_role'), falling back to the
     * canonical role resolution in Prodi_RPS_DB. Replaces the old
     * wp_prodi_user_profile.academic_role lookup.
     *
     * @param int $actor_user_id
     * @return array { id: int, role: string, prodi_code: string|null }
     */
    public static function get_actor( int $actor_user_id ): array {
        if ( user_can( $actor_user_id, 'administrator' ) ) {
            return [
                'id'         => $actor_user_id,
                'role'       => 'admin',
                'prodi_code' => null,
            ];
        }

        $db   = new Prodi_RPS_DB();
        $user = get_userdata( $actor_user_id );
        $role = $user ? $db->canonical_role_for_user( $user ) : 'dosen';

        return [
            'id'         => $actor_user_id,
            'role'       => $role,
            'prodi_code' => Prodi_Scope_Filter::get_user_prodi( $actor_user_id ) ?: null,
        ];
    }
}
