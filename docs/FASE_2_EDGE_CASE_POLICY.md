# Fase 2 Governance - Edge Case Policy Addendum

**Purpose:** Handle operational realities that strict policy doesn't cover
**Status:** Supplements FASE_2_GOVERNANCE_POLICY_V2.md
**Version:** 1.0
**Last Updated:** 2026-04-19

---

## Overview

Base policy (v2) provides the governance framework. This addendum handles edge cases that occur in real-world operations while maintaining audit integrity.

**Principle:** Flexible operations without compromising audit defensibility.

---

## Rule 1: Re-Review Loop After Kaprodi Rejection

**Problem:** When Kaprodi rejects, should document return to RMK or go directly back to Kaprodi?

### Policy Decision: **Strict Loop (Return to RMK)**

```
submitted_to_kaprodi
  ↓ [Kaprodi reject]
revision_requested_by_kaprodi
  ↓ [Dosen edit & resubmit]
submitted_to_rmk  ← BACK TO RMK REVIEW
  ↓ [RMK approve]
submitted_to_kaprodi
  ↓ [Kaprodi approve]
approved
```

### Rationale

1. **Quality Gate:** RMK remains academic gatekeeper even after Kaprodi review
2. **Consistency:** All changes must pass through same academic review channel
3. **Accountability:** RMK sees what changed after their initial approval

### Implementation

```typescript
function resubmitAfterKaprodiRejection(rpsId, userId) {
  // Preconditions
  assertWorkflowStatus(rpsId, "revision_requested_by_kaprodi");
  assertOwnership(rpsId, userId);

  // Action
  rps.workflowStatus = "submitted_to_rmk"; // ← Back to RMK, NOT Kaprodi

  // Notify RMK
  await notifyRMK(rpsId, {
    type: "resubmit_after_kaprodi_rejection",
    message: "Dokumen yang pernah Anda setujui telah direvisi sesuai masukan Kaprodi. Mohon review ulang."
  });
}
```

### Edge Case Handling

**Question:** What if RMK initially approved, then sees major changes after Kaprodi rejection?

**Answer:** RMK can reject again (back to revision_requested_by_rmk)

**Result:** Document cycles through RMK → Kaprodi → RMK again until both approve.

---

## Rule 2: Minor Correction Path (No Version Increment)

**Problem:** Typo fixes, metadata updates shouldn't require full version cloning.

### Policy Decision: **Admin Minor Correction (Same Version)**

```
approved + active
  ↓ [admin minor correction]
approved + active (same version, updated fields)
```

### Constraints

**ONLY allowed for:**
- Typos in mata kuliah name, SKS, kode
- Metadata corrections (semester, tahun akademik)
- Formatting errors (non-substantive)

**NOT allowed for:**
- CPL/CPMK changes
- Pertemuan content changes
- Dosen assignments
- Bobot penilaian changes

### Implementation

```typescript
function adminMinorCorrection(rpsId, adminId, corrections, reason) {
  // Preconditions
  assertRole(adminId, "admin");
  assertWorkflowStatus(rpsId, "approved");
  assertRecordStatus(rpsId, "active");
  assertReasonNotEmpty(reason);

  // Validate only non-substantive fields
  assertMinorCorrectionFields(corrections);

  // Apply corrections WITHOUT version increment
  await updateRps(rpsId, corrections);

  // Log to approval history (MANDATORY)
  await logApproval({
    rpsId,
    action: "admin_minor_correction",
    actorId: adminId,
    notes: `Minor correction: ${reason}`,
    fieldsChanged: Object.keys(corrections),
    timestamp: new Date()
  });

  // Notify owner
  await notifyOwner(rpsId, {
    type: "admin_minor_correction",
    message: "Admin melakukan koreksi minor pada dokumen Anda."
  });
}

function assertMinorCorrectionFields(corrections) {
  const allowedFields = [
    "namaMatkul", // Typo fix only
    "kodeMatkul", // Typo fix only
    "sks",        // Only if provably wrong (e.g., 2 → 3, not 3 → 2)
    "tahunAkademik",
    "semester"
  ];

  const changedFields = Object.keys(corrections);

  for (const field of changedFields) {
    if (!allowedFields.includes(field)) {
      throw new ForbiddenError(
        `Field "${field}" tidak boleh diubah melalui minor correction. ` +
        `Gunakan proses revisi biasa (create new version).`
      );
    }
  }
}
```

### Audit Trail

**All minor corrections MUST:**
- Be logged in approval history with `action: "admin_minor_correction"`
- List all changed fields
- Require explicit reason from admin
- Notify document owner

**Example log entry:**
```
Action: admin_minor_correction
Actor: Admin (Jane Doe)
Reason: Koreksi typo kode mata kuliah: MTJ 101 → MTJ 102
Fields Changed: kodeMatkul
Timestamp: 2026-04-19 10:30:00
```

---

## Rule 3: Soft Revision Limits (Warning, Not Hard Block)

**Problem:** Hard limits (3 revisions max) force version creation even for minor iterations.

### Policy Decision: **Soft Warning with Override**

```typescript
const REVISION_LIMITS = {
  MAX_REVISION_CYCLES_RMK: 3,
  MAX_REVISION_CYCLES_KAPRODI: 2,
};

function resubmitWithRevisionCheck(rpsId, userId) {
  const revisionCount = getRevisionCount(rpsId);
  const limit = getCurrentLimit(rpsId);

  if (revisionCount >= limit) {
    // SOFT WARNING
    const warning = `Batas revisi terlampaui (${revisionCount}/${limit}). ` +
                   `Silakan lanjutkan atau buat versi baru.`;

    // DO NOT THROW - allow user to decide
    notifyUser(userId, {
      type: "revision_limit_warning",
      message: warning,
      canContinue: true,
      alternativeAction: "create_new_version"
    });

    // Log the warning for audit
    await logApproval({
      rpsId,
      action: "revision_limit_exceeded_warning",
      notes: `Revision count: ${revisionCount}, Limit: ${limit}. User chose to continue.`
    });
  }

  // Allow resubmit regardless
  await resubmit(rpsId, userId);
}
```

### UI Behavior

When revision limit exceeded:

```
┌─────────────────────────────────────────┐
│ ⚠️  Peringatan Revisi                 │
│                                         │
│ Anda telah melewati batas revisi (3/3). │
│                                         │
│ [Lanjutkan Revisi Ini]  [Buat Versi Baru]│
│                                         │
│ Catatan: Revisi berlebih akan           │
│ mempengaruhi kualitas akademik.        │
└─────────────────────────────────────────┘
```

### Override Tracking

If user continues despite warning:
- Log the decision
- Tag in approval history: `revision_limit_override`
- Count as "exception" in reporting

---

## Rule 4: Exception Request Path (Formal Override)

**Problem:** Legitimate edge cases don't fit standard workflow.

### Policy Decision: **Formal Exception Request**

When user needs to bypass standard rules:

1. **Submit Exception Request**
   ```
   POST /api/rps/:id/exception-request
   {
     reason: string,
     requestedAction: string,
     justification: string
   }
   ```

2. **Admin Review**
   - Admin sees request in dashboard
   - Can approve or reject exception

3. **If Approved**
   - Admin performs action on behalf of user
   - Logged with `exception_granted: true`
   - Notifies requestor

### Example Exception Cases

**Valid exceptions:**
- Emergency curriculum change (mid-semester)
- Data corruption recovery
- Accreditation urgent deadline

**Invalid exceptions:**
- Bypassing standard review for convenience
- Avoiding revision limits without justification

### Implementation

```typescript
async function handleExceptionRequest(rpsId, userId, request) {
  // Create pending exception
  const exception = await createExceptionRequest({
    rpsId,
    requestorId: userId,
    requestedAction: request.action,
    justification: request.justification
  });

  // Notify admins
  await notifyAdmins({
    type: "exception_request_pending",
    exceptionId: exception.id,
    rpsId
  });
}

async function approveException(exceptionId, adminId) {
  const exception = await getException(exceptionId);

  // Perform requested action
  switch (exception.requestedAction) {
    case "bypass_revision_limit":
      await forceResubmit(exception.rpsId);
      break;
    case "emergency_approval":
      await fastTrackApproval(exception.rpsId);
      break;
    // ... other exceptions
  }

  // Log exception grant
  await logApproval({
    rpsId: exception.rpsId,
    action: `exception_granted: ${exception.requestedAction}`,
    actorId: adminId,
    notes: `Exception request by ${exception.requestorId}: ${exception.justification}`
  });

  // Notify requestor
  await notifyUser(exception.requestorId, {
    type: "exception_approved",
    message: "Exception request Anda telah disetujui."
  });
}
```

---

## Edge Case Scenarios (Real-World Testing)

### Scenario 1: Typo in Approved Document

**Situation:** RPS v2 approved, but mata kuliah name has typo "Teknik Analisis Lalu Lints" (extra 't')

**Old Policy:** Create v3 (version inflation)

**New Policy:** Admin minor correction
```typescript
adminMinorCorrection(v2, adminId, {
  namaMatkul: "Teknik Analisis Lalu Lintas"
}, "Perbaikan typo di nama mata kuliah");
```

**Result:** v2 corrected, no v3 needed.

---

### Scenario 2: Kaprodi Rejects Major Change

**Situation:**
- v1 approved by RMK
- Kaprodi rejects because CPL changed significantly
- Dosen fixes and resubmits

**Old Policy:** Ambiguous (return to RMK or back to Kaprodi?)

**New Policy:** Explicit loop back to RMK
```
v1: approved_by_rmk → submitted_to_kaprodi
     ↓ [Kaprodi reject: CPL berubah]
v1: revision_requested_by_kaprodi
     ↓ [Dosen edit & resubmit]
v1: submitted_to_rmk  ← RMK reviews changes again
     ↓ [RMK approve]
v1: submitted_to_kaprodi
     ↓ [Kaprodi approve]
v1: approved
```

**Result:** RMK sees what changed before re-approving.

---

### Scenario 3: Exceeds Revision Limit

**Situation:** RPS rejected 4 times by RMK (would trigger hard limit)

**Old Policy:** BLOCKED - "Batas revisi terlampaui. Buat versi baru."

**New Policy:** Soft warning + choice
```
⚠️ Anda telah melewati batas revisi (4/3).
   [Lanjutkan Revisi Ini]  [Buat Versi Baru]
```

If user continues:
- Document resubmits
- Logged as `revision_limit_override`
- Can continue working

**Result:** Flexibility without breaking system.

---

## Compliance Summary

| Rule | Purpose | Impact |
|------|---------|--------|
| **Re-Review Loop** | Maintain quality gate | RMK always reviews changes |
| **Minor Correction** | Avoid version inflation | Typos fixed without v(n+1) |
| **Soft Limits** | Operational flexibility | Warnings, not hard blocks |
| **Exception Path** | Handle edge cases | Formal override process |

---

## Implementation Priority

| Rule | Priority | Complexity |
|------|----------|------------|
| Rule 1 (Re-Review Loop) | 🔴 HIGH | Low (simple routing) |
| Rule 3 (Soft Limits) | 🟡 MEDIUM | Low (warning UI) |
| Rule 2 (Minor Correction) | 🟢 LOW | Medium (field validation) |
| Rule 4 (Exception Path) | 🟢 LOW | High (workflow system) |

**Recommendation:** Implement Rules 1 and 3 first (high value, low complexity). Rules 2 and 4 can be Phase 2.1.

---

## Audit Implications

All these rules add entries to approval history:

| Action | Log Entry | Audit Trail |
|--------|-----------|-------------|
| Re-review loop | `resubmit_after_kaprodi_rejection` | ✅ Visible |
| Minor correction | `admin_minor_correction` + fields | ✅ Visible |
| Soft limit override | `revision_limit_override` | ✅ Visible |
| Exception granted | `exception_granted` + justification | ✅ Visible |

**Result:** Full transparency maintained despite flexibility.

---

## Updated Stakeholder Decision Items

The 4 decisions from `FASE_2_STAKEHOLDER_DECISIONS.md` remain, but now include these edge cases:

**Decision 1 (Revision State):** Now includes re-review loop behavior
**Decision 3 (Revoked Display):** Minor corrections maintain `approved + active`
**Decision 4 (Superseded Visibility):** Exception handling for archival

---

## Governance Maturity: Final

With this addendum, system achieves:

**Level: Organizationally Resilient**

- ✅ Handles human imperfections
- ✅ Flexible without compromising audit
- ✅ Clear paths for edge cases
- ✅ Full transparency maintained

**Verdict:** Ready for implementation AND real-world use.

---

**This addendum completes the governance package.**
**Together with v2 policy and stakeholder decision sheet, system is now operationally mature.**
