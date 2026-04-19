/**
 * Fase 2 Governance - Workflow Status Normalization
 *
 * Provides backward compatibility during transition from:
 * - OLD: submitted_to_rmk → approved_by_rmk → submitted_to_kaprodi → approved
 * - NEW: submitted_to_rmk → submitted_to_kaprodi → approved
 *
 * Policy: approved_by_rmk is TRANSITIONAL ONLY - not a canonical state
 */

import type { RpsWorkflowStatus } from '@/services/rps/governance';

/**
 * Normalize legacy workflow status to canonical Fase 2 status
 *
 * Maps:
 * - approved_by_rmk → submitted_to_kaprodi (transitional alias)
 * - All other states → unchanged
 */
export function normalizeWorkflowStatus(status: string): RpsWorkflowStatus {
  // Transitional compatibility: approved_by_rmk maps to submitted_to_kaprodi
  if (status === 'approved_by_rmk') {
    return 'submitted_to_kaprodi' as RpsWorkflowStatus;
  }

  // All other states are canonical (including legacy enum values)
  const canonicalStates: RpsWorkflowStatus[] = [
    'draft',
    'submitted_to_rmk',
    'revision_requested_by_rmk',
    'submitted_to_kaprodi',
    'revision_requested_by_kaprodi',
    'approved'
  ];

  if (canonicalStates.includes(status as RpsWorkflowStatus)) {
    return status as RpsWorkflowStatus;
  }

  // Fallback for unknown states (should not happen)
  console.warn(`Unknown workflow status: ${status}, defaulting to draft`);
  return 'draft';
}

/**
 * Check if a status is a legacy transitional state
 */
export function isLegacyTransitionalStatus(status: string): boolean {
  return status === 'approved_by_rmk';
}

/**
 * Get display label for workflow status
 * Handles legacy states with deprecation notice
 */
export function getWorkflowStatusLabel(status: string): string {
  const normalized = normalizeWorkflowStatus(status);

  const labels: Record<RpsWorkflowStatus, string> = {
    draft: 'Draft',
    submitted_to_rmk: 'Menunggu Review RMK',
    revision_requested_by_rmk: 'Revisi RMK',
    submitted_to_kaprodi: 'Menunggu Review Kaprodi',
    revision_requested_by_kaprodi: 'Revisi Kaprodi',
    approved: 'Disetujui'
  };

  // Add deprecation notice for legacy states
  if (isLegacyTransitionalStatus(status)) {
    return `${labels[normalized]} (Legacy State)`;
  }

  return labels[normalized];
}

/**
 * Check if document is pending review by specific role
 * Accounts for legacy transitional states
 */
export function isPendingReview(status: string, role: 'rmk' | 'kaprodi'): boolean {
  const normalized = normalizeWorkflowStatus(status);

  if (role === 'rmk') {
    return normalized === 'submitted_to_rmk';
  }

  if (role === 'kaprodi') {
    return normalized === 'submitted_to_kaprodi';
  }

  return false;
}

/**
 * Check if document is in revision state
 */
export function isInRevision(status: string): boolean {
  const normalized = normalizeWorkflowStatus(status);
  return normalized.startsWith('revision_requested_by_');
}

/**
 * Check if document is approved
 */
export function isApproved(status: string): boolean {
  const normalized = normalizeWorkflowStatus(status);
  return normalized === 'approved';
}
