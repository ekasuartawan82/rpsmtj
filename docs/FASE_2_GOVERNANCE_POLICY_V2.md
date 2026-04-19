# Fase 2 Governance Policy - Decision Table v2

**Status:** REVISED - Ready for stakeholder review
**Version:** 0.2
**Last Updated:** 2026-04-19
**Changes from v1:** Separated workflow vs record status, simplified state machine, fixed admin revoke model

---

## 1. Dual Status Model (CRITICAL)

**Key Insight:** Document has TWO independent status dimensions:

### 1.1 Workflow Status (Approval Progress)

Defines where document is in approval process.

```
draft → submitted_to_rmk → submitted_to_kaprodi → approved
              ↑                  ↑                    │
              │                  │                    │
              └── revision_requested_by_rmk/kaprodi ┘
```

**States:**
- `draft` - Initial state, editable by owner
- `submitted_to_rmk` - Locked, awaiting RMK review
- `submitted_to_kaprodi` - Locked, awaiting Kaprodi review
- `revision_requested_by_rmk` - Editable by owner (rejected by RMK)
- `revision_requested_by_kaprodi` - Editable by owner (rejected by Kaprodi)
- `approved` - Final, immutable

### 1.2 Record Status (Lifecycle Stage)

Defines document's version lifecycle.

```
active → superseded → archived
   ↓
revoked (can come from active or superseded)
```

**States:**
- `active` - Current version in use
- `superseded` - Replaced by newer version
- `archived` - Historical reference only
- `revoked` - Admin-cancelled (explained below)

### 1.3 Combination Matrix

| Workflow Status | Record Status | Meaning |
|-----------------|---------------|---------|
| `approved` | `active` | ✅ Official, current version |
| `approved` | `superseded` | ⚠️ Was official, replaced by v2 |
| `draft` | `active` | 📝 Work in progress |
| `submitted_to_*` | `active` | ⏳ In approval queue |
| Any | `revoked` | 🚫 Cancelled by admin |

**Rule:** `workflow_status` and `record_status` are independent dimensions.

---

## 2. Simplified State Machine

### 2.1 Normal Flow (Happy Path)

```
draft (owner edits)
  ↓ [submit]
submitted_to_rmk (locked)
  ↓ [auto-approve by RMK]
submitted_to_kaprodi (locked)
  ↓ [approve by Kaprodi]
approved + active (final)
```

### 2.2 Revision Flow (Correction)

```
submitted_to_rmk
  ↓ [reject by RMK]
revision_requested_by_rmk (owner edits)
  ↓ [resubmit]
submitted_to_rmk (back to queue)

submitted_to_kaprodi
  ↓ [reject by Kaprodi]
revision_requested_by_kaprodi (owner edits)
  ↓ [resubmit]
submitted_to_kaprodi (back to queue)
```

### 2.3 Version Creation Flow

```
approved + active
  ↓ [revise by owner → create new version]
old: approved + superseded
new: draft + active
```

### 2.4 Admin Revoke Flow (NEW - Corrected)

```
approved + active
  ↓ [admin revoke]
approved + revoked (OLD VERSION PRESERVED)

system auto-creates:
draft + active (NEW VERSION FOR OWNER)
```

**Key Point:** Admin revoke DOES NOT mutate old version. Old version stays "approved" but marked "revoked". New version created for owner to continue work.

---

## 3. Granular Permission Matrix

### 3.1 Three-Tier Permission Model

| Permission | Meaning | Example |
|------------|---------|---------|
| `can_list` | Can see document in list/dashboard | RMK can see all submitted RPS in their prodi |
| `can_view` | Can open document details | Kaprodi can view any submitted RPS |
| `can_act` | Can perform state-changing actions | RMK can approve/reject submitted documents |

### 3.2 Role × Status × Permission Matrix

#### Dosen (Owner)

| Status | can_list | can_view | can_act | Actions |
|--------|----------|----------|---------|---------|
| `draft` (own) | ✅ | ✅ | ✅ | Edit, Submit |
| `submitted_to_rmk` (own) | ✅ | ✅ | ❌ | View only |
| `revision_requested_by_rmk` (own) | ✅ | ✅ | ✅ | Edit, Resubmit |
| `submitted_to_kaprodi` (own) | ✅ | ✅ | ❌ | View only |
| `revision_requested_by_kaprodi` (own) | ✅ | ✅ | ✅ | Edit, Resubmit |
| `approved` (own) | ✅ | ✅ | ✅ | View, Create New Version |
| Others' documents | ❌ | ❌ | ❌ | None |

#### RMK (Koordinator)

| Status | can_list | can_view | can_act | Actions |
|--------|----------|----------|---------|---------|
| `draft` (in their prodi) | ✅ | ✅ | ❌ | View only (no edit) |
| `submitted_to_rmk` | ✅ | ✅ | ✅ | Approve, Reject (with notes) |
| `revision_requested_by_rmk` | ✅ | ✅ | ❌ | View only |
| `submitted_to_kaprodi` | ✅ | ✅ | ❌ | View only (passed their stage) |
| `approved` | ✅ | ✅ | ❌ | View only |

#### Kaprodi

| Status | can_list | can_view | can_act | Actions |
|--------|----------|----------|---------|---------|
| `draft` | ❌ | ❌ | ❌ | Not visible (too early) |
| `submitted_to_rmk` | ❌ | ❌ | ❌ | Not their stage yet |
| `submitted_to_kaprodi` | ✅ | ✅ | ✅ | Approve, Reject (with notes) |
| `revision_requested_by_kaprodi` | ✅ | ✅ | ❌ | View only |
| `approved` | ✅ | ✅ | ❌ | View only |

#### Admin

| Status | can_list | can_view | can_act | Actions |
|--------|----------|----------|---------|---------|
| All statuses | ✅ | ✅ | 🔧 | Revoke (with reason), Archive |

**Legend:** 🔧 = Admin override (requires audit reason)

---

## 4. Revision Cycle Policy (Configurable)

### 4.1 Configuration

```typescript
const REVISION_LIMITS = {
  MAX_REVISION_CYCLES_RMK: 3,      // Configurable per institution
  MAX_REVISION_CYCLES_KAPRODI: 2,  // Stricter for final stage
};
```

### 4.2 Enforcement

```typescript
function assertCanResubmit(rps) {
  const revisionCount = getRevisionCount(rps);

  if (rps.workflowStatus === "revision_requested_by_rmk") {
    if (revisionCount >= REVISION_LIMITS.MAX_REVISION_CYCLES_RMK) {
      throw new Error(
        `Batas revisi RMK terlampaui (${revisionCount}/${REVISION_LIMITS.MAX_REVISION_CYCLES_RMK}). ` +
        `Silakan buat versi baru.`
      );
    }
  }

  if (rps.workflowStatus === "revision_requested_by_kaprodi") {
    if (revisionCount >= REVISION_LIMITS.MAX_REVISION_CYCLES_KAPRODI) {
      throw new Error(
        `Batas revisi Kaprodi terlampaui (${revisionCount}/${REVISION_LIMITS.MAX_REVISION_CYCLES_KAPRODI}). ` +
        `Silakan buat versi baru.`
      );
    }
  }
}
```

### 4.3 Revision Round Tracking

```typescript
ApprovalLog {
  // ... existing fields
  revisionRound: number  // 1, 2, 3, etc.
}
```

Each `revision_requested_*` action:
- Increments `revisionRound`
- All subsequent actions tagged with that round
- Makes audit clearer: "Round 2 revisions"

---

## 5. Transition Guards (Finalized)

### 5.1 Submit (Dosen → System)

```typescript
function submitRps(rpsId, userId) {
  // Preconditions
  assertOwnership(rpsId, userId);
  assertWorkflowStatus(rpsId, ["draft", "revision_requested_by_rmk", "revision_requested_by_kaprodi"]);
  assertMinContentRequired(rpsId); // CPL, CPMK, pertemuan valid

  // Action
  if (rps.workflowStatus === "draft") {
    rps.workflowStatus = "submitted_to_rmk";
  } else {
    // Resubmit after revision
    rps.workflowStatus = "submitted_to_rmk";
  }

  rps.recordStatus = "active";

  // Auto-assign reviewers (optional)
  await assignToRMK(rpsId);
}
```

### 5.2 Approve/Reject (RMK/Kaprodi)

```typescript
function approveRMK(rpsId, actorId) {
  assertWorkflowStatus(rpsId, "submitted_to_rmk");
  assertRole(actorId, "koordinator_rmk");

  // APPROVAL ACTION
  rps.workflowStatus = "submitted_to_kaprodi"; // Auto-advance
  // Note: No "approved_by_rmk" intermediate state

  logApproval({
    action: "approve_rmk",
    workflowStatus: "submitted_to_kaprodi", // Next state
    revisionRound: getCurrentRound(rpsId)
  });
}

function rejectRMK(rpsId, actorId, notes) {
  assertWorkflowStatus(rpsId, "submitted_to_rmk");
  assertRole(actorId, "koordinator_rmk");
  assertNotesNotEmpty(notes);

  // REJECT ACTION
  rps.workflowStatus = "revision_requested_by_rmk";

  logApproval({
    action: "reject_rmk",
    notes,
    revisionRound: incrementAndGetRound(rpsId)
  });
}
```

### 5.3 Revise (Create New Version)

```typescript
function reviseApprovedRps(rpsId, userId) {
  // Preconditions
  assertOwnership(rpsId, userId);
  assertWorkflowStatus(rpsId, "approved");
  assertRecordStatus(rpsId, "active");

  // Clone RPS
  const newVersion = await cloneRps(rpsId);

  // Set up new version
  newVersion.version = rps.version + 1;
  newVersion.parentId = rpsId;
  newVersion.workflowStatus = "draft";
  newVersion.recordStatus = "active";

  // Mark old version
  rps.recordStatus = "superseded";

  // Log both sides
  logApproval(rpsId, { action: "superseded_by", newVersionId: newVersion.id });
  logApproval(newVersion.id, { action: "cloned_from", parentVersionId: rpsId });

  return newVersion;
}
```

### 5.4 Admin Revoke (Corrected Model)

```typescript
function adminRevokeRps(rpsId, adminId, reason) {
  assertRole(adminId, "admin");
  assertReasonNotEmpty(reason);

  const rps = await getRps(rpsId);

  // IMPORTANT: Do NOT mutate old version to draft
  // Instead: Mark as revoked + create new draft version

  // Step 1: Mark old version
  rps.recordStatus = "revoked";
  rps.revokedAt = new Date();
  rps.revokedBy = adminId;
  rps.revokeReason = reason;

  logApproval(rpsId, {
    action: "admin_revoke",
    notes: `Admin revoke: ${reason}`,
    adminId,
    adminRole: "admin"
  });

  // Step 2: Create new draft version for owner to continue
  const newVersion = await cloneRps(rpsId);
  newVersion.version = rps.version + 1;
  newVersion.parentId = rpsId;
  newVersion.workflowStatus = "draft";
  newVersion.recordStatus = "active";

  logApproval(newVersion.id, {
    action: "created_after_revoke",
    parentVersionId: rpsId,
    revokeReason: reason
  });

  return newVersion;
}
```

**Key Insight:** Admin revoke creates v(n+1) draft, preserves v(n) as "approved + revoked" for historical integrity.

---

## 6. Immutable Rules (Strict)

### 6.1 Approved Document Lock

```typescript
function assertCanEdit(rpsId, userId) {
  const rps = await getRps(rpsId);

  // Rule 1: Cannot edit approved documents
  if (rps.workflowStatus === "approved") {
    throw new ForbiddenError(
      "Dokumen sudah disetujui dan tidak dapat diubah. " +
      "Silakan buat versi baru untuk perubahan."
    );
  }

  // Rule 2: Cannot edit submitted documents (not owner's stage)
  if (rps.workflowStatus.startsWith("submitted_to_")) {
    throw new ForbiddenError(
      "Dokumen sedang dalam proses review dan tidak dapat diubah. " +
      "Tunggu hingga revisi diminta atau disetujui."
    );
  }

  // Rule 3: Only owner can edit
  assertOwnership(rpsId, userId);

  // Rule 4: Only edit if in draft or revision state
  assertWorkflowStatus(rpsId, ["draft", "revision_requested_by_rmk", "revision_requested_by_kaprodi"]);
}
```

---

## 7. Database Schema Implications

### 7.1 Separate Status Fields

```typescript
model Rps {
  id                String    @id
  version           Int
  parentId          String?

  // Dual status model
  workflowStatus    RpsWorkflowStatus  // Approval progress
  recordStatus      RpsRecordStatus    // Lifecycle stage

  // Revoke tracking
  revokedAt         DateTime?
  revokedBy         String?
  revokeReason      String?

  // ... other fields
}

enum RpsWorkflowStatus {
  draft
  submitted_to_rmk
  revision_requested_by_rmk
  submitted_to_kaprodi
  revision_requested_by_kaprodi
  approved
}

enum RpsRecordStatus {
  active
  superseded
  archived
  revoked
}
```

### 7.2 Revision Round Tracking

```typescript
model RpsApprovalLog {
  id              String    @id
  rpsId           String
  version         String    // "v1", "v2"
  action          String
  actorId         String
  actorRole       String
  actorName       String
  catatanReview   String?
  createdAt       DateTime

  revisionRound   Int       @default(1)  // NEW FIELD
}
```

---

## 8. API Endpoints (Proposed)

### 8.1 Workflow Actions

```
POST   /api/rps/:id/submit
POST   /api/rps/:id/approve-rmk
POST   /api/rps/:id/reject-rmk
POST   /api/rps/:id/approve-kaprodi
POST   /api/rps/:id/reject-kaprodi
POST   /api/rps/:id/revise        // Create new version from approved
```

### 8.2 Admin Actions

```
POST   /api/rps/:id/admin-revoke
POST   /api/rps/:id/archive
POST   /api/rps/:id/restore
```

### 8.3 Query Actions

```
GET    /api/rps?workflowStatus=draft&recordStatus=active
GET    /api/rps?workflowStatus=approved&recordStatus=superseded
GET    /api/rps/:id/version-history
```

---

## 9. Compliance Checklist (Revised)

Before implementing:

- [x] ✅ Workflow status separated from record status
- [x] ✅ State machine simplified (removed approved_by_rmk)
- [x] ✅ Admin revoke model corrected (preserves history)
- [x] ✅ Revision limits made configurable
- [x] ✅ Granular permissions (list/view/act)
- [x] ✅ Auto-advance from RMK to Kaprodi
- [ ] ⏳ Stakeholder approval pending
- [ ] ⏳ Edge cases documented (orphan docs, lost owners)

---

## 10. Open Questions (Refined)

### Q1: Auto-advance timing
- **Current:** RMK approve → immediately move to Kaprodi
- **Question:** Is there ever a need for delay? (e.g., batch approval)

### Q2: Revision limit defaults
- **Proposed:** RMK=3, Kaprodi=2
- **Question:** Are these limits appropriate for your institution?

### Q3: Superseded document visibility
- **Option A:** Visible to all (historical transparency)
- **Option B:** Only owner + admin (privacy)
- **Question:** Which aligns with your data policy?

---

## Summary of Changes from v1

| Aspect | v1 | v2 (Revised) |
|--------|----|--------------|
| Status model | Mixed (8 states) | Dual (6 workflow + 4 record) |
| approved_by_rmk | Separate state | Removed (auto-advance) |
| Admin revoke | Mutates to draft | Creates v(n+1), preserves v(n) |
| Revision limits | Hard-coded "3" | Configurable constants |
| Permissions | Binary (can/cannot) | Granular (list/view/act) |
| Revision rounds | Not tracked | Added `revisionRound` field |

---

**This policy is now semantically clean and ready for stakeholder review.**
**Once approved, it can be directly translated into implementation.**
