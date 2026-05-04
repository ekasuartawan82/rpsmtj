# Phase 2D — Realistic Failure Test Specification

**Date:** 2026-05-04
**Purpose:** Validate that CI/CD detects subtle, realistic errors — not just obvious failures
**Mode:** REQUIRED before Phase 3

---

## What CI/CD Checks (Gates 1–5)

| Gate | What Is Checked |
|------|-----------------|
| Gate 1 | Required files present |
| Gate 2 | manual_check.json schema valid, status values = PASS/FAIL |
| Gate 3 | HTTP 200=1, 403=9, 500=0, Δlock=+1, Δaudit=+1 |
| Gate 4 | Cross-check: manual_check.json vs k6_summary.json consistency |
| Gate 5 | No protected files modified |

## What CI/CD Does NOT Check

| Gap | Description |
|-----|-------------|
| Timestamp correctness | CI/CD accepts timestamps even if in future |
| Actor identity | CI/CD does not verify WHO performed action |
| Screenshot content | CI/CD only checks file exists, not what it shows |
| Request order | CI/CD does not verify which request won the race |
| Response body | CI/CD checks HTTP status codes, not response content |

---

## Phase 2D Test Cases

Each test case MUST target an actual CI/CD gap above.

---

### Test 2D-A: Timestamp Corruption

**Target gap:** CI/CD does not validate timestamps

**Setup:**
1. Create valid evidence package (all counts correct: 200=1, 403=9, 500=0)
2. Modify `k6_summary.json` — set timestamps to year 2099
3. Submit PR

**Expected outcome:**
- CI/CD: PASS (Gate 3 passes — counts are correct)
- Reviewer: MUST REJECT (timestamps are impossible)
- If reviewer misses it → System has human gap → escalate

---

### Test 2D-B: Actor Identity Swap

**Target gap:** CI/CD does not verify actor identity

**Setup:**
1. Create valid evidence package
2. Modify `manual_check.json` — set actor_user_id to "admin" instead of "dosen"
3. Submit PR

**Expected outcome:**
- CI/CD: PASS (schema valid, counts correct)
- Reviewer: MUST REJECT (wrong actor — governance should use dosen, not admin)
- If reviewer misses it → System has human gap → document and close

---

### Test 2D-C: Screenshot–JSON Mismatch

**Target gap:** CI/CD does not cross-check screenshot *content* vs manual_check.json claims

**Setup:**
1. Create valid k6_summary.json and manual_check.json
2. In manual_check.json: set T2 cross_prodi status = "PASS"
3. But use a screenshot showing HTTP 200 (cross-prodi should be 403/FAIL)
4. Submit PR

**Expected outcome:**
- Gate 4 (automated cross-check): Should PASS (file exists, counts correct)
- Reviewer: MUST REJECT (screenshot contradicts claim)
- This is the hardest gap to automate — document as known limitation

---

## Decision Matrix

| CI/CD Result | Reviewer Result | Meaning | Action |
|---|---|---|---|
| FAIL | — | System is robust | None needed |
| PASS | REJECT | System has gap | Add automation to CI/CD for this gap |
| PASS | PASS | System failed | STOP — fix CI/CD before Phase 3 |

**"PASS + Reviewer REJECT" is NOT acceptable — it is a gap to close.**

---

## Execution Order

```bash
# Run Phase 2D after Phase 2A/B/C pass
# Each sub-test is a separate PR

# Test 2D-A
git checkout -b test/phase-2d-timestamp-corruption
# Manipulate evidence/k6_summary.json timestamps
# Submit PR → verify CI/CD result → reviewer reviews

# Test 2D-B
git checkout -b test/phase-2d-actor-swap
# Manipulate evidence/manual_check.json actor field
# Submit PR → verify CI/CD result → reviewer reviews

# Test 2D-C
git checkout -b test/phase-2d-screenshot-mismatch
# Replace t2_cross_prodi_denied.png with HTTP 200 screenshot
# Submit PR → verify CI/CD result → reviewer reviews
```

---

## Gate Before Phase 3

Phase 3 MUST NOT start if ANY Phase 2D test results in:
- CI/CD PASS + Reviewer PASS

If that happens: fix CI/CD gap first, re-run that 2D test, then proceed.
