/**
 * Scenario 5 Runtime Validation — Revision Loop
 *
 * Steps:
 *   1. submit round 1  (dosen → submitted_to_rmk)
 *   2. approve RMK     (submitted_to_rmk → submitted_to_kaprodi)
 *   3. reject Kaprodi  (submitted_to_kaprodi → revision_requested_by_kaprodi)
 *   4. resubmit round 2 (revision_requested_by_kaprodi → submitted_to_rmk)
 *   5. approve RMK round 2 (submitted_to_rmk → submitted_to_kaprodi)
 *
 * Verification after each step: workflow_status, currentRevisionCount
 * Final verification: rps_approval_log rows, notification rows
 */

import { PrismaClient } from '@prisma/client';
import {
  submitRps,
  approveRMK,
  rejectKaprodi,
} from '../src/services/rps/governance/transitions';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

// ── Test subjects (from live DB) ─────────────────────────────────────────────
const RPS_ID      = '768d9dfb-920f-430b-a8c5-8dca4c6be92b';
const DOSEN_ID    = '33831821-a9ad-4982-ad82-e568a1de76ec';
const DOSEN_NAME  = 'Aswin Badarudin Atmajaya';
const RMK_ID      = 'e9ee8dd4-1019-431d-b912-4822ce775efb';
const RMK_NAME    = 'Koordinator RMK MTJ';
const KAPRODI_ID  = '61165e92-50f4-452e-9db1-f04b5b2239da';
const KAPRODI_NAME = 'Putu Eka Suartawan';

// ── Helpers ──────────────────────────────────────────────────────────────────
function sep(label: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${label}`);
  console.log('═'.repeat(60));
}

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const mark = ok ? '✓' : '✗';
  console.log(`  ${mark}  ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
  if (!ok) process.exitCode = 1;
}

async function snapshot() {
  const rps = await prisma.rps.findUniqueOrThrow({
    where: { id: RPS_ID },
    select: {
      workflowStatus: true,
      currentRevisionCount: true,
      lastChangedAt: true,
      lastReviewedAtByRmk: true,
      lastReviewedAtByKaprodi: true,
    },
  });
  return rps;
}

async function getLogs() {
  return prisma.rpsApprovalLog.findMany({
    where: { rpsId: RPS_ID },
    orderBy: { createdAt: 'asc' },
    select: { action: true, revisionRound: true, actorRole: true, catatanReview: true },
  });
}

async function getNotifications() {
  return prisma.rpsNotification.findMany({
    where: { rpsId: RPS_ID },
    orderBy: { createdAt: 'asc' },
    select: { type: true, recipientUserId: true, title: true },
  });
}

// ── Reset state to draft so the test is idempotent ──────────────────────────
async function resetToDraft() {
  await prisma.$transaction([
    prisma.rpsApprovalLog.deleteMany({ where: { rpsId: RPS_ID } }),
    prisma.rpsNotification.deleteMany({ where: { rpsId: RPS_ID } }),
    prisma.rps.update({
      where: { id: RPS_ID },
      data: {
        workflowStatus: 'draft',
        currentRevisionCount: 0,
        lastChangedAt: new Date('2025-01-01T00:00:00Z'),
        lastReviewedAtByRmk: null,
        lastReviewedAtByKaprodi: null,
      },
    }),
  ]);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Scenario 5 — Revision Loop Runtime Validation');
  console.log('RPS ID:', RPS_ID);

  await resetToDraft();
  console.log('\n[RESET] → draft, currentRevisionCount=0, all logs/notifications cleared');

  // ── Step 1: Submit round 1 ────────────────────────────────────────────────
  sep('Step 1: submit round 1 (dosen)');
  await submitRps(RPS_ID, DOSEN_ID);
  let s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'submitted_to_rmk');
  check('currentRevisionCount', s.currentRevisionCount, 0);
  check('lastChangedAt unchanged (≤ seed date)', s.lastChangedAt! <= new Date('2025-01-02T00:00:00Z'), true);

  // ── Step 2: Approve RMK round 1 ───────────────────────────────────────────
  sep('Step 2: approve RMK round 1');
  await approveRMK(RPS_ID, RMK_ID, 'koordinator_rmk', RMK_NAME);
  s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'submitted_to_kaprodi');
  check('currentRevisionCount', s.currentRevisionCount, 0);
  check('lastReviewedAtByRmk set', s.lastReviewedAtByRmk !== null, true);

  // ── Step 3: Reject Kaprodi ────────────────────────────────────────────────
  sep('Step 3: reject Kaprodi (with catatan)');
  const catatan = 'Mohon perbaiki deskripsi bahan kajian dan lengkapi referensi pustaka.';
  await rejectKaprodi(RPS_ID, KAPRODI_ID, 'kaprodi', KAPRODI_NAME, catatan);
  s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'revision_requested_by_kaprodi');
  check('currentRevisionCount', s.currentRevisionCount, 1);
  check('lastReviewedAtByRmk reset to null', s.lastReviewedAtByRmk, null);
  check('lastReviewedAtByKaprodi set', s.lastReviewedAtByKaprodi !== null, true);

  // ── Step 4: Resubmit round 2 (dosen edits implicitly; we just resubmit) ──
  sep('Step 4: resubmit round 2 (dosen)');
  await submitRps(RPS_ID, DOSEN_ID);
  s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'submitted_to_rmk');
  check('currentRevisionCount', s.currentRevisionCount, 1);

  // ── Step 5: Approve RMK round 2 (should NOT hit deadlock) ─────────────────
  sep('Step 5: approve RMK round 2 (should pass assertReviewIsFresh)');
  let rmkApproveError: Error | null = null;
  try {
    await approveRMK(RPS_ID, RMK_ID, 'koordinator_rmk', RMK_NAME);
    s = await snapshot();
    check('workflowStatus', s.workflowStatus, 'submitted_to_kaprodi');
    check('currentRevisionCount', s.currentRevisionCount, 1);
  } catch (err) {
    rmkApproveError = err as Error;
    console.log(`  ✗  approveRMK threw: ${(err as Error).message}`);
    process.exitCode = 1;
  }

  // ── Audit log verification ─────────────────────────────────────────────────
  sep('Audit Log');
  const logs = await getLogs();
  console.log(`  Total log rows: ${logs.length}`);
  logs.forEach((l, i) => {
    console.log(`  [${i + 1}] action=${l.action}  revisionRound=${l.revisionRound}  actorRole=${l.actorRole}`);
  });

  // Expected log rows
  const expectedLogs = [
    { action: 'submit_to_rmk',  revisionRound: 1 },
    { action: 'approve_rmk',    revisionRound: 1 },
    { action: 'reject_kaprodi', revisionRound: 1 },
    { action: 'submit_to_rmk',  revisionRound: 2 },
    { action: 'approve_rmk',    revisionRound: 2 },
  ];

  check('Total log rows', logs.length, 5);
  expectedLogs.forEach((exp, i) => {
    if (logs[i]) {
      check(`log[${i + 1}] action`, logs[i].action, exp.action);
      check(`log[${i + 1}] revisionRound`, logs[i].revisionRound, exp.revisionRound);
    } else {
      console.log(`  ✗  log[${i + 1}] missing`);
      process.exitCode = 1;
    }
  });

  // ── Notification verification ──────────────────────────────────────────────
  sep('Notifications');
  const notifs = await getNotifications();
  console.log(`  Total notification rows: ${notifs.length}`);
  notifs.forEach((n, i) => {
    console.log(`  [${i + 1}] type=${n.type}  recipient=${n.recipientUserId.substring(0, 8)}...  title="${n.title}"`);
  });
  // Notifications are created by the workflow service layer (review-rmk.ts, review-kaprodi.ts),
  // NOT by governance/transitions.ts directly. Since we called governance functions directly,
  // there will be 0 notifications — that's expected and correct.
  console.log('  (Notifications created by workflow layer, not governance layer — 0 expected here)');

  // ── Summary ────────────────────────────────────────────────────────────────
  sep('RESULT');
  if (process.exitCode === 1) {
    console.log('  FAIL — one or more checks failed (see ✗ above)');
  } else {
    console.log('  PASS — Scenario 5 revision loop runtime verified');
  }
}

main()
  .catch((err) => {
    console.error('\nFATAL:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
