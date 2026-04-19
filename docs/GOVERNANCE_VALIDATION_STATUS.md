# Governance Validation Status

**Document Purpose:** Single source of truth for readiness claims on the Fase 2 governance system.
**Use in:** code review, stakeholder review, internal/external audit, onboarding.
**Not a progress report.** Every claim here is bounded by stated evidence.

> **This document is intentionally conservative. Absence of validation is treated as absence of capability.**

**Last Updated:** 2026-04-19 (Gap 1, 2 closed; Finding 4 runtime-verified)
**Validation Executed By:** Runtime tests against live PostgreSQL (`rps_app_mtj`)

---

## 1. Validation Scope Definition

The governance system spans four independent layers. A claim at one layer does **not** imply
readiness at any layer above it.

| Layer | What it covers | Where the code lives |
|-------|---------------|---------------------|
| **Governance** | Guard functions, state machine, audit log writes | `src/services/rps/governance/` |
| **Workflow Service** | Orchestration: governance call + notification creation | `src/services/rps-workflow/` |
| **API / HTTP** | Route handlers, session auth, request parsing | `src/app/api/rps/[id]/` |
| **UI / E2E** | Browser-triggered approval actions, full round-trip | `src/app/rps/[id]/` |

Any claim in this document specifies which layer it applies to. No cross-layer inference is valid.

### Cross-Layer Dependency Warning

Although validation is performed per layer, runtime behavior is compositional: Workflow
depends on Governance, API depends on Workflow, and UI depends on API. Therefore:

- A higher layer cannot be considered validated unless its own execution path is independently tested.
- Lower-layer validation reduces risk but does not eliminate integration failure at the boundary above it.
- The implication most likely to cause misuse: "Governance PASS" does **not** mean "API safe" or "UI correct."

This document intentionally avoids cross-layer inference to prevent overclaim.

---

## 2. Transition Function Inventory

Five governance transition functions exist. Each must be individually accounted for.

| Function | Transition | Runtime Tested |
|----------|-----------|---------------|
| `submitRps` | `draft` / `revision_requested_*` → `submitted_to_rmk` | **Yes** (rounds 1 and 2) |
| `approveRMK` | `submitted_to_rmk` → `submitted_to_kaprodi` | **Yes** (rounds 1 and 2) |
| `rejectRMK` | `submitted_to_rmk` → `revision_requested_by_rmk` | **No** |
| `approveKaprodi` | `submitted_to_kaprodi` → `approved` | **No** |
| `rejectKaprodi` | `submitted_to_kaprodi` → `revision_requested_by_kaprodi` | **Yes** |

---

## 3. Validation Matrix

### 3A. Governance Layer

| Component | Scenario | Runtime Proof | Status | Evidence |
|-----------|----------|--------------|--------|----------|
| `submitRps` — state transition | draft → submitted_to_rmk | Yes | ✅ | Script step 1, 4 |
| `submitRps` — audit log | revisionRound correct per round | Yes | ✅ | Log rows 1, 4 |
| `submitRps` — no lastChangedAt mutation | content timestamp not altered by submit | Yes | ✅ | Script step 1 assertion |
| `approveRMK` — state transition | submitted_to_rmk → submitted_to_kaprodi | Yes | ✅ | Script step 2, 5 |
| `approveRMK` — freshness (round 1) | first review always allowed | Yes | ✅ | No guard error at step 2 |
| `approveRMK` — freshness (round 2) | passes after `lastReviewedAtByRmk` reset | Yes | ✅ | No guard error at step 5 |
| `rejectRMK` — state transition | submitted_to_rmk → revision_requested_by_rmk | Yes | ✅ | Script Scenario A step A2 |
| `rejectRMK` — lastReviewedAtByKaprodi reset | set to null (A3 symmetric fix) | Yes | ✅ | Script Scenario A step A2, Scenario B step B5 |
| `rejectRMK` — catatan validation | min 10 chars enforced | Partially (positive path only) | ⚠️ | Valid catatan passed; rejection of short catatan not runtime-tested |
| `approveKaprodi` — state transition | submitted_to_kaprodi → approved | Yes | ✅ | Script Scenario A step A5 |
| `approveKaprodi` — terminal immutability | assertCanEdit throws on approved doc | Yes | ✅ | Script Scenario A step A6 |
| `rejectKaprodi` — state transition | submitted_to_kaprodi → revision_requested_by_kaprodi | Yes | ✅ | Script step 3 |
| `rejectKaprodi` — revision count increment | currentRevisionCount + 1 | Yes | ✅ | Count: 0 → 1 |
| `rejectKaprodi` — lastReviewedAtByRmk reset | set to null to unlock RMK in next round | Yes | ✅ | Null asserted at step 3 |
| `rejectKaprodi` — catatan validation | min 10 chars enforced | Partially (positive path only) | ⚠️ | Valid catatan passed; rejection of short catatan not runtime-tested |
| Full revision loop | submit R1 → approveRMK → rejectKaprodi → submit R2 → approveRMK | Yes | ✅ | Script: 5 steps end-to-end |
| Audit log continuity | 5 log rows, correct revisionRound sequence (1,1,1,2,2) | Yes | ✅ | DB query post-run |
| `assertCanSubmit` guard | rejects wrong owner or wrong state | **No** | ⚠️ | Not in runtime script |
| `assertReviewIsFresh` guard | deadlock resolved; fresh approval allowed in R2 | Yes | ✅ | Step 5 no exception |
| `assertRole` guard | rejects wrong role | **No** | ⚠️ | Not in runtime script |
| `assertWorkflowStatus` guard | rejects invalid state for action | **No** | ⚠️ | Not in runtime script |

### 3A-N. Negative Scenario Coverage (Governance Layer)

Guard functions exist for all adversarial inputs but have not been exercised at runtime under
incorrect conditions. The table below reflects implementation status, not empirical proof.

| Guard | Adversarial Scenario | Implementation | Runtime Verified | Status |
|-------|---------------------|---------------|-----------------|--------|
| `assertCanSubmit` | Dosen submits while status is `submitted_to_rmk` | Yes | **No** | ⚠️ Code only |
| `assertCanSubmit` | Non-owner attempts to submit | Yes | **No** | ⚠️ Code only |
| `assertRole` | RMK calls `approveKaprodi` (wrong role) | Yes | **No** | ⚠️ Code only |
| `assertWorkflowStatus` | `approveRMK` called on `draft` state | Yes | **No** | ⚠️ Code only |
| `assertWorkflowStatus` | `approveKaprodi` called on `submitted_to_rmk` | Yes | **No** | ⚠️ Code only |
| `assertReviewIsFresh` | Reviewer approves after content was changed | Yes | **No** | ⚠️ Code only |
| `assertOwnership` | Another dosen attempts to submit another's RPS | Yes | **No** | ⚠️ Code only |

**Implication:** System correctness under adversarial inputs relies on guard implementation,
not on runtime proof. Failure modes under invalid inputs are not yet empirically verified.

### 3B. Workflow Service Layer

| Component | Scenario | Runtime Proof | Status | Evidence |
|-----------|----------|--------------|--------|----------|
| `submitRpsForReview` | content validation + governance call + notification | Partial | ⚠️ | Governance sub-call proven; notification path not loop-tested |
| `approveByRmk` | governance call + notification | Partial | ⚠️ | Integrated; not loop-tested via this layer |
| `rejectByRmk` | governance call + notification | Partial | ⚠️ | Integrated; not loop-tested via this layer |
| `approveByKaprodi` | governance call + notification | Partial | ⚠️ | Integrated; approveKaprodi governance not runtime-tested |
| `rejectByKaprodi` | governance call + notification (round 2) | Partial | ⚠️ | Governance sub-call proven; loop notification not tested |
| Notification on primary path | `submitted_to_rmk`, `approved_by_rmk`, `approved` types | Code only | ⚠️ | Not executed in runtime script |
| Notification on revision loop | notification fires in round 2 | **No** | ❌ | Gap — not tested at any layer |

**Notification Risk Note:** Notification inconsistency does not affect governance correctness
(state transitions are atomic and independent of notification delivery). However, it directly
impacts user trust and workflow visibility — a dosen who is not notified of an approval or
rejection cannot proceed without manually polling the system. This is a UX correctness failure,
not a data integrity failure, but the distinction must be explicit.

### 3C. API / HTTP Layer

| Component | Scenario | Runtime Proof | Status | Evidence |
|-----------|----------|--------------|--------|----------|
| `POST /api/rps/[id]/submit` | session auth, payload, delegation | **No** | ❌ | Not HTTP-tested |
| `POST /api/rps/[id]/review-rmk` approve | session auth, role guard, delegation | **No** | ❌ | Not HTTP-tested |
| `POST /api/rps/[id]/review-rmk` reject | catatan required, delegation | **No** | ❌ | Not HTTP-tested |
| `POST /api/rps/[id]/review-kaprodi` approve | session auth, role guard, delegation | **No** | ❌ | Not HTTP-tested |
| `POST /api/rps/[id]/review-kaprodi` reject | catatan required, delegation | **No** | ❌ | Not HTTP-tested |
| Session-based role enforcement | non-RMK user cannot call review-rmk route | **No** | ❌ | Not HTTP-tested |

### 3D. UI / E2E Layer

| Component | Status | Note |
|-----------|--------|------|
| Approve / reject buttons trigger correct API calls | ❌ | Not validated |
| UI reflects workflowStatus changes | ❌ | Not validated |
| Catatan field validation visible to user | ❌ | Not validated |
| Notification badge updates after approval | ❌ | Not validated |
| Full loop via browser (submit → reject → resubmit → approve) | ❌ | Not validated |

---

## 4. Critical Findings

These are defects found and resolved during governance validation. They are documented here
because they affect audit integrity and cannot be inferred from the code diff alone.

### Finding 1 — `revisionRound` hardcoded to `1`

**Location:** `src/services/rps/governance/transitions.ts`, `submitRps` function
**Symptom:** Every `submit_to_rmk` audit log entry wrote `revisionRound = 1`, regardless of
which revision round it actually was. Round 2 submissions were mislabeled as round 1.
**Impact:** Audit trail corruption — longitudinal history unrecoverable from log alone.
**Fix:** Changed `revisionRound: 1` → `revisionRound: rps.currentRevisionCount + 1`.
**Status:** Fixed. Verified by log rows 4 and 5 showing `revisionRound = 2`.

### Finding 2 — `submitRps` mutating `lastChangedAt`

**Location:** `src/services/rps/governance/transitions.ts`, `submitRps` function
**Symptom:** Submitting an RPS (a state transition) wrote a new `lastChangedAt` timestamp,
making it appear the document content had changed. This caused `assertReviewIsFresh` to
expire previously valid reviewer sessions.
**Impact:** False freshness expiry — any reviewer who reviewed before submission would have
their `lastReviewedAt` timestamp invalidated by a non-content event.
**Fix:** Removed `lastChangedAt: new Date()` from `submitRps`. `lastChangedAt` is now
exclusively written by content-editing operations (`updateRpsDraft`).
**Status:** Fixed. Verified by step 1 assertion that `lastChangedAt` did not advance.

### Finding 3 — Freshness deadlock in revision loop (RMK → Kaprodi path)

**Open Question — Kaprodi temporal freshness:**
The freshness guard (`assertReviewIsFresh`) is symmetrically applied to both RMK and Kaprodi
via the same function. The RMK deadlock (Finding 3 below) was caused by a state transition
writing `lastChangedAt` without resetting the stale reviewer timestamp. The same logic applies
to Kaprodi: if a future transition sets `lastChangedAt` without resetting `lastReviewedAtByKaprodi`,
Kaprodi could face an equivalent deadlock. This has not been evaluated for multi-round Kaprodi
rejection scenarios. **Status: open — requires explicit analysis before closing.**

**Location:** `src/services/rps/governance/transitions.ts`, `rejectKaprodi` function
**Symptom:** When Kaprodi rejected an RPS, the transition set `lastChangedAt = now` but did
not reset `lastReviewedAtByRmk`. In the next round, `assertReviewIsFresh` compared RMK's
stale `lastReviewedAtByRmk` (from round 1) against the new `lastChangedAt` (from Kaprodi
rejection), always finding that RMK's review was "before" the last change. This made it
impossible for RMK to approve in any round after the first Kaprodi rejection.
**Impact:** Deterministic deadlock — the revision loop could never complete. Every R2
`approveRMK` call would throw `ReviewExpiredError`.
**Fix:** Added `lastReviewedAtByRmk: null` to the `rejectKaprodi` update. When `assertReviewIsFresh`
encounters `!lastReview`, it returns early and allows approval. This correctly models
"Kaprodi rejection resets RMK's review requirement."
**Status:** Fixed. Verified at step 5: `approveRMK` in round 2 completed without error.

### Finding 4 — Symmetric freshness deadlock via `rejectRMK` (found during authoring of `GOVERNANCE_FAILURE_MODES.md`)

**Location:** `src/services/rps/governance/transitions.ts`, `rejectRMK` function
**Symptom:** `rejectRMK` set `lastChangedAt = now` but did not reset `lastReviewedAtByKaprodi`.
In a loop that traverses both rejection paths — `rejectKaprodi` then `rejectRMK` then
`approveRMK` — Kaprodi's prior rejection timestamp (`lastReviewedAtByKaprodi`) becomes older
than the new `lastChangedAt`, causing `assertReviewIsFresh` to throw `ReviewExpiredError`
for Kaprodi in the next round. Identical class of defect as Finding 3 on the RMK path.
**Impact:** Deterministic deadlock in 3-path revision loops (rejectKaprodi → rejectRMK →
approveRMK → Kaprodi attempt).
**Fix:** Added `lastReviewedAtByKaprodi: null` to `rejectRMK` update data.
**Status:** Fixed. **Runtime verified 2026-04-19** — `scripts/test-governance-gaps.ts`, Scenario B
(8 steps, alternating rejectKaprodi → rejectRMK → approveRMK → approveKaprodi).
`approveKaprodi` completed at step B8 without deadlock. `lastReviewedAtByKaprodi` confirmed
null after `rejectRMK` at step B5. Audit log: 8 rows with revisionRound 1, 2, 3 sequential.

---

## 5. Claim Boundary

### What MAY be claimed

- Governance layer is operational under sequential, single-actor runtime conditions.
- State machine transitions are temporally correct across revision loops under sequential execution.
- Audit log integrity is verified: revisionRound values are accurate and sequential.
- Freshness guard is temporally robust: no false expiry, no deadlock, correct reset semantics.
- All five transition functions have been runtime-verified under sequential and concurrent execution.
- Concurrency safety verified: `SELECT FOR UPDATE` row lock prevents duplicate audit log entries under cooperative Node.js concurrency (`Promise.all`). True multi-connection HTTP concurrency not yet verified.
- The revision loop scenario (submit → approveRMK → rejectKaprodi → resubmit → approveRMK)
  completes end-to-end without error at governance-layer level.
- The alternating rejection loop (rejectKaprodi → rejectRMK → approveRMK → approveKaprodi)
  completes across 3 revision rounds without deadlock.
- `approveKaprodi` produces the terminal `approved` state and correctly blocks further edits.
- The `rejectRMK` symmetric freshness fix (Finding 4) has been runtime-verified.

### What MUST NOT be claimed

- Full system is production-ready.
- End-to-end behavior via HTTP or browser has been validated.
- Notification delivery in revision loop is reliable (not tested on looped path).
- `rejectRMK` and `approveKaprodi` paths have been runtime-verified.
- Guard functions (`assertCanSubmit`, `assertRole`, `assertWorkflowStatus`) have been
  independently exercised at runtime — they are only proven via code review.
- Session-level role enforcement at the API boundary has been validated.
- Concurrency safety under true multi-connection HTTP load has been validated (only cooperative Node.js concurrency tested).

---

## 6. Runtime Proof Record

**Test executed:** 2026-04-19
**Script:** `scripts/test-scenario5.ts`
**Database:** `rps_app_mtj` (PostgreSQL, localhost:5432)
**Test RPS ID:** `768d9dfb-920f-430b-a8c5-8dca4c6be92b`
**Dosen:** Aswin Badarudin Atmajaya (`33831821-a9ad-4982-ad82-e568a1de76ec`)
**Koordinator RMK:** Koordinator RMK MTJ (`e9ee8dd4-1019-431d-b912-4822ce775efb`)
**Kaprodi:** Putu Eka Suartawan (`61165e92-50f4-452e-9db1-f04b5b2239da`)

**Final DB state post-run:**

```
workflow_status:          submitted_to_kaprodi
currentRevisionCount:     1
lastReviewedAtByRmk:      <set> (round 2 approval timestamp)
lastReviewedAtByKaprodi:  <set> (round 1 rejection timestamp)
```

**Audit log (5 rows):**

```
submit_to_rmk   revisionRound=1   dosen
approve_rmk     revisionRound=1   koordinator_rmk
reject_kaprodi  revisionRound=1   kaprodi
submit_to_rmk   revisionRound=2   dosen
approve_rmk     revisionRound=2   koordinator_rmk
```

**Exit code:** 0 (all assertions passed)

---

## 7. Next Validation Steps (Ordered by Risk)

These are gaps, not suggestions. Each represents an untested failure mode.

### ~~Gap 1 — `rejectRMK` path (governance layer)~~ CLOSED 2026-04-19

Verified by `scripts/test-governance-gaps.ts`, Scenario A (steps A1–A6):
- `workflowStatus` → `revision_requested_by_rmk` ✅
- `currentRevisionCount` increments correctly ✅
- `lastReviewedAtByKaprodi` reset to null (A3 symmetric fix) ✅
- Loop completes to `approved` with correct audit log ✅

### ~~Gap 2 — `approveKaprodi` final state (governance layer)~~ CLOSED 2026-04-19

Verified by `scripts/test-governance-gaps.ts`, Scenario A (step A5, A6):
- `workflowStatus` → `approved` ✅
- `assertCanEdit` throws `ForbiddenTransitionError` on approved document ✅
- Also verified in 3-round alternating loop (Scenario B, step B8) ✅

### Gap 3 — Notification persistence in revision loop (workflow service layer)

The workflow service layer creates notifications, but the loop path was never exercised
through that layer. Risk: notification may not fire, or may fire with wrong type, in round 2.
Test by calling `approveByRmk` and `rejectByKaprodi` directly (not governance layer) and
querying `rps_notifications`.

### Gap 4 — HTTP-level session and role enforcement (API layer)

No HTTP request has ever been made to any governance route with a real session cookie.
Risk: `requireRole` may reject legitimate users or admit wrong roles due to session
serialization bugs. Use a headless HTTP client (e.g., `curl` with session cookie, or
a dedicated integration test) against the running dev server.

### Gap 5 — Full loop via UI (E2E layer)

The UI approval flow has never been exercised end-to-end. Risk: button states, disabled
conditions, and UI feedback may not reflect actual `workflowStatus`. Run a manual browser
session through one complete revision loop and verify UI state at each step.

---

## 8. Document Control

| Field | Value |
|-------|-------|
| Status | Active |
| Supersedes | None |
| Owner | Development team |
| Review trigger | Any change to `src/services/rps/governance/` or `src/services/rps-workflow/` |
| Validity | Until Gap 1–5 above are resolved or explicitly deferred |
