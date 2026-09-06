<?php
/**
 * One-shot migrations for the RPS plugin.
 *
 * Currently handles the transition from a dedicated prodi_user_profile table
 * (Phase 3 original design) to wp_usermeta (rps_role / rps_prodi_code), which
 * is editable via the standard WordPress Users screen and needs no extra
 * schema. Idempotent: guarded by an option flag and safe to run repeatedly.
 *
 * @package Prodi_Poltrada_RPS
 */

if (!defined('ABSPATH')) {
    die;
}

class Prodi_RPS_Migration
{
    /**
     * Migrate prodi_user_profile (if it exists) into wp_usermeta, then
     * preserve the old table (renamed) as a backup rather than dropping it.
     *
     * Idempotent via the prodi_rps_migration_usermeta_done option.
     */
    public static function migrate_to_usermeta(): void
    {
        global $wpdb;

        if (get_option('prodi_rps_migration_usermeta_done')) {
            return;
        }

        $profileTable = Prodi_RPS_DB::table('user_profile');

        // Only attempt migration if the legacy table actually exists.
        $exists = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM information_schema.tables
                 WHERE table_schema = %s AND table_name = %s",
                DB_NAME,
                $profileTable
            )
        );

        if (!$exists) {
            update_option('prodi_rps_migration_usermeta_done', 1);
            return;
        }

        // Copy each profile row's prodi_code / academic_role into usermeta.
        $rows = $wpdb->get_results(
            "SELECT user_id, prodi_code, academic_role FROM {$profileTable} WHERE is_active = 1",
            ARRAY_A
        );

        foreach ($rows as $row) {
            $userId = (int) $row['user_id'];
            if (!$userId) {
                continue;
            }
            if (!empty($row['prodi_code'])) {
                update_user_meta($userId, 'rps_prodi_code', sanitize_text_field($row['prodi_code']));
            }
            if (!empty($row['academic_role'])) {
                update_user_meta($userId, 'rps_role', sanitize_text_field($row['academic_role']));
            }
        }

        // Preserve the legacy table as a timestamped backup rather than DROP.
        $backup = $profileTable . '_old_' . gmdate('Ymd_His');
        $wpdb->query("RENAME TABLE {$profileTable} TO {$backup}");

        update_option('prodi_rps_migration_usermeta_done', 1);
    }
}
