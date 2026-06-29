<?php
/**
 * RPS PDF Export (mPDF).
 *
 * Renders an approved RPS as a printable PDF document using the bundled mPDF
 * library (PHP-native, no headless browser). Only RPS with workflow_status
 * 'approved' may be exported — enforced as a hard gate.
 *
 * @package Prodi_Poltrada_RPS
 */

if (!defined('WPINC')) {
    die;
}

class Prodi_RPS_Pdf
{
    private Prodi_RPS_DB $db;

    public function __construct(Prodi_RPS_DB $db)
    {
        $this->db = $db;
    }

    /**
     * Export an approved RPS as a PDF download (sends HTTP headers + body).
     *
     * @param int   $rpsId
     * @param array $actor
     * @throws RPS_Input_Exception   when the RPS is not approved / inaccessible.
     * @throws RuntimeException      when mPDF is not available.
     */
    public function export_pdf(int $rpsId, array $actor): void
    {
        if (!class_exists('\Mpdf\Mpdf')) {
            throw new RuntimeException(
                'mPDF library tidak ditemukan. Jalankan `composer install` di dalam folder plugin, ' .
                'atau unduh mPDF ke includes/lib/mpdf/. Lihat README bagian PDF Export.'
            );
        }

        $rps = $this->db->get_rps_detail($rpsId, $actor);
        if (!$rps) {
            throw new RPS_Input_Exception('RPS tidak ditemukan atau akses ditolak.');
        }

        // Gate: only approved RPS may be exported.
        if ((string) ($rps['workflow_status'] ?? '') !== Prodi_RPS_DB::STATUS_APPROVED) {
            throw new RPS_Input_Exception('Hanya RPS berstatus "approved" yang dapat di-export ke PDF.');
        }

        // Prodi scope gate (defense in depth — get_rps_detail already checks ownership).
        if (class_exists('Prodi_Scope_Filter') && !Prodi_Scope_Filter::validate_rps_access($rpsId, (int) $actor['id'])) {
            throw new RPS_Input_Exception('Akses ditolak (lintas prodi).');
        }

        // Enrich with relation matrices the detail view doesn't bundle.
        $rps['cpmk_cpl_matrix'] = $this->load_cpmk_cpl_matrix($rpsId);
        $rps['korelasi_matrix'] = $this->load_korelasi_matrix($rpsId, $rps['cpl_entries'] ?? [], $rps['sub_cpmk_entries'] ?? []);
        $rps['rtm_entries']     = $this->load_rtm_entries($rpsId);

        $html = $this->render_html($rps);
        $filename = $this->build_filename($rps);

        $mpdf = new \Mpdf\Mpdf([
            'format'        => 'A4',
            'margin_left'   => 15,
            'margin_right'  => 15,
            'margin_top'    => 18,
            'margin_bottom' => 18,
            'default_font'  => 'sans-serif',
        ]);
        $mpdf->SetTitle('RPS ' . ($rps['kode_mk'] ?? '') . ' v' . ($rps['version_number'] ?? 1));
        $mpdf->WriteHTML($html);

        // Stream as attachment.
        $mpdf->Output($filename, \Mpdf\Output\Destination::DOWNLOAD);
    }

    /**
     * Render the RPS to HTML by populating the document template.
     * Output buffering lets the template use plain PHP with escaped echoes.
     */
    private function render_html(array $rps): string
    {
        $templatePath = PRODI_RPS_PLUGIN_PATH . 'includes/templates/rps-document.php';
        if (!file_exists($templatePath)) {
            throw new RuntimeException('Template PDF tidak ditemukan: ' . $templatePath);
        }

        // Helper available inside the template for safe output.
        $e = static function ($v): string {
            return htmlspecialchars((string) ($v ?? ''), ENT_QUOTES, 'UTF-8');
        };
        $logoUrl = PRODI_RPS_PLUGIN_URL . 'assets/poltrada-logo.png';

        ob_start();
        include $templatePath;
        return (string) ob_get_clean();
    }

    private function build_filename(array $rps): string
    {
        $kode = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($rps['kode_mk'] ?? 'MK'));
        $tahun = preg_replace('/[^0-9]/', '', (string) ($rps['tahun_akademik'] ?? ''));
        $versi = (int) ($rps['version_number'] ?? 1);
        return sprintf('RPS_%s_%s_v%d.pdf', $kode, $tahun, $versi);
    }

    // =====================================================================
    // Relation loaders for the PDF matrix tables
    // =====================================================================

    /** @return array<int, int[]> cpmk_id => [cpl_id,...] */
    private function load_cpmk_cpl_matrix(int $rpsId): array
    {
        global $wpdb;
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT link.rps_cpmk_id AS cpmk_id, link.rps_cpl_id AS cpl_id
             FROM " . Prodi_RPS_DB::table('rps_cpmk_cpl') . " link
             INNER JOIN " . Prodi_RPS_DB::table('rps_cpmk') . " c ON c.id = link.rps_cpmk_id
             WHERE c.rps_id = %d",
            $rpsId
        ), ARRAY_A) ?: [];

        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['cpmk_id']][] = (int) $r['cpl_id'];
        }
        return $out;
    }

    /** @return array<int, array<int,float>> sub_cpmk_id => [cpl_id => persentase] */
    private function load_korelasi_matrix(int $rpsId, array $cpls, array $subCpmks): array
    {
        global $wpdb;
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT k.rps_sub_cpmk_id AS sid, k.rps_cpl_id AS cpl_id, k.persentase
             FROM " . Prodi_RPS_DB::table('rps_korelasi_cpl') . " k
             INNER JOIN " . Prodi_RPS_DB::table('rps_sub_cpmk') . " s ON s.id = k.rps_sub_cpmk_id
             WHERE s.rps_id = %d",
            $rpsId
        ), ARRAY_A) ?: [];

        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['sid']][(int) $r['cpl_id']] = (float) $r['persentase'];
        }
        return $out;
    }

    /** @return array RTM rows for this RPS. */
    private function load_rtm_entries(int $rpsId): array
    {
        global $wpdb;
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM " . Prodi_RPS_DB::table('rps_rtm') . " WHERE rps_id = %d ORDER BY nomor_tugas ASC",
            $rpsId
        ), ARRAY_A) ?: [];
    }
}
