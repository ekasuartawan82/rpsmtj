<?php

/**
 * Prodi Scope Filter
 *
 * Validates actor_prodi === rps_prodi BEFORE request reaches governance engine.
 * INJECTED AT ENDPOINT LAYER — governance engine NOT modified (freeze zone).
 *
 * @package Prodi_Poltrada_RPS
 */

if ( ! defined( 'WPINC' ) ) {
    die;
}

class Prodi_Scope_Filter {

    /**
     * Check whether an actor's prodi matches the target RPS prodi.
     * Fail-closed: both actor_prodi and rps_prodi must be non-empty strings and equal (case-insensitive) for non-admin.
     *
     * @param string|null $actor_prodi Actor's prodi code.
     * @param string|null $rps_prodi   RPS prodi code.
     * @param bool        $is_admin    Whether actor is administrator.
     * @return bool True if access allowed, false otherwise.
     */
    public static function match_prodi( ?string $actor_prodi, ?string $rps_prodi, bool $is_admin = false ): bool {
        if ( $is_admin ) {
            return true;
        }

        $actor = is_string( $actor_prodi ) ? strtoupper( trim( $actor_prodi ) ) : '';
        $rps   = is_string( $rps_prodi ) ? strtoupper( trim( $rps_prodi ) ) : '';

        if ( $actor === '' || $rps === '' ) {
            return false;
        }

        return $actor === $rps;
    }

    /**
     * Validate RPS access based on prodi code matching
     *
     * @param int $rps_id RPS ID to access
     * @param int $actor_user_id WordPress user ID attempting access
     * @return bool True if access allowed, false otherwise
     */
    public static function validate_rps_access( int $rps_id, int $actor_user_id ): bool {
        // Admin politeknik: bypass all prodi restrictions
        if ( user_can( $actor_user_id, 'administrator' ) ) {
            return true;
        }

        // Get actor prodi from wp_usermeta (authoritative source)
        $actor_prodi = self::get_user_prodi( $actor_user_id );
        if ( empty( $actor_prodi ) ) {
            return false;
        }

        // Get RPS prodi from database
        $rps_prodi = self::get_rps_prodi( $rps_id );
        if ( $rps_prodi === null || $rps_prodi === false ) {
            // RPS not found or prodi unassigned
            return false;
        }

        // Cross-prodi check: actor_prodi MUST match rps_prodi
        return self::match_prodi( $actor_prodi, $rps_prodi, false );
    }

    /**
     * Get prodi code for a user.
     *
     * Stored in wp_usermeta (meta_key = 'rps_prodi_code') so it is editable
     * from the standard WordPress Users screen. Replaces the old dedicated
     * prodi_user_profile table.
     *
     * @param int $user_id WordPress user ID
     * @return string|false Upper-cased prodi code or false if not assigned.
     */
    public static function get_user_prodi( int $user_id ) {
        $code = get_user_meta( $user_id, 'rps_prodi_code', true );
        $code = is_string( $code ) ? strtoupper( trim( $code ) ) : '';

        return $code !== '' ? $code : false;
    }

    /**
     * Get prodi code for an RPS
     * Helper function for testing and debugging
     *
     * @param int $rps_id RPS ID
     * @return string|null|false Upper-cased prodi code, null if RPS not found, false if empty
     */
    public static function get_rps_prodi( int $rps_id ) {
        global $wpdb;

        $prodi = $wpdb->get_var( $wpdb->prepare(
            "SELECT prodi_code FROM {$wpdb->prefix}prodi_rps WHERE id = %d",
            $rps_id
        ) );

        if ( $prodi === null ) {
            return null;
        }

        $code = strtoupper( trim( (string) $prodi ) );
        return $code !== '' ? $code : false;
    }
}
