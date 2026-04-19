# Governance Failure Modes

**Document Purpose:** Systematic catalogue of how the governance system can fail — not how it works.
**Relation to `GOVERNANCE_VALIDATION_STATUS.md`:** That document asks "what has been proven correct."
This document asks "how can this be proven wrong."
**Use in:** security review, integration testing, adversarial test design, post-incident analysis.

> **Reading instruction:** Each failure mode describes a real code path or real system condition.
> None are hypothetical unless explicitly marked. Hypothetical modes are labelled *(theoretical)*.

---

## Failure Taxonomy

Three causal domains, kept strictly separate. Mixing them corrupts root cause analysis.

| Type | Definition | Where failures live |
|------|-----------|-------------------|
| **A — Governance** | The enforcement layer itself has a gap: a guard missing, a transition incorrect, a rule not applied | `src/services/rps/governance/` |
| **B — Integration** | Governance logic is correct but is invoked incorrectly, bypassed at a layer boundary, or its effects are not propagated | `src/services/rps-workflow/`, `src/app/api/`, session layer |
| **C — Observability** | Failure exists (A or B) but is not detectable: no log, no alert, no audit trail | Cross-cutting: logging, monitoring, DB schema |

**Diagnostic rule:** A failure should be classified at its *root cause* layer, not at where it surfaces.
If an API route passes the wrong data to governance and governance rejects it correctly,
the failure is Type B (invocation), not Type A (enforcement).

---

## Type A — Governance Failures

Failures where the enforcement layer itself is the origin.

---

### A1 — Direct DB Mutation Bypasses Entire Governance Layer

**Status:** Known gap. No mitigation exists in current implementation.

**Trigger:** Any actor with direct database access (Prisma Studio, `psql`, migration script) writes
`workflow_status` directly to the `rps` table.

```sql
UPDATE rps SET workflow_status = 'approved' WHERE id = '...';
```

**Expected:** State transition requires guard validation, creates `rps_approval_log` entry,
sets `lastChangedAt`, sends notifications.

**Actual:** Row updated silently. No log entry. No notification. No guard check.
`currentRevisionCount`, `lastReviewedAt*`, and `versionNo` remain at old values.
The document appears `approved` in the application but the audit trail is broken.

**Impact:** Audit trail gap. Cannot reconstruct who approved, when, or under what conditions.
Any downstream feature that trusts `workflowStatus` (PDF export, UI state) will behave as if
the document is legitimately approved.

**Detection:** Query `rps` for `workflowStatus = 'approved'` without a corresponding `rps_approval_log`
row with `action = 'approve_kaprodi'` for the same `rpsId` and `versionNo`.

```sql
SELECT r.id FROM rps r
LEFT JOIN rps_approval_log l
  ON l.rps_id = r.id AND l.action = 'approve_kaprodi'
WHERE r.workflow_status = 'approved' AND l.id IS NULL;
```

**Mitigation path:** DB-level trigger on `rps.workflow_status` that rejects writes not
originating from the governance service, or row-level security (RLS) in PostgreSQL.
Neither is currently implemented.

---

### A2 — Race Condition on Concurrent Approval

**Status:** Confirmed, then fixed (2026-04-19). Attack proved real; mitigation applied and re-tested.

**Trigger:** Two concurrent HTTP requests both call `approveRMK` for the same RPS at the same
millisecond (e.g., double-click on approve button before UI disables it).

**Sequence:**
```
Request 1: reads rps → workflowStatus='submitted_to_rmk' ✓
Request 2: reads rps → workflowStatus='submitted_to_rmk' ✓  (before R1 commits)
Request 1: UPDATE rps SET workflow_status='submitted_to_kaprodi' → commits
Request 2: UPDATE rps SET workflow_status='submitted_to_kaprodi' → commits (silently succeeds)
Result: two rps_approval_log rows for the same approval event
```

**Expected:** Only one approval log entry per approval event. Second concurrent request
should fail with `ForbiddenTransitionError` (status already advanced).

**Actual:** Prisma `$transaction` does not issue `SELECT FOR UPDATE`. Both reads see the old
state and both writes succeed at the row level (PostgreSQL last-write-wins). Two log entries
created. Final `workflowStatus` is correct (`submitted_to_kaprodi`), but audit log is
duplicated.

**Impact:** Audit trail inflation. Makes longitudinal analysis incorrect. In an `approve →
rejectKaprodi → resubmit` loop, duplicate log entries cause `revisionRound` counts to diverge
from actual rounds.

**Detection:** Query for duplicate `action` within the same `rpsId` + `revisionRound`:

```sql
SELECT rps_id, revision_round, action, COUNT(*)
FROM rps_approval_log
GROUP BY rps_id, revision_round, action
HAVING COUNT(*) > 1;
```

**Fix applied (2026-04-19):** All five transition functions refactored. Pattern:
```typescript
await tx.$queryRaw`SELECT id FROM rps WHERE id = ${rpsId}::uuid FOR UPDATE`;
const rps = await tx.rps.findUnique({ where: { id: rpsId }, include: RPS_INCLUDE });
// guards run here on freshly-locked read
assertWorkflowStatus(rps.workflowStatus, [...]);
```
The `SELECT FOR UPDATE` acquires a PostgreSQL row-level lock at the start of the transaction.
The second concurrent transaction blocks until the first commits. After the first commits and
advances the state, the second reads the updated state, fails the guard (`assertWorkflowStatus`
throws `ForbiddenTransitionError`), and rolls back. One log entry. One state transition.

**Concurrency attack result (before fix):** All three attacks confirmed — 2 successful calls,
2 log entries per action. `scripts/test-concurrency-attack.ts`, run 2026-04-19T04:45:10Z.

**Concurrency attack result (after fix):** All three attacks contained — 1 successful call,
1 failed with `ForbiddenTransitionError`, 1 log entry. Run 2026-04-19T04:46:26Z.

**Remaining caveat:** The concurrency test uses Node.js cooperative concurrency (`Promise.all`),
which interleaves at I/O boundaries but does not simulate true OS-thread-level parallelism
(separate PostgreSQL connections from separate HTTP requests). The `SELECT FOR UPDATE` lock is
correct at the DB level and will hold under any connection model, but this has not been
verified with true multi-connection HTTP load testing.

---

### A3 — Symmetric Freshness Deadlock via `rejectRMK` (FOUND AND FIXED 2026-04-19)

**Status:** Fixed. Documented as finding because the symmetric fix for `rejectKaprodi` was
applied earlier (Finding 3 in `GOVERNANCE_VALIDATION_STATUS.md`) and this is the same
class of defect on the opposite branch.

**Trigger:** Revision loop that traverses both rejection paths:
`rejectKaprodi` (round N) → `rejectRMK` (round N+1) → `approveRMK` (round N+2) → Kaprodi tries to approve.

**Root cause (before fix):**
- `rejectKaprodi` correctly reset `lastReviewedAtByRmk: null`
- But `rejectRMK` did **not** reset `lastReviewedAtByKaprodi`
- `approveRMK` set `lastChangedAt = now`
- `assertReviewIsFresh` for Kaprodi: `lastReviewedAtByKaprodi (round N) < lastChangedAt (round N+2)` → `ReviewExpiredError`

**Reproduction trace (before fix):**
```
R1: submit → approveRMK     → lastChangedAt=T1, lastReviewedAtByRmk=T1
R1: rejectKaprodi           → lastChangedAt=T2, lastReviewedAtByKaprodi=T2, lastReviewedAtByRmk=null
R2: submit → rejectRMK      → lastChangedAt=T3, lastReviewedAtByRmk=T3   ← did NOT reset lastReviewedAtByKaprodi
R3: submit → approveRMK     → lastChangedAt=T4, lastReviewedAtByRmk=T4
R3: approveKaprodi attempt  → assertReviewIsFresh: T2 < T4 → DEADLOCK
```

**Fix applied:**
```typescript
// transitions.ts → rejectRMK data block
lastReviewedAtByKaprodi: null  // reset: Kaprodi must re-review in next round after RMK rejection
```

**Verification needed:** This fix was applied by code analysis, not by runtime test. The
symmetric scenario requires a 7-step test sequence not yet covered by `scripts/test-scenario5.ts`.
See Gap 1 in `GOVERNANCE_VALIDATION_STATUS.md`.

---

### A4 — `assertReviewIsFresh` Cold-Start Bypass on Migrated Documents

**Status:** By-design behaviour. Documented because it is a security trade-off, not just
an implementation detail.

**Trigger:** An RPS document that existed before Fase 2 governance was introduced has
`lastChangedAt = null`. Any reviewer can approve it without having reviewed it since any
specific content state.

**Root cause:** `assertReviewIsFresh` returns early if `!lastReview` (first-ever review).
When `lastChangedAt` is also null, the guard has no timestamp to compare against and
allows approval unconditionally.

**Expected (design intent):** Pre-existing documents should be reviewable without requiring
a baseline review timestamp — bootstrapping is valid.

**Risk:** A reviewer who has never actually read the document can rubber-stamp it by approving
immediately after migration. There is no minimum review time or content-read signal.

**Detection:** No detection is currently possible because there is no audit signal for
"reviewer opened document" — only "reviewer submitted approval action."

**Mitigation path:** Requires a read-event tracking mechanism (separate from approval log).
Out of scope for current system. Risk is accepted and documented.

---

### A5 — Kaprodi Freshness Under Mixed-Loop Scenarios (Open — Partially Mitigated)

**Status:** Open. The fix in A3 mitigates the most common path. Longer loops with
alternating rejections have not been fully evaluated.

**Concern:** In a scenario with 3+ revision rounds involving alternating RMK and Kaprodi
rejections, the sequence of `lastReviewedAt*` resets may not cover all paths. Each
rejection transition only resets the *other* reviewer's timestamp — but does not guarantee
that the *resetting reviewer's own* timestamp is consistent with the current `lastChangedAt`.

**Current state:** A3 fix (resetting `lastReviewedAtByKaprodi` in `rejectRMK`) handles
the minimal 3-round case. Longer alternating loops have not been runtime-tested.

**Recommendation:** Extend `scripts/test-scenario5.ts` to include an alternating loop:
`rejectKaprodi → rejectRMK → rejectKaprodi → approveRMK → approveKaprodi`.

---

## Type B — Integration Failures

Failures where governance logic is correct but is not correctly invoked or its effects
are not correctly propagated across layer boundaries.

---

### B1 — Session Role vs Database Role Drift

**Status:** Latent. Risk depends on how frequently roles change in production.

**Trigger:** A user's role is changed in the `users` table (e.g., `dosen` promoted to
`koordinator_rmk`) while they have an active session. They retain their old session role.

**Sequence:**
- API route calls `requireRole("koordinator_rmk")` → passes (session has new role from re-login) OR fails (session has old role) depending on session freshness
- Workflow layer calls `getUserAuditData(userId)` → reads **current** role from DB
- `assertRole(actorRole, 'koordinator_rmk')` in governance uses the DB role, not the session role

**Inversion risk:** A user whose session is stale (`dosen`) but DB is current (`koordinator_rmk`)
will be rejected at the API route (`requireRole` fails) but would pass governance if somehow
reached. Conversely, a user demoted in DB but still in session can reach the API route
and then get the demoted role from DB — causing `assertRole` to fail at governance level.

**Current protection:** `getUserAuditData` fetches live DB role for audit trail and governance
validation. This means governance uses the most current role, but the session check at the
API layer may diverge.

**Impact:** If session becomes stale in the wrong direction, legitimate reviewers can be
locked out without a clear error message about why (session says OK, governance says wrong role).

**Detection:** Log `actorRole` from `getUserAuditData` alongside session role at API layer.
Alert on mismatch.

**Mitigation path:** Shorten session TTL, or invalidate sessions on role change.

---

### B2 — Notification Outside Transaction Boundary

**Status:** Active architectural gap.

**Location:** `src/services/rps-workflow/review-rmk.ts:91-103`, `review-kaprodi.ts:91-108`

**Structure:**
```typescript
// Inside approveByRmk / approveByKaprodi:
const governanceResult = await approveRMKGovernance(...);  // ← commits to DB atomically
await createNotifications(prisma, [...]);                   // ← separate DB write, outside that transaction
```

**Failure mode:** If `createNotifications` throws (connection drop, constraint violation,
unexpected notification schema error), the governance transition has already committed.
The RPS `workflowStatus` is correctly advanced, the audit log entry exists, but no
notification is created.

**Expected:** Either both the transition and the notification succeed, or both fail.

**Actual:** Notifications are not wrapped in the governance `$transaction`. They can fail
independently while governance succeeds.

**Impact:** Users are not notified of approval/rejection events. Dosen does not know to
resubmit. RMK does not know to review. Workflow stalls silently with no error visible
to the actor who triggered the action.

**Detection:** Query for RPS in `submitted_to_rmk` state with no corresponding
`rps_notifications` row of type `submitted_to_rmk` for the `koordinatorRmkId`.

**Mitigation path:** Move `createNotifications` inside the `$transaction` block, or implement
a transactional outbox pattern (write notification intent to DB atomically, deliver async).

---

### B3 — Double-Submit Idempotency Failure

**Status:** Latent. Triggered by UI double-click or network retry.

**Location:** `src/app/api/rps/[id]/submit/route.ts` → `submitRpsForReview` → `submitRpsGovernance`

**Trigger:** User clicks "Submit" twice quickly, or browser retries a timed-out POST.

**Expected:** Second request fails with `ForbiddenTransitionError` (status already `submitted_to_rmk`).

**Actual (current):** The `assertWorkflowStatus` guard in `submitRps` checks the state at
read time. If both requests read before either commits, both may pass. This produces:
- Two `submit_to_rmk` approval log entries with the same `revisionRound`
- Two notification rows for the same `koordinatorRmkId`
- Final state is still `submitted_to_rmk` (idempotent at state level, not at side-effect level)

**Impact:** Duplicate audit log entries for submit action. Duplicate notifications to RMK
(inbox spam). Complicates longitudinal audit queries.

**Detection:** Same as A2 — query for duplicate action+revisionRound combinations in log.

**Mitigation path:** UI-level: disable submit button immediately on first click.
Service-level: add idempotency key check before calling governance, or use database
unique constraint on `(rpsId, revisionRound, action)` in `rps_approval_log`.

---

### B4 — Stale UI Read Before Action

**Status:** Inherent to stateless HTTP. No mitigation in current implementation.

**Trigger:** User opens RPS detail page at time T1 (page loads `workflowStatus = submitted_to_rmk`).
At time T2, RMK approves (state → `submitted_to_kaprodi`). User's browser still shows
old state. User clicks an action button that is now invalid.

**Expected:** API returns error, UI shows updated state.

**Actual:** API returns `ForbiddenTransitionError` (governance guard catches it). UI shows
generic error or stale state depending on error handling in the component. User must
manually refresh.

**Impact:** Confusing UX. Not a data integrity failure — governance correctly rejects
the illegal action.

**Risk level:** Low for data integrity, medium for UX trust. Acceptable without polling.

**Detection:** N/A — governance catches it. Log `ForbiddenTransitionError` occurrences
to detect if this happens frequently (indicates concurrent users on same RPS).

**Mitigation path:** Server-Sent Events or WebSocket push to invalidate client state.
Currently not implemented. Acceptable trade-off for current usage scale.

---

### B5 — Wrong Layer Entry Point Bypasses Workflow Checks

**Status:** Active risk in development environments. Mitigated by code discipline in production.

**Trigger:** Developer or test script calls governance functions directly (e.g., `submitRps`,
`approveRMK`) instead of going through the workflow service layer.

**What is bypassed:**
- `assertRpsReadyForSubmission` (content completeness check — CPL, CPMK, bobot, etc.)
- `assertActiveWarningsAcknowledged` (warning acknowledgement check)
- `validateRmkAuthority` / `validateKaprodiAuthority` (per-document ownership check)
- Notification creation

**Current scenario:** The runtime test script `scripts/test-scenario5.ts` does exactly this —
it calls governance directly and skips all workflow checks. This is intentional for governance
isolation testing. But if a developer does the same in manual testing and mistakes the result
as "system validated," that is a B-class failure.

**Impact on test validity:** The Scenario 5 runtime proof in `GOVERNANCE_VALIDATION_STATUS.md`
is governance-layer proof only. It does not validate that a correctly formed HTTP request
through the full stack would succeed with the same result.

**Detection:** Code review discipline. Governance functions in `src/services/rps/governance/`
should not be imported outside `src/services/rps-workflow/` except in tests explicitly
labelled as governance-isolation tests.

---

## Type C — Observability Failures

Failures that exist (Type A or B) but cannot be detected because no signal is emitted.

---

### C1 — Guard Rejections Are Not Logged

**Status:** Active gap. All guard throws are invisible to the audit trail.

**Root cause:** `rps_approval_log` only receives entries on successful transitions
(inside `$transaction`). Guard functions (`assertRole`, `assertWorkflowStatus`,
`assertReviewIsFresh`, `assertCanSubmit`) throw exceptions, which abort the transaction
before any log entry is created.

**What this hides:**
- Repeated `ForbiddenTransitionError` on the same RPS (someone probing state transitions)
- `ReviewExpiredError` attempts (reviewer repeatedly clicking approve on stale review)
- `OwnershipError` attempts (someone attempting to submit another dosen's RPS)

**Consequence:** A systematic attempt to manipulate workflow state leaves no trace in the
audit trail. The only signal is the HTTP error response returned to the client.

**Detection:** Cannot be detected from DB alone. Requires HTTP access log analysis
(4xx response codes on governance routes).

**Mitigation path:** Write a `rps_guard_event` log entry on every guard rejection
(outside the main `$transaction`, using a separate write). Include: `rpsId`, `actorUserId`,
`guardType`, `reason`, `timestamp`. This is not currently implemented.

---

### C2 — `lastChangedAt` Semantic Drift

**Status:** Active naming mismatch. Not a runtime bug today but brittle under future changes.

**Current behavior:** `lastChangedAt` is written **only** by governance transitions:
- `approveRMK` sets it
- `rejectRMK` sets it
- `approveKaprodi` sets it
- `rejectKaprodi` sets it
- Content-editing services (`updateRpsDraft`, `updateRpsPertemuan`, `updateRpsCpmk`, etc.)
  do **not** set it

**Stated intent (comment in `submitRps`):** "lastChangedAt tracks content changes, not
state transitions"

**Actual behavior:** The opposite — it tracks state transitions (reviewer actions), not
content changes.

**Why it works today:** The field happens to fulfill its functional role in `assertReviewIsFresh`
because state transitions advance `lastChangedAt` beyond any previous review timestamp,
effectively forcing re-review after each transition. Dosen cannot edit content while the
document is submitted, so content-edit timestamps are irrelevant during review.

**Why it is fragile:** If a future feature allows content edits after submission (e.g.,
minor corrections without resubmission) and that feature calls `lastChangedAt = new Date()`,
the freshness guard will behave unexpectedly. Conversely, if a developer trusts the comment
and *stops* writing `lastChangedAt` in transitions (reasoning: "transitions are not content
changes"), the freshness guard will stop working.

**Mitigation path:** Rename to `lastGovernanceEventAt` or explicitly document that this
field tracks *governance-relevant events* rather than *content edits*. Update the comment.

---

### C3 — Rubber-Stamping Has No Minimum Review Window

**Status:** By design. Documented as observability gap.

**Current behavior:** `assertReviewIsFresh` only checks *ordering* (was the last review
before the last change?), not *duration* (did the reviewer spend any time reviewing?).

**Consequence:** A reviewer can open the RPS, immediately click approve, and the system
accepts it as a valid review. No minimum time between receiving the document and approving.

**Signals currently available:** None. `rps_approval_log` timestamps show when actions
were taken, not how long the document was open before approval.

**Theoretical minimum:** `lastReviewedAtByRmk - lastChangedAt` could be computed from
existing timestamps to detect suspiciously fast approvals. This is not currently queried.

**Detection (manual):** Query approval log for cases where the time between `submitted_to_rmk`
log entry and `approve_rmk` log entry is less than a threshold (e.g., 60 seconds):

```sql
SELECT
  sub.rps_id,
  sub.created_at AS submitted_at,
  appr.created_at AS approved_at,
  EXTRACT(EPOCH FROM (appr.created_at - sub.created_at)) AS seconds_elapsed
FROM rps_approval_log sub
JOIN rps_approval_log appr
  ON appr.rps_id = sub.rps_id
  AND appr.revision_round = sub.revision_round
  AND appr.action = 'approve_rmk'
WHERE sub.action = 'submit_to_rmk'
  AND EXTRACT(EPOCH FROM (appr.created_at - sub.created_at)) < 60;
```

---

### C4 — Unbounded Revision Count with No Circuit Breaker

**Status:** Active gap. No alert or maximum defined.

**Current behavior:** `currentRevisionCount` increments on every `rejectRMK` or
`rejectKaprodi`. No upper bound is enforced at the governance layer.

**Consequence:** A document rejected 20 times will have `currentRevisionCount = 20` and
`revisionRound` values up to 21 in the audit log. This is not wrong, but it is undetected.

**Operational risk:** High revision counts indicate a document stuck in review. This is
valuable workflow intelligence that currently produces no alert.

**Detection:** Query for RPS with revision count above a threshold:

```sql
SELECT id, current_revision_count, workflow_status
FROM rps
WHERE current_revision_count >= 3
ORDER BY current_revision_count DESC;
```

**Mitigation path:** Admin alert when `currentRevisionCount >= 3`. Not a governance
enforcement issue — this is a workflow health monitoring gap.

---

## Cross-Reference to `GOVERNANCE_VALIDATION_STATUS.md`

| Finding / Gap in Validation Doc | Failure Mode Here |
|----------------------------------|------------------|
| Finding 3 (Kaprodi rejection deadlock) | A3 (symmetric fix applied, same class) |
| Gap 1 (rejectRMK not tested) | A3 (runtime proof still needed), A5 (longer loops) |
| Gap 2 (approveKaprodi not tested) | A1 (no log = undetectable) |
| Gap 3 (notification in loop) | B2 (architectural gap — outside transaction) |
| Gap 4 (HTTP session enforcement) | B1 (role drift), B5 (wrong entry point) |
| Gap 5 (UI E2E) | B4 (stale read), B3 (double-submit) |
| Open question (Kaprodi freshness) | A3 (fixed), A5 (open for longer loops) |

---

## How to Use This Document

**For code review:**
Before approving any change to `src/services/rps/governance/` or `src/services/rps-workflow/`,
check whether the change could introduce a new A-type failure or worsen a B-type gap.

**For adversarial testing:**
Use the "Trigger" and "Sequence" fields in each failure mode as test case specifications.
A2 and B3 require concurrent execution tooling. A1 requires direct DB access.

**For post-incident analysis:**
Start with C1 — if guard rejections are not logged, the audit trail cannot reconstruct
adversarial access attempts. Any incident investigation is bounded by what signals exist.

**For roadmap prioritization:**
A2 (race condition) and B2 (notification outside transaction) are the highest-risk active
gaps with concrete, implementable mitigations. C1 (guard rejection logging) has the
highest leverage for future auditability.

---

## Document Control

| Field | Value |
|-------|-------|
| Status | Active |
| Companion document | `GOVERNANCE_VALIDATION_STATUS.md` |
| Review trigger | Any change to `src/services/rps/governance/` or `src/services/rps-workflow/`, or any new DB migration affecting `rps` or `rps_approval_log` |
| Last updated | 2026-04-19 |
| Active findings (unfixed) | A1, A2, A4, A5, B1, B2, B3, B4, B5, C1, C2, C3, C4 |
| Fixed during authoring | A3 (`rejectRMK` missing `lastReviewedAtByKaprodi: null`) |
