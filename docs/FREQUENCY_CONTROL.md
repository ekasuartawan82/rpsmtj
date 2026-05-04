# 🔄 FREQUENCY CONTROL - DRIFT PREVENTION

**Date:** 2026-05-04
**Purpose:** Mencegah akumulasi error kecil dan perubahan tak terdeteksi
**Mode:** ENFORCED

---

## 📊 TES RITUAL WAJIB

### Setiap PR (Wajib - Tanpa Kompromi):
- [ ] Test T1: Same-prodi access (manual)
- [ ] Test T2: Cross-prodi access (manual)
- [ ] Test T3: Admin access (manual)
- [ ] Screenshot semua hasil
- [ ] Attach di PR description

### Setiap 3 PR (Periodik - Wajib):
- [ ] Test T4: K6 smoke test otomatis
- [ ] Run: `./scripts/check_k6_smoke.sh baseline/run4/submit-concurrency-result.json`
- [ ] Verify output: **PASS**
- [ ] Attach log di PR

### Setiap Release (Opsional - Disarankan):
- [ ] Full K6 suite: submit, approve_rmk, approve_kaprodi
- [ ] Verify semua scenario
- [ ] Verify pattern: 1×200, 9×403
- [ ] Create evidence package

---

## 🎯 TUJUAN FREQUENCY CONTROL

### Mencegah:
1. **Akumulasi Error Kecil**
   - 1 PR mungkin "ok" tapi 5 PR = drift
   - K6 smoke setiap 3 PR menangkap ini

2. **Perubahan Tak Terdeteksi**
   - Manual test T1-T3 setiap PR
   - K6 smoke setiap 3 PR
   - Full suite setiap release
   - Semua berlapis

3. **Baseline Drift**
   - Pattern harus selalu sama dengan RUN #4
   - Script `check_k6_smoke.sh` memastikan ini
   - Otomatis, bukan subjektif

---

## 📋 CHECKLIST REVIEWER

### Saat Review PR (Harus Cek):

**Manual Tests:**
- [ ] Ada screenshot T1 (same-prodi)?
- [ ] Ada screenshot T2 (cross-prodi denied)?
- [ ] Ada screenshot T3 (admin)?
- [ ] Semua menunjukkan expected behavior?

**K6 Smoke (Setiap 3 PR):**
- [ ] K6 smoke test dijalankan?
- [ ] Script `check_k6_smoke.sh` mengembalikan PASS?
- [ ] Pattern sama dengan baseline RUN #4?

**Jika TIDAK:**
- ❌ REJECT PR
- ❌ Request evidence tambahan
- ❌ Jangan approve tanpa bukti

---

## 🚨 CONTOH DRIFT YANG TERDETEKSI

### Scenario: K6 Smoke Setelah 3 PR

**Expected (Baseline RUN #4):**
```
HTTP 200: 1
HTTP 403: 9
Pattern: PASS
```

**Actual Setelah 3 PR:**
```
HTTP 200: 2  ← DRIFT TERDETEKSI!
HTTP 403: 8
Pattern: FAIL
```

**Action:**
1. **STOP** semua PR berikutnya
2. **INVESTIGATE** perubahan di 3 PR terakhir
3. **REVERT** jika perlu
4. **FIX** root cause
5. **RETEST** semua 3 PR

---

## ⚠️ TINDAKAN YANG DILARANG

### ❌ JANGAN:
- Skip test T1-T4 karena "deadline"
- Test manual saja tanpa screenshot
- K6 smoke "nanti saja" setelah 10 PR
- "Trust me bro" tanpa evidence
- Luluskan PR tanpa bukti lengkap

### ✅ GUNAKAN:
- Test ritual wajib setiap PR
- Screenshot semua hasil
- K6 smoke setiap 3 PR
- Script validation otomatis
- Evidence-based approval

---

## 📊 FREQUENCY MATRIX

| Frequency | Test | Evidence | Automated? |
|-----------|-------|----------|-------------|
| **Per PR** | T1, T2, T3 (Manual) | Screenshot | ❌ Manual |
| **3 PR** | T4 (K6 Smoke) | Log JSON | ✅ Script |
| **Release** | Full Suite | Evidence Package | ✅ Script |

---

## 🔧 AUTOMATION SCRIPTS

### 1. K6 Smoke Pattern Check:
```bash
./scripts/check_k6_smoke.sh <k6-output.json>
```

**Validates:**
- HTTP 200 count = 1
- HTTP 403/409 count = 9
- HTTP 500 count = 0
- Total requests = 10

**Exit Code:**
- 0 = PASS (pattern sama dengan baseline)
- 1 = FAIL (pattern berbeda)

### 2. Prodi Scope Check:
```bash
./scripts/check_prodi_scope.sh
```

**Validates:**
- `wp_prodi_user_profile` table exists
- `prodi_code` columns exist
- User profiles populated
- Prodi distribution OK

---

## 📋 WORKFLOW INTEGRATION

### Saat Developer Submit PR:

1. Run tests T1-T3 manual
2. Take screenshots
3. (Setiap 3 PR) Run K6 smoke
4. Run validation script
5. Fill PR template
6. Attach all evidence
7. Submit PR

### Saat Reviewer Review PR:

1. Check PR template filled
2. Verify screenshots attached
3. (Setiap 3 PR) Check K6 smoke log
4. Verify validation script PASS
5. Approve/Reject based on evidence

---

## 🎯 SUCCESS CRITERIA

### Short Term (Per PR):
- All T1-T3 manual tests PASS
- Screenshot evidence attached
- No regression from baseline

### Medium Term (3 PR):
- K6 smoke test PASS
- Pattern matches RUN #4
- No drift detected

### Long Term (Release):
- Full K6 suite PASS
- All scenarios validated
- Governance intact

---

## 🚨 EMERGENCY PROCEDURE

### Jika Drift Terdeteksi:

1. **STOP** semua PR berikutnya
2. **IDENTIFY** titik drift (PR keberapa?)
3. **REVERT** PR yang bermasalah
4. **INVESTIGATE** root cause
5. **FIX** dengan benar
6. **RETEST** semua
7. **LANJUT** hanya jika 100% fixed

---

## 🟢 KESIMPULAN

**Purpose:**
- Mencegah akumulasi error kecil
- Menangkap drift sedini mungkin
- Menjaga baseline tetap intact

**Method:**
- Test ritual wajib (per PR, 3 PR, release)
- Automation script untuk validasi
- Evidence-based approval
- Zero tolerance untuk skip

**Result:**
- Governance baseline terjaga
- Regression terdeteksi sejak awal
- Perubahan terkontrol

---

## 📞 INSTRUKSI KE DEVELOPER

**Setiap PR:**
```bash
# 1. Manual tests T1-T3
# 2. Take screenshots
# 3. (Setiap 3 PR) Run K6 smoke
./scripts/check_k6_smoke.sh k6-output.json
# 4. Fill PR template
# 5. Submit with evidence
```

**Jangan skip langkah manapun!**

---

## 📞 INSTRUKSI KE REVIEWER

**Setiap PR:**
- Cek PR template
- Cek screenshots T1-T3
- (Setiap 3 PR) Cek K6 log
- (Setiap 3 PR) Cek validation script
- Approve hanya jika semua bukti lengkap

**Jangan approve tanpa bukti!**

---

---

## 📊 STABILITY METRICS (Long-Term Validation)

Track via: `./scripts/track_pr_stability.sh <PR_NUMBER> <pass|fail>`

### Success Criteria:

| Period | Target | Red Flag |
|--------|--------|----------|
| Week 1 | 100% evidence compliance | Any PR merges without evidence |
| Week 2–3 | 0 bypasses, 0 exceptions | Any "just this once" request |
| Month 1+ | 10 consecutive passes | Streak reset more than twice |

### Red Flags (Immediate Escalation):

- "Just this once" requests → **REJECT, do not negotiate**
- Deadline pressure waivers → **REJECT, evidence requirement is not deadline-sensitive**
- Reviewer auto-approve patterns → **Rotate reviewer, re-audit last 3 PRs**
- CI/CD bypass attempts → **STOP all PRs, full audit required**

### Reset Behavior:

- Any failed PR → streak resets to 0
- Stability log persists in `.pr_stability_log` (committed to repo)
- Last reset date always visible

---

*Frequency Control: 2026-05-04*
*Purpose: Drift Prevention*
*Mode: ENFORCED*
