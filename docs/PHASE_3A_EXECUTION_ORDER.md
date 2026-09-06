# 🚀 PHASE 3A EXECUTION ORDER — MULTI-PRODI IMPLEMENTATION

**Status:** ACCEPTED WITH GUARDRAILS
**Date:** 2026-05-04
**Governance Status:** PASS defined runtime concurrency validation

---

## 🎯 OBJECTIVE

Implement multi-prodi support for Politeknik Transportasi Darat Bali (MTJ, TO, MLog) dengan Smartcampus integration dan RPS reload feature, **tanpa mengubah governance concurrency logic yang sudah lolos validasi**.

---

## 📋 EXECUTION ORDER (WAJIB DIIKUTI BERURUTAN)

### 0. Branch & Safety

```bash
git checkout -b feature/phase-3a-multiprodi
# Backup DB sebelum migration
mysqldump -uwordpress -p wordpress > backup_before_phase3a.sql
```

---

### 1. Migration — Tabel Profil User

Buat tabel baru **tanpa FK hard constraint**:

```sql
CREATE TABLE IF NOT EXISTS wp_prodi_user_profile (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  institution_code VARCHAR(50) DEFAULT 'POLTRADA_BALI',
  prodi_code VARCHAR(10) NOT NULL,  -- MTJ, TO, MLOG
  academic_role VARCHAR(50),
  smartcampus_id VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- NO FOREIGN KEY to wp_users - application layer relation
  UNIQUE KEY user_id (user_id),
  KEY prodi_code (prodi_code),
  KEY smartcampus_id (smartcampus_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Constraint:** Jangan mengubah struktur `wp_users`.

---

### 2. Migration — Tambah prodi_code pada Domain Data

```sql
-- Tambah kolom prodi_code
ALTER TABLE wp_prodi_kurikulum ADD COLUMN prodi_code VARCHAR(10);
ALTER TABLE wp_prodi_rps ADD COLUMN prodi_code VARCHAR(10);

-- Optional performance optimization
CREATE INDEX idx_rps_prodi ON wp_prodi_rps(prodi_code);
CREATE INDEX idx_kurikulum_prodi ON wp_prodi_kurikulum(prodi_code);
```

**Constraints:**
- ❌ Dilarang mengubah `wp_users`
- ❌ Dilarang mengubah struktur audit log

---

### 3. Backfill Data (WAJIB)

Isi `prodi_code` untuk data yang sudah ada:

```sql
-- Mapping awal (sesuaikan dengan real data)
UPDATE wp_prodi_rps SET prodi_code = 'MTJ' WHERE prodi_code IS NULL;
UPDATE wp_prodi_kurikulum SET prodi_code = 'MTJ' WHERE prodi_code IS NULL;

-- Isi profil user untuk existing users
INSERT INTO wp_prodi_user_profile (user_id, prodi_code, academic_role)
VALUES
  (2, 'MTJ', 'dosen'),
  (3, 'MTJ', 'rmk'),
  (4, 'MTJ', 'kaprodi')
ON DUPLICATE KEY UPDATE
  prodi_code = VALUES(prodi_code),
  academic_role = VALUES(academic_role);
```

---

### 4. Service Layer — Prodi Filter (ACCESS CONTROL)

Tambahkan guard di layer akses (misalnya `can_access_rps()`), **TANPA menyentuh concurrency logic**:

```php
// Pseudo-code
function can_access_rps(array $rps, array $actor): bool {
    // EXISTING governance logic (JANGAN DIUBAH)
    if ($actor['role'] === self::ROLE_ADMIN) {
        return true;
    }

    // NEW: Prodi filter
    $actorProdi = get_user_prodi_code($actor['id']); // dari wp_prodi_user_profile
    $rpsProdi   = $rps['prodi_code'] ?? null;

    if ($actorProdi !== $rpsProdi) {
        return false; // Cross-prodi access denied
    }

    // LANJUT ke existing role-based checks
    // ... (existing governance logic)
}
```

**Constraints:**
- ❌ Jangan ubah state machine
- ❌ Jangan ubah lock_version mechanism
- ❌ Jangan ubah audit logic

---

### 5. Query Layer — Scope Prodi

Semua list/query RPS wajib pakai filter:

```php
// Untuk non-admin users
WHERE r.prodi_code = :actor_prodi

// Admin boleh bypass filter
```

---

### 6. UI Layer — Scope & Guard

**Requirements:**
- Filter dropdown/list berdasarkan `prodi_code`
- Sembunyikan RPS lintas prodi dari non-admin users
- Tampilkan badge prodi (MTJ/TO/MLog)
- Read-only guard mengikuti `workflow_status` (existing)
- Tampilkan nama prodi lengkap pada detail view

---

### 7. Fitur "Reload RPS Lama" (Copy-as-New-Draft)

Implement endpoint/service:

```php
function reload_rps_as_draft(int $old_rps_id, string $new_year, string $new_semester): array
{
    $old = get_rps($old_rps_id);

    $new = [
        'source_rps_id'   => $old_rps_id,
        'workflow_status'=> 'draft',
        'lock_version'    => 0,
        'academic_year'   => $new_year,
        'semester'        => $new_semester,
        'prodi_code'      => $old['prodi_code'],
        // ... copy other fields dari $old
    ];

    return save_rps($new);
}
```

**❌ JANGAN mengedit RPS yang sudah approved!**

---

### 8. Audit Log — Tetap (JOIN Saat Laporan)

Audit log **tidak perlu kolom prodi_code**. Gunakan JOIN:

```sql
SELECT
  al.*,
  r.prodi_code
FROM wp_prodi_rps_approval_log al
JOIN wp_prodi_rps r ON al.rps_id = r.id;
```

---

### 9. Targeted Regression Tests (WAJIB)

#### Test 1 — Same-Prodi Access
```
Actor: dosen_mtj (prodi=MTJ)
RPS: MTJ
Expected: ALLOW (HTTP 200)
```

#### Test 2 — Cross-Prodi Access
```
Actor: dosen_mtj (prodi=MTJ)
RPS: TO
Expected: DENY (HTTP 403)
```

#### Test 3 — Admin Access
```
Actor: admin_poltrada
RPS: ANY (MTJ/TO/MLOG)
Expected: ALLOW
```

#### Test 4 — K6 Smoke Concurrency
```
Scenario: Submit oleh dosen_mtj ke RPS MTJ
Load: 10 concurrent requests
Expected:
  - 1× HTTP 200
  - 9× HTTP 403/409
  - No HTTP 500
  - Δlock_version = +1
  - Δaudit_log = +1
Purpose: Governance path tidak rusak
```

---

### 10. Acceptance Criteria (Gate Phase 3A)

- ✅ Tidak ada perubahan pada governance concurrency path
- ✅ Semua T1–T4 regression tests PASS
- ✅ Tidak ada HTTP 500
- ✅ Audit log tetap single-write
- ✅ lock_version tetap +1 per successful transition
- ✅ Cross-prodi access blocked
- ✅ Admin access allowed to all prodi

---

### 11. Larangan (Hard Guardrails)

❌ **DILARANG:**
- Ubah state machine governance
- Ubah SELECT FOR UPDATE / optimistic locking
- Ubah struktur audit log
- Tambah kolom di wp_users
- Edit langsung RPS approved
- Menghapus atau menonaktifkan lock_version checks

---

### 12. Deliverables Developer

**Wajib:**
- [ ] PR/branch `feature/phase-3a-multiprodi`
- [ ] Migration SQL + rollback script
- [ ] Diff service layer (access control changes only)
- [ ] UI changes (scope prodi)
- [ ] Test report (T1–T4 manual tests)
- [ ] K6 smoke test logs
- [ ] Screenshot/UI demo

---

## 🎯 STATUS TARGET

```
Governance: PASS (existing - tidak berubah)
Phase 3 UI: UNLOCKED
Phase 3A: IMPLEMENTATION IN PROGRESS
Retest: TARGETED REGRESSION REQUIRED
Institution: Politeknik Transportasi Darat Bali
Programs: MTJ, TO, MLog
```

---

## 📝 RINGKASAN PERUBAHAN

**Tabel Baru:**
- `wp_prodi_user_profile` (profil user terpisah)

**Kolom Baru:**
- `wp_prodi_kurikulum.prodi_code`
- `wp_prodi_rps.prodi_code`

**Service Layer:**
- Prodi filter di access control
- Copy-as-new-draft untuk reload RPS

**UI Layer:**
- Scope berdasarkan prodi
- Badge prodi
- Filter dropdown

**Tidak Berubah:**
- Governance concurrency logic
- State machine
- Lock version mechanism
- Audit log structure

---

## ✅ INSTRUKSI KEPADA DEVELOPER

Eksekusi langkah **1–12** di atas secara berurutan. Jangan lompat langkah. Jika ada kendala atau pertanyaan, diskusikan sebelum mengubah governance logic.

Setelah selesai, kirim:
1. Pull request
2. Test report (T1–T4)
3. K6 smoke test logs
4. Screenshot perubahan UI

**Hasil akan direview untuk memastikan:**
- Governance concurrency path tidak rusak
- Prodi filter berfungsi dengan benar
- Regression tests semua PASS
- Tidak ada perubahan yang tidak perlu pada core governance

---

*Dokumen ini dibuat: 2026-05-04*
*Version: FINAL*
*Status: READY FOR DEVELOPER EXECUTION*
