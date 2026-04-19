/**
 * Runtime Proof Test: RMK Reject
 *
 * Scenario: RMK rejects RPS, sending it back to dosen for revision
 * Verify: revision_requested_by_rmk status, audit log with catatan, notification
 */

import { rejectByRmk } from '../src/services/rps-workflow/review-rmk';

const TEST_RPS_ID = '371c2c8a-565d-4096-86d0-5340c0405b9b';
const KOORDINATOR_RMK_ID = 'e9ee8dd4-1019-431d-b912-4822ce775efb';
const CATATAN_REVIEW = 'Mohon lengkapi bagian evaluasi pembelajaran dengan referensi yang lebih mutakhir. Minimal 20 karakter.';

async function runRejectTest() {
  console.log('=== RUNTIME PROOF TEST: RMK Reject ===\n');

  console.log('Test Configuration:');
  console.log(`  RPS ID: ${TEST_RPS_ID}`);
  console.log(`  Actor: Koordinator RMK (${KOORDINATOR_RMK_ID})`);
  console.log(`  Catatan: ${CATATAN_REVIEW}`);
  console.log('');

  try {
    console.log('Step 1: Calling rejectByRmk() service...');
    const result = await rejectByRmk(TEST_RPS_ID, CATATAN_REVIEW, {
      actorUserId: KOORDINATOR_RMK_ID,
    });

    console.log('✅ Service call successful\n');
    console.log('Result:');
    console.log(`  New workflow status: ${result.workflowStatus}`);
    console.log(`  Current revision count: ${result.currentRevisionCount}`);
    console.log(`  Last reviewed by RMK: ${result.lastReviewedAtByRmk}`);
    console.log('');

    console.log('=== EXPECTED VERIFICATION RESULTS ===');
    console.log(`-- Query 1: Status should be 'revision_requested_by_rmk'
SELECT workflow_status, current_revision_count, last_reviewed_at_by_rmk
FROM rps
WHERE id = '${TEST_RPS_ID}';

-- Query 2: Audit log should have catatan
SELECT action, actor_role, actor_name, catatan_review, revision_round, created_at
FROM rps_approval_log
WHERE rps_id = '${TEST_RPS_ID}'
ORDER BY created_at DESC
LIMIT 1;

-- Query 3: Notification should have revision type
SELECT type, title, message, recipient_user_id, created_at
FROM rps_notifications
WHERE rps_id = '${TEST_RPS_ID}'
ORDER BY created_at DESC
LIMIT 1;
`);

  } catch (error) {
    console.error('❌ Test failed:');
    console.error(error);
    process.exit(1);
  }
}

runRejectTest();
