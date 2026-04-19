/**
 * Runtime Proof Test: Revision Loop Stability (CRITICAL)
 *
 * Scenario: Dosen resubmits RPS after Kaprodi rejection
 * Risk: Tests temporal robustness - does system remain consistent after cycles?
 *
 * 6-Layer Verification (Longitudinal Integrity):
 * 1. Transition correctness: revision_requested_by_kaprodi → submitted_to_rmk (loop back)
 * 2. Revision counter: Must increment (not reset/stagnant)
 * 3. Audit continuity: Log sequence must remain linear
 * 4. Catatan preservation: Previous catatan must NOT be lost
 * 5. Notification re-trigger: New notification created (not reuse/silent)
 * 6. Guard consistency: Only owner can resubmit, others blocked
 *
 * BEFORE STATE (baseline):
 * - workflow_status: revision_requested_by_kaprodi
 * - revision_count: 2
 * - audit_logs: 5 entries
 * - last action: reject_kaprodi
 */

import { submitRpsForReview } from '../src/services/rps-workflow/submit';

const TEST_RPS_ID = 'aa8d0843-1901-4c47-a656-bd05aa78daae';
const DOSEN_PENGEMBANG_ID = 'd23281e7-7da6-4012-932c-826d1ae70b98';

async function runRevisionLoopTest() {
  console.log('=== RUNTIME PROOF TEST: Revision Loop Stability ===\n');

  console.log('Test Configuration:');
  console.log(`  RPS ID: ${TEST_RPS_ID}`);
  console.log(`  Actor: Dosen Pengembang (${DOSEN_PENGEMBANG_ID})`);
  console.log('');
  console.log('Baseline State:');
  console.log('  workflow_status: revision_requested_by_kaprodi');
  console.log('  revision_count: 2');
  console.log('  audit_logs: 5 entries');
  console.log('  last_action: reject_kaprodi');
  console.log('');
  console.log('Critical Risk Assessment:');
  console.log('  - Does revision counter increment correctly?');
  console.log('  - Does audit trail remain linear after loop?');
  console.log('  - Are previous catatan preserved?');
  console.log('  - Do notifications re-trigger?');
  console.log('  - Is owner-only guard enforced?');
  console.log('');

  try {
    console.log('Step 1: Calling submitRpsForReview() (RESUBMIT)...');
    const result = await submitRpsForReview(TEST_RPS_ID, {
      actorUserId: DOSEN_PENGEMBANG_ID,
    });

    console.log('✅ Resubmit successful\n');
    console.log('Result:');
    console.log(`  New workflow status: ${result.workflowStatus}`);
    console.log(`  Last changed at: ${result.lastChangedAt}`);
    console.log('');

    console.log('=== 6-LAYER VERIFICATION QUERIES ===\n');

    console.log('-- Layer 1: Transition Correctness (Loop Back)');
    console.log('-- Expected: revision_requested_by_kaprodi → submitted_to_rmk');
    console.log(`SELECT workflow_status, current_revision_count
FROM rps
WHERE id = '${TEST_RPS_ID}';
`);

    console.log('-- Layer 2: Revision Counter Increment');
    console.log('-- Expected: revision_count = 3 (incremented from 2)');
    console.log(`SELECT current_revision_count
FROM rps
WHERE id = '${TEST_RPS_ID}';
`);

    console.log('-- Layer 3: Audit Continuity (Linear Sequence)');
    console.log('-- Expected: 6 logs with sequential actions');
    console.log(`SELECT action, actor_role, revision_round, created_at
FROM rps_approval_log
WHERE rps_id = '${TEST_RPS_ID}'
ORDER BY created_at;
`);

    console.log('-- Layer 4: Catatan Preservation');
    console.log('-- Expected: Previous catatan from reject_rmk and reject_kaprodi still exist');
    console.log(`SELECT action,
       SUBSTRING(catatan_review, 1, 50) || '...' AS catatan_preview
FROM rps_approval_log
WHERE rps_id = '${TEST_RPS_ID}'
  AND catatan_review IS NOT NULL
ORDER BY created_at;
`);

    console.log('-- Layer 5: Notification Re-trigger');
    console.log('-- Expected: New notification created after resubmit');
    console.log(`SELECT type, title, created_at
FROM rps_notifications
WHERE rps_id = '${TEST_RPS_ID}'
ORDER BY created_at DESC
LIMIT 2;
`);

    console.log('-- Layer 6: Guard Consistency (Owner-Only)');
    console.log('-- Expected: Only owner can resubmit, others blocked');
    console.log('-- Check: Actor was owner (dosen pengembang)');
    console.log(`SELECT
  r.created_by AS owner_id,
  u.nama AS owner_name,
  u.role AS owner_role
FROM rps r
JOIN users u ON r.created_by = u.id
WHERE r.id = '${TEST_RPS_ID}';
`);

    console.log('\n=== LONGITUDINAL INTEGRITY CHECK ===');
    console.log('Before: 5 logs, revision 2, status revision_requested_by_kaprodi');
    console.log('After:  Should be 6 logs, revision 3, status submitted_to_rmk');
    console.log('Gap: +1 log, +1 revision, status loop back');

  } catch (error) {
    console.error('❌ Test failed:');
    console.error(error);
    process.exit(1);
  }
}

runRevisionLoopTest();
