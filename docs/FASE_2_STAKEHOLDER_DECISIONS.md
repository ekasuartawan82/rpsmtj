# Fase 2 Governance - Stakeholder Decision Sheet

**Purpose:** Final policy decisions requiring stakeholder sign-off before implementation
**Date:** 2026-04-19
**Status:** AWAITING APPROVAL

---

## Instructions

Please review each decision below and initial your approval. Once all 4 decisions are finalized, implementation can proceed.

**Legend:**
- ✅ = Approved
- ❌ = Rejected (please specify alternative)
- 🔄 = Requires discussion

---

## Decision 1: Revision State Model

**Question:** Should revision states be separated by reviewer role?

### Options

**Option A: Separated States (RECOMMENDED)**
```
- revision_requested_by_rmk (RMK rejects)
- revision_requested_by_kaprodi (Kaprodi rejects)
```
**Pros:**
- Clear accountability (who requested revision)
- Different revision reasons per stage
- Different resubmit rules possible
- UI shows specific reviewer feedback

**Cons:**
- More states to manage (2 instead of 1)

**Option B: Combined State**
```
- revision_requested (generic)
```
**Pros:**
- Simpler state machine
- Fewer database states

**Cons:**
- Loses context (who rejected?)
- Moves complexity to conditional logic
- Harder to query "rejected by RMK vs Kaprodi"

### Technical Recommendation

**Option A (Separated)**

### Stakeholder Decision

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Kaprodi | | _____________ | |
| Koordinator RMK | | _____________ | |
| Dosen Representative | | _____________ | |
| Admin/Akademik | | _____________ | |

**Final Decision:** [ ] Option A  [ ] Option B  [ ] Other (specify): __________

---

## Decision 2: RMK Approval → Kaprodi Forwarding

**Question:** Should RMK approval automatically forward to Kaprodi?

### Options

**Option A: Auto-Advance (RECOMMENDED)**
```
RMK approves → automatically moves to submitted_to_kaprodi
```
**Pros:**
- Faster workflow
- No bottleneck at RMK
- Clear accountability (RMK approval = endorsement)
- Fewer manual steps

**Cons:**
- RMK cannot "park" approvals
- No batching possibility
- Kaprodi immediately receives all RMK-approved RPS

**Option B: Manual Forward**
```
RMK approves → stays in approved_by_rmk state
RMK manually clicks "Submit to Kaprodi"
```
**Pros:**
- RMK controls timing
- Can batch submissions
- Review period buffer

**Cons:**
- Additional manual step
- Potential workflow delay
- More complex UI

**Option C: Conditional Auto-Advance**
```
Auto-advance after X hours/days OR manual forward button
```
**Pros:**
- Flexibility with default automation
- Best of both worlds

**Cons:**
- Most complex implementation
- User confusion (when will it forward?)

### Technical Recommendation

**Option A (Auto-Advance)**

### Stakeholder Decision

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Kaprodi | | _____________ | |
| Koordinator RMK | | _____________ | |
| Dosen Representative | | _____________ | |
| Admin/Akademik | | _____________ | |

**Final Decision:** [ ] Option A  [ ] Option B  [ ] Option C  [ ] Other: __________

---

## Decision 3: Display Status for Revoked Documents

**Question:** How should documents with status `approved + revoked` be displayed to users?

### Context

A document can be:
- **Historically approved** (was officially signed off)
- **Currently revoked** (admin cancelled it)

### Options

**Option A: Show "Revoked" (RECOMMENDED)**
```
Primary badge: "REVOKED"
Secondary info: "Was approved on [date], revoked on [date]"
```
**Pros:**
- Clear operational status
- Users won't mistakenly use revoked doc
- Follows principle: record_status drives display

**Cons:**
- Loses "was approved" context
- May confuse why it's revoked (need to check details)

**Option B: Show "Approved (Revoked)"**
```
Primary badge: "APPROVED (REVOKED)"
or
Badge: "APPROVED" + badge: "REVOKED"
```
**Pros:**
- Preserves both statuses
- Full transparency

**Cons:**
- More complex UI
- Could be confusing (is it active or not?)

**Option C: Show Based on Context**
```
For owner: "REVOKED - Create new version"
For others: "REVOKED - Not available for use"
```
**Pros:**
- Contextual guidance
- Clear next steps

**Cons:**
- Inconsistent display
- More complex logic

### Technical Recommendation

**Option A (Show "Revoked")**

With detailed status shown in document info panel:
- Workflow Status: Approved
- Record Status: Revoked
- Revoke Reason: [displayed]
- Revoked By: [displayed]
- Revoked Date: [displayed]

### Stakeholder Decision

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Kaprodi | | _____________ | |
| Koordinator RMK | | _____________ | |
| Dosen Representative | | _____________ | |
| Admin/Akademik | | _____________ | |

**Final Decision:** [ ] Option A  [ ] Option B  [ ] Option C  [ ] Other: __________

---

## Decision 4: Superseded Document Visibility

**Question:** How should old versions (superseded documents) be accessible?

### Context

When a new version is created, the old version is marked `superseded`. Should it be:
- Hidden from all lists?
- Visible only in version history?
- Fully visible like active documents?

### Options

**Option A: Version History Only (RECOMMENDED)**
```
- Does NOT appear in main RPS list
- Appears ONLY in "Version History" panel
- Accessible via: "View all versions" button
```
**Pros:**
- Main list shows only current active versions
- Avoids confusion
- Historical transparency maintained
- Clear separation: current vs historical

**Cons:**
- Requires extra UI panel
- Not immediately visible that versions exist

**Option B: Owner + Admin Only**
```
- Visible to document owner
- Visible to admins
- Hidden from others
```
**Pros:**
- Privacy maintained
- Owner can reference old versions
- Admin oversight kept

**Cons:**
- Inconsistent visibility
- RMK/Kaprodi cannot see evolution

**Option C: Fully Visible**
```
- Appears in all lists (with badge: "SUPERSEDED")
- Anyone can view
```
**Pros:**
- Maximum transparency
- Simplest logic

**Cons:**
- Clutters main lists
- Users may open superseded docs by mistake
- Confusing: which version should I use?

### Technical Recommendation

**Option A (Version History Only)**

Implementation:
- Main list filters: `recordStatus = 'active'`
- Version History panel: shows all versions (active + superseded + archived + revoked)
- Each document has "View Version History" button

### Stakeholder Decision

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Kaprodi | | _____________ | |
| Koordinator RMK | | _____________ | |
| Dosen Representative | | _____________ | |
| Admin/Akademik | | _____________ | |

**Final Decision:** [ ] Option A  [ ] Option B  [ ] Option C  [ ] Other: __________

---

## Summary Sheet

Once signed, these decisions will be locked into:

1. Database schema (Prisma models)
2. State machine logic
3. API endpoints
4. UI/UX behavior

**Implementation will NOT proceed until all 4 decisions are finalized.**

---

## Approval Status

| Decision | Status | Approved By | Date |
|----------|--------|-------------|------|
| 1. Revision State Model | ⏳ Pending | | |
| 2. RMK Auto-Advance | ⏳ Pending | | |
| 3. Revoked Display | ⏳ Pending | | |
| 4. Superseded Visibility | ⏳ Pending | | |

**Overall Status:** ⏳ AWAITING STAKEHOLDER APPROVAL (0/4 decisions finalized)

---

## Next Steps

1. **Circulate this sheet** to all stakeholders (Kaprodi, RMK, Dosen, Admin)
2. **Discuss options** in meeting if needed
3. **Collect signatures** for all 4 decisions
4. **Return signed sheet** to technical team
5. **Implementation begins** within 5 business days of sign-off

---

**Questions? Contact:** Technical Team / Document Engine Maintainers

---

**Version:** 1.0
**Page:** 1 of 1
**For Official Use**
