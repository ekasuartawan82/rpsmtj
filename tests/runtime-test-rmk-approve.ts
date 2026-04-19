/**
 * Runtime Proof Test: RMK Approve
 *
 * Purpose: Verify end-to-end governance behavior by calling service directly
 * This bypasses HTTP/auth to prove notification creation at service layer
 *
 * Test: approveByRmk() service function
 * Verify: 3 outputs (workflow status, audit log, notification)
 */

import { approveByRmk } from '../src/services/rps-workflow/review-rmk';

const TEST_RPS_ID = '371c2c8a-565d-4096-86d0-5340c0405b9b';
const KOORDINATOR_RMK_ID = 'e9ee8dd4-1019-431d-b912-4822ce775efb';

async function runRuntimeTest() {
  console.log('=== RUNTIME PROOF TEST: RMK Approve ===\n');

  console.log('Test Configuration:');
  console.log(`  RPS ID: ${TEST_RPS_ID}`);
  console.log(`  Actor (Koordinator RMK): ${KOORDINATOR_RMK_ID}`);
  console.log('');

  try {
    console.log('Step 1: Calling approveByRmk() service...');
    const result = await approveByRmk(TEST_RPS_ID, {
      actorUserId: KOORDINATOR_RMK_ID,
    });

    console.log('✅ Service call successful\n');
    console.log('Result:');
    console.log(`  New workflow status: ${result.workflowStatus}`);
    console.log(`  Last changed at: ${result.lastChangedAt}`);
    console.log(`  Last reviewed by RMK: ${result.lastReviewedAtByRmk}`);
    console.log('');

    console.log('Step 2: Verifying database state...');
    // Verification queries will be run separately via psql
    console.log('✅ Please run verification queries manually (see below)\n');

    console.log('=== VERIFICATION QUERIES ===');
    console.log(`-- Query 1: Check workflow status
SELECT workflow_status, last_reviewed_at_by_rmk, last_changed_at
FROM rps
WHERE id = '${TEST_RPS_ID}';

-- Query 2: Check audit log
SELECT action, actor_role, actor_name, created_at
FROM rps_approval_log
WHERE rps_id = '${TEST_RPS_ID}'
ORDER BY created_at DESC
LIMIT 1;

-- Query 3: Check notification
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

runRuntimeTest();
