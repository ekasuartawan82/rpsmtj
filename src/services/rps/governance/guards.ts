/**
 * Fase 2 Governance - Core Guard Functions
 *
 * These guards enforce the governance rules defined in:
 * - FASE_2_GOVERNANCE_POLICY_V2.md
 * - FASE_2_IMPLEMENTATION_CONTRACT.md
 */

import { Prisma } from '@prisma/client';
import { AppError } from '@/lib/errors';

// ============================================================================
// Custom Errors
// ============================================================================

export class GovernanceError extends AppError {
  constructor(message: string, statusCode = 422, code = 'GOVERNANCE_ERROR') {
    super(message, statusCode, code);
    this.name = 'GovernanceError';
  }
}

export class ForbiddenTransitionError extends GovernanceError {
  constructor(message: string) {
    super(message, 422, 'FORBIDDEN_TRANSITION');
    this.name = 'ForbiddenTransitionError';
  }
}

export class ReviewExpiredError extends GovernanceError {
  constructor(message: string) {
    super(message, 422, 'REVIEW_EXPIRED');
    this.name = 'ReviewExpiredError';
  }
}

export class OwnershipError extends GovernanceError {
  constructor(message: string) {
    super(message, 403, 'OWNERSHIP_ERROR');
    this.name = 'OwnershipError';
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

export type RpsWithGovernance = Prisma.RpsGetPayload<{
  include: {
    createdByUser: true;
    dosenPengembang: true;
    koordinatorRmk: true;
    kaprodi: true;
  };
}>;

export type WorkflowStatus = 'draft' | 'submitted_to_rmk' | 'revision_requested_by_rmk' | 'submitted_to_kaprodi' | 'revision_requested_by_kaprodi' | 'approved';

export type RecordStatus = 'active' | 'superseded' | 'archived' | 'revoked';

// ============================================================================
// Guard Functions
// ============================================================================

/**
 * Guard: Assert document can be submitted
 * Policy: Only documents in draft or revision states can be submitted
 */
export function assertCanSubmit(
  rps: Pick<RpsWithGovernance, 'workflowStatus' | 'createdBy'>,
  userId: string
): void {
  // Rule 1: Must be in submittable state
  const validStates: WorkflowStatus[] = ['draft', 'revision_requested_by_rmk', 'revision_requested_by_kaprodi'];

  if (!validStates.includes(rps.workflowStatus as WorkflowStatus)) {
    throw new ForbiddenTransitionError(
      `Dokumen dengan status "${rps.workflowStatus}" tidak dapat disubmit. ` +
      `Hanya draft atau revisi yang dapat disubmit.`
    );
  }

  // Rule 2: Must be owner
  assertOwnership(rps, userId);
}

/**
 * Guard: Assert document can be edited
 * Policy: Only owner can edit draft/revision documents
 */
export function assertCanEdit(
  rps: Pick<RpsWithGovernance, 'workflowStatus' | 'createdBy'>,
  userId: string
): void {
  // Rule 1: Cannot edit approved documents
  if (rps.workflowStatus === 'approved') {
    throw new ForbiddenTransitionError(
      'Dokumen sudah disetujui dan tidak dapat diubah. ' +
      'Silakan buat versi baru untuk perubahan.'
    );
  }

  // Rule 2: Cannot edit submitted documents (not in revision stage)
  if (rps.workflowStatus.startsWith('submitted_to_')) {
    throw new ForbiddenTransitionError(
      'Dokumen sedang dalam proses review dan tidak dapat diubah. ' +
      'Tunggu hingga revisi diminta atau disetujui.'
    );
  }

  // Rule 3: Must be owner
  assertOwnership(rps, userId);
}

/**
 * Guard: Assert review is fresh (prevents rubber-stamping)
 * Policy: FASE_2_BEHAVIORAL_SAFEGUARDS.md - Safeguard 1
 */
export function assertReviewIsFresh(
  rps: Pick<RpsWithGovernance, 'lastChangedAt' | 'lastReviewedAtByRmk' | 'lastReviewedAtByKaprodi'>,
  reviewerRole: 'koordinator_rmk' | 'kaprodi'
): void {
  const lastReview = reviewerRole === 'koordinator_rmk'
    ? rps.lastReviewedAtByRmk
    : rps.lastReviewedAtByKaprodi;

  const lastChange = rps.lastChangedAt;

  // If no prior review, first approval is always allowed
  if (!lastReview) {
    return;
  }

  // If document changed since last review, require re-review
  if (lastReview < lastChange) {
    throw new ReviewExpiredError(
      `Dokumen telah berubah sejak review terakhir Anda pada ${lastReview.toLocaleString('id-ID')}. ` +
      `Perubahan terbaru: ${lastChange.toLocaleString('id-ID')}. ` +
      `Mohon review ulang sebelum menyetujui.`
    );
  }
}

/**
 * Guard: Assert user is document owner
 */
export function assertOwnership(
  rps: Pick<RpsWithGovernance, 'createdBy'>,
  userId: string
): void {
  if (rps.createdBy !== userId) {
    throw new OwnershipError(
      'Anda tidak memiliki akses ke dokumen ini. ' +
      'Hanya pemilik dokumen yang dapat melakukan aksi ini.'
    );
  }
}

/**
 * Guard: Assert user has required role
 */
export function assertRole(
  userRole: string,
  requiredRole: 'koordinator_rmk' | 'kaprodi' | 'admin' | 'dosen'
): void {
  if (userRole !== requiredRole) {
    throw new ForbiddenTransitionError(
      `Aksi ini memerlukan role "${requiredRole}". Role Anda: ${userRole}`
    );
  }
}

/**
 * Guard: Assert workflow status is valid for transition
 */
export function assertWorkflowStatus(
  currentStatus: string,
  expectedStatuses: WorkflowStatus[]
): void {
  if (!expectedStatuses.includes(currentStatus as WorkflowStatus)) {
    throw new ForbiddenTransitionError(
      `Status workflow saat ini "${currentStatus}" tidak valid untuk aksi ini. ` +
      `Status yang diharapkan: ${expectedStatuses.join(', ')}.`
    );
  }
}

/**
 * Guard: Assert record status is active
 */
export function assertRecordStatus(
  currentStatus: string,
  expectedStatuses: RecordStatus[] = ['active']
): void {
  if (!expectedStatuses.includes(currentStatus as RecordStatus)) {
    throw new ForbiddenTransitionError(
      `Status record saat ini "${currentStatus}" tidak valid untuk aksi ini. ` +
      `Status yang diharapkan: ${expectedStatuses.join(', ')}.`
    );
  }
}
