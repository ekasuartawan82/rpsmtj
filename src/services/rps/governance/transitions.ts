/**
 * Fase 2 Governance - State Transition Functions
 *
 * Core workflow actions:
 * - submitRps: draft → submitted_to_rmk
 * - approveRMK: submitted_to_rmk → submitted_to_kaprodi
 * - rejectRMK: submitted_to_rmk → revision_requested_by_rmk
 * - approveKaprodi: submitted_to_kaprodi → approved
 * - rejectKaprodi: submitted_to_kaprodi → revision_requested_by_kaprodi
 *
 * Concurrency safety: every transition acquires a row-level lock via SELECT FOR UPDATE
 * before running guards and committing state changes. This prevents duplicate audit log
 * entries under concurrent execution (A2 in GOVERNANCE_FAILURE_MODES.md).
 *
 * Policy: FASE_2_GOVERNANCE_POLICY_V2.md
 * Implementation: FASE_2_IMPLEMENTATION_CONTRACT.md
 */

import { prisma } from '@/db/prisma';
import {
  assertCanSubmit,
  assertReviewIsFresh,
  assertRole,
  assertWorkflowStatus,
  type RpsWithGovernance
} from './guards';

// ============================================================================
// Internal helpers
// ============================================================================

const RPS_INCLUDE = {
  createdByUser: true,
  dosenPengembang: true,
  koordinatorRmk: true,
  kaprodi: true,
} as const;

// ============================================================================
// Transition Functions
// ============================================================================

/**
 * Transition: Submit RPS to RMK review
 * Flow: draft → submitted_to_rmk
 */
export async function submitRps(
  rpsId: string,
  userId: string
): Promise<{ rps: RpsWithGovernance; log: any }> {
  const result = await prisma.$transaction(async (tx) => {
    // Lock row first — prevents concurrent submits from both passing the guard
    await tx.$queryRaw`SELECT id FROM rps WHERE id = ${rpsId}::uuid FOR UPDATE`;

    const rps = await tx.rps.findUnique({
      where: { id: rpsId },
      include: RPS_INCLUDE,
    }) as RpsWithGovernance | null;

    if (!rps) throw new Error('RPS tidak ditemukan');

    // Guards run on freshly-locked read
    assertCanSubmit(rps, userId);

    // Update workflow status only — lastChangedAt tracks content changes, not state transitions
    const updatedRps = await tx.rps.update({
      where: { id: rpsId },
      data: { workflowStatus: 'submitted_to_rmk' },
      include: RPS_INCLUDE,
    });

    const log = await tx.rpsApprovalLog.create({
      data: {
        rpsId,
        versionNo: rps.versionNo,
        actorUserId: userId,
        actorRole: rps.createdByUser.role,
        actorName: rps.createdByUser.nama,
        action: 'submit_to_rmk',
        revisionRound: rps.currentRevisionCount + 1,
      },
    });

    return { rps: updatedRps as any, log };
  });

  return result;
}

/**
 * Transition: Approve by RMK
 * Flow: submitted_to_rmk → submitted_to_kaprodi (auto-advance)
 *
 * Policy: Auto-advance from RMK to Kaprodi (FASE_2_GOVERNANCE_POLICY_V2.md)
 * Note: Legacy "approved_by_rmk" state is NOT used - we skip straight to submitted_to_kaprodi
 */
export async function approveRMK(
  rpsId: string,
  actorId: string,
  actorRole: string,
  actorName: string
): Promise<{ rps: RpsWithGovernance; log: any }> {
  // Role check is stateless — safe to run before acquiring lock
  assertRole(actorRole, 'koordinator_rmk');

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM rps WHERE id = ${rpsId}::uuid FOR UPDATE`;

    const rps = await tx.rps.findUnique({
      where: { id: rpsId },
      include: RPS_INCLUDE,
    }) as RpsWithGovernance | null;

    if (!rps) throw new Error('RPS tidak ditemukan');

    // DB-dependent guards on freshly-locked read
    assertWorkflowStatus(rps.workflowStatus, ['submitted_to_rmk']);
    assertReviewIsFresh(rps, 'koordinator_rmk');

    // CRITICAL: write submitted_to_kaprodi (canonical), NOT approved_by_rmk (legacy)
    const updatedRps = await tx.rps.update({
      where: { id: rpsId },
      data: {
        workflowStatus: 'submitted_to_kaprodi',
        lastReviewedAtByRmk: new Date(),
        lastChangedAt: new Date(),
      },
      include: RPS_INCLUDE,
    });

    const log = await tx.rpsApprovalLog.create({
      data: {
        rpsId,
        versionNo: rps.versionNo,
        actorUserId: actorId,
        actorRole,
        actorName,
        action: 'approve_rmk',
        revisionRound: rps.currentRevisionCount + 1,
      },
    });

    return { rps: updatedRps as any, log };
  });

  return result;
}

/**
 * Transition: Reject by RMK
 * Flow: submitted_to_rmk → revision_requested_by_rmk
 */
export async function rejectRMK(
  rpsId: string,
  actorId: string,
  actorRole: string,
  actorName: string,
  catatanReview: string
): Promise<{ rps: RpsWithGovernance; log: any }> {
  assertRole(actorRole, 'koordinator_rmk');

  if (!catatanReview || catatanReview.trim().length < 10) {
    throw new Error('Catatan review harus diisi (minimal 10 karakter)');
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM rps WHERE id = ${rpsId}::uuid FOR UPDATE`;

    const rps = await tx.rps.findUnique({
      where: { id: rpsId },
      include: RPS_INCLUDE,
    }) as RpsWithGovernance | null;

    if (!rps) throw new Error('RPS tidak ditemukan');

    assertWorkflowStatus(rps.workflowStatus, ['submitted_to_rmk']);
    assertReviewIsFresh(rps, 'koordinator_rmk');

    const updatedRps = await tx.rps.update({
      where: { id: rpsId },
      data: {
        workflowStatus: 'revision_requested_by_rmk',
        lastReviewedAtByRmk: new Date(),
        currentRevisionCount: rps.currentRevisionCount + 1,
        lastChangedAt: new Date(),
        lastReviewedAtByKaprodi: null,  // symmetry with rejectKaprodi: allows Kaprodi to re-review in next round
      },
      include: RPS_INCLUDE,
    });

    const log = await tx.rpsApprovalLog.create({
      data: {
        rpsId,
        versionNo: rps.versionNo,
        actorUserId: actorId,
        actorRole,
        actorName,
        action: 'reject_rmk',
        catatanReview,
        revisionRound: rps.currentRevisionCount + 1,
      },
    });

    return { rps: updatedRps as any, log };
  });

  return result;
}

/**
 * Transition: Approve by Kaprodi
 * Flow: submitted_to_kaprodi → approved
 */
export async function approveKaprodi(
  rpsId: string,
  actorId: string,
  actorRole: string,
  actorName: string
): Promise<{ rps: RpsWithGovernance; log: any }> {
  assertRole(actorRole, 'kaprodi');

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM rps WHERE id = ${rpsId}::uuid FOR UPDATE`;

    const rps = await tx.rps.findUnique({
      where: { id: rpsId },
      include: RPS_INCLUDE,
    }) as RpsWithGovernance | null;

    if (!rps) throw new Error('RPS tidak ditemukan');

    assertWorkflowStatus(rps.workflowStatus, ['submitted_to_kaprodi']);
    assertReviewIsFresh(rps, 'kaprodi');

    const updatedRps = await tx.rps.update({
      where: { id: rpsId },
      data: {
        workflowStatus: 'approved',
        lastReviewedAtByKaprodi: new Date(),
        lastChangedAt: new Date(),
      },
      include: RPS_INCLUDE,
    });

    const log = await tx.rpsApprovalLog.create({
      data: {
        rpsId,
        versionNo: rps.versionNo,
        actorUserId: actorId,
        actorRole,
        actorName,
        action: 'approve_kaprodi',
        revisionRound: rps.currentRevisionCount + 1,
      },
    });

    return { rps: updatedRps as any, log };
  });

  return result;
}

/**
 * Transition: Reject by Kaprodi
 * Flow: submitted_to_kaprodi → revision_requested_by_kaprodi
 *
 * Policy: Returns to RMK for re-review (FASE_2_EDGE_CASE_POLICY.md - Rule 1)
 */
export async function rejectKaprodi(
  rpsId: string,
  actorId: string,
  actorRole: string,
  actorName: string,
  catatanReview: string
): Promise<{ rps: RpsWithGovernance; log: any }> {
  assertRole(actorRole, 'kaprodi');

  if (!catatanReview || catatanReview.trim().length < 10) {
    throw new Error('Catatan review harus diisi (minimal 10 karakter)');
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM rps WHERE id = ${rpsId}::uuid FOR UPDATE`;

    const rps = await tx.rps.findUnique({
      where: { id: rpsId },
      include: RPS_INCLUDE,
    }) as RpsWithGovernance | null;

    if (!rps) throw new Error('RPS tidak ditemukan');

    assertWorkflowStatus(rps.workflowStatus, ['submitted_to_kaprodi']);
    assertReviewIsFresh(rps, 'kaprodi');

    const updatedRps = await tx.rps.update({
      where: { id: rpsId },
      data: {
        workflowStatus: 'revision_requested_by_kaprodi',
        lastReviewedAtByKaprodi: new Date(),
        currentRevisionCount: rps.currentRevisionCount + 1,
        lastChangedAt: new Date(),
        lastReviewedAtByRmk: null,
      },
      include: RPS_INCLUDE,
    });

    const log = await tx.rpsApprovalLog.create({
      data: {
        rpsId,
        versionNo: rps.versionNo,
        actorUserId: actorId,
        actorRole,
        actorName,
        action: 'reject_kaprodi',
        catatanReview,
        revisionRound: rps.currentRevisionCount + 1,
      },
    });

    return { rps: updatedRps as any, log };
  });

  return result;
}
