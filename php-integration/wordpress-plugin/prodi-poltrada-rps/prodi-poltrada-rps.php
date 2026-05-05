<?php
/**
 * Plugin Name:       Prodi Poltrada RPS
 * Plugin URI:        https://example.com/
 * Description:       Modul RPS PHP/MySQL untuk integrasi ke web WordPress Prodi Poltrada.
 * Version:           0.1.0
 * Author:            IT Poltrada
 * Author URI:        https://example.com/
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       prodi-poltrada-rps
 */

if (!defined('WPINC')) {
    die;
}

define('PRODI_RPS_PLUGIN_VERSION', '0.1.0');
define('PRODI_RPS_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('PRODI_RPS_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-exceptions.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-db.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-governance.php';
// Phase 3 — multi-prodi classes (load before class-frontend.php which references them)
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-prodi-scope-filter.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-smartcampus-sync.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-rps-copy.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-version-history.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-dashboard-filter.php';
require_once PRODI_RPS_PLUGIN_PATH . 'includes/class-frontend.php';

function prodi_rps_activate_plugin(): void
{
    Prodi_RPS_DB::create_tables();
    flush_rewrite_rules();
}

register_activation_hook(__FILE__, 'prodi_rps_activate_plugin');

function prodi_rps_bootstrap_plugin(): void
{
    $db = new Prodi_RPS_DB();
    $governance = new Prodi_RPS_Governance_Service($db);
    new Prodi_RPS_Frontend($db, $governance);
}

add_action('plugins_loaded', 'prodi_rps_bootstrap_plugin');
