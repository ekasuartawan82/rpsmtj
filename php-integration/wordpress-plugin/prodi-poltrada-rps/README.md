# Prodi Poltrada RPS WordPress Plugin

Modul ini adalah rebuild awal aplikasi RPS dari Next.js/Prisma ke PHP + MySQL untuk integrasi WordPress existing.

## Integrasi

1. Copy folder `prodi-poltrada-rps` ke `wp-content/plugins/`.
2. Aktifkan plugin `Prodi Poltrada RPS` dari dashboard WordPress.
3. Buat halaman WordPress baru, lalu isi dengan shortcode:

```text
[prodi_rps_app]
```

4. Pastikan plugin existing `Prodi Poltrada` tetap aktif karena modul ini membaca mata kuliah dari tabel `wp_prodi_kurikulum`.

## Auth

Modul ini tidak membuat form login sendiri. Semua akses memakai login WordPress:

- user belum login diarahkan ke login WordPress
- identitas aktor diambil dari `wp_get_current_user()`
- role canonical bisa di-set melalui user meta `rps_role`

Role canonical:

- `admin`
- `dosen`
- `koordinator_rmk`
- `kaprodi`

Fallback role:

- WordPress `administrator` menjadi `admin`
- WordPress role `dosen`, `koordinator_rmk`, atau `kaprodi` dipakai langsung
- `author`, `contributor`, dan `subscriber` dipetakan sebagai `dosen`
- jika tidak ada role yang cocok, user dengan capability `manage_options` menjadi `admin`; selain itu `dosen`

## Tabel

Saat activation, plugin membuat tabel MySQL dengan prefix WordPress:

- `wp_prodi_rps`
- `wp_prodi_rps_dosen_pengampu`
- `wp_prodi_rps_cpl_prodi`
- `wp_prodi_rps_cpl`
- `wp_prodi_rps_cpmk`
- `wp_prodi_rps_cpmk_cpl`
- `wp_prodi_rps_sub_cpmk`
- `wp_prodi_rps_korelasi_cpl`
- `wp_prodi_rps_pertemuan`
- `wp_prodi_rps_pustaka`
- `wp_prodi_rps_rtm`
- `wp_prodi_rps_rtm_pertemuan`
- `wp_prodi_rps_approval_log`
- `wp_prodi_rps_notifications`
- `wp_prodi_rps_whitelist_kko`

Mata kuliah dibaca dari tabel existing `wp_prodi_kurikulum`.

## Fitur Tahap Ini

- list/filter RPS
- create draft RPS
- detail RPS
- update identitas RPS
- tambah CPL, CPMK, Sub-CPMK, pertemuan, dan pustaka
- workflow dasar: submit RMK, approve/reject RMK, approve/reject Kaprodi
- riwayat approval

## Catatan Porting

Ini sengaja dibuat sebagai plugin terpisah dengan class `Prodi_RPS_*` agar tidak bentrok dengan class existing `Prodi_DB` dan `Prodi_Frontend` dari plugin `Prodi Poltrada`.
