# Fase 2 Governance Policy - Decision Table

**Status:** DRAFT - Subject to stakeholder approval
**Version:** 0.1
**Last Updated:** 2026-04-19

---

## 1. State Machine Definition

```
┌─────────────────────────────────────────────────────────────┐
│                    RPS DOCUMENT LIFECYCLE                    │
└─────────────────────────────────────────────────────────────┘

draft
  ↓ [submit by dosen]
submitted_to_rmk
  ↓ [start_review by RMK] OR [revision_requested by RMK]
revision_requested_by_rmk (edit mode, max 3 cycles)
  ↓ [resubmit by dosen]
submitted_to_rmk
  ↓ [approve_rmk by RMK]
approved_by_rmk
  ↓ [submit_to_kaprodi by RMK or auto-advance]
submitted_to_kaprodi
  ↓ [approve_kaprodi by Kaprodi]
approved ──────────────────────────────────→ IMMUTABLE
  ↓ [revise by dosen → create new version]
superseded
  ↓ [auto-archive]
archived (read-only, never active)
```

---

## 2. Role × Status × Action Matrix

| Status | Dosen (Owner) | RMK | Kaprodi | Admin |
|--------|---------------|-----|---------|-------|
| **draft** | ✅ Edit, Submit | ❌ View only | ❌ View only | 🔧 Revoke |
| **submitted_to_rmk** | ❌ Locked | ✅ Review, Approve, Reject | ❌ View only | 🔧 Revoke |
| **revision_requested_by_rmk** | ✅ Edit, Resubmit | ✅ View only | ❌ View only | 🔧 Revoke |
| **approved_by_rmk** | ❌ Locked | ✅ Submit to Kaprodi | ❌ View only | 🔧 Revoke |
| **submitted_to_kaprodi** | ❌ Locked | ❌ View only | ✅ Approve, Reject | 🔧 Revoke |
| **revision_requested_by_kaprodi** | ✅ Edit, Resubmit | ❌ View only | ✅ View only | 🔧 Revoke |
| **approved** | ❌ View only | ❌ View only | ❌ View only | 🔧 Revoke (with reason) |
| **superseded** | ❌ View only | ❌ View only | ❌ View only | 🔧 Archive |
| **archived** | ❌ View only | ❌ View only | ❌ View only | 🔧 Restore (if needed) |

**Legend:**
- ✅ = Allowed
- ❌ = Forbidden (throws error)
- 🔧 = Admin override (requires audit reason)

---

## 3. Transition Guards

### 3.1 Submit (Dosen → System)

**Preconditions:**
```typescript
assertCanSubmit(rps, userId) {
  assertOwnership(rps, userId);
  assertStatus(rps, ["draft", "revision_requested_by_rmk"]);
  assertMinContentRequired(rps); // CPL, CPMK, pertemuan valid
}
```

**Action:**
```typescript
if (currentStatus === "draft") {
  nextStatus = "submitted_to_rmk";
} else if (currentStatus === "revision_requested_by_rmk") {
  revisionCycle++;
  if (revisionCycle > 3) {
    throw Error("Maximum revision cycles exceeded. Please create new version.");
  }
  nextStatus = "submitted_to_rmk"; // Resubmit
}
```

---

### 3.2 Approve/Reject (RMK/Kaprodi)

**RMK Approval:**
```typescript
assertRMKApproval(rps, actorRole) {
  assertStatus(rps, "submitted_to_rmk");
  assertRole(actorRole, ["koordinator_rmk"]);
  assertNotApprover(rps, actorId); // Cannot approve own submission (if applicable)
}

nextStatus = "approved_by_rmk";
```

**RMK Rejection:**
```typescript
nextStatus = "revision_requested_by_rmk";
requireReason = true; // Must provide rejection notes
```

**Kaprodi Approval:**
```typescript
assertKaprodiApproval(rps, actorRole) {
  assertStatus(rps, "submitted_to_kaprodi");
  assertRole(actorRole, ["kaprodi"]);
}

nextStatus = "approved"; // FINAL
```

**Kaprodi Rejection:**
```typescript
nextStatus = "revision_requested_by_kaprodi";
requireReason = true;
```

---

### 3.3 Revise (Create New Version)

**Preconditions:**
```typescript
assertCanRevise(rps, userId) {
  assertOwnership(rps, userId);
  assertStatus(rps, "approved"); // Only approved documents can create new version
}
```

**Action:**
```typescript
// Clone RPS
const newVersion = await cloneRps(rpsId);
newVersion.version = rps.version + 1;
newVersion.parentId = rps.id;
newVersion.status = "draft";

// Mark old version
rps.status = "superseded";
```

---

### 3.4 Admin Revoke

**Preconditions:**
```typescript
assertAdminRevoke(rps, adminId, reason) {
  assertRole(adminId, ["admin"]);
  assertStatus(rps, ["approved", "superseded"]); // Can revoke final docs
  assertReasonNotEmpty(reason);
}
```

**Action:**
```typescript
// Soft revoke
rps.status = "draft"; // Reset to draft
rps.revokedAt = now();
rps.revokedBy = adminId;
rps.revokeReason = reason;

// Log to approval history
await createApprovalLog({
  rpsId,
  action: "admin_revoke",
  actorId: adminId,
  notes: `Admin revoke: ${reason}`
});
```

---

## 4. Immutable Rules

### 4.1 Approved Document Lock

```typescript
function assertNotImmutable(rps) {
  if (rps.status === "approved") {
    throw new ForbiddenError(
      "Dokumen sudah disetujui dan tidak dapat diubah. " +
      "Silakan buat versi baru untuk perubahan."
    );
  }
}
```

### 4.2 Edit Guard

All edit operations MUST call:
```typescript
assertCanEdit(rps, userId) {
  assertNotImmutable(rps);
  assertOwnership(rps, userId);
  assertStatus(rps, EDITABLE_STATUSES); // draft, revision_requested_*
}
```

---

## 5. Version Integrity Rules

### 5.1 Version Numbering

- New RPS: version = 1
- Revision: version = parent.version + 1
- Format: "v{number}" (e.g., "v1", "v2")

### 5.2 Parent-Child Relationship

```typescript
RPS {
  id: string
  version: number
  parentId?: string  // Points to previous version
  status: RpsStatus
}
```

### 5.3 Version Status Transitions

```
v1 (approved) ──[revise]──> v1 → superseded
                            v2 (draft) ──...──> v2 → approved
```

**Rule:** Only ONE version can be `approved` at a time per course.

---

## 6. Audit Requirements

### 6.1 Approval History Log

ALL status changes MUST log:

```typescript
ApprovalLog {
  id
  rpsId
  version: string  // "v1", "v2"
  action: string  // "submit", "approve_rmk", "reject_kaprodi", "admin_revoke"
  actorId: string
  actorRole: string
  actorName: string  // Denormalized for audit
  catatanReview?: string
  createdAt: Date
}
```

### 6.2 Required Actions

These actions MUST have notes:
- `reject_rmk`
- `reject_kaprodi`
- `admin_revoke`
- `clone_for_revision`

---

## 7. Open Questions (Stakeholder Input Needed)

### Q1: Maximum Revision Cycles
- **Proposal:** 3 cycles max for RMK revision
- **Question:** Apakah terlalu ketat? Atau terlalu longgar?

### Q2: RMK Auto-Advance to Kaprodi
- **Option A:** RMK approve → auto-submit to Kaprodi
- **Option B:** RMK approve → manual submit by RMK
- **Question:** Mana yang sesuai workflow institusi?

### Q3: Admin Revoke Authority
- **Proposal:** Admin bisa revoke approved docs dengan alasan
- **Question:** Apakah perlu 2-factor approval (2 admins)?

### Q4: Version Superseded Visibility
- **Option A:** Superseded versions visible to all
- **Option B:** Only visible to owner + admin
- **Question:** Mana yang sesuai kebijakan data?

---

## 8. Implementation Priority

**Phase 2.1 - Core Guards (MUST)**
- [ ] State machine implementation
- [ ] Transition guard functions
- [ ] Immutable approved lock
- [ ] Version cloning logic

**Phase 2.2 - Approval Workflow (MUST)**
- [ ] Submit/Approve/Reject endpoints
- [ ] Approval history logging
- [ ] Role-based access control

**Phase 2.3 - Version Management (SHOULD)**
- [ ] Version list view
- [ ] Version comparison
- [ ] Superseded document handling

**Phase 2.4 - Admin Tools (OPTIONAL)**
- [ ] Admin revoke
- [ ] Emergency restore
- [ ] Audit log viewer

---

## 9. Compliance Checklist

Before implementing, verify:

- [ ] All stakeholders agree on state machine
- [ ] Role permissions documented and approved
- [ ] Version rules accepted
- [ ] Audit requirements clear
- [ ] Edge cases covered (orphaned docs, lost owners, etc.)

---

**This document is the foundation for Fase 2 implementation.**
**No code should be written until this policy is locked.**
