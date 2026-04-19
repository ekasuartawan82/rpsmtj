import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createNotifications } from "@/services/notifications";
import { approveKaprodi as approveKaprodiGovernance, rejectKaprodi as rejectKaprodiGovernance } from "@/services/rps/governance";

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

type ReviewKaprodiOptions = {
  actorUserId: string;
};

async function validateKaprodiAuthority(rpsId: string, actorUserId: string) {
  const rps = await prisma.rps.findUnique({
    where: { id: rpsId },
    select: {
      id: true,
      status: true,
      workflowStatus: true,
      kaprodiId: true,
      dosenPengembangId: true,
      koordinatorRmkId: true,
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

  // Verify actor is the kaprodi
  if (rps.kaprodiId !== actorUserId) {
    throw new ValidationError("Hanya kaprodi yang dapat mereview RPS ini.");
  }

  return rps;
}

export async function approveByKaprodi(rpsId: string, options: ReviewKaprodiOptions) {
  const rps = await validateKaprodiAuthority(rpsId, options.actorUserId);

  // Fetch actual user data for audit trail (not placeholders)
  const { role: actorRole, name: actorName } = await getUserAuditData(options.actorUserId);

  // NEW: Use governance layer (Fase 2)
  // This handles: state transition, guards, audit log, freshness tracking
  const governanceResult = await approveKaprodiGovernance(
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
      type: "approved",
      title: "RPS disahkan Kaprodi",
      message: `${rps.mataKuliah.kode} • ${rps.mataKuliah.nama} telah disahkan dan siap diekspor.`,
      href: `/rps/${rpsId}`,
    },
    {
      recipientUserId: rps.koordinatorRmkId,
      rpsId,
      type: "approved",
      title: "RPS final telah disahkan",
      message: `${rps.mataKuliah.kode} • ${rps.mataKuliah.nama} telah disahkan oleh Kaprodi.`,
      href: `/rps/${rpsId}`,
    },
  ]);

  return governanceResult.rps;
}

export async function rejectByKaprodi(
  rpsId: string,
  catatan: string,
  options: ReviewKaprodiOptions
) {
  // Validate catatan length
  const validatedCatatan = catatanSchema.parse(catatan);

  const rps = await validateKaprodiAuthority(rpsId, options.actorUserId);

  // Fetch actual user data for audit trail (not placeholders)
  const { role: actorRole, name: actorName } = await getUserAuditData(options.actorUserId);

  // NEW: Use governance layer (Fase 2)
  // This handles: state transition, guards, audit log, freshness tracking
  const governanceResult = await rejectKaprodiGovernance(
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
      type: "revision_requested_by_kaprodi",
      title: "RPS dikembalikan oleh Kaprodi",
      message: `${rps.mataKuliah.kode} • ${rps.mataKuliah.nama} memerlukan revisi. Catatan: ${validatedCatatan}`,
      href: `/rps/${rpsId}`,
    },
  ]);

  return governanceResult.rps;
}
