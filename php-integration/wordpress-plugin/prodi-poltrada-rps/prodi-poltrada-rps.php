<?php
/**
 * Plugin Name:       Prodi Poltrada RPS
 * Plugin URI:        https://example.com/
 * Description:       Modul RPS PHP/MySQL untuk integrasi ke web WordPress Prodi Poltrada.
 * Version:           0.2.0
 * Author:            IT Poltrada
 * Author URI:        https://example.com/
 * License:           GPL v2 or later
 * License URI:        https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       prodi-poltrada-rps
 */

if (!defined('WPINC')) {
    die;
}

define('PRODI_RPS_PLUGIN_VERSION', '0.2.0');
define('PRODI_RPS_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('PRODI_RPS_PLUGIN_URL', plugin_dir_url(__FILE__));

// Load bundled mPDF autoloader if present (fallback for shared hosting w/o composer).
if (file_exists(PRODI_RPS_PLUGIN_PATH . 'vendor/autoload.php')) {
    require_once PRODI_RPS_PLUGIN_PATH . 'vendor/autoload.php';
} elseif (file_exists(PRODI_RPS_PLUGIN_PATH . 'includes/lib/mpdf/autoload.php')) {
    require_once PRODI_RPS_PLUGIN_PATH . 'includes/lib/mpdf/autoload.php';
}

require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-exceptions.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-db.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-governance.php';
// Phase 3 — multi-prodi classes (load before class-frontend.php which references them)
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-prodi-scope-filter.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-smartcampus-sync.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-rps-copy.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-version-history.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-dashboard-filter.php';
// Phase 4 — validation, warnings, PDF export, usermeta migration
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-rps-validator.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-rps-pdf.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-migration.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-frontend.php';

/**
 * Activation: create all tables fresh, then backfill any missing columns
 * (covers re-activation on sites that pre-date the prodi_rps schema fix).
 */
function prodi_rps_activate_plugin(): void
{
    Prodi_RPS_DB::create_tables();

    $db = new Prodi_RPS_DB();
    $db->ensure_schema_columns();

    Prodi_RPS_Migration::migrate_to_usermeta();

    flush_rewrite_rules();
}

register_activation_hook(__FILE__, 'prodi_rps_activate_plugin');

/**
 * admin_init backfill guard: if the plugin was upgraded (not re-activated)
 * dbDelta will not have run, so ensure columns exist on every admin request
 * until they do. Cheap (information_schema lookup) and idempotent.
 */
add_action('admin_init', function (): void {
    $flag = 'prodi_rps_schema_v020_done';
    if (get_option($flag)) {
        return;
    }
    $db = new Prodi_RPS_DB();
    $db->ensure_schema_columns();
    Prodi_RPS_Migration::migrate_to_usermeta();
    update_option($flag, 1);
});

function prodi_rps_bootstrap_plugin(): void
{
    $db = new Prodi_RPS_DB();
    $governance = new Prodi_RPS_Governance_Service($db);
    $validator = new Prodi_RPS_Validator($db);
    $pdf = new Prodi_RPS_Pdf($db);
    $governance->set_validator($validator);
    new Prodi_RPS_Frontend($db, $governance, $validator, $pdf);
}

add_action('plugins_loaded', 'prodi_rps_bootstrap_plugin');
