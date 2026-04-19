# Fase 2 Governance - Implementation Contract

**Purpose:** Enforcement layer to prevent policy-implementation drift
**Status:** MANDATORY before any code implementation
**Version:** 1.0
**Last Updated:** 2026-04-19

---

## Overview

This document is **NOT for stakeholders**—it's for developers, code reviewers, and QA.

**Problem:** Even perfect governance design can be degraded during implementation:
- Developers simplify guard logic
- Reviewers miss skipped validations
- "Good enough" overrides accumulate
- System becomes compliant in name, not in practice

**Solution:** Contract that defines:
1. Non-negotiable rules (cannot be skipped)
2. Forbidden patterns (must be rejected in code review)
3. Verification hooks (how to prove implementation matches design)
4. Definition of Done for governance features

**Principle:** Implementation fidelity is as critical as design quality.

---

## Section 1: Non-Negotiable Rules

### Rule 1: All State Transitions MUST Go Through Guard Functions

**❌ FORBIDDEN:**
```typescript
// Direct status mutation - NEVER ALLOWED
await prisma.rps.update({
  where: { id: rpsId },
  data: { workflowStatus: "approved" }
});
```

**✅ REQUIRED:**
```typescript
// All transitions through guard functions
await approveKaprodi(rpsId, actorId);  // This contains ALL guards
```

**Enforcement:**
- Code reviewer must see guard function call
- No direct `prisma.rps.update` with status changes
- All status logic in `/src/services/rps/governance/`

---

### Rule 2: All Write Operations MUST Update Audit Trail

**❌ FORBIDDEN:**
```typescript
// Silent update - NEVER ALLOWED
await prisma.rps.update({
  where: { id: rpsId },
  data: { mataKuliah: "New Name" }
});
// No audit log created
```

**✅ REQUIRED:**
```typescript
// Every write MUST log
await logApproval({
  rpsId,
  action: "field_update",
  actorId,
  fieldsChanged: ["mataKuliah"],
  timestamp: new Date()
});

await prisma.rps.update({
  where: { id: rpsId },
  data: { mataKuliah: "New Name" }
});
```

**Enforcement:**
- Check for `logApproval()` call before any write
- No "silent updates" allowed
- Audit log must include: who, what, when, why

---

### Rule 3: All Document Changes MUST Update `lastChangedAt`

**❌ FORBIDDEN:**
```typescript
// Edit without freshness update - NEVER ALLOWED
await prisma.rps.update({
  where: { id: rpsId },
  data: { mataKuliah: "New Name" }
});
// Forgot to update lastChangedAt
```

**✅ REQUIRED:**
```typescript
// All edits update freshness timestamp
await prisma.rps.update({
  where: { id: rpsId },
  data: {
    mataKuliah: "New Name",
    lastChangedAt: new Date()  // MANDATORY
  }
});
```

**Enforcement:**
- Every write to RPS fields must include `lastChangedAt`
- Code reviewer must check for this field
- Missing `lastChangedAt` = automatic rejection in PR

---

### Rule 4: Minor Corrections MUST Pass Through Whitelist Validator

**❌ FORBIDDEN:**
```typescript
// Bypass whitelist - NEVER ALLOWED
async function adminMinorCorrection(rpsId, adminId, corrections) {
  // Direct update without validation
  await prisma.rps.update({
    where: { id: rpsId },
    data: corrections
  });
}
```

**✅ REQUIRED:**
```typescript
// Must validate whitelist
async function adminMinorCorrection(rpsId, adminId, corrections, reason) {
  // MANDATORY: Validate whitelist
  assertAllowedMinorCorrections(corrections);

  // MANDATORY: Classify changes
  const assessments = Object.entries(corrections).map(([field, newValue]) =>
    classifyChange(field, rps[field], newValue)
  );

  // MANDATORY: Check for substantive changes
  const hasSubstantiveChange = assessments.some(a => a.requiresVersionBump);
  if (hasSubstantiveChange) {
    throw new ForbiddenError("Substantive change detected");
  }

  // Then apply
  await prisma.rps.update({
    where: { id: rpsId },
    data: {
      ...corrections,
      lastChangedAt: new Date()
    }
  });
}
```

**Enforcement:**
- Check for `assertAllowedMinorCorrections()` call
- Check for `classifyChange()` call
- No direct updates without validation

---

### Rule 5: All Approval Actions MUST Check Freshness

**❌ FORBIDDEN:**
```typescript
// Rubber-stamp approval - NEVER ALLOWED
async function approveKaprodi(rpsId, actorId) {
  await prisma.rps.update({
    where: { id: rpsId },
    data: {
      workflowStatus: "approved",
      lastReviewedAtByKaprodi: new Date()
    }
  });
  // No freshness check
}
```

**✅ REQUIRED:**
```typescript
// Must verify review is current
async function approveKaprodi(rpsId, actorId) {
  const rps = await getRps(rpsId);

  // MANDATORY: Freshness check
  assertReviewIsFresh(rps, "kaprodi");

  // MANDATORY: Confidence assessment
  const confidence = assessApprovalQuality(rps);

  if (confidence.approvalConfidence === "low") {
    await notifyKaprodi(actorId, { /* warning */ });
  }

  await prisma.rps.update({
    where: { id: rpsId },
    data: {
      workflowStatus: "approved",
      lastReviewedAtByKaprodi: new Date()
    }
  });

  // MANDATORY: Log with confidence
  await logApproval({
    rpsId,
    action: "approve_kaprodi",
    actorId,
    reviewDuration: confidence.reviewDuration,
    approvalConfidence: confidence.approvalConfidence
  });
}
```

**Enforcement:**
- Check for `assertReviewIsFresh()` call
- Check for `assessApprovalQuality()` call
- Approval logs must include confidence metrics

---

## Section 2: Forbidden Patterns

### Pattern 1: Conditional Logic in Controllers

**❌ FORBIDDEN:**
```typescript
// Business logic in controller - VIOLATES SEPARATION OF CONCERNS
app.post("/api/rps/:id/approve-kaprodi", async (req, res) => {
  const rps = await prisma.rps.findUnique({ where: { id: req.params.id } });

  // BAD: Logic in controller
  if (rps.workflowStatus !== "submitted_to_kaprodi") {
    return res.status(400).json({ error: "Wrong status" });
  }

  // BAD: Direct update
  await prisma.rps.update({
    where: { id: req.params.id },
    data: { workflowStatus: "approved" }
  });

  res.json({ success: true });
});
```

**✅ REQUIRED:**
```typescript
// Controller delegates to service
app.post("/api/rps/:id/approve-kaprodi", async (req, res) => {
  // GOOD: All logic in service layer
  const result = await approveKaprodi(req.params.id, req.user.id);
  res.json(result);
});
```

**Enforcement:**
- Controllers only handle HTTP (req/res)
- All business logic in `/src/services/`
- PR reviewer must check file location

---

### Pattern 2: Silent Overrides Without Reason

**❌ FORBIDDEN:**
```typescript
// Override without documentation - NEVER ALLOWED
async function forceResubmit(rpsId) {
  await prisma.rps.update({
    where: { id: rpsId },
    data: { workflowStatus: "submitted_to_rmk" }
  });
  // No reason, no audit trail
}
```

**✅ REQUIRED:**
```typescript
// All overrides require documentation
async function forceResubmit(rpsId, adminId, reason) {
  if (!reason || reason.length < 20) {
    throw new Error("Override requires detailed reason (min 20 chars)");
  }

  await prisma.rps.update({
    where: { id: rpsId },
    data: { workflowStatus: "submitted_to_rmk" }
  });

  // MANDATORY: Log override
  await logApproval({
    rpsId,
    action: "override_resubmit",
    actorId: adminId,
    notes: `Override: ${reason}`,
    overrideReason: reason
  });
}
```

**Enforcement:**
- All override functions require `reason` parameter
- Reason must be validated (min length)
- Must be logged with `overrideReason` field

---

### Pattern 3: Partial Guard Implementation

**❌ FORBIDDEN:**
```typescript
// Skipping some guards - NEVER ALLOWED
async function approveKaprodi(rpsId, actorId) {
  const rps = await getRps(rpsId);

  // Only checking status, skipping freshness
  if (rps.workflowStatus !== "submitted_to_kaprodi") {
    throw new Error("Wrong status");
  }

  // Approving without confidence check
  await prisma.rps.update({
    where: { id: rpsId },
    data: { workflowStatus: "approved" }
  });
}
```

**✅ REQUIRED:**
```typescript
// ALL guards must be present
async function approveKaprodi(rpsId, actorId) {
  const rps = await getRps(rpsId);

  // Guard 1: Status check
  assertWorkflowStatus(rpsId, "submitted_to_kaprodi");

  // Guard 2: Role check
  assertRole(actorId, "kaprodi");

  // Guard 3: Freshness check
  assertReviewIsFresh(rps, "kaprodi");

  // Guard 4: Confidence check
  const confidence = assessApprovalQuality(rps);

  // Guard 5: Low confidence warning
  if (confidence.approvalConfidence === "low") {
    await notifyKaprodi(actorId, { /* warning */ });
  }

  // Then approve
  await prisma.rps.update({
    where: { id: rpsId },
    data: { workflowStatus: "approved" }
  });
}
```

**Enforcement:**
- Code reviewer must check ALL guards are present
- Compare implementation with policy document
- Missing guard = PR must be rejected

---

### Pattern 4: Hard-Coded Configuration

**❌ FORBIDDEN:**
```typescript
// Hard-coded limits - BREAKS CONFIGURABILITY
const MAX_REVISIONS = 3;

function assertCanResubmit(rps) {
  if (rps.revisionCount >= MAX_REVISIONS) {
    throw new Error("Limit exceeded");
  }
}
```

**✅ REQUIRED:**
```typescript
// Use configuration constants
const REVISION_LIMITS = {
  MAX_REVISION_CYCLES_RMK: 3,
  MAX_REVISION_CYCLES_KAPRODI: 2
};

function assertCanResubmit(rps) {
  const limit = rps.workflowStatus.includes("rmk")
    ? REVISION_LIMITS.MAX_REVISION_CYCLES_RMK
    : REVISION_LIMITS.MAX_REVISION_CYCLES_KAPRODI;

  if (rps.revisionCount >= limit) {
    throw new Error(`Batas revisi terlampaui (${rps.revisionCount}/${limit})`);
  }
}
```

**Enforcement:**
- All magic numbers extracted to named constants
- Configuration in dedicated file
- No numbers in business logic

---

## Section 3: Verification Hooks

### Hook 1: Code Review Checklist for Governance Features

Every PR touching governance logic MUST include:

```markdown
## Governance Compliance Checklist

- [ ] All state transitions go through guard functions
- [ ] All write operations update audit trail
- [ ] All document changes update `lastChangedAt`
- [ ] Minor corrections use whitelist validator
- [ ] Approval actions check freshness
- [ ] Business logic in service layer (not controller)
- [ ] No silent overrides without reason
- [ ] All guards present (compared to policy)
- [ ] Configuration in constants (not hard-coded)
- [ ] Audit logs include: who, what, when, why
```

**Enforcement:**
- PR template includes this checklist
- Code reviewer must verify each item
- Missing checklist = PR not reviewed

---

### Hook 2: Automated Test Coverage Requirements

Every governance function MUST have:

```typescript
describe("approveKaprodi", () => {
  // Valid scenario
  it("should approve when all guards pass", async () => {
    // Test normal flow
  });

  // Invalid scenarios
  it("should reject when status is wrong", async () => {
    // Test guard 1
  });

  it("should reject when actor is not kaprodi", async () => {
    // Test guard 2
  });

  it("should reject when review is not fresh", async () => {
    // Test guard 3
  });

  // Abuse scenario
  it("should warn when approval confidence is low", async () => {
    // Test guard 4 + warning
  });

  // Edge cases
  it("should handle multiple rapid resubmits", async () => {
    // Test cumulative behavior
  });
});
```

**Enforcement:**
- Minimum 5 test cases per function
- Must include valid, invalid, abuse scenarios
- CI/CD blocks if coverage < 80%

---

### Hook 3: Integration Tests for State Transitions

```typescript
describe("RPS State Machine", () => {
  it("should follow happy path: draft → submitted_to_rmk → submitted_to_kaprodi → approved", async () => {
    // Test complete flow
  });

  it("should follow revision loop: submitted_to_rmk → revision_requested_by_rmk → submitted_to_rmk", async () => {
    // Test rejection flow
  });

  it("should follow kaprodi rejection loop: submitted_to_kaprodi → revision_requested_by_kaprodi → submitted_to_rmk", async () => {
    // Test cross-stage rejection
  });

  it("should create new version on revise: approved (v1) → superseded + draft (v2)", async () => {
    // Test version creation
  });

  it("should preserve history on admin revoke: approved (v1) → revoked + draft (v2)", async () => {
    // Test revoke model
  });
});
```

**Enforcement:**
- All state transitions tested end-to-end
- Must verify audit trail after each transition
- Must verify status combinations (workflow + record)

---

### Hook 4: Abuse Scenario Testing

```typescript
describe("Abuse Prevention", () => {
  it("should block composite whitelist abuse", async () => {
    // Try to change namaMatkul + kodeMatkul + tahunAkademik
    // Expect: Substantive change error
  });

  it("should block cumulative drift attack", async () => {
    // Perform 10 minor corrections in sequence
    // Expect: Blocked at 9th correction (20% threshold)
  });

  it("should warn rushed approval", async () => {
    // Approve within 15 seconds with major changes
    // Expect: Low confidence warning logged
  });

  it("should prevent rubber-stamping via freshness flag", async () => {
    // Approve without reviewing changes
    // Expect: Freshness error
  });
});
```

**Enforcement:**
- All red-team scenarios from policy tested
- Tests must verify system response
- Must log abuse attempts for audit

---

## Section 4: Definition of Done (Governance)

A governance feature is **COMPLETE** only when:

### 4.1 Code Quality

- [ ] All guards implemented (verified against policy)
- [ ] No forbidden patterns used
- [ ] Business logic in service layer
- [ ] Configuration externalized
- [ ] Types properly defined

### 4.2 Audit Trail

- [ ] All actions logged
- [ ] Logs include: actor, action, timestamp, reason
- [ ] Audit trail verifiable via test
- [ ] No silent updates possible

### 4.3 Testing

- [ ] Unit tests for all guards
- [ ] Integration tests for state transitions
- [ ] Abuse scenario tests passing
- [ ] Edge cases covered
- [ ] Coverage ≥ 80%

### 4.4 Documentation

- [ ] Function documented with purpose
- [ ] Guards reference policy sections
- [ ] Edge cases explained
- [ ] Examples provided

### 4.5 Verification

- [ ] Code review checklist completed
- [ ] All checklist items checked
- [ ] Reviewer explicitly approves governance compliance
- [ ] No "good enough" compromises logged

---

## Section 5: Implementation Sequencing

### Phase 1: Foundation (Week 1-2)

**Priority: 🔴 CRITICAL**

1. Database schema
   - Add dual status fields
   - Add tracking fields (lastChangedAt, lastReviewedAt*, etc.)
   - Add drift tracking fields
   - Add approval log fields

2. Service layer structure
   - Create `/src/services/rps/governance/`
   - Create guard functions
   - Create transition functions
   - Create audit log functions

**Completion Criteria:**
- Schema migration passes
- Guard functions exist (even if empty)
- Audit log infrastructure ready

---

### Phase 2: Core Governance (Week 3-4)

**Priority: 🔴 CRITICAL**

1. State machine implementation
   - Implement all transitions (submit, approve, reject, revise)
   - Implement revision count tracking
   - Implement version management

2. Permission system
   - Implement role checks
   - Implement ownership checks
   - Implement status-based access control

**Completion Criteria:**
- All state transitions working
- Permissions enforced
- Integration tests pass

---

### Phase 3: Behavioral Safeguards (Week 5)

**Priority: 🟡 HIGH**

1. Freshness tracking
   - Implement `lastChangedAt` updates
   - Implement freshness guards
   - Implement re-review logic

2. Minor correction system
   - Implement whitelist validation
   - Implement change classification
   - Implement drift tracking

**Completion Criteria:**
- Rubber-stamping prevented
- Whitelist abuse blocked
- Cumulative drift detected

---

### Phase 4: Abuse Detection (Week 6)

**Priority: 🟡 HIGH**

1. Approval confidence scoring
   - Implement quality assessment
   - Implement confidence logging
   - Implement low-confidence warnings

2. Escalation system
   - Implement progressive requirements
   - Implement justification prompts
   - Implement supervisor approval

**Completion Criteria:**
- Low-quality approvals detected
- All abuse scenarios blocked or logged
- Red-team tests pass

---

### Phase 5: API & UI (Week 7-8)

**Priority: 🟢 MEDIUM**

1. API endpoints
   - Expose all governance functions
   - Add proper error handling
   - Add request validation

2. UI implementation
   - Implement status displays
   - Implement action buttons
   - Implement warning dialogs
   - Implement version history panel

**Completion Criteria:**
- All endpoints functional
- UI matches state machine
- User flows tested

---

## Section 6: Risk Mitigation

### Risk 1: Implementation Schedule Pressure

**Scenario:** "We need to ship quickly, can we skip some guards?"

**Mitigation:**
- This contract defines non-negotiable rules
- Skipping guards = violation of implementation contract
- Technical debt must be documented with explicit stakeholder approval

**Action:**
If schedule pressure requires compromise:
1. Document which guards are skipped
2. Get explicit stakeholder sign-off
3. Create tracking ticket for completion
4. Mark in system as "partial implementation"

---

### Risk 2: Developer Misunderstanding

**Scenario:** Developer doesn't understand why a guard exists, removes it.

**Mitigation:**
- Every guard MUST reference policy section
- Code comments MUST explain rationale
- Code reviewer MUST check presence

**Example:**
```typescript
// Guard: Check review freshness
// Policy: FASE_2_BEHAVIORAL_SAFEGUARDS.md - Safeguard 1
// Rationale: Prevent rubber-stamping when document changed after last review
function assertReviewIsFresh(rps, reviewerRole) {
  // Implementation...
}
```

---

### Risk 3: Reviewer Fatigue

**Scenario:** Code reviewer gets tired, approves "looks fine."

**Mitigation:**
- Mandatory checklist for governance PRs
- Checklist must be explicitly marked as complete
- Reviewer signature required

**Process:**
```markdown
## Governance Review

I have verified:
- [ ] All guards present (compared to FASE_2_GOVERNANCE_POLICY_V2.md)
- [ ] All forbidden patterns avoided (checked FASE_2_IMPLEMENTATION_CONTRACT.md)
- [ ] All tests passing (including abuse scenarios)
- [ ] All documentation complete

**Reviewer Signature:** @reviewer-name
**Date:** YYYY-MM-DD
```

---

## Section 7: Governance Verification Tests

### Test Suite 1: Guard Completeness

```typescript
describe("Guard Completeness", () => {
  // For each transition function
  const transitions = [
    "submitRps",
    "approveRMK",
    "rejectRMK",
    "approveKaprodi",
    "rejectKaprodi",
    "reviseApprovedRps",
    "adminRevokeRps",
    "adminMinorCorrection"
  ];

  transitions.forEach(transition => {
    it(`${transition} should have all required guards`, async () => {
      // Verify function exists
      const fn = require(`../services/${transition}`);
      expect(fn).toBeDefined();

      // Verify guards by testing rejection scenarios
      // This forces implementation of all guards
    });
  });
});
```

---

### Test Suite 2: Audit Trail Integrity

```typescript
describe("Audit Trail Integrity", () => {
  const actions = [
    "submitRps",
    "approveRMK",
    "rejectRMK",
    "approveKaprodi",
    "rejectKaprodi",
    "reviseApprovedRps",
    "adminRevokeRps",
    "adminMinorCorrection"
  ];

  actions.forEach(action => {
    it(`${action} should create audit log entry`, async () => {
      const result = await executeAction(action);

      const log = await prisma.rpsApprovalLog.findFirst({
        where: { action }
      });

      expect(log).not.toBeNull();
      expect(log.actorId).toBeDefined();
      expect(log.timestamp).toBeDefined();
      expect(log.action).toBe(action);
    });
  });
});
```

---

### Test Suite 3: State Machine Consistency

```typescript
describe("State Machine Consistency", () => {
  it("should maintain valid workflow + record status combinations", async () => {
    // Test all valid combinations from policy
    const validCombinations = [
      { workflow: "draft", record: "active" },
      { workflow: "submitted_to_rmk", record: "active" },
      { workflow: "approved", record: "active" },
      { workflow: "approved", record: "superseded" },
      { workflow: "approved", record: "revoked" }
    ];

    // Test invalid combinations are rejected
    const invalidCombinations = [
      { workflow: "draft", record: "superseded" },
      { workflow: "submitted_to_rmk", record: "revoked" }
    ];
  });
});
```

---

## Section 8: Final Audit Protocol

Before declaring Fase 2 "COMPLETE":

### 8.1 Code Audit

- [ ] All transitions implemented
- [ ] All guards present
- [ ] No forbidden patterns
- [ ] All tests passing
- [ ] Coverage ≥ 80%

### 8.2 Policy Audit

- [ ] Compare implementation with FASE_2_GOVERNANCE_POLICY_V2.md
- [ ] Verify all 5 policy documents addressed
- [ ] Check no "TODO" comments in governance code
- [ ] Verify no hardcoded workarounds

### 8.3 Abuse Scenario Audit

- [ ] Run all red-team scenarios
- [ ] Verify blocks or warnings
- [ ] Check audit trail quality
- [ ] Verify no silent bypasses

### 8.4 Documentation Audit

- [ ] All functions documented
- [ ] Policy references present
- [ ] Examples provided
- [ ] Rationale explained

---

## Section 7: Governance Observability Layer

### Purpose

Prevent silent governance degradation through:
- Continuous monitoring of governance metrics
- Automated flagging of anomalies
- Operational review loops

**Principle:** "What gets measured, gets managed. What gets reviewed, stays effective."

---

### 7.1 Governance Metrics (Core KPIs)

#### Metric 1: Approval Freshness Compliance

**Definition:** % of approvals with freshness violations

**Calculation:**
```sql
SELECT
  COUNT(CASE WHEN reviewDuration < 60 THEN 1 END) AS rushedApprovals,
  COUNT(*) AS totalApprovals,
  ROUND(COUNT(CASE WHEN reviewDuration < 60 THEN 1 END) * 100.0 / COUNT(*), 2) AS violationRate
FROM RpsApprovalLog
WHERE action IN ('approve_rmk', 'approve_kaprodi')
  AND createdAt >= NOW() - INTERVAL '30 days';
```

**Thresholds:**
- 🟢 **Green:** < 5% violations
- 🟡 **Yellow:** 5-15% violations
- 🔴 **Red:** > 15% violations

**Action Required:**
- Yellow: Review patterns with Kaprodi/RMK
- Red: Consider tightening freshness guard or retraining

---

#### Metric 2: Minor Correction Frequency

**Definition:** Average number of minor corrections per approved document

**Calculation:**
```sql
SELECT
  COUNT(*) FILTER (WHERE action = 'admin_minor_correction') AS minorCorrections,
  COUNT(DISTINCT rpsId) AS totalDocuments,
  ROUND(COUNT(*) FILTER (WHERE action = 'admin_minor_correction') * 1.0 / COUNT(DISTINCT rpsId), 2) AS avgCorrectionsPerDoc
FROM RpsApprovalLog
WHERE action = 'admin_minor_correction'
  AND createdAt >= NOW() - INTERVAL '30 days';
```

**Thresholds:**
- 🟢 **Green:** < 0.5 corrections/doc
- 🟡 **Yellow:** 0.5-2 corrections/doc
- 🔴 **Red:** > 2 corrections/doc

**Action Required:**
- Yellow: Review minor correction patterns
- Red: Potential whitelist abuse or drift accumulation

---

#### Metric 3: Revision Cycle Distribution

**Definition:** Distribution of revision rounds before approval

**Calculation:**
```sql
SELECT
  revisionRound,
  COUNT(*) AS documentCount,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS percentage
FROM RpsApprovalLog
WHERE action LIKE '%revision%'
  AND createdAt >= NOW() - INTERVAL '90 days'
GROUP BY revisionRound
ORDER BY revisionRound;
```

**Expected Pattern:**
- Round 1: 60-70% (first-time approval)
- Round 2: 20-30% (minor fixes)
- Round 3: 5-10% (complex cases)
- Round 4+: < 5% (escalation zone)

**Anomaly Detection:**
- If Round 4+ > 10%: Review escalation effectiveness
- If Round 1 < 40%: Initial submission quality issue

---

#### Metric 4: Cumulative Drift Incidents

**Definition:** Number of documents exceeding drift threshold

**Calculation:**
```sql
SELECT
  COUNT(*) AS documentsAtRisk,
  ROUND(cumulativeChangeScore::numeric, 2) AS avgDriftScore
FROM Rps
WHERE cumulativeChangeScore > 0.15  -- Approaching threshold
  AND recordStatus = 'active'
  AND workflowStatus = 'approved';
```

**Thresholds:**
- 🟢 **Green:** 0 documents > 0.20
- 🟡 **Yellow:** 1-5 documents > 0.20
- 🔴 **Red:** > 5 documents > 0.20

**Action Required:**
- Any document > 0.20: Immediate version bump required
- Yellow zone: Review drift patterns with admins

---

#### Metric 5: Low Confidence Approval Rate

**Definition:** % of approvals flagged as low confidence

**Calculation:**
```sql
SELECT
  COUNT(CASE WHEN approvalConfidence = 'low' THEN 1 END) AS lowConfidenceApprovals,
  COUNT(*) AS totalApprovals,
  ROUND(COUNT(CASE WHEN approvalConfidence = 'low' THEN 1 END) * 100.0 / COUNT(*), 2) AS lowConfidenceRate
FROM RpsApprovalLog
WHERE action IN ('approve_rmk', 'approve_kaprodi')
  AND approvalConfidence IS NOT NULL
  AND createdAt >= NOW() - INTERVAL '30 days';
```

**Thresholds:**
- 🟢 **Green:** < 10% low confidence
- 🟡 **Yellow:** 10-25% low confidence
- 🔴 **Red:** > 25% low confidence

**Action Required:**
- Yellow: Discuss with reviewers
- Red: Training on review quality or process redesign

---

### 7.2 Automated Flags (Real-Time Alerts)

#### Flag 1: Rushed Approval Detection

**Trigger:** Approval performed < 30 seconds after last change

**Implementation:**
```typescript
// In approveKaprodi function
const confidence = assessApprovalQuality(rps);

if (confidence.reviewDuration < 30 && confidence.changedFieldsImpact === "substantive") {
  // CRITICAL FLAG
  await notifyGovernanceTeam({
    type: "critical_rushed_approval",
    rpsId,
    actorId,
    reviewDuration: confidence.reviewDuration,
    changedFieldsCount: confidence.changedFieldsCount,
    message: "CRITICAL: Substantive approval performed in < 30 seconds"
  });
}
```

**Response Required:**
- Immediate notification to Governance Team
- Requires explanation within 24 hours
- Logged in governance incident tracker

---

#### Flag 2: Excessive Minor Corrections

**Trigger:** > 5 minor corrections on single document version

**Implementation:**
```typescript
// In adminMinorCorrection function
const correctionCount = await prisma.rpsApprovalLog.count({
  where: {
    rpsId,
    action: "admin_minor_correction",
    createdAt: {
      gte: rps.approvedAt  // Since approval
    }
  }
});

if (correctionCount >= 5) {
  // WARNING FLAG
  await notifyGovernanceTeam({
    type: "excessive_minor_corrections",
    rpsId,
    correctionCount,
    message: `WARNING: ${correctionCount} minor corrections on approved document`
  });
}
```

**Response Required:**
- Review document history
- Consider forced version bump
- Evaluate whitelist effectiveness

---

#### Flag 3: Escalation Override Spike

**Trigger:** > 3 escalation overrides in 1 week by same reviewer

**Implementation:**
```typescript
// Background job runs weekly
const recentOverrides = await prisma.rpsApprovalLog.groupBy({
  by: ['actorId'],
  where: {
    action: 'revision_limit_justification_provided',
    createdAt: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  },
  having: {
    actorId: {
      _count: {
        gt: 3
      }
    }
  }
});

if (recentOverrides.length > 0) {
  await notifyGovernanceTeam({
    type: "escalation_override_spike",
    reviewers: recentOverrides.map(r => r.actorId),
    message: "WARNING: Reviewers exceeding normal escalation limits"
  });
}
```

**Response Required:**
- Review reviewer workload
- Assess if limits are appropriate
- Consider retraining or role adjustment

---

#### Flag 4: Drift Threshold Breach

**Trigger:** Document cumulative score exceeds 20%

**Implementation:**
```typescript
// In adminMinorCorrection function
const newCumulativeScore = rps.cumulativeChangeScore + totalChangeScore;

if (newCumulativeScore > rps.driftThreshold) {
  // CRITICAL FLAG (already implemented as error)
  // But also log to governance metrics
  await logGovernanceMetric({
    type: "drift_threshold_breach",
    rpsId,
    cumulativeScore: newCumulativeScore,
    threshold: rps.driftThreshold,
    severity: "critical"
  });
}
```

**Response Required:**
- Automatic block (already enforced)
- Incident report required
- Process improvement review

---

### 7.3 Operational Review Loops

#### Weekly Governance Review (30 minutes)

**Attendees:** Admin/Akademik, System Owner

**Agenda:**
1. Review metrics dashboard (5 min)
2. Discuss flagged incidents (15 min)
3. Review low confidence approvals (5 min)
4. Action items for next week (5 min)

**Outputs:**
- Incident log updates
- Action item assignments
- Process adjustment decisions

---

#### Monthly Governance Audit (2 hours)

**Attendees:** Kaprodi, RMK Coordinator, Admin, System Owner

**Agenda:**
1. Metric trends (30 min)
   - Compare with previous month
   - Identify patterns

2. Review all red metrics (30 min)
   - Root cause analysis
   - Corrective actions

3. Policy effectiveness review (30 min)
   - Are guards working as intended?
   - Any unintended consequences?

4. System tuning decisions (30 min)
   - Adjust thresholds if needed
   - Update whitelist if appropriate
   - Escalation policy changes

**Outputs:**
- Monthly governance report
- Policy change proposals
- System configuration updates

---

### 7.4 Governance Dashboard Specification

#### Dashboard Layout (Single Page)

```
┌─────────────────────────────────────────────────────────────┐
│ GOVERNANCE DASHBOARD - Last 30 Days                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Freshness Rate   │  │ Low Conf Rate    │                 │
│  │      8.3%        │  │     12.1%        │                 │
│  │     🟡 Yellow     │  │     🟢 Green     │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Avg Minor Corr   │  │ Drift Incidents  │                 │
│  │     0.4/doc      │  │       0          │                 │
│  │     🟢 Green     │  │     🟢 Green     │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ Active Flags (Last 7 Days)                                   │
├─────────────────────────────────────────────────────────────┤
│ • 2 Rushed approvals (DOC-123, DOC-456)                     │
│ • 1 Excessive minor corrections (DOC-789: 6 corrections)    │
│ • 0 Drift threshold breaches                                │
├─────────────────────────────────────────────────────────────┤
│ Recent Low Confidence Approvals                              │
├─────────────────────────────────────────────────────────────┤
│ 2026-04-19 10:23 | approve_kaprodi | DOC-123 | 15 sec      │
│ 2026-04-18 14:45 | approve_rmk      | DOC-234 | 45 sec      │
│ 2026-04-17 09:12 | approve_kaprodi | DOC-345 | 28 sec      │
├─────────────────────────────────────────────────────────────┤
│ [View Full Audit Log] [Download Metrics] [Configure Alerts] │
└─────────────────────────────────────────────────────────────┘
```

#### Technical Implementation

**API Endpoint:**
```typescript
// GET /api/governance/metrics
async function getGovernanceMetrics(req, res) {
  const metrics = {
    freshnessRate: await calculateFreshnessViolationRate(),
    lowConfidenceRate: await calculateLowConfidenceRate(),
    avgMinorCorrections: await calculateAvgMinorCorrections(),
    driftIncidents: await getDriftIncidentCount(),
    activeFlags: await getActiveFlags(),
    recentLowConfidenceApprovals: await getRecentLowConfidenceApprovals(10)
  };

  res.json(metrics);
}
```

**Frontend Component:**
```typescript
// Simple dashboard, auto-refresh every 5 minutes
"use client";

export function GovernanceDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const response = await fetch('/api/governance/metrics');
      const data = await response.json();
      setMetrics(data);
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000); // 5 min

    return () => clearInterval(interval);
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="governance-dashboard">
      <MetricCard
        title="Freshness Rate"
        value={`${metrics.freshnessRate}%`}
        status={getStatus(metrics.freshnessRate, 5, 15)}
      />
      {/* ... other metrics */}
    </div>
  );
}
```

---

### 7.5 Governance Incident Tracking

**Incident Categories:**

1. **Critical** (Immediate response required)
   - Drift threshold breach
   - Rushed substantive approval (< 30 sec)

2. **Warning** (Review within 1 week)
   - Low confidence approval
   - Excessive minor corrections

3. **Informational** (Monitor only)
   - Metric trend changes
   - Escalation overrides

**Incident Lifecycle:**
```
Detected → Logged → Reviewed → Action Taken → Closed → Monitored
```

**Database Schema:**
```typescript
model GovernanceIncident {
  id          String   @id
  type        String   // "critical", "warning", "informational"
  category    String   // "drift_breach", "rushed_approval", etc.
  severity    String   // "critical", "warning", "info"
  description String
  rpsId       String?
  actorId     String?
  detectedAt  DateTime @default(now())
  reviewedAt  DateTime?
  reviewedBy  String?
  actionTaken String?
  closedAt    DateTime?
  status      String   @default("open") // "open", "in_review", "closed"
}
```

---

### 7.6 Closed-Loop Assurance

**The Complete Governance Loop:**

```
┌─────────────────────────────────────────────────────────────┐
│                    DESIGN LAYER                             │
│  - Policy documents (5 docs)                                │
│  - Rules & safeguards defined                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  IMPLEMENTATION LAYER                       │
│  - Service layer with guards                                │
│  - Audit trail logging                                      │
│  - State machine enforcement                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  OBSERVABILITY LAYER                        │
│  - Metrics collection                                       │
│  - Automated flagging                                       │
│  - Dashboard visibility                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  CORRECTIVE LAYER                           │
│  - Incident review                                          │
│  - Operational reviews (weekly/monthly)                     │
│  - System tuning                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
                    Back to Design
                (Policy improvements)
```

---

### 7.7 Implementation Priority

**Phase 1: Basic Metrics** (Week 1)
- [ ] Implement 5 core metric queries
- [ ] Create metrics API endpoint
- [ ] Build basic dashboard

**Phase 2: Automated Flags** (Week 2)
- [ ] Implement 4 flag types
- [ ] Set up notification system
- [ ] Create incident tracking schema

**Phase 3: Review Loops** (Week 3)
- [ ] Schedule weekly review meetings
- [ ] Create monthly audit template
- [ ] Define incident response procedures

**Phase 4: Closed-Loop Tuning** (Ongoing)
- [ ] Review metrics monthly
- [ ] Adjust thresholds based on data
- [ ] Update policies as needed

---

### 7.8 Success Criteria

**The governance system is considered "operational" when:**

- [ ] All 5 metrics are calculated and visible
- [ ] At least 30 days of baseline data collected
- [ ] Dashboard is accessible and reviewed weekly
- [ ] Automated flags are functioning
- [ ] Incident tracking system is active
- [ ] At least 1 monthly governance audit completed
- [ ] At least 1 policy adjustment made based on metrics

---

**This completes the closed-loop governance system.**

**Without observability:** Governance design degrades silently
**With observability:** Governance system maintains effectiveness over time

---

## Appendix A: Quick Reference

### Non-Negotiable Rules (Copy-Paste for PR Reviews)

```markdown
## Governance Compliance Checklist

- [ ] All state transitions through guard functions
- [ ] All writes update audit trail
- [ ] All edits update `lastChangedAt`
- [ ] Minor corrections use whitelist + classification
- [ ] Approvals check freshness + confidence
- [ ] Business logic in service layer
- [ ] No silent overrides without reason
- [ ] All guards present (verify against policy)
- [ ] Configuration in constants
- [ ] Tests include abuse scenarios
```

---

## Appendix B: Contact & Escalation

### Questions About Implementation

- **Technical Clarification:** Lead Developer
- **Policy Interpretation:** Governance Architect
- **Override Request:** Stakeholder Committee

### Emergencies (Production Issues)

If governance system blocks legitimate operation:
1. DO NOT remove guards
2. Document the case
3. Emergency meeting with stakeholders
4. Decide: policy change vs. exception handling
5. Implement solution with proper audit trail

---

## Final Statement

**This contract is enforceable.**

Any implementation that violates these rules is considered **INCOMPLETE** and **NON-COMPLIANT** with Fase 2 governance design.

**Principle:**
> "A governance system is only as strong as its implementation fidelity.
> Perfect policy with imperfect execution = no governance at all."

---

**Status:** READY FOR IMPLEMENTATION
**Requirement:** All developers MUST read and sign before writing governance code

---

**Version:** 1.0
**Page:** 1 of 1
**For Technical Use Only** (Not for stakeholder distribution)
