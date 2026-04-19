/**
 * Governance Gap Validation — Gap 1, 2, and A3 Symmetric Fix
 *
 * Gap 1: rejectRMK runtime path
 *   Scenario A: submit → rejectRMK → resubmit → approveRMK → approveKaprodi (terminal)
 *
 * Gap 2: approveKaprodi terminal state
 *   Verified in Scenario A above (final step)
 *   Plus: assertCanEdit throws on approved doc
 *
 * A3 Symmetric Fix: 7-step alternating rejection loop
 *   Scenario B: submit → approveRMK → rejectKaprodi → submit → rejectRMK → submit → approveRMK → approveKaprodi
 *   Critical: Kaprodi must NOT deadlock at the final approveKaprodi step.
 *
 * Evidence target:
 *   - rejectRMK state: revision_requested_by_rmk
 *   - rejectRMK increments currentRevisionCount
 *   - approveKaprodi terminal: workflowStatus = 'approved'
 *   - assertCanEdit throws after approved (guard test)
 *   - A3 fix: Kaprodi not deadlocked after alternating loop
 */

import { PrismaClient } from '@prisma/client';
import {
  submitRps,
  approveRMK,
  rejectRMK,
  rejectKaprodi,
  approveKaprodi,
} from '../src/services/rps/governance/transitions';
import { assertCanEdit } from '../src/services/rps/governance/guards';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

const RPS_ID       = '768d9dfb-920f-430b-a8c5-8dca4c6be92b';
const DOSEN_ID     = '33831821-a9ad-4982-ad82-e568a1de76ec';
const RMK_ID       = 'e9ee8dd4-1019-431d-b912-4822ce775efb';
const RMK_NAME     = 'Koordinator RMK MTJ';
const KAPRODI_ID   = '61165e92-50f4-452e-9db1-f04b5b2239da';
const KAPRODI_NAME = 'Putu Eka Suartawan';

const CATATAN_RMK     = 'Daftar referensi harus diperlengkapi sesuai standar APA.';
const CATATAN_KAPRODI = 'Capaian pembelajaran perlu diselaraskan dengan kurikulum terbaru program studi.';

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

function checkThrows(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✗  ${label}: did NOT throw (expected exception)`);
    process.exitCode = 1;
  } catch (e) {
    console.log(`  ✓  ${label}: threw ${(e as Error).name} — "${(e as Error).message.slice(0, 80)}"`);
  }
}

async function snapshot() {
  return prisma.rps.findUniqueOrThrow({
    where: { id: RPS_ID },
    select: {
      workflowStatus: true,
      currentRevisionCount: true,
      lastChangedAt: true,
      lastReviewedAtByRmk: true,
      lastReviewedAtByKaprodi: true,
    },
  });
}

async function getLogs() {
  return prisma.rpsApprovalLog.findMany({
    where: { rpsId: RPS_ID },
    orderBy: { createdAt: 'asc' },
    select: { action: true, revisionRound: true, actorRole: true },
  });
}

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

// ── Scenario A: Gap 1 (rejectRMK) + Gap 2 (approveKaprodi terminal) ─────────
async function scenarioA() {
  sep('SCENARIO A — Gap 1 (rejectRMK) + Gap 2 (approveKaprodi terminal)');
  await resetToDraft();

  // Step A1: submit
  sep('A1: submit (dosen)');
  await submitRps(RPS_ID, DOSEN_ID);
  let s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'submitted_to_rmk');
  check('currentRevisionCount', s.currentRevisionCount, 0);

  // Step A2: rejectRMK  ← GAP 1
  sep('A2: rejectRMK (koordinator_rmk)');
  await rejectRMK(RPS_ID, RMK_ID, 'koordinator_rmk', RMK_NAME, CATATAN_RMK);
  s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'revision_requested_by_rmk');
  check('currentRevisionCount', s.currentRevisionCount, 1);
  check('lastReviewedAtByRmk set', s.lastReviewedAtByRmk !== null, true);
  check('lastReviewedAtByKaprodi reset to null', s.lastReviewedAtByKaprodi, null);  // A3 symmetric fix

  // Step A3: resubmit (round 2)
  sep('A3: resubmit round 2 (dosen)');
  await submitRps(RPS_ID, DOSEN_ID);
  s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'submitted_to_rmk');
  check('currentRevisionCount', s.currentRevisionCount, 1);

  // Step A4: approveRMK round 2
  sep('A4: approveRMK round 2');
  await approveRMK(RPS_ID, RMK_ID, 'koordinator_rmk', RMK_NAME);
  s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'submitted_to_kaprodi');

  // Step A5: approveKaprodi  ← GAP 2 (terminal state)
  sep('A5: approveKaprodi — terminal state');
  await approveKaprodi(RPS_ID, KAPRODI_ID, 'kaprodi', KAPRODI_NAME);
  s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'approved');
  check('lastReviewedAtByKaprodi set', s.lastReviewedAtByKaprodi !== null, true);

  // Gap 2 extra: assertCanEdit must throw on approved doc
  sep('A6: assertCanEdit throws on approved document');
  const approvedRps = await prisma.rps.findUniqueOrThrow({
    where: { id: RPS_ID },
    include: { createdByUser: true, dosenPengembang: true, koordinatorRmk: true, kaprodi: true },
  });
  checkThrows('assertCanEdit on approved doc', () => assertCanEdit(approvedRps as any, DOSEN_ID));

  // Audit log for Scenario A
  sep('Scenario A — Audit Log');
  const logs = await getLogs();
  const expectedA = [
    { action: 'submit_to_rmk', revisionRound: 1 },
    { action: 'reject_rmk',    revisionRound: 1 },
    { action: 'submit_to_rmk', revisionRound: 2 },
    { action: 'approve_rmk',   revisionRound: 2 },
    { action: 'approve_kaprodi', revisionRound: 2 },
  ];
  check('Total log rows', logs.length, 5);
  logs.forEach((l, i) => {
    console.log(`  [${i + 1}] action=${l.action}  revisionRound=${l.revisionRound}  role=${l.actorRole}`);
  });
  expectedA.forEach((exp, i) => {
    if (logs[i]) {
      check(`log[${i + 1}] action`, logs[i].action, exp.action);
      check(`log[${i + 1}] revisionRound`, logs[i].revisionRound, exp.revisionRound);
    }
  });
}

// ── Scenario B: A3 symmetric fix — 7-step alternating rejection loop ─────────
async function scenarioB() {
  sep('SCENARIO B — A3 Symmetric Fix (7-step alternating loop)');
  await resetToDraft();

  // B1: submit R1
  sep('B1: submit R1 (dosen)');
  await submitRps(RPS_ID, DOSEN_ID);

  // B2: approveRMK R1
  sep('B2: approveRMK R1');
  await approveRMK(RPS_ID, RMK_ID, 'koordinator_rmk', RMK_NAME);
  let s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'submitted_to_kaprodi');

  // B3: rejectKaprodi R1
  sep('B3: rejectKaprodi R1');
  await rejectKaprodi(RPS_ID, KAPRODI_ID, 'kaprodi', KAPRODI_NAME, CATATAN_KAPRODI);
  s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'revision_requested_by_kaprodi');
  check('currentRevisionCount', s.currentRevisionCount, 1);
  check('lastReviewedAtByRmk reset to null', s.lastReviewedAtByRmk, null);

  // B4: resubmit R2
  sep('B4: resubmit R2 (dosen)');
  await submitRps(RPS_ID, DOSEN_ID);

  // B5: rejectRMK R2  ← tests A3 symmetric fix
  sep('B5: rejectRMK R2 (critical — tests A3 symmetric fix)');
  await rejectRMK(RPS_ID, RMK_ID, 'koordinator_rmk', RMK_NAME, CATATAN_RMK);
  s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'revision_requested_by_rmk');
  check('currentRevisionCount', s.currentRevisionCount, 2);
  check('lastReviewedAtByKaprodi reset to null', s.lastReviewedAtByKaprodi, null);  // A3 fix

  // B6: resubmit R3
  sep('B6: resubmit R3 (dosen)');
  await submitRps(RPS_ID, DOSEN_ID);

  // B7: approveRMK R3
  sep('B7: approveRMK R3');
  await approveRMK(RPS_ID, RMK_ID, 'koordinator_rmk', RMK_NAME);
  s = await snapshot();
  check('workflowStatus', s.workflowStatus, 'submitted_to_kaprodi');

  // B8: approveKaprodi R3 — MUST NOT DEADLOCK
  sep('B8: approveKaprodi R3 — must not deadlock (A3 fix proof)');
  let deadlock = false;
  try {
    await approveKaprodi(RPS_ID, KAPRODI_ID, 'kaprodi', KAPRODI_NAME);
    s = await snapshot();
    check('workflowStatus', s.workflowStatus, 'approved');
    check('No deadlock (ReviewExpiredError)', true, true);
  } catch (e) {
    deadlock = true;
    console.log(`  ✗  Deadlock! approveKaprodi threw: ${(e as Error).name} — ${(e as Error).message}`);
    process.exitCode = 1;
  }

  // Audit log for Scenario B
  sep('Scenario B — Audit Log');
  const logs = await getLogs();
  const expectedB = [
    { action: 'submit_to_rmk',  revisionRound: 1 },
    { action: 'approve_rmk',    revisionRound: 1 },
    { action: 'reject_kaprodi', revisionRound: 1 },
    { action: 'submit_to_rmk',  revisionRound: 2 },
    { action: 'reject_rmk',     revisionRound: 2 },
    { action: 'submit_to_rmk',  revisionRound: 3 },
    { action: 'approve_rmk',    revisionRound: 3 },
    { action: 'approve_kaprodi', revisionRound: 3 },
  ];
  check('Total log rows', logs.length, 8);
  logs.forEach((l, i) => {
    console.log(`  [${i + 1}] action=${l.action}  revisionRound=${l.revisionRound}  role=${l.actorRole}`);
  });
  expectedB.forEach((exp, i) => {
    if (logs[i]) {
      check(`log[${i + 1}] action`, logs[i].action, exp.action);
      check(`log[${i + 1}] revisionRound`, logs[i].revisionRound, exp.revisionRound);
    }
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Governance Gap Validation — Gap 1, 2, and A3 Symmetric Fix');
  console.log('RPS ID:', RPS_ID);
  console.log('Date:', new Date().toISOString());

  await scenarioA();
  await scenarioB();

  sep('FINAL RESULT');
  if (process.exitCode === 1) {
    console.log('  FAIL — one or more checks failed (see ✗ above)');
  } else {
    console.log('  PASS — Gap 1 (rejectRMK), Gap 2 (approveKaprodi), A3 symmetric fix all verified');
  }
}

main()
  .catch((err) => {
    console.error('\nFATAL:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
