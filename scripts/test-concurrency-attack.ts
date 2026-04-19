/**
 * Concurrency Attack Test — A2: Race Condition on Concurrent Approval
 *
 * Design intent: break the system, not pass it.
 *
 * Race window in approveRMK / approveKaprodi:
 *   1. findUnique (OUTSIDE $transaction) — both callers read the same state
 *   2. assertWorkflowStatus (OUTSIDE $transaction) — both pass the guard
 *   3. $transaction UPDATE — PostgreSQL serializes at row level, but both commits succeed
 *   4. rpsApprovalLog.create — both run, producing duplicate entries
 *
 * Expected (desired behavior): second call fails with ForbiddenTransitionError
 * Expected (current behavior, no SELECT FOR UPDATE): both may succeed → duplicate log entries
 *
 * Three attack surfaces tested:
 *   Attack 1 — Concurrent approveRMK (submitted_to_rmk × 2)
 *   Attack 2 — Concurrent approveKaprodi (submitted_to_kaprodi × 2)
 *   Attack 3 — Concurrent submitRps (draft × 2)
 *
 * Output: honest report of what actually happens under contention.
 */

import { PrismaClient } from '@prisma/client';
import {
  submitRps,
  approveRMK,
  approveKaprodi,
} from '../src/services/rps/governance/transitions';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

const RPS_ID       = '768d9dfb-920f-430b-a8c5-8dca4c6be92b';
const DOSEN_ID     = '33831821-a9ad-4982-ad82-e568a1de76ec';
const RMK_ID       = 'e9ee8dd4-1019-431d-b912-4822ce775efb';
const RMK_NAME     = 'Koordinator RMK MTJ';
const KAPRODI_ID   = '61165e92-50f4-452e-9db1-f04b5b2239da';
const KAPRODI_NAME = 'Putu Eka Suartawan';

// ── Helpers ──────────────────────────────────────────────────────────────────
function sep(label: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${label}`);
  console.log('═'.repeat(60));
}

function report(label: string, value: unknown) {
  console.log(`  →  ${label}: ${JSON.stringify(value)}`);
}

async function resetToState(targetStatus: string, revisionCount = 0) {
  await prisma.$transaction([
    prisma.rpsApprovalLog.deleteMany({ where: { rpsId: RPS_ID } }),
    prisma.rpsNotification.deleteMany({ where: { rpsId: RPS_ID } }),
    prisma.rps.update({
      where: { id: RPS_ID },
      data: {
        workflowStatus: targetStatus,
        currentRevisionCount: revisionCount,
        lastChangedAt: new Date('2025-01-01T00:00:00Z'),
        lastReviewedAtByRmk: null,
        lastReviewedAtByKaprodi: null,
      },
    }),
  ]);
}

async function getLogCount(action: string): Promise<number> {
  return prisma.rpsApprovalLog.count({ where: { rpsId: RPS_ID, action } });
}

async function getState() {
  return prisma.rps.findUniqueOrThrow({
    where: { id: RPS_ID },
    select: { workflowStatus: true, currentRevisionCount: true },
  });
}

// ── Attack 1: Concurrent approveRMK ──────────────────────────────────────────
async function attack1() {
  sep('ATTACK 1 — Concurrent approveRMK (2 simultaneous calls)');
  await resetToState('submitted_to_rmk');
  console.log('  [state] reset to submitted_to_rmk');

  const [r1, r2] = await Promise.allSettled([
    approveRMK(RPS_ID, RMK_ID, 'koordinator_rmk', RMK_NAME),
    approveRMK(RPS_ID, RMK_ID, 'koordinator_rmk', RMK_NAME),
  ]);

  const succeeded  = [r1, r2].filter(r => r.status === 'fulfilled').length;
  const failed     = [r1, r2].filter(r => r.status === 'rejected').length;
  const logCount   = await getLogCount('approve_rmk');
  const finalState = await getState();

  report('Calls succeeded', succeeded);
  report('Calls failed', failed);
  report('approve_rmk log entries', logCount);
  report('Final workflowStatus', finalState.workflowStatus);

  if (r2.status === 'rejected') {
    console.log(`  [rejection reason] ${(r2 as PromiseRejectedResult).reason?.message}`);
  }

  // Analysis
  console.log('');
  if (logCount > 1) {
    console.log('  ⚠  RACE CONDITION CONFIRMED — duplicate audit log entries');
    console.log('  ⚠  Both calls passed the guard and committed to the DB');
    console.log('  ⚠  A2 is an active vulnerability, not theoretical');
  } else if (succeeded === 1 && failed === 1 && logCount === 1) {
    console.log('  ✓  System handled concurrency correctly (one succeeded, one failed)');
    console.log('  ✓  Guard or DB serialization prevented duplicate entry');
  } else if (succeeded === 2 && logCount === 1) {
    console.log('  ✓  Both returned success but DB write was idempotent (log count = 1)');
  }

  return { attack: 'A1', succeeded, failed, logCount, status: finalState.workflowStatus };
}

// ── Attack 2: Concurrent approveKaprodi ──────────────────────────────────────
async function attack2() {
  sep('ATTACK 2 — Concurrent approveKaprodi (2 simultaneous calls)');
  await resetToState('submitted_to_kaprodi');
  console.log('  [state] reset to submitted_to_kaprodi');

  const [r1, r2] = await Promise.allSettled([
    approveKaprodi(RPS_ID, KAPRODI_ID, 'kaprodi', KAPRODI_NAME),
    approveKaprodi(RPS_ID, KAPRODI_ID, 'kaprodi', KAPRODI_NAME),
  ]);

  const succeeded  = [r1, r2].filter(r => r.status === 'fulfilled').length;
  const failed     = [r1, r2].filter(r => r.status === 'rejected').length;
  const logCount   = await getLogCount('approve_kaprodi');
  const finalState = await getState();

  report('Calls succeeded', succeeded);
  report('Calls failed', failed);
  report('approve_kaprodi log entries', logCount);
  report('Final workflowStatus', finalState.workflowStatus);

  if (r2.status === 'rejected') {
    console.log(`  [rejection reason] ${(r2 as PromiseRejectedResult).reason?.message}`);
  }

  console.log('');
  if (logCount > 1) {
    console.log('  ⚠  RACE CONDITION CONFIRMED — duplicate audit log entries at terminal state');
    console.log('  ⚠  This means a document can appear "approved twice" in the audit trail');
  } else {
    console.log('  ✓  No duplicate entries at terminal state');
  }

  return { attack: 'A2', succeeded, failed, logCount, status: finalState.workflowStatus };
}

// ── Attack 3: Concurrent submitRps ───────────────────────────────────────────
async function attack3() {
  sep('ATTACK 3 — Concurrent submitRps (double-click simulation)');
  await resetToState('draft');
  console.log('  [state] reset to draft');

  const [r1, r2] = await Promise.allSettled([
    submitRps(RPS_ID, DOSEN_ID),
    submitRps(RPS_ID, DOSEN_ID),
  ]);

  const succeeded  = [r1, r2].filter(r => r.status === 'fulfilled').length;
  const failed     = [r1, r2].filter(r => r.status === 'rejected').length;
  const logCount   = await getLogCount('submit_to_rmk');
  const finalState = await getState();

  report('Calls succeeded', succeeded);
  report('Calls failed', failed);
  report('submit_to_rmk log entries', logCount);
  report('Final workflowStatus', finalState.workflowStatus);

  if (r2.status === 'rejected') {
    console.log(`  [rejection reason] ${(r2 as PromiseRejectedResult).reason?.message}`);
  }

  console.log('');
  if (logCount > 1) {
    console.log('  ⚠  RACE CONDITION CONFIRMED — duplicate submit log entries');
    console.log('  ⚠  B3 (double-submit) is an active vulnerability, not theoretical');
  } else {
    console.log('  ✓  Double-submit handled correctly');
  }

  return { attack: 'A3', succeeded, failed, logCount, status: finalState.workflowStatus };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Concurrency Attack Test — Governance Layer (A2 / B3)');
  console.log('Design intent: break the system, not pass it.');
  console.log('RPS ID:', RPS_ID);
  console.log('Date:', new Date().toISOString());

  const results = await Promise.all([
    attack1(),
    // Attacks must run sequentially to not interfere with each other's reset
  ]);

  const r1 = results[0];
  const r2 = await attack2();
  const r3 = await attack3();

  sep('CONCURRENCY AUDIT SUMMARY');
  console.log('');
  console.log('  Attack                       | Succeeded | Failed | Log entries | Safe?');
  console.log('  -----------------------------|-----------|--------|-------------|------');

  for (const r of [r1, r2, r3]) {
    const safe   = r.logCount === 1 ? 'Yes' : 'NO ⚠';
    const attack = r.attack.padEnd(28);
    console.log(`  ${attack} | ${String(r.succeeded).padEnd(9)} | ${String(r.failed).padEnd(6)} | ${String(r.logCount).padEnd(11)} | ${safe}`);
  }

  const anyVulnerable = [r1, r2, r3].some(r => r.logCount > 1);
  console.log('');
  if (anyVulnerable) {
    console.log('  VERDICT: Race condition is REAL — SELECT FOR UPDATE required');
    console.log('  See GOVERNANCE_FAILURE_MODES.md A2 for mitigation path.');
  } else {
    console.log('  VERDICT: No race condition detected under this concurrency model.');
    console.log('  Note: This test uses cooperative Node.js concurrency, not true OS threads.');
    console.log('  True HTTP-level concurrency (separate connections, separate OS threads)');
    console.log('  may still exhibit the race condition described in A2.');
  }
}

main()
  .catch((err) => {
    console.error('\nFATAL:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
