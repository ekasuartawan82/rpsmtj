/**
 * Runtime Proof Test: Revision Loop Stability (GOVERNANCE LAYER ONLY)
 *
 * Bypass service layer validation to test governance core
 */

import { submitRps as submitRpsGovernance } from '../src/services/rps/governance';

const TEST_RPS_ID = 'aa8d0843-1901-4c47-a656-bd05aa78daae';
const DOSEN_PENGEMBANG_ID = 'd23281e7-7da6-4012-932c-826d1ae70b98';

async function runGovernanceLoopTest() {
  console.log('=== RUNTIME PROOF TEST: Revision Loop (GOVERNANCE LAYER) ===\n');

  console.log('Test Configuration:');
  console.log(`  RPS ID: ${TEST_RPS_ID}`);
  console.log(`  Actor: Dosen Pengembang (${DOSEN_PENGEMBANG_ID})`);
  console.log('');
  console.log('Baseline:');
  console.log('  status: revision_requested_by_kaprodi');
  console.log('  revision_count: 2');
  console.log('  audit_logs: 10 entries');
  console.log('');

  try {
    console.log('Step 1: Calling submitRps() governance directly...');
    const result = await submitRpsGovernance(TEST_RPS_ID, DOSEN_PENGEMBANG_ID);

    console.log('✅ Resubmit successful\n');
    console.log('Result:');
    console.log(`  New workflow status: ${result.rps.workflowStatus}`);
    console.log(`  Last changed at: ${result.rps.lastChangedAt}`);
    console.log('');

    console.log('=== VERIFICATION QUERIES ===\n');
    console.log(`-- Layer 1: Status (should be submitted_to_rmk)
SELECT workflow_status, current_revision_count, last_changed_at
FROM rps
WHERE id = '${TEST_RPS_ID}';
`);

    console.log(`-- Layer 2: Audit logs (should be 11 now)
SELECT action, actor_role, revision_round
FROM rps_approval_log
WHERE rps_id = '${TEST_RPS_ID}'
ORDER BY created_at;
`);

    console.log(`-- Layer 3: Latest action
SELECT * FROM (
  SELECT action, actor_role, actor_name, created_at,
         LAG(action) OVER (ORDER BY created_at) AS previous_action
  FROM rps_approval_log
  WHERE rps_id = '${TEST_RPS_ID}'
) t
ORDER BY created_at DESC
LIMIT 2;
`);

  } catch (error) {
    console.error('❌ Test failed:');
    console.error(error);
    process.exit(1);
  }
}

runGovernanceLoopTest();
