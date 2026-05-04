# Slice Rollback Rule

**Date:** 2026-05-04
**Purpose:** Prevent bug stacking when incremental slices fail
**Mode:** ENFORCED — no exceptions

---

## Trigger Condition

This rule activates when ANY slice PR is rejected or fails CI/CD.

---

## Rollback Procedure

### Step 1 — STOP

Immediately halt all subsequent slice PRs.
Do not submit Slice N+1 while Slice N is in failure state.

### Step 2 — REVERT

| Situation | Revert Target |
|-----------|---------------|
| Slice 1 fails | Baseline (main branch) |
| Slice 2+ fails | Last successful merged slice |

Revert command:
```bash
git revert <failed-commit-sha> --no-edit
git push origin main
```

Authorization: **Project lead must approve revert commit before push.**

### Step 3 — ISOLATE

Identify root cause in isolation. Do not touch other code while investigating.

Isolation checklist:
- [ ] What did the failing slice change?
- [ ] Which test specifically failed (T1/T2/T3/T4)?
- [ ] Is failure in code, migration, or evidence?
- [ ] Can failure be reproduced locally before CI?

### Step 4 — FIX

Fix only the isolated root cause. Do not bundle additional changes.

### Step 5 — RE-RUN T1-T5

Full regression before retry:
```bash
# T1-T3: Manual tests
# T4: K6 smoke
./scripts/check_k6_smoke.sh baseline/run4/submit-concurrency-result.json

# T5: Data integrity (if applicable)
```

All tests must PASS before retry.

### Step 6 — RESUME

Only after T1-T5 all pass:
- Retry the failed slice as new PR
- Subsequent slices remain blocked until retry succeeds

---

## Slice Blocking Diagram

```
Slice 1: PASS ✅
Slice 2: PASS ✅
Slice 3: FAIL ❌
  → STOP. Revert to Slice 2 state.
  → Fix Slice 3 issue.
  → Re-test T1-T5.
  → Retry Slice 3 (new PR)
Slice 4: BLOCKED until Slice 3 retry PASS
Slice 5: BLOCKED until Slice 4 PASS
```

---

## Why This Rule Exists

Without this rule:
- Bug in Slice 3 gets masked by Slice 4 changes
- Debugging scope expands across multiple slices
- Root cause becomes impossible to isolate
- Revert becomes destructive (loses good work from later slices)

With this rule:
- Each failure is always isolated to one slice
- Revert cost is minimal (only one slice lost)
- Root cause is always findable
