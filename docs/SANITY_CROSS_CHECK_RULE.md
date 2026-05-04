# Sanity Cross-Check Rule

**Date:** 2026-05-04
**Purpose:** Automated consistency validation between evidence files
**Mode:** ENFORCED via CI/CD (Gate 4)

---

## What Is Validated Automatically

CI/CD Gate 4 cross-checks consistency between:

| Source A | Source B | Check |
|----------|----------|-------|
| `manual_check.json` T1 status | `k6_summary.json` http_500_count | If T1=PASS, 500s must be 0 |
| `manual_check.json` T2 status | Evidence semantics | T2 must be PASS (denied = test passed) |
| `manual_check.json` http_200 claim | `k6_summary.json` http_200_count | Counts must be consistent |
| `manual_check.json` screenshot refs | Actual files on disk | Referenced files must exist |

## Example Detected Inconsistencies

**Case 1:** manual_check.json says all PASS, k6_summary.json shows http_500_count = 5
→ CI/CD Gate 4: **FAIL** — cannot be simultaneously true

**Case 2:** manual_check.json references `t2_cross_prodi_denied.png` but file is `t2.png`
→ CI/CD Gate 4: **FAIL** — referenced screenshot not found

**Case 3:** manual_check.json T2 status = "FAIL"
→ CI/CD Gate 4: **FAIL** — T2 (cross-prodi denied) must be PASS for test to pass

## Known CI/CD Limitations (Reviewer Must Still Verify)

| Gap | Why CI/CD Cannot Check |
|-----|------------------------|
| Screenshot content vs claims | CI/CD checks file exists, not what image shows |
| Actor identity correctness | CI/CD checks counts, not who performed action |
| Timestamp plausibility | CI/CD does not validate timestamps |

For these gaps, reviewer must apply visual inspection. See Phase 2D test cases in `PHASE_2D_SPECIFICATION.md`.

## Reviewer Role After Gate 4 Passes

Gate 4 handles structural consistency. Reviewer handles semantic consistency:
- Does screenshot visually match the claim?
- Is the actor in audit log the correct user?
- Are timestamps plausible?

**Gate 4 PASS does not eliminate reviewer responsibility — it narrows it.**
