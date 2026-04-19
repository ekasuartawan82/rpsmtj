import { prisma } from "@/db/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

export async function deleteRps(rpsId: string, actorUserId: string) {
  const rps = await prisma.rps.findUnique({
    where: { id: rpsId },
    select: {
      id: true,
      status: true,
      dosenPengembangId: true,
    },
  });

  if (!rps) throw new NotFoundError("RPS tidak ditemukan.");

  if (rps.dosenPengembangId !== actorUserId) {
    throw new ForbiddenError("Hanya dosen pengembang yang dapat menghapus RPS ini.");
  }

  if (rps.status !== "draft") {
    throw new ValidationError(
      "Hanya RPS berstatus draft yang dapat dihapus. RPS yang sudah diajukan atau disetujui tidak bisa dihapus."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.rpsRtmPertemuan.deleteMany({ where: { rpsRtm: { rpsId } } });
    await tx.rpsKorelasiCpl.deleteMany({ where: { rpsSubCpmk: { rpsId } } });
    await tx.rpsCpmkCpl.deleteMany({ where: { rpsCpmk: { rpsId } } });
    await tx.rpsRtm.deleteMany({ where: { rpsId } });
    await tx.rpsPertemuan.deleteMany({ where: { rpsId } });
    await tx.rpsSubCpmk.deleteMany({ where: { rpsId } });
    await tx.rpsCpmk.deleteMany({ where: { rpsId } });
    await tx.rpsCpl.deleteMany({ where: { rpsId } });
    await tx.rpsPustaka.deleteMany({ where: { rpsId } });
    await tx.rpsDosenPengampu.deleteMany({ where: { rpsId } });
    await tx.rpsApprovalLog.deleteMany({ where: { rpsId } });
    await tx.rpsNotification.deleteMany({ where: { rpsId } });
    await tx.rps.delete({ where: { id: rpsId } });
  });

  return { id: rpsId, success: true };
}
