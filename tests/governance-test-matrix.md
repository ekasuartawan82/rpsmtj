# Governance HTTP-Level Test Matrix

**Purpose:** Runtime validation of Fase 2 governance layer
**Status:** Draft - Ready for Execution
**Date:** 2026-04-19

---

## Test Environment Setup

### Prerequisites
- Dev server running on `localhost:3000`
- Database with test data:
  - Minimal 1 RPS in `draft` status
  - User accounts with roles: `dosen`, `koordinator_rmk`, `kaprodi`
  - Valid session tokens for each role

### Required Test Data
```sql
-- Verify test data exists before running tests
SELECT id, kode, nama, workflowStatus, status,
       dosenPengembangId, koordinatorRmkId, kaprodiId
FROM rps
LIMIT 5;

-- Verify users exist
SELECT id, nama, role, email
FROM users
WHERE role IN ('dosen', 'koordinator_rmk', 'kaprodi');
```

---

## Test Suite 1: State Transitions (Happy Path)

### Test 1.1: Submit RPS (draft → submitted_to_rmk)
**Endpoint:** `POST /api/rps/[id]/submit`

** Preconditions:**
- RPS in `draft` status
- All OBE requirements met (CPL, CPMK, pertemuan, etc.)
- Actor is `dosenPengembang`

**Expected Results:**
```json
{
  "data": {
    "workflowStatus": "submitted_to_rmk",
    "lastChangedAt": "timestamp > now",
    "versionNo": "unchanged"
  }
}
```

**Verification Queries:**
```sql
-- 1. Check workflow status
SELECT workflowStatus FROM rps WHERE id = '<rpsId>';

-- 2. Check audit log created
SELECT * FROM rps_approval_log
WHERE rpsId = '<rpsId>'
  AND action = 'submit_to_rmk'
ORDER BY createdAt DESC
LIMIT 1;

-- Expected: actorRole, actorName populated correctly
-- Expected: revisionRound = 1
```

**Status:** ⏳ Not Run

---

### Test 1.2: Approve RMK (submitted_to_rmk → submitted_to_kaprodi)
**Endpoint:** `POST /api/rps/[id]/review-rmk`
**Payload:** `{ "action": "approve" }`

**Preconditions:**
- RPS in `submitted_to_rmk` status
- Actor is `koordinatorRmk`

**Expected Results:**
```json
{
  "data": {
    "workflowStatus": "submitted_to_kaprodi",  // Canonical Fase 2 state
    "lastReviewedAtByRmk": "timestamp > now",
    "lastChangedAt": "timestamp > now"
  }
}
```

**Verification Queries:**
```sql
-- 1. Check workflow status (NOT approved_by_rmk)
SELECT workflowStatus FROM rps WHERE id = '<rpsId>';
-- Expected: submitted_to_kaprodi

-- 2. Check freshness tracking
SELECT lastReviewedAtByRmk FROM rps WHERE id = '<rpsId>';
-- Expected: within last minute

-- 3. Check audit log
SELECT * FROM rps_approval_log
WHERE rpsId = '<rpsId>'
  AND action = 'approve_rmk'
ORDER BY createdAt DESC
LIMIT 1;

-- Expected: actorRole = 'koordinator_rmk'
-- Expected: actorName = actual user name
-- Expected: revisionRound incremented
```

**Critical Check:**
```sql
-- Verify approved_by_rmk is NOT written
SELECT workflowStatus FROM rps WHERE id = '<rpsId>';
-- If status = 'approved_by_rmk', TEST FAILED
-- Correct status must be 'submitted_to_kaprodi'
```

**Status:** ⏳ Not Run

---

### Test 1.3: Reject RMK (submitted_to_rmk → revision_requested_by_rmk)
**Endpoint:** `POST /api/rps/[id]/review-rmk`
**Payload:** `{ "action": "reject", "catatan": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Minimum 20 karakter." }`

**Preconditions:**
- RPS in `submitted_to_rmk` status
- Actor is `koordinatorRmk`

**Expected Results:**
```json
{
  "data": {
    "workflowStatus": "revision_requested_by_rmk",
    "currentRevisionCount": "previous + 1",
    "lastReviewedAtByRmk": "timestamp > now"
  }
}
```

**Verification Queries:**
```sql
-- 1. Check revision count incremented
SELECT currentRevisionCount FROM rps WHERE id = '<rpsId>';

-- 2. Check audit log has catatan
SELECT catatanReview FROM rps_approval_log
WHERE rpsId = '<rpsId>'
  AND action = 'reject_rmk'
ORDER BY createdAt DESC
LIMIT 1;
-- Expected: matches submitted catatan (min 20 chars)
```

**Status:** ⏳ Not Run

---

### Test 1.4: Approve Kaprodi (submitted_to_kaprodi → approved)
**Endpoint:** `POST /api/rps/[id]/review-kaprodi`
**Payload:** `{ "action": "approve" }`

**Preconditions:**
- RPS in `submitted_to_kaprodi` status
- Actor is `kaprodi`

**Expected Results:**
```json
{
  "data": {
    "workflowStatus": "approved",
    "lastReviewedAtByKaprodi": "timestamp > now",
    "lastChangedAt": "timestamp > now"
  }
}
```

**Verification Queries:**
```sql
-- 1. Check final status
SELECT workflowStatus FROM rps WHERE id = '<rpsId>';
-- Expected: approved

-- 2. Check audit log
SELECT * FROM rps_approval_log
WHERE rpsId = '<rpsId>'
  AND action = 'approve_kaprodi'
ORDER BY createdAt DESC
LIMIT 1;

-- Expected: actorRole = 'kaprodi'
-- Expected: actorName = actual user name
```

**Status:** ⏳ Not Run

---

### Test 1.5: Reject Kaprodi (submitted_to_kaprodi → revision_requested_by_kaprodi)
**Endpoint:** `POST /api/rps/[id]/review-kaprodi`
**Payload:** `{ "action": "reject", "catatan": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Minimum 20 karakter." }`

**Preconditions:**
- RPS in `submitted_to_kaprodi` status
- Actor is `kaprodi`

**Expected Results:**
```json
{
  "data": {
    "workflowStatus": "revision_requested_by_kaprodi",
    "currentRevisionCount": "previous + 1"
  }
}
```

**Verification Queries:**
```sql
-- Same as Test 1.3
-- Verify catatanReview stored correctly
```

**Status:** ⏳ Not Run

---

## Test Suite 2: Guard Enforcement

### Test 2.1: Wrong Role Blocked (RMK)
**Endpoint:** `POST /api/rps/[id]/review-rmk`
**Payload:** `{ "action": "approve" }`

**Setup:**
- RPS in `submitted_to_rmk`
- Actor is NOT `koordinatorRmk` (e.g., `kaprodi` or another `dosen`)

**Expected Result:**
```json
{
  "error": {
    "message": "Hanya koordinator RMK yang dapat mereview RPS ini."
  }
}
```

**Status Code:** 403 Forbidden or 400 Bad Request

**Verification Queries:**
```sql
-- Verify status NOT changed
SELECT workflowStatus FROM rps WHERE id = '<rpsId>';
-- Expected: still submitted_to_rmk

-- Verify NO audit log created
SELECT COUNT(*) FROM rps_approval_log
WHERE rpsId = '<rpsId>'
  AND action = 'approve_rmk';
-- Expected: 0
```

**Status:** ⏳ Not Run

---

### Test 2.2: Wrong Role Blocked (Kaprodi)
**Endpoint:** `POST /api/rps/[id]/review-kaprodi`
**Payload:** `{ "action": "approve" }`

**Setup:**
- RPS in `submitted_to_kaprodi`
- Actor is NOT `kaprodi`

**Expected Result:**
```json
{
  "error": {
    "message": "Hanya kaprodi yang dapat mereview RPS ini."
  }
}
```

**Status Code:** 403 Forbidden or 400 Bad Request

**Verification Queries:**
```sql
-- Same as Test 2.1
-- Verify status unchanged, no audit log
```

**Status:** ⏳ Not Run

---

### Test 2.3: Invalid Status Transition Blocked
**Endpoint:** `POST /api/rps/[id]/review-rmk`
**Payload:** `{ "action": "approve" }`

**Setup:**
- RPS NOT in `submitted_to_rmk` (e.g., `draft` or `approved`)
- Actor is valid `koordinatorRmk`

**Expected Result:**
```json
{
  "error": {
    "message": "Status RPS tidak valid untuk aksi ini."
  }
}
```

**Status Code:** 400 Bad Request

**Verification Queries:**
```sql
-- Verify status NOT changed
SELECT workflowStatus FROM rps WHERE id = '<rpsId>';
-- Expected: original status unchanged
```

**Status:** ⏳ Not Run

---

### Test 2.4: Reject Without Catatan Blocked
**Endpoint:** `POST /api/rps/[id]/review-rmk`
**Payload:** `{ "action": "reject", "catatan": "too short" }`

**Setup:**
- RPS in `submitted_to_rmk`
- Actor is `koordinatorRmk`
- Catatan < 20 characters

**Expected Result:**
```json
{
  "error": {
    "message": "Catatan penolakan minimal 20 karakter..."
  }
}
```

**Status Code:** 400 Bad Request

**Verification Queries:**
```sql
-- Verify status unchanged
-- Verify NO audit log created
```

**Status:** ⏳ Not Run

---

## Test Suite 3: Freshness Tracking

### Test 3.1: Stale RMK Approval Blocked
**Scenario:**
- RPS approved by RMK at T0
- RPS modified by dosen at T1 (T1 > T0)
- Attempt to approve Kaprodi at T2

**Setup:**
```sql
-- 1. Submit and approve RMK
-- RPS workflowStatus = submitted_to_kaprodi
-- lastReviewedAtByRmk = T0

-- 2. Simulate RPS modification
UPDATE rps
SET lastChangedAt = NOW(),
    workflowStatus = 'draft'  -- Simulate edit
WHERE id = '<rpsId>';

-- 3. Try to approve Kaprodi (should fail)
```

**Expected Result:**
```json
{
  "error": {
    "message": "RPS telah dimodifikasi sejak review terakhir. Silakan ajukan ulang."
  }
}
```

**Status Code:** 400 Bad Request

**Verification Queries:**
```sql
-- Check freshness guard triggered
-- Verify status NOT changed to approved
```

**Status:** ⏳ Not Run

---

### Test 3.2: Stale Kaprodi Review Blocked
**Scenario:**
- Similar to Test 3.1, but for Kaprodi rejection

**Setup:**
```sql
-- 1. Approve RMK, then reject by Kaprodi
-- RPS workflowStatus = revision_requested_by_kaprodi
-- lastReviewedAtByKaprodi = T0

-- 2. Simulate RPS modification
UPDATE rps
SET lastChangedAt = NOW()
WHERE id = '<rpsId>';

-- 3. Try to approve RMK again (should fail)
```

**Expected Result:**
```json
{
  "error": {
    "message": "Dokumen telah berubah sejak review terakhir."
  }
}
```

**Status:** ⏳ Not Run

---

## Test Suite 4: Legacy Normalization

### Test 4.1: Read Legacy State (approved_by_rmk)
**Scenario:**
- Simulate existing RPS with `workflowStatus = 'approved_by_rmk'`
- Verify normalization doesn't break queries

**Setup:**
```sql
-- Create test data with legacy state
UPDATE rps
SET workflowStatus = 'approved_by_rmk'
WHERE id = '<rpsId>';
```

**Test Query:**
```typescript
// Using normalizeWorkflowStatus helper
const normalized = normalizeWorkflowStatus(rps.workflowStatus);
// Expected: 'submitted_to_kaprodi'
```

**Verification:**
```sql
-- 1. Check raw status
SELECT workflowStatus FROM rps WHERE id = '<rpsId>';
-- Expected: approved_by_rmk

-- 2. Check normalized display label
-- Expected: "Menunggu Review Kaprodi (Legacy State)"
```

**Status:** ⏳ Not Run

---

### Test 4.2: Write Canonical State (New Approvals)
**Scenario:**
- New RPS submitted through current workflow
- Verify NO new legacy states created

**Setup:**
- Create fresh RPS
- Submit → Approve RMK → Approve Kaprodi

**Verification:**
```sql
-- Check audit trail
SELECT action, workflowStatus
FROM rps
JOIN rps_approval_log ON rps.id = rps_approval_log.rpsId
WHERE rps.id = '<rpsId>'
ORDER BY rps_approval_log.createdAt;

-- Expected workflow:
-- 1. submit_to_rmk
-- 2. approve_rmk → status = submitted_to_kaprodi
-- 3. approve_kaprodi → status = approved

-- Critical: NO approved_by_rmk in workflowStatus column
```

**Status:** ⏳ Not Run

---

## Test Suite 5: Audit Trail Integrity

### Test 5.1: Actor Identity Accuracy
**Scenario:**
- Verify all audit log entries have correct `actorRole` and `actorName`

**Verification Queries:**
```sql
-- Check all recent logs have non-null actor data
SELECT id, rpsId, action, actorUserId, actorRole, actorName
FROM rps_approval_log
WHERE createdAt >= NOW() - INTERVAL '1 hour'
ORDER BY createdAt DESC;

-- Expected:
-- - actorRole IN ('dosen', 'koordinator_rmk', 'kaprodi')
-- - actorName NOT IN ('koordinator_rmk', 'kaprodi', 'Koordinator RMK', 'Kaprodi')
-- - actorName matches actual user.nama from users table
```

**Cross-Reference Check:**
```sql
-- Verify actor data matches user table
SELECT
  log.id,
  log.actorRole,
  log.actorName,
  user.role,
  user.nama,
  CASE
    WHEN log.actorRole != user.role THEN 'ROLE MISMATCH'
    WHEN log.actorName != user.nama THEN 'NAME MISMATCH'
    ELSE 'OK'
  END as verification_status
FROM rps_approval_log log
JOIN users user ON log.actorUserId = user.id
WHERE log.createdAt >= NOW() - INTERVAL '1 hour'
ORDER BY log.createdAt DESC;

-- Expected: All rows have verification_status = 'OK'
```

**Status:** ⏳ Not Run

---

## Test Suite 6: Notification Semantics

### Test 6.1: Notification Types Preserved
**Scenario:**
- Verify notifications still use legacy types for compatibility

**Verification Queries:**
```sql
-- Check notification types after each transition
SELECT type, title, message
FROM notifications
WHERE rpsId = '<rpsId>'
ORDER BY createdAt DESC
LIMIT 10;

-- Expected after RMK approve:
-- - type = "approved_by_rmk" (legacy)

-- Expected after Kaprodi approve:
-- - type = "approved"
```

**Status:** ⏳ Not Run

---

## Test Execution Summary

### Pass/Fail Criteria

**TEST SUITE PASSES IF:**
- ✅ All 5 happy path transitions succeed (Suite 1)
- ✅ All 4 guard tests block invalid actions (Suite 2)
- ✅ Freshness guards block stale approvals (Suite 3)
- ✅ Legacy states normalized correctly (Suite 4)
- ✅ All audit logs have accurate actor data (Suite 5)
- ✅ Notifications created with correct types (Suite 6)

**CRITICAL FAILURES (BLOCKER):**
- ❌ Any happy path transition fails
- ❌ Actor identity placeholder still in logs
- ❌ Wrong role not blocked by guards
- ❌ Legacy state not normalized correctly
- ❌ Canonical state not written (approved_by_rmk appears in new data)

**WARNINGS (NON-BLOCKER):**
- ⚠️ Minor formatting differences in notifications
- ⚠️ Timestamp precision differences

---

## Test Execution Log

### Run 1 - [Date]
| Test Suite | Tests | Pass | Fail | Status |
|------------|-------|------|------|--------|
| Suite 1: State Transitions | 5 | 0 | 0 | ⏳ Not Run |
| Suite 2: Guard Enforcement | 4 | 0 | 0 | ⏳ Not Run |
| Suite 3: Freshness Tracking | 2 | 0 | 0 | ⏳ Not Run |
| Suite 4: Legacy Normalization | 2 | 0 | 0 | ⏳ Not Run |
| Suite 5: Audit Integrity | 1 | 0 | 0 | ⏳ Not Run |
| Suite 6: Notifications | 1 | 0 | 0 | ⏳ Not Run |
| **TOTAL** | **15** | **0** | **0** | **⏳ Pending** |

---

## Notes

- All tests require valid authentication tokens
- Test data cleanup may be needed between runs
- Consider using transaction rollback for test isolation
- Some tests may require manual SQL setup steps

---

**Version:** 1.0
**Last Updated:** 2026-04-19
**Status:** Ready for Execution
