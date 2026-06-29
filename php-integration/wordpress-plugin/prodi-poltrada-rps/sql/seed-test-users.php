<?php
/**
 * Seed test WordPress users + RPS role/prodi usermeta for local dev.
 *
 * Creates one user per canonical RPS role (admin already exists) and writes
 * the rps_role / rps_prodi_code usermeta the plugin reads. Passwords are
 * generated fresh via wp_generate_password() — this script never imports or
 * reuses real password hashes from any database dump.
 *
 * Usage (from the WP root, or via wp-cli eval-file):
 *   wp eval-file path/to/seed-test-users.php
 *
 * Or as a WP-CLI command if wp-cli is available:
 *   wp eval-file seed-test-users.php --path=/var/www/html
 *
 * Idempotent: re-running updates existing users in place.
 */

if (!defined('ABSPATH') && !function_exists('wp_insert_user')) {
    fwrite(STDERR, "This script must run inside WordPress (use `wp eval-file`). Aborting.\n");
    exit(1);
}

$users = [
    [
        'user_login' => 'rps_dosen_mtj',
        'user_email' => 'rps_dosen_mtj@example.test',
        'display_name' => 'Dosen MTJ (Test)',
        'role' => 'dosen',
        'prodi_code' => 'MTJ',
    ],
    [
        'user_login' => 'rps_rmk_mtj',
        'user_email' => 'rps_rmk_mtj@example.test',
        'display_name' => 'Koordinator RMK MTJ (Test)',
        'role' => 'koordinator_rmk',
        'prodi_code' => 'MTJ',
    ],
    [
        'user_login' => 'rps_kaprodi_mtj',
        'user_email' => 'rps_kaprodi_mtj@example.test',
        'display_name' => 'Kaprodi MTJ (Test)',
        'role' => 'kaprodi',
        'prodi_code' => 'MTJ',
    ],
    [
        'user_login' => 'rps_dosen_to',
        'user_email' => 'rps_dosen_to@example.test',
        'display_name' => 'Dosen TO (Test)',
        'role' => 'dosen',
        'prodi_code' => 'TO',
    ],
];

$created = 0;
foreach ($users as $u) {
    $existing = get_user_by('login', $u['user_login']);
    if ($existing) {
        $userId = $existing->ID;
        echo "Updated existing user {$u['user_login']} (ID {$userId})\n";
    } else {
        $userId = wp_insert_user([
            'user_login' => $u['user_login'],
            'user_email' => $u['user_email'],
            'display_name' => $u['display_name'],
            'user_pass' => wp_generate_password(20, true),
            'role' => 'subscriber',
        ]);
        if (is_wp_error($userId)) {
            echo "FAILED {$u['user_login']}: " . $userId->get_error_message() . "\n";
            continue;
        }
        echo "Created user {$u['user_login']} (ID {$userId}) — reset password via WP admin to login\n";
        $created++;
    }

    update_user_meta($userId, 'rps_role', $u['role']);
    update_user_meta($userId, 'rps_prodi_code', $u['prodi_code']);
}

echo "\nDone. {$created} new users created.\n";
echo "Reminder: set each user's password from the WP admin Users screen before logging in.\n";
