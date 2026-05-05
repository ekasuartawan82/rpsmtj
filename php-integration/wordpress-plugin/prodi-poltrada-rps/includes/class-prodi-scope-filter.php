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
     * Validate RPS access based on prodi code matching
     *
     * @param int $rps_id RPS ID to access
     * @param int $actor_user_id WordPress user ID attempting access
     * @return bool True if access allowed, false otherwise
     */
    public static function validate_rps_access( int $rps_id, int $actor_user_id ): bool {
        global $wpdb;

        // Admin politeknik: bypass all prodi restrictions
        if ( user_can( $actor_user_id, 'administrator' ) ) {
            return true;
        }

        // Get actor prodi from user meta
        $actor_prodi = get_user_meta( $actor_user_id, 'prodi_code', true );
        if ( empty( $actor_prodi ) ) {
            // No prodi assigned = no access to any RPS
            return false;
        }

        // Get RPS prodi from database
        $rps_prodi = $wpdb->get_var( $wpdb->prepare(
            "SELECT prodi_code FROM {$wpdb->prefix}prodi_rps WHERE id = %d",
            $rps_id
        ) );

        if ( $rps_prodi === null ) {
            // RPS not found
            return false;
        }

        // Cross-prodi check: actor_prodi MUST match rps_prodi
        return $actor_prodi === $rps_prodi;
    }

    /**
     * Get prodi code for a user
     * Helper function for testing and debugging
     *
     * @param int $user_id WordPress user ID
     * @return string|false Prodi code or false if not assigned
     */
    public static function get_user_prodi( int $user_id ) {
        return get_user_meta( $user_id, 'prodi_code', true );
    }

    /**
     * Get prodi code for an RPS
     * Helper function for testing and debugging
     *
     * @param int $rps_id RPS ID
     * @return string|false Prodi code or false if RPS not found
     */
    public static function get_rps_prodi( int $rps_id ) {
        global $wpdb;

        return $wpdb->get_var( $wpdb->prepare(
            "SELECT prodi_code FROM {$wpdb->prefix}prodi_rps WHERE id = %d",
            $rps_id
        ) );
    }
}
