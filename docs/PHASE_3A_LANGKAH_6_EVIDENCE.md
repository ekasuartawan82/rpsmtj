# Phase 3A Langkah 6 Evidence & Verification Package

## 1. Executive Summary

| Item | Specification | Result | Verdict |
| :--- | :--- | :--- | :--- |
| **Option B Schema** | `prodi_code` in domain tables, user bindings in `wp_usermeta` | 7 profiles (MTJ, TO) | **PASS** |
| **T1: Same-Prodi Access** | Dosen MTJ (User 2) -> RPS 1 (MTJ) | ALLOW (Filter & DB) | **PASS** |
| **T2: Cross-Prodi Access** | Dosen MTJ -> RPS TO & Dosen TO -> RPS MTJ | DENY (403 Expected) | **PASS** |
| **T3: Admin Bypass** | Admin (User 1) -> RPS MTJ & RPS TO | ALLOW (Filter & DB) | **PASS** |
| **Copy-as-Draft** | Cross-prodi blocked; same-prodi creates new draft, deep copies, source immutable | Blocked 403 / New Draft ID 7 | **PASS** |
| **T4: K6 Concurrency Smoke** | 10 VUs / 10 concurrent requests to `prodi_rps_submit_to_rmk` | 1× 200, 9× 403, 0× 500 | **PASS** |
| **$\Delta$lock_version** | Optimistic lock version increment on RPS 1 | 1 → 2 ($\Delta = +1$) | **PASS** |
| **$\Delta$audit_log** | Immutable audit log increment on RPS 1 | 3 → 4 ($\Delta = +1$) | **PASS** |
| **Automated Test Suites** | All 4 PHP test suites (concurrency, validator, prodi-scope, rps-copy) | 85 / 85 Passing | **PASS** |

---

## 2. Option B Usermeta Architecture Verification
Executed via `scripts/check_prodi_scope.sh` against live MySQL container `rps_mysql`:

```text
🔍 Prodi Scope Validation
=======================

1. Checking prodi_code columns in domain tables...
  ✓ wp_prodi_rps.prodi_code exists
  ✓ wp_prodi_kurikulum.prodi_code exists

2. Checking user prodi mappings in wp_usermeta (meta_key = 'rps_prodi_code')...
  ✓ User prodi assignments found in usermeta: 7

3. Checking prodi distribution across users...
  prodi_code  count
  MTJ         6
  TO          1

  ✓ MTJ profile found in usermeta
  ✓ TO profile found in usermeta

=======================
✅ PRODI SCOPE CHECK: COMPLETE
```

---

## 3. Real Runtime Access Control Verification (T1 - T3)
Executed inside container `rps_wordpress` via `run_langkah6_evidence.sh`:

```text
=== ACCESS CONTROL RUNTIME VERIFICATION (T1 - T3) ===

Actor MTJ: ID 2 | Role: dosen | Prodi: MTJ
Actor TO:  ID 8 | Role: dosen | Prodi: TO
Actor ADM: ID 1 | Role: admin | Prodi: NULL (Bypass)

[T1] Same-Prodi Access:
  - Filter validate_rps_access(RPS 1, Actor 2): ALLOWED
  - DB get_rps_detail(RPS 1, Actor MTJ):       ALLOWED
  => Verdict: PASS

[T2] Cross-Prodi Access (Must be DENIED):
  - Dosen MTJ -> RPS 3 (TO):
      Filter validate: DENIED (Expected 403)
      DB detail:       DENIED (Expected null)
  - Dosen TO -> RPS 1 (MTJ):
      Filter validate: DENIED (Expected 403)
      DB detail:       DENIED (Expected null)
  => Verdict: PASS

[T3] Admin Bypass:
  - Admin -> RPS 1 (MTJ): Filter=ALLOWED, DB=ALLOWED
  - Admin -> RPS 3 (TO):  Filter=ALLOWED, DB=ALLOWED
  => Verdict: PASS
```

---

## 4. Real DB Copy-as-Draft & Immutability Verification
Executed inside container `rps_wordpress` via `Prodi_RPS_Copy`:

```text
=== COPY-AS-DRAFT REAL RUNTIME VERIFICATION ===

[Copy-1] Cross-Prodi Copy Guard:
  ✓ Cross-prodi copy BLOCKED: Access denied: actor 2 cannot copy RPS 3 (prodi mismatch)
  => Verdict: PASS

[Copy-2] Same-Prodi Copy Execution:
  ✓ New draft created with ID: 7
  - Source RPS (ID 3):
      workflow_status = approved (Must be approved - IMMUTABLE)
      lock_version    = 1
      is_current      = 0 (Must be 0 - superseded)
  - New Draft RPS (ID 7):
      workflow_status = draft (Must be draft)
      lock_version    = 1 (Must be 1)
      is_current      = 1 (Must be 1)
      parent_rps_id   = 3 (Must be 3)
      prodi_code      = TO (Must match TO)
  => Verdict: PASS
```

---

## 5. K6 Concurrency Smoke Test (T4)

### Execution Parameters
- **Target URL**: `http://[::1]:8080/wp-admin/admin-ajax.php`
- **Action**: `prodi_rps_submit_to_rmk`
- **Actor**: `dosen@mtj.local` (User ID 2, Prodi MTJ)
- **RPS Target**: ID 1 (Initial status: `draft`, `lock_version`: 1)
- **Concurrency**: 10 VUs / 10 iterations concurrently

### HTTP Status Code Distribution
```text
🔍 K6 Smoke Pattern Validation
================================
File: /Users/putueka/ProjectAplikasi/RPS_App/evidence/phase-3a-langkah6/submit-concurrency-result.json

📊 HTTP Status Distribution:
  HTTP 200: 1
  HTTP 403: 9
  HTTP 409: 0
  HTTP 500: 0
  Total Requests: 10

✅ VALIDATION RESULTS:
====================
  ✓ Success count: 1 (expected: 1)
  ✓ Failure count: 9 (expected: 9)
  ✓ HTTP 500: 0 (good)
  ✓ Total requests: 10 (expected: 10)

================================
✅ K6 SMOKE TEST: PASS
Pattern matches RUN #4 baseline
```

### State Transition Snapshot
- **Initial State**:
```json
{
  "rps_id": 1,
  "lock_version": 1,
  "last_changed_at": "2026-09-06 11:53:13.000000",
  "workflow_status": "draft",
  "timestamp_captured": "2026-09-06 11:53:13.000000",
  "current_revision_count": 0,
  "last_reviewed_at_by_rmk": null,
  "last_reviewed_at_by_kaprodi": null
}
```

- **Final State**:
```json
{
  "rps_id": 1,
  "lock_version": 2,
  "last_changed_at": "2026-09-06 11:53:14.000000",
  "workflow_status": "submitted_to_rmk",
  "timestamp_captured": "2026-09-06 11:53:15.000000",
  "current_revision_count": 0,
  "last_reviewed_at_by_rmk": null,
  "last_reviewed_at_by_kaprodi": null
}
```

- **Audit Log Delta**:
```json
[
  {
    "id": 7,
    "action": "submit_to_rmk",
    "rps_id": 1,
    "created_at": "2026-09-06 11:53:14.000000",
    "actor_user_id": 2,
    "revision_round": 1
  }
]
```

---

## 6. Full Test Suite Summary
All four automated test suites executed on PHP 8.2:

```text
test-concurrency.php: 7/7 PASS
test-validator.php:   19/19 PASS
test-prodi-scope.php: 36/36 PASS
test-rps-copy.php:    23/23 PASS
=======================================
TOTAL: 85 / 85 PASS (0 FAILURES)
=======================================
```

---

## 7. Evidence File Artifacts
All evidence files are located in `evidence/phase-3a-langkah6/`:
- `01_prodi_scope_check.txt`
- `02_access_control_verification.txt`
- `03_copy_as_draft_verification.txt`
- `04_k6_smoke_validation.txt`
- `initial-state-submit.json`
- `final-state-submit.json`
- `initial-audit-log.json`
- `final-audit-log.json`
- `audit-log-delta-submit.json`
- `submit-concurrency-result.json`
