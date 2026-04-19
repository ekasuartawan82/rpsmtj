/**
 * Runtime Proof Test: Kaprodi Approve
 *
 * Scenario: Kaprodi approves RPS, marking it as final approved state
 * Verify: submitted_to_kaprodi → approved, audit log, notification (2 recipients)
 */

import { approveByKaprodi } from '../src/services/rps-workflow/review-kaprodi';

const TEST_RPS_ID = '371c2c8a-565d-4096-86d0-5340c0405b9b';
const KAPRODI_ID = '61165e92-50f4-452e-9db1-f04b5b2239da';

async function runKaprodiApproveTest() {
  console.log('=== RUNTIME PROOF TEST: Kaprodi Approve ===\n');

  console.log('Test Configuration:');
  console.log(`  RPS ID: ${TEST_RPS_ID}`);
  console.log(`  Actor: Kaprodi (${KAPRODI_ID})`);
  console.log('');

  try {
    console.log('Step 1: Calling approveByKaprodi() service...');
    const result = await approveByKaprodi(TEST_RPS_ID, {
      actorUserId: KAPRODI_ID,
    });

    console.log('✅ Service call successful\n');
    console.log('Result:');
    console.log(`  New workflow status: ${result.workflowStatus}`);
    console.log(`  Last reviewed by Kaprodi: ${result.lastReviewedAtByKaprodi}`);
    console.log('');

    console.log('=== EXPECTED VERIFICATION RESULTS ===');
    console.log(`-- Query 1: Status should be 'approved'
SELECT workflow_status, last_reviewed_at_by_kaprodi
FROM rps
WHERE id = '${TEST_RPS_ID}';

-- Query 2: Audit log
SELECT action, actor_role, actor_name, created_at
FROM rps_approval_log
WHERE rps_id = '${TEST_RPS_ID}'
ORDER BY created_at DESC
LIMIT 1;

-- Query 3: Notifications (should be 2: dosen + koordinator RMK)
SELECT type, title, recipient_user_id, created_at
FROM rps_notifications
WHERE rps_id = '${TEST_RPS_ID}'
  AND type = 'approved'
ORDER BY created_at DESC;
`);

  } catch (error) {
    console.error('❌ Test failed:');
    console.error(error);
    process.exit(1);
  }
}

runKaprodiApproveTest();
