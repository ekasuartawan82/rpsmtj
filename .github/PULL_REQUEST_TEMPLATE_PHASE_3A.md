# 🔒 PULL REQUEST TEMPLATE - PHASE 3A MULTI-PRODI

**PR Category:** Feature Implementation
**Related Issue:** Phase 3A - Multi-Prodi Support
**Baseline:** RUN #4 (k6-evidence-run2/)

---

## ⚠️ BEFORE YOU SUBMIT

- [ ] Saya sudah membaca `PHASE_3A_EXECUTION_ORDER.md`
- [ ] Saya sudah membaca `OPERATIONAL_CONTROL_FRAMEWORK.md`
- [ ] Saya mengerti freeze area dan break condition
- [ ] Semua 12 langkah execution order sudah selesai
- [ ] Saya tidak menyentuh governance core files

---

## 📋 EVIDENCE CHECKLIST (WAJIB)

### Test T1 - Same-Prodi Access:
- [ ] Screenshot request actor: dosen_mtj
- [ ] Screenshot response: HTTP 200
- [ ] Evidence: RPS MTJ accessible by dosen MTJ

**Lampiran:** `assets/test_t1_same_prodi.png`

### Test T2 - Cross-Prodi Access:
- [ ] Screenshot request actor: dosen_mtj
- [ ] Screenshot response: HTTP 403
- [ ] Evidence: RPS TO blocked for dosen MTJ

**Lampiran:** `assets/test_t2_cross_prodi_denied.png`

### Test T3 - Admin Access:
- [ ] Screenshot test MTJ
- [ ] Screenshot test TO
- [ ] Screenshot test MLog
- [ ] Evidence: Admin can access all prodi

**Lampiran:** `assets/test_t3_admin_all_prodi.png`

### Test T4 - K6 Smoke Concurrency:
- [ ] K6 output log file (raw JSON)
- [ ] Console output screenshot
- [ ] HTTP status distribution
- [ ] Database state verification
- [ ] Pattern: 1×200, 9×403, Δlock=+1, Δaudit=+1

**Lampiran:** `assets/k6_smoke_log.json`, `assets/k6_console_output.png`

---

## 🔒 FREEZE AREA VERIFICATION

### Governance Files (TIDAK BOLEH BERUBAH):
- [ ] `/governance/` → No changes
- [ ] `RPS_Governance_Service.php` → No changes
- [ ] `/services/locking/*` → No changes
- [ ] `/db/transaction/*` → No changes
- [ ] `/audit/*` → No changes (struktur)

### Jika ada perubahan di atas:
**TULISKAN ALASAN DI BAWAH:**
```
[Penjelasan wajib jika menyentuh governance files]
```

---

## 📝 CHANGES SUMMARY

### Database Schema:
```sql
-- Migration SQL yang dijalankan:
[Attach migration SQL]

-- Rollback SQL:
[Attach rollback SQL]
```

### Files Modified:
- [ ] `wp_prodi_user_profile` (created)
- [ ] `wp_prodi_rps` (prodi_code added)
- [ ] `wp_prodi_kurikulum` (prodi_code added)
- [ ] Service layer (access control filter)
- [ ] Query layer (prodi filter)
- [ ] UI layer (prodi scope)

### Files NOT Modified:
- [ ] `wp_users` (no changes)
- [ ] Audit log structure (no changes)
- [ ] Governance logic (no changes)

---

## 🧪 TESTING RESULTS

### Manual Tests (T1-T3):
| Test | Actor | RPS Prodi | Expected | Actual | Pass? |
|------|-------|-----------|----------|--------|-------|
| T1 | dosen_mtj | MTJ | HTTP 200 | | ☐ |
| T2 | dosen_mtj | TO | HTTP 403 | | ☐ |
| T3 | admin | ALL | HTTP 200 | | ☐ |

### K6 Smoke Test (T4):
```
HTTP 200 count: ___
HTTP 403 count: ___
HTTP 409 count: ___
HTTP 500 count: ___ (must be 0)
Δlock_version: ___
Δaudit_log: ___
Pattern matches RUN #4? ☐ YES ☐ NO
```

---

## 🚨 BREAK CONDITION CHECK

Sebelum submit, pastikan TIDAK ADA:
- [ ] HTTP 200 > 1 (must be exactly 1)
- [ ] audit_log > 1 entry (must be exactly 1)
- [ ] lock_version > 1 (must be exactly +1)
- [ ] HTTP 500 muncul (must be 0)
- [ ] K6 pattern berubah dari RUN #4

**Jika ada di atas → STOP, JANGAN SUBMIT PR**

---

## 📦 DELIVERABLES

### Code:
- [ ] Migration SQL
- [ ] Rollback SQL
- [ ] Source code changes

### Evidence:
- [ ] Screenshot T1
- [ ] Screenshot T2
- [ ] Screenshot T3
- [ ] K6 smoke log
- [ ] K6 console output
- [ ] HTTP status distribution

### Documentation:
- [ ] Database schema changes
- [ ] API changes (jika ada)
- [ ] UI screenshot (jika ada)

---

## 👀 REVIEWER CHECKLIST

### Code Review:
- [ ] Freeze area tidak tersentuh
- [ ] Prodi filter ada di semua query
- [ ] Cross-prodi access blocked
- [ ] Admin bypass working
- [ ] No hardcoded values

### Evidence Review:
- [ ] T1-T3 screenshots attached
- [ ] K6 smoke log attached
- [ ] Pattern matches RUN #4
- [ ] No HTTP 500
- [ ] Δlock_version = +1
- [ ] Δaudit_log = +1

### Consistency Cross-Check (Reviewer — wajib sebelum approve):

- [ ] manual_check.json status consistent dengan K6 HTTP counts?
- [ ] Screenshot T1 menunjukkan HTTP 200 (bukan error)?
- [ ] Screenshot T2 menunjukkan HTTP 403 (bukan 200)?
- [ ] Actor di audit log adalah dosen (bukan admin)?
- [ ] Tidak ada anomali timestamp (bukan masa depan)?

⚠️ Jika ADA inkonsistensi → REJECT. Jangan approve karena CI/CD hijau saja.

### Approval Decision:
☐ **APPROVE** - Semua checklist terpenuhi DAN cross-check konsisten
☐ **REQUEST CHANGES** - Ada yang kurang
☐ **REJECT** - Freeze violation / regression failure / evidence inconsistency

---

## 💬 ADDITIONAL NOTES

```
[Catatan tambahan untuk reviewer]
```

---

## 🔗 LINKS

- **SSOT:** `docs/PHASE_3A_EXECUTION_ORDER.md`
- **Control Framework:** `docs/OPERATIONAL_CONTROL_FRAMEWORK.md`
- **Baseline:** `k6-evidence-run2/`
- **Quick Ref:** `docs/QUICK_REFERENCE_PHASE_3A.md`

---

**⚠️ PR TIDAK AKAN DIREVIEW TANPA:**
1. Semua checklist di atas terisi
2. Semua bukti (evidence) dilampirkan
3. Freeze area verification complete

**🚀 Jika semua lengkap → Submit PR untuk review**

---

*PR Template: 2026-05-04*
*Phase: 3A Multi-Prodi*
*Control Mode: ENFORCED*
