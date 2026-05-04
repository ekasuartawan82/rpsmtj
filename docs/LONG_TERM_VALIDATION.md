# Long-Term Validation Protocol

**Date:** 2026-05-04
**Purpose:** Prove system stability under real-world conditions over time
**Tool:** `scripts/track_pr_stability.sh`

---

## Why Short-Term Proof Is Not Enough

PR #1 passes + PR #2A/B/C/D rejected = Controls work today.

Not proven:
- Week 3, end of day, deadline pressure
- PR #8 where reviewer is fatigued
- "Just this once" request from someone senior
- CI/CD bypass attempt disguised as emergency

Long-term validation closes this gap.

---

## Stability Tracking

Track every PR result:
```bash
./scripts/track_pr_stability.sh <PR_NUMBER> <pass|fail>
```

Results logged to `.pr_stability_log` (committed to repo, visible to all).

---

## Success Criteria by Period

### Week 1
- 100% evidence compliance (every PR has complete evidence package)
- Zero bypasses (no PR merges without CI/CD green)
- Zero "just this once" exceptions granted

### Weeks 2–3
- 10 consecutive PRs passing CI/CD
- Zero streak resets due to evidence failure
- Zero compromises on review standards

### Month 1+
- Streak of 10 maintained or exceeded
- No degradation under deadline pressure
- No reviewer auto-approve patterns detected

**THEN: System is considered truly stable.**

---

## Red Flag Patterns

Escalate to project lead immediately if detected:

| Pattern | Signal | Response |
|---------|--------|----------|
| "Just this once" request | Standards negotiation under pressure | REJECT, document, escalate |
| Deadline pressure waivers | Time pressure overriding controls | REJECT — evidence is not optional |
| Reviewer auto-approve | Fatigue-driven bypass | Rotate reviewer, audit last 3 PRs |
| CI/CD bypass attempt | Emergency framing to skip gates | STOP all PRs, full audit |
| Evidence completeness declining | Screenshots degrading in quality | Reinforce standard, add checklist |

---

## Reset Behavior

When a PR fails:
- Streak resets to 0
- Reset event recorded in `.pr_stability_log`
- Rollback rule activates (see `SLICE_ROLLBACK_RULE.md`)
- Recovery must achieve new streak of 10 before stability is re-declared

---

## Dashboard Reference

Run at any time:
```bash
./scripts/track_pr_stability.sh <last-PR-number> pass
```

Output shows current streak, total PRs, and failure count.

---

## Important Distinction

Long-term validation is not about the code being correct.
It is about the **process being maintained** when it is hardest to maintain.

A system that works perfectly for 2 PRs and degrades on PR #8 is not stable.
A system that holds standards on PR #50 under deadline pressure is stable.
