import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createNotifications } from "@/services/notifications";
import { approveRMK as approveRMKGovernance, rejectRMK as rejectRMKGovernance } from "@/services/rps/governance";
import { normalizeWorkflowStatus, getWorkflowStatusLabel } from "@/services/rps/governance/status-normalization";

/**
 * Fetch user role and name for audit trail
 * Ensures audit integrity by using actual user data, not placeholders
 */
async function getUserAuditData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      nama: true,
    },
  });

  if (!user) {
    throw new ValidationError("User tidak ditemukan untuk audit trail.");
  }

  return {
    role: user.role,
    name: user.nama,
  };
}

const catatanSchema = z
  .string()
  .trim()
  .min(
    20,
    "Catatan penolakan minimal 20 karakter. Mohon berikan penjelasan detail agar dosen dapat melakukan perbaikan."
  );

type ReviewRmkOptions = {
  actorUserId: string;
};

async function validateRmkAuthority(rpsId: string, actorUserId: string) {
  const rps = await prisma.rps.findUnique({
    where: { id: rpsId },
    select: {
      id: true,
      status: true,
      workflowStatus: true,
      koordinatorRmkId: true,
      dosenPengembangId: true,
      versionNo: true,
      mataKuliah: {
        select: {
          kode: true,
          nama: true,
        },
      },
    },
  });

  if (!rps) {
    throw new NotFoundError("RPS tidak ditemukan.");
  }

  // Verify actor is the koordinator RMK
  if (rps.koordinatorRmkId !== actorUserId) {
    throw new ValidationError("Hanya koordinator RMK yang dapat mereview RPS ini.");
  }

  return rps;
}

export async function approveByRmk(rpsId: string, options: ReviewRmkOptions) {
  const rps = await validateRmkAuthority(rpsId, options.actorUserId);

  // Fetch actual user data for audit trail (not placeholders)
  const { role: actorRole, name: actorName } = await getUserAuditData(options.actorUserId);

  // NEW: Use governance layer (Fase 2)
  // This handles: state transition, guards, audit log, freshness tracking
  const governanceResult = await approveRMKGovernance(
    rpsId,
    options.actorUserId,
    actorRole,  // Actual role from database
    actorName  // Actual name from database
  );

  // Create notifications (existing functionality)
  await createNotifications(prisma, [
    {
      recipientUserId: rps.dosenPengembangId,
      rpsId,
      type: "approved_by_rmk",  // Keep legacy notification type for compatibility
      title: "RPS disetujui RMK",
      message: `${rps.mataKuliah.kode} • ${rps.mataKuliah.nama} telah disetujui RMK dan siap diajukan ke Kaprodi.`,
      href: `/rps/${rpsId}`,
    },
  ]);

  return governanceResult.rps;
}

export async function rejectByRmk(
  rpsId: string,
  catatan: string,
  options: ReviewRmkOptions
) {
  // Validate catatan length
  const validatedCatatan = catatanSchema.parse(catatan);

  const rps = await validateRmkAuthority(rpsId, options.actorUserId);

  // Fetch actual user data for audit trail (not placeholders)
  const { role: actorRole, name: actorName } = await getUserAuditData(options.actorUserId);

  // NEW: Use governance layer (Fase 2)
  // This handles: state transition, guards, audit log, freshness tracking
  const governanceResult = await rejectRMKGovernance(
    rpsId,
    options.actorUserId,
    actorRole,  // Actual role from database
    actorName,  // Actual name from database
    validatedCatatan
  );

  // Create notifications (existing functionality)
  await createNotifications(prisma, [
    {
      recipientUserId: rps.dosenPengembangId,
      rpsId,
      type: "revision_requested_by_rmk",
      title: "RPS dikembalikan oleh RMK",
      message: `${rps.mataKuliah.kode} • ${rps.mataKuliah.nama} memerlukan revisi. Catatan: ${validatedCatatan}`,
      href: `/rps/${rpsId}`,
    },
  ]);

  return governanceResult.rps;
}
