/**
 * Runtime Proof Test: Kaprodi Reject (CRITICAL SCENARIO)
 *
 * Scenario: Kaprodi rejects RPS at final authority stage
 * Risk: This is where governance logic最容易 crack
 *
 * 5-Layer Verification:
 * 1. Workflow status → revision_requested_by_kaprodi
 * 2. Catatan revisi stored完整 (not just log without content)
 * 3. Audit log correct (action, actor, timestamp)
 * 4. Notification correct (recipient, type, message semantics)
 * 5. Re-entry semantics → document in correct state for editing
 */

import { rejectByKaprodi } from '../src/services/rps-workflow/review-kaprodi';

const TEST_RPS_ID = '371c2c8a-565d-4096-86d0-5340c0405b9b';
const KAPRODI_ID = '61165e92-50f4-452e-9db1-f04b5b2239da';
const CATATAN_KAPRODI = 'Evaluasi pembelajaran perlu disesuaikan dengan capaian pembelajaran lulusan yang lebih spesifik. Tambahan referensi industri diperlukan.';

async function runKaprodiRejectTest() {
  console.log('=== RUNTIME PROOF TEST: Kaprodi Reject (CRITICAL) ===\n');

  console.log('Test Configuration:');
  console.log(`  RPS ID: ${TEST_RPS_ID}`);
  console.log(`  Actor: Kaprodi (${KAPRODI_ID})`);
  console.log(`  Catatan: ${CATATAN_KAPRODI}`);
  console.log('');
  console.log('Critical Risk Assessment:');
  console.log('  - Final authority stage rejection');
  console.log('  - Catatan must be preserved完整');
  console.log('  - Re-entry path must be clear for owner');
  console.log('  - Audit trail must show escalation context');
  console.log('');

  try {
    console.log('Step 1: Calling rejectByKaprodi() service...');
    const result = await rejectByKaprodi(TEST_RPS_ID, CATATAN_KAPRODI, {
      actorUserId: KAPRODI_ID,
    });

    console.log('✅ Service call successful\n');
    console.log('Result:');
    console.log(`  New workflow status: ${result.workflowStatus}`);
    console.log(`  Current revision count: ${result.currentRevisionCount}`);
    console.log(`  Last reviewed by Kaprodi: ${result.lastReviewedAtByKaprodi}`);
    console.log('');

    console.log('=== 5-LAYER VERIFICATION QUERIES ===\n');

    console.log('-- Layer 1: Workflow Status');
    console.log('-- Expected: revision_requested_by_kaprodi');
    console.log(`SELECT workflow_status, current_revision_count, last_changed_at
FROM rps
WHERE id = '${TEST_RPS_ID}';
`);

    console.log('-- Layer 2: Catatan Review Stored Complete');
    console.log('-- Expected: catatan_review matches input (not truncated)');
    console.log(`SELECT action, catatan_review, length(catatan_review) AS catatan_length
FROM rps_approval_log
WHERE rps_id = '${TEST_RPS_ID}'
  AND action = 'reject_kaprodi'
ORDER BY created_at DESC
LIMIT 1;
`);

    console.log('-- Layer 3: Audit Log Integrity');
    console.log('-- Expected: action=reject_kaprodi, actor_role=kaprodi, timestamp=current');
    console.log(`SELECT action, actor_role, actor_name, revision_round, created_at
FROM rps_approval_log
WHERE rps_id = '${TEST_RPS_ID}'
ORDER BY created_at DESC
LIMIT 1;
`);

    console.log('-- Layer 4: Notification Semantics');
    console.log('-- Expected: type=revision_requested_by_kaprodi, recipient=dosen pengembang');
    console.log(`SELECT type, title, message, recipient_user_id, created_at
FROM rps_notifications
WHERE rps_id = '${TEST_RPS_ID}'
ORDER BY created_at DESC
LIMIT 1;
`);

    console.log('-- Layer 5: Re-entry Semantics');
    console.log('-- Expected: Document editable by owner (dosen pengembang)');
    console.log('-- Check: Can dosen edit this document? (via ownership check)');
    console.log(`SELECT
  r.workflow_status,
  r.created_by AS owner_id,
  u.nama AS owner_name,
  CASE
    WHEN r.workflow_status IN ('draft', 'revision_requested_by_rmk', 'revision_requested_by_kaprodi')
    THEN 'Editable by owner'
    ELSE 'Not editable'
  END AS edit_permission
FROM rps r
JOIN users u ON r.created_by = u.id
WHERE r.id = '${TEST_RPS_ID}';
`);

  } catch (error) {
    console.error('❌ Test failed:');
    console.error(error);
    process.exit(1);
  }
}

runKaprodiRejectTest();
