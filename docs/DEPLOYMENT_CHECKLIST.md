# Production Deployment Checklist — RPS Multi-Prodi WordPress Plugin

**Date:** 2026-05-06  
**Executor:** Developer  
**QC:** Forensic Auditor (review after each checkpoint)  
**Environment:** WordPress production — Politeknik Transportasi Darat Bali  
**Zero-downtime target:** All migrations are additive (no DROP, no column removal)

> ⚠️ **STOP RULE:** Jika ada langkah yang menghasilkan output berbeda dari Expected, STOP.
> Jangan lanjut. Lapor ke QC sebelum melanjutkan.

---

## PRE-DEPLOYMENT (Wajib Sebelum Apapun)

### P1 — Backup Database Production

```bash
# Di server production
mysqldump -u [wp_user] -p [wp_database] \
  > backup_pre_deploy_$(date +%Y%m%d_%H%M%S).sql

# Verifikasi backup tidak kosong
wc -l backup_pre_deploy_*.sql
```

**Expected:** File backup berukuran > 0, wc -l menampilkan jumlah baris yang wajar (bukan 0)  
**QC Checkpoint P1:** Kirim output `wc -l` dan nama file backup.

---

### P2 — Verifikasi WordPress Version & PHP Version

```bash
wp core version --allow-root
php --version
mysql --version
```

**Expected:**
- WordPress ≥ 5.8
- PHP ≥ 7.4
- MySQL ≥ 5.7

**QC Checkpoint P2:** Kirim output ketiga perintah di atas.

---

### P3 — Verifikasi WordPress Prefix dan Database

```bash
# Cek prefix tabel yang digunakan di wp-config.php
grep "table_prefix" /path/to/wp-config.php

# Verifikasi tabel governance sudah ada (dari deployment sebelumnya)
wp db query "SHOW TABLES LIKE 'wp_prodi_%';" --allow-root
```

**Expected:**
- `table_prefix = 'wp_'` (atau prefix aktual di config)
- Tabel `wp_prodi_rps`, `wp_prodi_rps_approval_log` sudah ada

**QC Checkpoint P3:** Kirim output SHOW TABLES.

---

## PHASE A — DATABASE MIGRATIONS

Jalankan migration secara berurutan. Setiap migration harus diverifikasi sebelum lanjut ke berikutnya.

### A1 — Migration: prodi_code column

```bash
wp db query --allow-root < prisma/migrations/20260505082449_add_prodi_code/migration.sql
```

**Verifikasi:**
```bash
wp db query "SHOW COLUMNS FROM wp_prodi_rps LIKE 'prodi_code';" --allow-root
wp db query "SELECT COUNT(*), prodi_code FROM wp_prodi_rps GROUP BY prodi_code;" --allow-root
```

**Expected:**
- Kolom `prodi_code VARCHAR(10)` ada
- Semua record sudah ter-backfill dengan 'MTJ' (atau nilai yang ada)

**QC Checkpoint A1:** Kirim output SHOW COLUMNS dan SELECT COUNT.

---

### A2 — Migration: wp_prodi_user_profile table

```bash
wp db query --allow-root < prisma/migrations/20260505100000_add_user_profile_table/migration.sql
```

**Verifikasi:**
```bash
wp db query "DESCRIBE wp_prodi_user_profile;" --allow-root
wp db query "SELECT * FROM wp_prodi_user_profile;" --allow-root
```

**Expected:**
- Tabel `wp_prodi_user_profile` terbentuk dengan kolom: id, user_id, institution_code, prodi_code, academic_role, smartcampus_id, is_active, created_at, updated_at
- Seed data: 3 baris untuk user_id 2/3/4

> ⚠️ **PENTING:** Seed ini menggunakan user_id 2/3/4 dari lingkungan Docker development.
> Di production, user_id akan berbeda. Lihat Phase B (User Profile Seed) untuk data production.

**QC Checkpoint A2:** Kirim output DESCRIBE dan SELECT *.

---

### A3 — Migration: wp_prodi_smartcampus_sync table

```bash
wp db query --allow-root < prisma/migrations/20260506080000_add_smartcampus_sync_table/migration.sql
```

**Verifikasi:**
```bash
wp db query "DESCRIBE wp_prodi_smartcampus_sync;" --allow-root
wp db query "SELECT COUNT(*) FROM wp_prodi_smartcampus_sync;" --allow-root
```

**Expected:**
- Tabel terbentuk dengan kolom: id, nidn, nama_lengkap, email, prodi_code, status_aktif, wp_user_id, sync_source, last_synced, raw_data
- COUNT bisa 0 atau 3 (tergantung apakah seed test user ada di production)

**QC Checkpoint A3:** Kirim output DESCRIBE dan COUNT.

---

### A4 — Migration: versioning fields (version_number, is_current)

```bash
wp db query --allow-root < prisma/migrations/20260506090000_add_rps_versioning_fields/migration.sql
```

**Verifikasi:**
```bash
wp db query "SHOW COLUMNS FROM wp_prodi_rps LIKE 'version_number';" --allow-root
wp db query "SHOW COLUMNS FROM wp_prodi_rps LIKE 'is_current';" --allow-root
wp db query "SELECT COUNT(*) as total, SUM(is_current) as current_count FROM wp_prodi_rps;" --allow-root
```

**Expected:**
- Kedua kolom ada
- `current_count` = `total` (semua record existing adalah is_current=1)

**QC Checkpoint A4:** Kirim output ketiga query di atas.

---

## PHASE B — USER PROFILE SEED (DATA PRODUCTION)

> ⚠️ Ini adalah langkah KRITIS. Data test (user_id 2/3/4) TIDAK valid di production.
> Developer WAJIB menyediakan data dosen nyata.

### B1 — Ambil user_id aktual dari wp_users

```bash
wp db query "
  SELECT ID, user_email, display_name
  FROM wp_users
  WHERE user_email IN (
    'dosen@mtj.local',
    'rmk@mtj.local',
    'kaprodi@mtj.local'
  )
  OR user_login IN ('dosen_mtj', 'rmk_mtj', 'kaprodi_mtj');
" --allow-root
```

**QC Checkpoint B1:** Kirim output query di atas. Dari hasil ini, saya akan generate perintah INSERT yang benar untuk production.

---

### B2 — Insert user profiles production

> **TUNGGU:** QC akan berikan SQL INSERT yang benar setelah menerima output B1.

Template (developer ISI user_id, prodi_code, academic_role sesuai data nyata):

```sql
INSERT INTO wp_prodi_user_profile (user_id, prodi_code, academic_role, institution_code)
VALUES
  ([USER_ID_DOSEN],   '[PRODI]', 'dosen',             'POLTRADA_BALI'),
  ([USER_ID_RMK],     '[PRODI]', 'koordinator_rmk',   'POLTRADA_BALI'),
  ([USER_ID_KAPRODI], '[PRODI]', 'kaprodi',            'POLTRADA_BALI')
ON DUPLICATE KEY UPDATE
  prodi_code    = VALUES(prodi_code),
  academic_role = VALUES(academic_role),
  is_active     = 1;
```

**Verifikasi setelah insert:**
```bash
wp db query "
  SELECT p.user_id, u.user_email, p.prodi_code, p.academic_role, p.is_active
  FROM wp_prodi_user_profile p
  JOIN wp_users u ON u.ID = p.user_id
  ORDER BY p.prodi_code, p.academic_role;
" --allow-root
```

**QC Checkpoint B2:** Kirim output verifikasi di atas.

---

## PHASE C — PLUGIN DEPLOYMENT

### C1 — Upload plugin files

```bash
# Di server production (dari root repo)
cp -r php-integration/wordpress-plugin/prodi-poltrada-rps \
      /path/to/wordpress/wp-content/plugins/

# Verifikasi semua class files ada
ls /path/to/wordpress/wp-content/plugins/prodi-poltrada-rps/includes/
```

**Expected — semua 9 file ini harus ada:**
```
class-dashboard-filter.php
class-db.php
class-exceptions.php
class-frontend.php
class-governance.php
class-prodi-scope-filter.php
class-rps-copy.php
class-smartcampus-sync.php
class-version-history.php
```

**QC Checkpoint C1:** Kirim output `ls includes/`.

---

### C2 — Aktifkan plugin

```bash
wp plugin activate prodi-poltrada-rps --allow-root
wp plugin status prodi-poltrada-rps --allow-root
```

**Expected:**
```
Plugin 'prodi-poltrada-rps' activated.
Status: Active
```

**QC Checkpoint C2:** Kirim output kedua perintah di atas.

---

### C3 — Verifikasi tidak ada PHP fatal error

```bash
# Cek error log WordPress
tail -50 /path/to/wordpress/wp-content/debug.log 2>/dev/null || echo "No debug.log"

# Cek error log PHP/Apache
tail -50 /var/log/apache2/error.log 2>/dev/null \
  || tail -50 /var/log/nginx/error.log 2>/dev/null \
  || echo "No error log found"
```

**Expected:** Tidak ada `Fatal error`, `Parse error`, atau `Class not found` yang berhubungan dengan `prodi-poltrada-rps`.

**QC Checkpoint C3:** Kirim output error log (atau "No debug.log" jika kosong).

---

## PHASE D — SMOKE TEST

### D1 — Test T1: Same-prodi access

Gunakan akun dosen (prodi=MTJ) dan akses RPS prodi MTJ.

```bash
# Via WP-CLI (ganti dengan user_id dosen production)
wp eval "
  \$result = Prodi_Scope_Filter::validate_rps_access(1, [USER_ID_DOSEN_MTJ]);
  echo 'T1 result: ' . (\$result ? 'ALLOW' : 'DENY') . PHP_EOL;
" --allow-root
```

**Expected:** `T1 result: ALLOW`

**QC Checkpoint D1:** Kirim output.

---

### D2 — Test T2: Cross-prodi blocked

```bash
# Cari RPS milik prodi BERBEDA dari dosen test
wp db query "
  SELECT id, prodi_code FROM wp_prodi_rps
  WHERE prodi_code != '[PRODI_DOSEN_TEST]'
  LIMIT 1;
" --allow-root

# Ganti [RPS_ID_OTHER_PRODI] dengan hasil di atas
wp eval "
  \$result = Prodi_Scope_Filter::validate_rps_access([RPS_ID_OTHER_PRODI], [USER_ID_DOSEN_MTJ]);
  echo 'T2 result: ' . (\$result ? 'ALLOW (FAIL!)' : 'DENY (PASS)') . PHP_EOL;
" --allow-root
```

**Expected:** `T2 result: DENY (PASS)`

> ⚠️ Jika output `ALLOW (FAIL!)` → STOP. Ini berarti prodi filter tidak berfungsi di production. Lapor QC.

**QC Checkpoint D2:** Kirim output kedua command.

---

### D3 — Test T3: Admin bypass

```bash
# user_id=1 biasanya admin di WordPress
wp eval "
  \$result = Prodi_Scope_Filter::validate_rps_access(1, 1);
  echo 'T3 result: ' . (\$result ? 'ALLOW' : 'DENY') . PHP_EOL;
" --allow-root
```

**Expected:** `T3 result: ALLOW`

**QC Checkpoint D3:** Kirim output.

---

## PHASE E — POST-DEPLOYMENT VERIFICATION

### E1 — Verifikasi semua tabel production

```bash
wp db query "
  SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME LIKE 'wp_prodi_%'
  ORDER BY TABLE_NAME;
" --allow-root
```

**Expected — minimal 8 tabel ini harus ada:**
```
wp_prodi_rps
wp_prodi_rps_approval_log
wp_prodi_rps_cpl
wp_prodi_rps_cpmk
wp_prodi_rps_pertemuan
wp_prodi_rps_pustaka
wp_prodi_smartcampus_sync
wp_prodi_user_profile
```

**QC Checkpoint E1:** Kirim output query.

---

### E2 — Final state snapshot

```bash
wp db query "
  SELECT
    (SELECT COUNT(*) FROM wp_prodi_rps)              AS total_rps,
    (SELECT COUNT(*) FROM wp_prodi_rps_approval_log) AS total_audit_log,
    (SELECT COUNT(*) FROM wp_prodi_user_profile)     AS total_profiles,
    (SELECT COUNT(*) FROM wp_prodi_smartcampus_sync) AS total_sync_records,
    (SELECT MAX(lock_version) FROM wp_prodi_rps)     AS max_lock_version;
" --allow-root
```

**QC Checkpoint E2:** Kirim output. Ini menjadi baseline state production.

---

## ROLLBACK PROCEDURE

Jika deployment gagal di titik manapun:

```bash
# Restore backup
mysql -u [wp_user] -p [wp_database] < backup_pre_deploy_YYYYMMDD_HHMMSS.sql

# Deaktifkan plugin
wp plugin deactivate prodi-poltrada-rps --allow-root

# Verifikasi restore berhasil
wp db query "SHOW TABLES LIKE 'wp_prodi_user_profile';" --allow-root
# Expected: kosong (tabel tidak ada) = rollback berhasil
```

---

## REPORTING FORMAT

Untuk setiap QC Checkpoint, kirim dalam format:

```
[CHECKPOINT X] STATUS: PASS / FAIL / BLOCKER

Output:
<paste output di sini>

Catatan (jika ada):
<catatan tambahan>
```

---

## QC SIGN-OFF GATES

| Gate | Checkpoint | Status |
|------|-----------|--------|
| Pre-deploy backup | P1, P2, P3 | ⏳ Pending |
| Migrations complete | A1, A2, A3, A4 | ⏳ Pending |
| User profiles seeded | B1, B2 | ⏳ Pending |
| Plugin active | C1, C2, C3 | ⏳ Pending |
| Smoke test T1/T2/T3 | D1, D2, D3 | ⏳ Pending |
| Final verification | E1, E2 | ⏳ Pending |

**Deployment COMPLETE hanya jika semua gate: ✅ PASS**
