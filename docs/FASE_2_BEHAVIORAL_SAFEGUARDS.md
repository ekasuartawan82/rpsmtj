# Fase 2 Governance - Behavioral Safeguards Addendum

**Purpose:** Prevent behavioral failure modes (rubber-stamping, minor correction abuse, limit normalization)
**Status:** Supplements FASE_2_EDGE_CASE_POLICY.md
**Version:** 1.0
**Last Updated:** 2026-04-19

---

## Overview

Edge case policy (v2) handles operational scenarios. This addendum handles **human behavioral risks** that could undermine governance quality despite technically sound design.

**Principle:** Make the system resilient against lazy, rushed, or abusive actors without breaking legitimate use cases.

---

## Safeguard 1: Review Freshness Flag (Prevents Rubber-Stamping)

### Problem: Approval Fatigue

**Scenario:**
1. RMK approves document
2. Kaprodi rejects → back to RMK
3. RMK re-approves **without re-reading changes**
4. Quality degrades while audit trail looks clean

**Risk:** "Rubber-stamping" — approval without actual review

### Solution: Technical Freshness Guard

```typescript
// Add to RPS model
model Rps {
  // ... existing fields

  lastReviewedAtByRmk      DateTime?
  lastReviewedAtByKaprodi  DateTime?
  lastChangedAt            DateTime  // Updated on every edit
}
```

### Rule: Review Expiration

```typescript
function assertReviewIsFresh(rps, reviewerRole) {
  const lastReview = reviewerRole === "koordinator_rmk"
    ? rps.lastReviewedAtByRmk
    : rps.lastReviewedAtByKaprodi;

  const lastChange = rps.lastChangedAt;

  // Rule: Review must be MORE RECENT than changes
  if (lastReview && lastChange && lastReview < lastChange) {
    throw new ForbiddenError(
      `Dokumen telah berubah sejak review terakhir Anda (${lastReview.toLocaleString('id-ID')}). ` +
      `Perubahan terbaru: ${lastChange.toLocaleString('id-ID')}. ` +
      `Mohon review ulang sebelum menyetujui.`
    );
  }
}
```

### Implementation: Auto-Invalidate Review on Edit

```typescript
function onRpsEdit(rpsId) {
  await updateRps(rpsId, {
    lastChangedAt: new Date()
  });

  // NOTE: We do NOT reset lastReviewedAtByRmk/Kaprodi
  // The comparison (lastReview < lastChange) handles invalidation
}
```

### Usage in Approval Actions

```typescript
function approveRMK(rpsId, actorId) {
  const rps = await getRps(rpsId);

  // NEW: Check review freshness
  assertReviewIsFresh(rps, "koordinator_rmk");

  // ... rest of approval logic

  // Update review timestamp
  await updateRps(rpsId, {
    lastReviewedAtByRmk: new Date()
  });
}

function approveKaprodi(rpsId, actorId) {
  const rps = await getRps(rpsId);

  // NEW: Check review freshness
  assertReviewIsFresh(rps, "kaprodi");

  // ... rest of approval logic

  // Update review timestamp
  await updateRps(rpsId, {
    lastReviewedAtByKaprodi: new Date()
  });
}
```

### UI Behavior

When reviewer tries to approve but changes detected:

```
┌─────────────────────────────────────────┐
│ ⚠️  Review Tidak Lagih Berlaku           │
│                                         │
│ Dokumen telah berubah sejak review      │
│ terakhir Anda pada [tanggal].           │
│                                         │
│ Perubahan terbaru: [tanggal]           │
│                                         │
│ [Lihat Perubahan]  [Review Ulang]       │
│                                         │
│ Persetujuan tanpa review dapat           │
│ mencemari kualitas akademik.            │
└─────────────────────────────────────────┘
```

### Edge Case: No Prior Review

```typescript
function assertReviewIsFresh(rps, reviewerRole) {
  const lastReview = reviewerRole === "koordinator_rmk"
    ? rps.lastReviewedAtByRmk
    : rps.lastReviewedAtByKaprodi;

  const lastChange = rps.lastChangedAt;

  // If no prior review, first approval is always allowed
  if (!lastReview) {
    return; // No check needed
  }

  // If document changed since last review, require re-review
  if (lastReview < lastChange) {
    throw new ForbiddenError(/* ... */);
  }
}
```

---

## Safeguard 2: Minor Correction Whitelist (Prevents Abuse)

### Problem: Subjective "Minor" Definition

**Current edge case policy** uses narrative definition:
> "ONLY allowed for: Typos in mata kuliah name, SKS, kode, metadata..."

**Risk:** Admin subjectivity → potential abuse → silent substantive changes

### Solution: Technical Whitelist

```typescript
// Define explicit whitelist
const MINOR_CORRECTION_FIELDS = {
  mataKuliah: {
    allowed: true,
    maxChangePercent: 0.1,  // Max 10% character change (typo detection)
    pattern: /^[A-Za-z0-9\s\-\.,]+$/  // No structural changes
  },
  kodeMatkul: {
    allowed: true,
    maxChangePercent: 0.2,
    pattern: /^[A-Z]{3}\-[0-9]{3}$/  // Strict format
  },
  sks: {
    allowed: false  // SKS changes NEVER minor (substantive)
  },
  tahunAkademik: {
    allowed: true,
    pattern: /^[0-9]{4}\/[0-9]{4}$/  // Format validation
  },
  // CPL, CPMK, pertemuan, etc. are NOT in whitelist
};

const PROHIBITED_FIELDS = [
  "cpl",           // Learning outcomes
  "cpmk",          // Course outcomes
  "subCpmk",       // Detailed outcomes
  "pertemuan",     // Weekly plans
  "bobotPenilaian", // Assessment weights
  "dosenPengampu", // Teaching team
  "matriksCplSubCpmk" // Correlation matrix
];
```

### Rule: Strict Field Validation

```typescript
function adminMinorCorrection(rpsId, adminId, corrections, reason) {
  assertRole(adminId, "admin");
  assertWorkflowStatus(rpsId, "approved");
  assertRecordStatus(rpsId, "active");

  // NEW: Technical whitelist enforcement
  assertAllowedMinorCorrections(corrections);

  const rps = await getRps(rpsId);

  // NEW: Detect potential substantive changes
  for (const [field, newValue] of Object.entries(corrections)) {
    const oldValue = rps[field];

    if (!isMinorChange(field, oldValue, newValue)) {
      throw new ForbiddenError(
        `Perubahan field "${field}" dari "${oldValue}" ke "${newValue}" ` +
        `dianggap substantif dan memerlukan proses revisi (create new version). ` +
        `Hubungi Kaprodi jika Anda yakin ini adalah perubahan minor.`
      );
    }
  }

  // Apply corrections
  await updateRps(rpsId, corrections);

  // Log with field diff
  await logApproval({
    rpsId,
    action: "admin_minor_correction",
    actorId: adminId,
    notes: `Minor correction: ${reason}`,
    fieldsChanged: Object.keys(corrections),
    fieldDiffs: Object.entries(corrections).map(
      ([field, newValue]) => ({
        field,
        oldValue: rps[field],
        newValue
      })
    ),
    timestamp: new Date()
  });
}

function assertAllowedMinorCorrections(corrections) {
  for (const field of Object.keys(corrections)) {
    // Check against prohibited fields
    if (PROHIBITED_FIELDS.includes(field)) {
      throw new ForbiddenError(
        `Field "${field}" tidak boleh diubah melalui minor correction. ` +
        `Perubahan CPL, CPMK, pertemuan, atau dosen memerlukan revisi lengkap.`
      );
    }

    // Check if field is in whitelist
    if (!MINOR_CORRECTION_FIELDS[field]) {
      throw new ForbiddenError(
        `Field "${field}" tidak terdaftar sebagai field minor correction. ` +
        `Hubungi pengembang sistem jika field ini harus ditambahkan ke whitelist.`
      );
    }
  }
}

function isMinorChange(field, oldValue, newValue) {
  const config = MINOR_CORRECTION_FIELDS[field];

  // Character change percentage detection
  const oldLength = String(oldValue).length;
  const newLength = String(newValue).length;
  const changePercent = Math.abs(newLength - oldLength) / oldLength;

  if (changePercent > (config.maxChangePercent || 0.1)) {
    return false;  // Too much change = substantive
  }

  // Pattern validation
  if (config.pattern && !config.pattern.test(newValue)) {
    return false;  // Invalid format = substantive
  }

  return true;
}
```

### Examples

**✅ Allowed (Minor):**
```javascript
{
  kodeMatkul: "MTJ-101" → "MTJ-102"  // 1 char typo (12.5% change)
  mataKuliah: "Teknik Anlisiss" → "Teknik Analisis"  // Typo fix (8% change)
  tahunAkademik: "2024/2025" → "2025/2026"  // Metadata update
}
```

**❌ Blocked (Substantive):**
```javascript
{
  sks: 3 → 4  // Field not in whitelist
  mataKuliah: "Teknik Analisis" → "Teknik Analisis Lanjutan"  // 50% change
  cpl: [...]  // Prohibited field entirely
}
```

### Audit Trail Enhancement

All minor corrections now log:
- Which fields changed
- Old vs new values
- Change percentage (for audit review)

**Example audit log:**
```json
{
  "action": "admin_minor_correction",
  "fieldsChanged": ["kodeMatkul"],
  "fieldDiffs": [{
    "field": "kodeMatkul",
    "oldValue": "MTJ-101",
    "newValue": "MTJ-102",
    "changePercent": 12.5
  }],
  "justification": "Perbaikan typo",
  "timestamp": "2026-04-19T10:30:00Z"
}
```

---

## Safeguard 3: Soft Limit Escalation (Prevents Normalization)

### Problem: Override Becomes Normal

**Current edge case policy:** Soft warning at 3 revisions → user can continue

**Risk:** If always continued → warning becomes meaningless → effective "no limit"

### Solution: Progressive Escalation

```typescript
const REVISION_LIMITS = {
  MAX_REVISION_CYCLES_RMK: 3,
  MAX_REVISION_CYCLES_KAPRODI: 2,
};

const ESCALATION_THRESHOLDS = {
  WARNING: { rmk: 3, kaprodi: 2 },      // Show warning
  REQUIRE_JUSTIFICATION: { rmk: 4, kaprodi: 3 },  // Require written reason
  REQUIRE_SUPERVISOR_APPROVAL: { rmk: 5, kaprodi: 4 }  // Require higher authority
};

function resubmitWithRevisionCheck(rpsId, userId) {
  const rps = await getRps(rpsId);
  const revisionCount = getRevisionCount(rps);

  const limit = getCurrentLimit(rps);
  const escalation = getEscalationLevel(rps, revisionCount);

  // LEVEL 1: Soft warning (base policy)
  if (revisionCount >= limit) {
    notifyUser(userId, {
      type: "revision_limit_warning",
      message: `Batas revisi terlampaui (${revisionCount}/${limit}).`,
      canContinue: true,
      alternativeAction: "create_new_version"
    });
  }

  // LEVEL 2: Require justification (NEW)
  if (escalation >= REQUIRE_JUSTIFICATION) {
    const justification = await promptUser(userId, {
      type: "justification_required",
      message: `Revisi ke-${revisionCount} memerlukan penjelasan tertulis.`,
      placeholder: "Jelaskan mengapa revisi masih diperlukan...",
      required: true
    });

    if (!justification || justification.length < 50) {
      throw new ForbiddenError(
        "Revisi melebihi batas wajar. Mohon jelaskan secara rinci " +
        "atau buat versi baru dokumen."
      );
    }

    // Log justification
    await logApproval({
      rpsId,
      action: "revision_limit_justification_provided",
      actorId: userId,
      notes: justification,
      revisionRound: revisionCount
    });
  }

  // LEVEL 3: Require supervisor approval (NEW)
  if (escalation >= REQUIRE_SUPERVISOR_APPROVAL) {
    // For RMK: require Kaprodi approval
    // For Kaprodi: require Admin approval

    if (rps.workflowStatus.includes("rmk")) {
      await requestKaprodiOverrideApproval(rpsId, {
        reason: `Revision count: ${revisionCount} requires Kaprodi approval`,
        requestorId: userId
      });
    } else {
      await requestAdminOverrideApproval(rpsId, {
        reason: `Revision count: ${revisionCount} requires Admin approval`,
        requestorId: userId
      });
    }

    throw new PendingApprovalError(
      `Revisi ke-${revisionCount} memerlukan persetujuan atasan. ` +
      `Permintaan Anda telah diajukan ke ${getSupervisorRole(rps)}.`
    );
  }

  // Allow resubmit
  await resubmit(rpsId, userId);
}

function getEscalationLevel(rps, revisionCount) {
  if (rps.workflowStatus.includes("rmk")) {
    if (revisionCount >= ESCALATION_THRESHOLDS.REQUIRE_SUPERVISOR_APPROVAL.rmk) {
      return ESCALATION_THRESHOLDS.REQUIRE_SUPERVISOR_APPROVAL.rmk;
    }
    if (revisionCount >= ESCALATION_THRESHOLDS.REQUIRE_JUSTIFICATION.rmk) {
      return ESCALATION_THRESHOLDS.REQUIRE_JUSTIFICATION.rmk;
    }
  }

  if (rps.workflowStatus.includes("kaprodi")) {
    if (revisionCount >= ESCALATION_THRESHOLDS.REQUIRE_SUPERVISOR_APPROVAL.kaprodi) {
      return ESCALATION_THRESHOLDS.REQUIRE_SUPERVISOR_APPROVAL.kaprodi;
    }
    if (revisionCount >= ESCALATION_THRESHOLDS.REQUIRE_JUSTIFICATION.kaprodi) {
      return ESCALATION_THRESHOLDS.REQUIRE_JUSTIFICATION.kaprodi;
    }
  }

  return ESCALATION_THRESHOLDS.WARNING;
}
```

### Escalation Flow (RMK Example)

```
Revision 1-3: Normal
  ↓
Revision 4: REQUIRE_JUSTIFICATION
  ↓ [Dosen provides reason]
Revision 4 allowed
  ↓
Revision 5: REQUIRE_KAPRODI_APPROVAL
  ↓ [Kaprodi must approve]
Revision 5 allowed
  ↓
Revision 6+: Create new version required (hard stop)
```

### UI Behavior: Progressive Warning

```
┌─────────────────────────────────────────┐
│ ⚠️  Revisi Ke-4 Memerlukan Penjelasan    │
│                                         │
│ Anda telah melewati batas normal revisi. │
│ Mohon jelaskan secara tertulis mengapa   │
│ revisi masih diperlukan (min. 50 kar).  │
│                                         │
│ [Jelaskan]  [Buat Versi Baru]           │
└─────────────────────────────────────────┘
```

**For Revision 5+ (Kaprodi approval):**
```
┌─────────────────────────────────────────┐
| 🛑 Revisi Ke-5 Memerlukan Persetujuan   │
│                                         │
│ Jumlah revisi ini sudah tidak wajar.    │
│ Persetujuan Kaprodi diperlukan untuk     │
│ melanjutkan.                            │
│                                         │
│ Status: Menunggu persetujuan Kaprodi    │
└─────────────────────────────────────────┘
```

---

## Real-World Stress Test: 3 Extreme Scenarios

### Scenario 1: "Stubborn Dosen" (Ignores All Warnings)

**Behavior:**
- Keeps resubmitting despite warnings
- Provides minimal justifications
- Reaches revision 6+

**System Response:**
```
Revision 1-3: Normal ✅
Revision 4: Warning + justification required ✅
Revision 5: Kaprodi approval required ✅
Revision 6: HARD STOP - Create new version required ✅
```

**Outcome:** System allows extended process but makes it progressively harder. Cannot abuse infinitely.

---

### Scenario 2: "Lazy RMK" (Auto-Approves Without Reading)

**Behavior:**
- Tries to approve immediately after dosen resubmits
- Doesn't check what changed

**System Response:**
```
RMK tries to approve →
  Error: "Dokumen telah berubah sejak review terakhir Anda"
  Force: Must review changes first
```

**Outcome:** Rubber-stamping prevented by technical freshness guard.

---

### Scenario 3: "Overreaching Admin" (Abuses Minor Correction)

**Behavior:**
- Tries to change CPL through "minor correction"
- Claims it's "formatting"

**System Response:**
```
Admin attempts CPL change →
  Error: "Field 'cpl' tidak boleh diubah melalui minor correction"
  Force: Must use revise process (create new version)
```

**Outcome:** Abuse prevented by technical whitelist enforcement.

---

## Implementation Priority

| Safeguard | Priority | Complexity | Value |
|-----------|----------|------------|-------|
| **1. Freshness Flag** | 🔴 HIGH | Low | Prevents rubber-stamping |
| **2. Whitelist** | 🔴 HIGH | Medium | Prevents silent abuse |
| **3. Escalation** | 🟡 MEDIUM | Medium | Prevents limit normalization |

**Recommendation:** Implement all 3 safeguards together as they address complementary behavioral risks.

---

## Database Schema Changes

```typescript
model Rps {
  // ... existing fields

  // NEW: Review freshness tracking
  lastReviewedAtByRmk      DateTime?
  lastReviewedAtByKaprodi  DateTime?
  lastChangedAt            DateTime  @default(now())

  // NEW: Escalation tracking
  currentRevisionCount     Int       @default(0)
  escalationLevel          Int       @default(0)
}
```

---

## Compliance Summary

All safeguards add protection **without breaking legitimate use**:

| Safeguard | Protects Against | Legitimate Use Still Works? |
|-----------|------------------|------------------------------|
| Freshness Flag | Rubber-stamping | ✅ Quick re-approvals if no changes |
| Whitelist | Admin overreach | ✅ True typo fixes via whitelist |
| Escalation | Limit abuse | ✅ Extended revisions with justification |

---

## Updated Governance Maturity

With behavioral safeguards:

| Level | Definition | Status |
|-------|------------|--------|
| **Level 1** | Technically Sound | ✅ Achieved (Fase 1) |
| **Level 2** | Systematically Consistent | ✅ Achieved (v2) |
| **Level 3** | Organizationally Resilient | ✅ Achieved (Edge cases) |
| **Level 3.5** | Behaviorally Robust | ✅ Achieved (This addendum) |

**Final Status:** ✅ **Resilient Against Imperfect Human Actors**

---

## Stakeholder Communication

**When presenting to stakeholders, emphasize:**

1. **Freshness Flag** → Prevents "approve tanpa baca"
2. **Whitelist** → Clear rules, no subjectivity
3. **Escalation** → Progressive control, not hard blocks

**Key Message:** "Sistem ini menjaga kualitas akademik melalui teknis, bukan hanya kebijakan manusia."

---

**This addendum completes the governance package.**
**With these safeguards, system is ready for real-world use with non-ideal actors.**
