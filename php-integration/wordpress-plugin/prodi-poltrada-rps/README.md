# Prodi Poltrada RPS WordPress Plugin

Modul RPS (Rencana Pembelajaran Semester) untuk WordPress, dibangun ulang dari
aplikasi Next.js/Prisma ke PHP + MySQL (`$wpdb`) agar terintegrasi dengan
`smartcampus.poltrada.ac.id`. Berjalan sebagai plugin WordPress terpisah
dengan class `Prodi_RPS_*` (tidak bentrok dengan plugin `Prodi Poltrada`
existing yang menyediakan `wp_prodi_kurikulum` & `wp_prodi_dosen`).

## Integrasi

1. Salin folder `prodi-poltrada-rps` ke `wp-content/plugins/`.
2. (Untuk export PDF) Install mPDF — lihat **PDF Export** di bawah.
3. Aktifkan plugin `Prodi Poltrada RPS` dari dashboard WordPress.
4. Buat halaman WordPress baru, isi dengan shortcode:

```text
[prodi_rps_app]
```

5. Pastikan plugin `Prodi Poltrada` tetap aktif (modul ini membaca mata kuliah
   dari `wp_prodi_kurikulum`). Untuk dev tanpa plugin itu, impor
   `sql/seed-kurikulum-sample.sql`.
6. Buat/set peran RPS per user via layar **Users → Edit** WordPress (meta
   `rps_role` dan `rps_prodi_code`), atau jalankan `sql/seed-test-users.php`
   via `wp eval-file`.

## Auth

Modul ini tidak membuat form login sendiri — 100% delegasi ke WordPress:

- user belum login → diarahkan ke `wp_login_url()`
- identitas aktor dari `wp_get_current_user()`
- role canonical via user meta `rps_role`
- kode prodi via user meta `rps_prodi_code`

Role canonical: `admin`, `dosen`, `koordinator_rmk`, `kaprodi`. Fallback:
`administrator`→admin; `dosen`/`koordinator_rmk`/`kaprodi` langsung;
`author`/`contributor`/`subscriber`→dosen; `manage_options`→admin.

## Tabel

Saat aktivasi, plugin membuat (prefix WP, biasanya `wp_`):

- `wp_prodi_rps` (+ kolom `prodi_code`, `version_number`, `is_current`,
  `program_studi`, `last_changed_at`, `last_reviewed_at_by_rmk`,
  `last_reviewed_at_by_kaprodi`)
- `wp_prodi_rps_dosen_pengampu`, `wp_prodi_rps_cpl_prodi`, `wp_prodi_rps_cpl`
- `wp_prodi_rps_cpmk`, `wp_prodi_rps_cpmk_cpl`, `wp_prodi_rps_sub_cpmk`
- `wp_prodi_rps_korelasi_cpl`, `wp_prodi_rps_pertemuan`, `wp_prodi_rps_pustaka`
- `wp_prodi_rps_rtm`, `wp_prodi_rps_rtm_pertemuan`
- `wp_prodi_rps_approval_log`, `wp_prodi_rps_notifications`
- `wp_prodi_rps_whitelist_kko`
- `wp_prodi_smartcampus_sync` (staging ETL smartcampus CSV)

Mata kuliah dibaca dari `wp_prodi_kurikulum` (milik plugin Prodi Poltrada).

## Fitur

- List/filter/detail RPS, create draft, update header + CPL/CPMK/Sub-CPMK/
  pertemuan/pustaka/RTM
- Workflow 3-tahap: dosen → RMK → Kaprodi (approve/reject + revision loop)
- **Validasi pre-submit OBE** (12 hard blockers): header lengkap, ≥1 CPL/CPMK,
  setiap CPMK mapped CPL, setiap CPMK punya Sub-CPMK, korelasi CPL >0%,
  setiap Sub-CPMK dirujuk pertemuan, **total bobot = 100%**, catatan
  penugasan match RTM, RTM terhubung pertemuan, minggu UTS=8/UAS=16
- **Soft warnings W-01..W-04** (acknowledge-before-submit): indikator ≥8 kata,
  kata kerja operasional whitelist KKO, rujukan pustaka, bobot proporsional
- **Freshness guard** (anti-rubber-stamping): reviewer tidak bisa approve jika
  dokumen berubah sejak review terakhir; reject me-reset timestamp reviewer lain
- **Copy-as-draft** + **version history** (lineage via `parent_rps_id`)
- **Multi-prodi scoping** (dosen/RMK/Kaprodi hanya lihat RPS prodi sendiri)
- **Export PDF** (mPDF) untuk RPS approved
- **Smartcampus sync** (import CSV → staging + usermeta)
- Audit log lengkap (`wp_prodi_rps_approval_log`) per transisi

## PDF Export

Export PDF memakai **mPDF 8.x**. Install salah satu cara:

```bash
# Opsi A: composer (di dalam folder plugin)
composer install --no-dev --optimize-autoloader

# Opsi B: shared hosting tanpa composer — unduh mPDF manual ke:
#   includes/lib/mpdf/   (dengan autoload.php-nya)
```

Plugin otomatis mendeteksi `vendor/autoload.php` atau
`includes/lib/mpdf/autoload.php`. Tanpa mPDF, tombol "Export PDF" akan
menampilkan pesan instruksi instalasi (tidak fatal). Hanya RPS berstatus
`approved` yang dapat di-export.

## Testing

Dua test suite CLI berjalan tanpa WordPress (mock `$wpdb`):

```bash
cd prodi-poltrada-rps
php test-concurrency.php   # governance + concurrency + freshness (7 checks)
php test-validator.php     # OBE hard blockers + warnings (12 checks)
```

Verifikasi end-to-end manual di staging: lihat
`tests/manual-verification-checklist.md`. Skrip seed:
`sql/seed-kurikulum-sample.sql` (mata kuliah) dan `sql/seed-test-users.php`
(pengguna test via `wp eval-file`).

## Catatan Porting

Class `Prodi_RPS_*` sengaja dipisah dari `Prodi_DB`/`Prodi_Frontend` milik
plugin Prodi Poltrada untuk menghindari bentrok. Role/prodi disimpan di
`wp_usermeta` (bukan tabel profil terpisah) supaya bisa di-set dari layar
Users WordPress standar.
