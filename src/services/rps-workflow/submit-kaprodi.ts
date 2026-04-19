import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createNotifications } from "@/services/notifications";

type SubmitToKaprodiOptions = {
  actorUserId: string;
};

export async function submitToKaprodi(rpsId: string, options: SubmitToKaprodiOptions) {
  const rps = await prisma.rps.findUnique({
    where: { id: rpsId },
    select: {
      id: true,
      status: true,
      koordinatorRmkId: true,
      kaprodiId: true,
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
  if (rps.koordinatorRmkId !== options.actorUserId) {
    throw new ValidationError("Hanya koordinator RMK yang dapat mengajukan RPS ini ke Kaprodi.");
  }

  const actor = await prisma.user.findUnique({
    where: { id: options.actorUserId },
    select: { role: true, nama: true },
  });
  const actorRole = actor?.role ?? "koordinator_rmk";
  const actorName = actor?.nama ?? options.actorUserId;

  // Use transaction to update status and create approval log
  await prisma.$transaction(async (tx) => {
    const updated = await tx.rps.updateMany({
      where: {
        id: rpsId,
        status: "approved_by_rmk",
      },
      data: {
        status: "submitted_to_kaprodi",
      },
    });

    if (updated.count !== 1) {
      throw new ValidationError(
        "RPS tidak dalam status yang dapat diajukan ke Kaprodi, atau sudah diproses oleh pengguna lain."
      );
    }

    // Create approval log entry
    await tx.rpsApprovalLog.create({
      data: {
        rpsId,
        versionNo: rps.versionNo,
        actorUserId: options.actorUserId,
        actorRole,
        actorName,
        action: "submit_to_kaprodi",
        catatanReview: null,
      },
      select: {
        id: true,
      },
    });

    await createNotifications(tx, [
      {
        recipientUserId: rps.kaprodiId,
        rpsId,
        type: "submitted_to_kaprodi",
        title: "RPS menunggu review Kaprodi",
        message: `${rps.mataKuliah.kode} • ${rps.mataKuliah.nama} diajukan untuk review Kaprodi.`,
        href: `/rps/${rpsId}`,
      },
    ]);
  });

  // Return updated RPS
  const updatedRps = await prisma.rps.findUnique({
    where: { id: rpsId },
    select: {
      id: true,
      status: true,
      versionNo: true,
    },
  });

  return updatedRps;
}
