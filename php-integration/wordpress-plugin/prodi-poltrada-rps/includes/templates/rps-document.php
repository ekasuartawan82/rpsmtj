<?php
/**
 * RPS PDF document template.
 *
 * Rendered by Prodi_RPS_Pdf::render_html() with output buffering. Available
 * variables: $rps (array), $e (escaper closure), $logoUrl (string).
 *
 * @package Prodi_Poltrada_RPS
 */

if (!defined('WPINC')) {
    die;
}

/** @var array $rps */
/** @var callable $e */
/** @var string $logoUrl */

$cpls       = $rps['cpl_entries'] ?? [];
$cpmks      = $rps['cpmk_entries'] ?? [];
$subCpmks   = $rps['sub_cpmk_entries'] ?? [];
$pertemuans = $rps['pertemuan_entries'] ?? [];
$pustakas   = $rps['pustaka_entries'] ?? [];
$rtms       = $rps['rtm_entries'] ?? [];
$cpmkCpl    = $rps['cpmk_cpl_matrix'] ?? [];
$korelasi   = $rps['korelasi_matrix'] ?? [];

$subCpmkByCpmk = [];
foreach ($subCpmks as $sc) {
    $subCpmkByCpmk[(int) $sc['rps_cpmk_id']][] = $sc;
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
    body { font-family: sans-serif; font-size: 10pt; color: #222; line-height: 1.45; }
    h1 { font-size: 14pt; margin: 0 0 2pt 0; text-align: center; }
    h2 { font-size: 11pt; background: #eef2f7; padding: 4pt 6pt; border-left: 3pt solid #2c5282; margin: 14pt 0 6pt 0; }
    h3 { font-size: 10pt; margin: 8pt 0 4pt 0; }
    .header { text-align: center; border-bottom: 2pt solid #2c5282; padding-bottom: 6pt; margin-bottom: 10pt; }
    .header img { height: 56pt; }
    .header .instansi { font-size: 11pt; font-weight: bold; }
    .header .doc-title { font-size: 13pt; font-weight: bold; margin-top: 2pt; }
    table { width: 100%; border-collapse: collapse; margin: 4pt 0 8pt 0; }
    th, td { border: 0.5pt solid #999; padding: 3pt 4pt; vertical-align: top; font-size: 9pt; }
    th { background: #f0f4f8; text-align: left; }
    .meta td:first-child { width: 28%; font-weight: bold; background: #f7f9fc; }
    .matrix td.c { text-align: center; }
    .footer { margin-top: 14pt; font-size: 8pt; color: #666; border-top: 0.5pt solid #ccc; padding-top: 4pt; }
    .approved-stamp { color: #2f855a; font-weight: bold; }
    .small { font-size: 8pt; color: #555; }
</style>
</head>
<body>

<div class="header">
    <?php if ($logoUrl): ?><img src="<?= $e($logoUrl) ?>" alt="Logo"><?php endif; ?>
    <div class="instansi">POLITEKNIK TRANSPORTASI Sungai DUSU</div>
    <div class="doc-title">RENCANA PEMBELAJARAN SEMESTER (RPS)</div>
    <div class="small">
        <?= $e($rps['program_studi'] ?? $rps['prodi_code'] ?? '') ?> &middot;
        Tahun Akademik <?= $e($rps['tahun_akademik']) ?> &middot;
        Versi <?= $e($rps['version_number'] ?? 1) ?>
    </div>
</div>

<h2>A. Identitas Mata Kuliah</h2>
<table class="meta">
    <tr><td>Kode Mata Kuliah</td><td><?= $e($rps['kode_mk']) ?></td><td>Bobot SKS</td><td><?= $e($rps['sks_teori'] ?? '') ?> / <?= $e($rps['sks_praktik'] ?? '') ?></td></tr>
    <tr><td>Nama Mata Kuliah</td><td><?= $e($rps['nama_mk']) ?></td><td>Semester</td><td><?= $e($rps['semester'] ?? '') ?></td></tr>
    <tr><td>Program Studi</td><td><?= $e($rps['program_studi'] ?? $rps['prodi_code'] ?? '') ?></td><td>Tanggal Penyusunan</td><td><?= $e($rps['tanggal_penyusunan']) ?></td></tr>
    <tr><td>Dosen Pengembang</td><td><?= $e($rps['dosen_pengembang_name']) ?></td><td>Status</td><td class="approved-stamp">APPROVED</td></tr>
    <tr><td>Koordinator RMK</td><td><?= $e($rps['koordinator_rmk_name'] ?? '-') ?></td><td>Kaprodi</td><td><?= $e($rps['kaprodi_name'] ?? '-') ?></td></tr>
</table>

<h2>B. Deskripsi &amp; Bahan Kajian</h2>
<p><?= nl2br($e($rps['deskripsi_singkat'])) ?></p>
<h3>Bahan Kajian</h3>
<p><?= nl2br($e($rps['bahan_kajian'])) ?></p>
<?php if (!empty($rps['catatan_tambahan'])): ?>
<h3>Catatan Tambahan</h3>
<p><?= nl2br($e($rps['catatan_tambahan'])) ?></p>
<?php endif; ?>

<h2>C. Capaian Pembelajaran Lulusan (CPL)</h2>
<table>
    <thead><tr><th style="width:10%">Kode</th><th style="width:15%">Kategori</th><th>Deskripsi</th></tr></thead>
    <tbody>
    <?php foreach ($cpls as $cpl): ?>
        <tr><td><?= $e($cpl['kode']) ?></td><td><?= $e($cpl['kategori'] ?? '') ?></td><td><?= $e($cpl['deskripsi']) ?></td></tr>
    <?php endforeach; ?>
    </tbody>
</table>

<h2>D. CPMK &amp; Pemetaan ke CPL</h2>
<table>
    <thead>
        <tr><th style="width:10%">Kode CPMK</th><th>Deskripsi CPMK</th><th style="width:18%">CPL Terkait</th></tr>
    </thead>
    <tbody>
    <?php foreach ($cpmks as $cpmk):
        $linkedCpls = $cpmkCpl[(int) $cpmk['id']] ?? [];
        $cplLabels = array_filter(array_map(function ($cplId) use ($cpls) {
            foreach ($cpls as $c) { if ((int) $c['id'] === $cplId) { return $c['kode']; } }
            return null;
        }, $linkedCpls));
    ?>
        <tr>
            <td><?= $e($cpmk['kode']) ?></td>
            <td><?= $e($cpmk['deskripsi']) ?></td>
            <td><?= $e(implode(', ', $cplLabels)) ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>

<h2>E. Sub-CPMK &amp; Korelasi CPL (%)</h2>
<table>
    <thead>
        <tr>
            <th style="width:10%">Sub-CPMK</th>
            <th>Deskripsi</th>
            <?php foreach ($cpls as $cpl): ?>
                <th class="c"><?= $e($cpl['kode']) ?></th>
            <?php endforeach; ?>
        </tr>
    </thead>
    <tbody>
    <?php foreach ($subCpmks as $sc): ?>
        <tr>
            <td><?= $e($sc['kode']) ?></td>
            <td><?= $e($sc['deskripsi']) ?></td>
            <?php foreach ($cpls as $cpl):
                $persen = $korelasi[(int) $sc['id']][(int) $cpl['id']] ?? null; ?>
                <td class="c"><?= $persen !== null ? $e(number_format((float) $persen, 0) . '%') : '-' ?></td>
            <?php endforeach; ?>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>

<h2>F. Rencana Pertemuan (16 Minggu)</h2>
<table>
    <thead>
        <tr>
            <th style="width:5%">Mgg</th>
            <th style="width:10%">Tipe</th>
            <th style="width:18%">Sub-CPMK / Materi</th>
            <th style="width:24%">Indikator Penilaian</th>
            <th style="width:10%">Bobot</th>
            <th>Metode &amp; Penugasan</th>
        </tr>
    </thead>
    <tbody>
    <?php foreach ($pertemuans as $p):
        $indikator = $p['indikator_penilaian'] ?? '';
        $decoded = json_decode($indikator, true);
        $indText = is_array($decoded) ? implode('; ', $decoded) : (string) $indikator;
    ?>
        <tr>
            <td class="c"><?= $e($p['order_no']) ?></td>
            <td><?= $e(strtoupper($p['tipe'] ?? 'reguler')) ?></td>
            <td>
                <strong><?= $e($p['sub_cpmk_kode'] ?? $p['sub_cpmk_text'] ?? '') ?></strong><br>
                <span class="small"><?= $e(mb_substr((string) ($p['materi_pembelajaran'] ?? ''), 0, 80)) ?></span>
            </td>
            <td><?= $e($indText) ?></td>
            <td class="c"><?= $e($p['bobot_penilaian_persen'] ?? '') ?>%</td>
            <td>
                <span class="small"><?= $e($p['metode_pembelajaran'] ?? '') ?></span>
                <?php if (!empty($p['catatan_penugasan'])): ?><br><em class="small">Tugas: <?= $e($p['catatan_penugasan']) ?></em><?php endif; ?>
            </td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>

<h2>G. Referensi / Pustaka</h2>
<table>
    <thead><tr><th style="width:12%">Kategori</th><th>Daftar Pustaka</th></tr></thead>
    <tbody>
    <?php foreach ($pustakas as $pustaka): ?>
        <tr><td><?= $e(strtoupper($pustaka['kategori'] ?? '')) ?></td><td><?= $e($pustaka['teks_lengkap']) ?></td></tr>
    <?php endforeach; ?>
    </tbody>
</table>

<?php if ($rtms !== []): ?>
<h2>H. Rencana Tugas Mandiri (RTM)</h2>
<table>
    <thead><tr><th style="width:8%">No.</th><th style="width:30%">Judul Tugas</th><th>Metode</th><th>Penugasan</th></tr></thead>
    <tbody>
    <?php foreach ($rtms as $rtm): ?>
        <tr>
            <td><?= $e($rtm['nomor_tugas']) ?></td>
            <td><?= $e($rtm['judul_tugas'] ?? '') ?></td>
            <td><?= $e($rtm['metode_penugasan'] ?? '') ?></td>
            <td class="small"><?= $e($rtm['deskripsi_penugasan'] ?? '') ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
<?php endif; ?>

<div class="footer">
    Dokumen ini dihasilkan otomatis oleh Sistem RPS Prodi Poltrada. Status: APPROVED.
    Disahkan pada <?= $e($rps['updated_at'] ?? '') ?>.
    Versi <?= $e($rps['version_number'] ?? 1) ?>.
</div>

</body>
</html>
