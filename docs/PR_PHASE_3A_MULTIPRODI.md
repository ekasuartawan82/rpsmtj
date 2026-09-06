# Pull Request: Phase 3A Multi-Prodi Implementation

**Source Branch:** `feature/phase-3a-multiprodi`  
**Target Branch:** `main`  
**Base Commit:** `0c119db`  
**Status:** Ready for Merge (QC Sign-Off & Dry-Run Approved)  

---

## 1. Ringkasan Perubahan (Overview)

Pull request ini mengimplementasikan dukungan multi-prodi (Program Studi Manajemen Transportasi Jalan / MTJ, Teknologi Otomotif / TO, dan Manajemen Logistik / MLog) untuk Politeknik Transportasi Darat Bali (Poltrada Bali) pada aplikasi RPS dan WordPress Plugin (`prodi-poltrada-rps`).

Implementasi ini mencakup:
1. **Pemisahan Ruang Lingkup Program Studi (Option B Usermeta Architecture):** Kolom `prodi_code` pada tabel domain `wp_prodi_rps` dan `wp_prodi_kurikulum`. Pemetaan peran dan program studi disimpan pada `wp_usermeta` (`meta_key = 'rps_prodi_code'`, `'rps_role'`).
2. **Access Control & Defensive Filtering (Fail-Closed):** Penyekatan akses lintas program studi (`Prodi_Scope_Filter::match_prodi`) di service dan UI form layer. Non-admin dibatasi hanya pada prodinya sendiri; Admin Politeknik memiliki hak akses global (*bypass*).
3. **Fitur Reload RPS Lama (Copy-as-Draft):** Dosen dapat menyalin RPS berstatus `approved` menjadi draft baru untuk tahun akademik berikutnya (`Prodi_RPS_Copy::copy_as_draft`) dengan salinan penuh entitas anak (CPL, CPMK, Sub-CPMK, Pertemuan, Pustaka, Korelasi CPL, Pengampu), pelacakan silsilah (`parent_rps_id`), dan penjagaan immutabilitas record sumber.
4. **Validasi Konkurensi & Bukti Runtime Nyata:** Uji regresi T1–T4 dan smoke test beban konkurensi K6 (10 VUs bersamaan) terhadap environment container Docker (`rps_wordpress` & `rps_mysql`).

---

## 2. Bukti & Hasil Verifikasi (Evidence Summary)

Dokumentasi lengkap evidence runtime: [`docs/PHASE_3A_LANGKAH_6_EVIDENCE.md`](docs/PHASE_3A_LANGKAH_6_EVIDENCE.md)

| Pengujian / Parameter | Spesifikasi | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- |
| **Unit Test Suites (PHP 8.2)** | 4 test files | **85 / 85 PASS** (0 failures) | **PASS** |
| - `test-concurrency.php` | Concurrency & authz | 7 / 7 PASS | PASS |
| - `test-validator.php` | OBE rules & warnings | 19 / 19 PASS | PASS |
| - `test-prodi-scope.php` | Prodi scoping & clamping | 36 / 36 PASS | PASS |
| - `test-rps-copy.php` | Copy-as-draft & lineage | 23 / 23 PASS | PASS |
| **T1: Same-Prodi Access** | Dosen MTJ $\to$ RPS 1 (MTJ) | Filter: ALLOWED, DB: ALLOWED | **PASS** |
| **T2: Cross-Prodi Access** | Dosen MTJ $\to$ RPS TO & Dosen TO $\to$ RPS MTJ | Filter: DENIED (403), DB: DENIED (`null`) | **PASS** |
| **T3: Admin Bypass** | Admin $\to$ RPS MTJ & RPS TO | Filter: ALLOWED, DB: ALLOWED | **PASS** |
| **Copy-as-Draft Guard** | Dosen MTJ $\to$ Copy RPS TO | Diblokir: `InvalidArgumentException` (403) | **PASS** |
| **Copy-as-Draft Immutability** | Dosen TO $\to$ Copy RPS TO | Draft baru ID 7 dibuat (`draft`, `lock_version=1`, `parent_rps_id=3`, `is_current=1`). Sumber ID 3 tetap `approved` (`is_current=0`) | **PASS** |
| **T4: K6 Concurrency Smoke** | 10 VUs $\to$ `prodi_rps_submit_to_rmk` | **1× 200, 9× 403, 0× 500** | **PASS** |
| **$\Delta$lock_version** | Optimistic lock increment | 1 $\to$ 2 ($\Delta\text{lock\_version} = +1$) | **PASS** |
| **$\Delta$audit_log** | Single-write audit append | 3 $\to$ 4 ($\Delta\text{audit\_log} = +1$, action: `submit_to_rmk`) | **PASS** |
| **Production Script Dry-Run** | `scripts/deploy-production.sh --dry-run` | Semua tahap A1–E2 idempoten dan lolos | **PASS** |

---

## 3. Kepatuhan Terhadap Guardrail Keras (Hard Guardrails)

- ✅ **Governance Freeze Zone Terjaga Utuh:** `includes/class-governance.php` memiliki **0 diff** (`git diff main..HEAD -- includes/class-governance.php` kosong). State machine, `SELECT ... FOR UPDATE`, dan `lock_version` tidak tersentuh.
- ✅ **Tidak Ada Modifikasi Struktur `wp_users`:** Struktur tabel standar WordPress tidak diubah sama sekali. Metadata prodi dan role disimpan secara terisolasi pada `wp_usermeta`.
- ✅ **Immutabilitas RPS Approved Dijamin:** Record RPS yang telah berstatus `approved` tidak pernah diubah atau diedit statusnya menjadi draft. Penyusunan ulang periode baru selalu membuat record baru melalui alur `copy_as_draft`.
- ✅ **Audit Log Append-Only:** Format dan alur audit log tidak dimodifikasi; setiap transisi workflow dicatat secara transaksional di dalam atomic transaction block.

---

## 4. Rincian Commit pada Branch

- `bdfeead`: test(phase-3a): execute Langkah 6 targeted regression tests and assemble real runtime evidence package
- `94e96d2`: fix(phase-3a): correct rps_korelasi_cpl schema columns, preserve persentase in copy-as-draft, and expand assertions
- `ea45588`: feat(phase-3a): implement Langkah 5 RPS copy-as-draft with lineage tracking, deep copy, and tests
- `eb3e9a6`: fix(phase-3a): close QC findings on Langkah 4 prodi scoping, unify authorization, and expand tests
- `a698d9c`: feat(phase-3a): implement Langkah 3 backfill seed, Langkah 4 prodi scope filter in service/form layer, and fix deploy-production.sh staleness
- `47536ce`: fix(phase-3a): align Phase 3A migration with usermeta architecture (Option B) and improve hygiene
- `a3b2fa8`: feat(phase-3a): add multi-prodi schema migration, rollback, and kurikulum backfill guard
- `c572e32`: fix(core): join kurikulum in rps detail, mpdf temp dir, and lint fixes
- `be57377`: docs(rps-plugin): correct PHP file count to 14 (7 modified + 7 new)
- `fbaf0b5`: docs(rps-plugin): correct PHP file count and test count
- `04f20f0`: chore(phase-3a): add deploy dry-run evidence, PR description, and execution order

---

## 5. Prosedur Verifikasi Pasca-Merge
1. Jalankan `./scripts/deploy-production.sh --dry-run` untuk memastikan kesiapan server.
2. Jalankan migrasi schema `php-integration/wordpress-plugin/prodi-poltrada-rps/sql/01_phase_3a_migration.sql`.
3. Verifikasi kesehatan tabel melalui `./scripts/check_prodi_scope.sh`.
4. Jalankan 4 unit test suites: `php test-concurrency.php && php test-validator.php && php test-prodi-scope.php && php test-rps-copy.php`.
