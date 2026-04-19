import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createNotifications } from "@/services/notifications";
import { assertActiveWarningsAcknowledged } from "@/services/rps-validation";
import { submitRps as submitRpsGovernance } from "@/services/rps/governance";

type SubmitRpsOptions = {
  actorUserId: string;
};

async function assertRpsReadyForSubmission(rpsId: string) {
  const [
    rps,
    cplCount,
    cpmkCount,
    cpmkWithoutSubCpmkCount,
    pertemuanCount,
    rtmWithoutPertemuanCount,
    cpmkWithoutCplMapping,
    subCpmkWithoutPositiveCplCorrelationCount,
    subCpmkWithoutRegularPertemuanCount,
    regularPertemuanBobotAggregate,
    pertemuanAssignmentNotes,
    rtmEntries,
  ] = await Promise.all([
    prisma.rps.findUnique({
      where: { id: rpsId },
      select: {
        id: true,
        deskripsiSingkat: true,
        bahanKajian: true,
        tanggalPenyusunan: true,
      },
    }),
    prisma.rpsCpl.count({
      where: { rpsId },
    }),
    prisma.rpsCpmk.count({
      where: { rpsId },
    }),
    prisma.rpsCpmk.count({
      where: {
        rpsId,
        subCpmkEntries: {
          none: {},
        },
      },
    }),
    prisma.rpsPertemuan.count({
      where: { rpsId },
    }),
    prisma.rpsRtm.count({
      where: {
        rpsId,
        pertemuanLinks: {
          none: {},
        },
      },
    }),
    // Validasi OBE: Cari CPMK yang tidak memiliki mapping ke CPL
    prisma.rpsCpmk.count({
      where: {
        rpsId,
        cplLinks: {
          none: {},
        },
      },
    }),
    prisma.rpsSubCpmk.count({
      where: {
        rpsId,
        korelasiCpl: {
          none: {
            persentase: {
              gt: 0,
            },
          },
        },
      },
    }),
    prisma.rpsSubCpmk.count({
      where: {
        rpsId,
        pertemuanEntries: {
          none: {
            tipe: "reguler",
          },
        },
      },
    }),
    prisma.rpsPertemuan.aggregate({
      where: {
        rpsId,
        tipe: "reguler",
      },
      _sum: {
        bobotPenilaianPersen: true,
      },
    }),
    prisma.rpsPertemuan.findMany({
      where: {
        rpsId,
        catatanPenugasan: {
          not: null,
        },
      },
      select: {
        catatanPenugasan: true,
      },
    }),
    prisma.rpsRtm.findMany({
      where: { rpsId },
      select: {
        nomorTugas: true,
      },
    }),
  ]);

  if (!rps) {
    throw new NotFoundError("RPS tidak ditemukan.");
  }

  const blockers: string[] = [];

  if (!rps.tanggalPenyusunan) {
    blockers.push("tanggal penyusunan belum diisi");
  }

  if (!rps.deskripsiSingkat?.trim()) {
    blockers.push("deskripsi singkat belum diisi");
  }

  if (!rps.bahanKajian?.trim()) {
    blockers.push("bahan kajian belum diisi");
  }

  if (cplCount === 0) {
    blockers.push("minimal satu CPL harus ditambahkan");
  }

  if (cpmkCount === 0) {
    blockers.push("minimal satu CPMK harus ditambahkan");
  }

  // Validasi OBE: Setiap CPMK harus mapping ke minimal 1 CPL
  if (cpmkWithoutCplMapping > 0) {
    blockers.push(
      `${cpmkWithoutCplMapping} CPMK belum di-mapping ke CPL. ` +
      "Sesuai prinsip OBE, setiap CPMK harus terhubung ke minimal satu CPL."
    );
  }

  if (cpmkWithoutSubCpmkCount > 0) {
    blockers.push(
      `${cpmkWithoutSubCpmkCount} CPMK belum memiliki Sub-CPMK turunan`
    );
  }

  if (pertemuanCount === 0) {
    blockers.push("minimal satu pertemuan harus ditambahkan");
  }

  if (subCpmkWithoutPositiveCplCorrelationCount > 0) {
    blockers.push(
      `${subCpmkWithoutPositiveCplCorrelationCount} Sub-CPMK belum memiliki korelasi CPL dengan nilai > 0%`
    );
  }

  if (subCpmkWithoutRegularPertemuanCount > 0) {
    blockers.push(
      `${subCpmkWithoutRegularPertemuanCount} Sub-CPMK belum direferensikan di pertemuan reguler`
    );
  }

  const totalBobotReguler = regularPertemuanBobotAggregate._sum.bobotPenilaianPersen
    ? parseFloat(regularPertemuanBobotAggregate._sum.bobotPenilaianPersen.toString())
    : 0;

  if (Math.abs(totalBobotReguler - 100) > 0.01) {
    blockers.push(
      `total bobot penilaian pertemuan reguler adalah ${totalBobotReguler.toFixed(2)}%, harus 100%`
    );
  }

  const assignmentNotes = new Set(
    pertemuanAssignmentNotes
      .map((entry) => entry.catatanPenugasan?.trim())
      .filter((note): note is string => Boolean(note))
  );
  const rtmNomorTugasSet = new Set(
    rtmEntries.map((entry) => entry.nomorTugas.trim()).filter(Boolean)
  );
  const unmatchedAssignmentNotes = [...assignmentNotes].filter(
    (note) => !rtmNomorTugasSet.has(note)
  );

  if (unmatchedAssignmentNotes.length > 0) {
    blockers.push(
      `${unmatchedAssignmentNotes.length} catatan penugasan belum memiliki RTM dengan nomor tugas yang sama`
    );
  }

  if (rtmWithoutPertemuanCount > 0) {
    blockers.push("setiap RTM harus terhubung ke minimal satu pertemuan");
  }

  if (blockers.length > 0) {
    throw new ValidationError(
      `RPS belum siap diajukan: ${blockers.join("; ")}.`
    );
  }
}

export async function submitRpsForReview(rpsId: string, options: SubmitRpsOptions) {
  // STEP 1: Content validation (existing - OBE compliance)
  await assertActiveWarningsAcknowledged(rpsId, options.actorUserId);
  await assertRpsReadyForSubmission(rpsId);

  // STEP 2: Governance validation (new - Fase 2)
  // This handles:
  // - Ownership check
  // - Workflow status validation
  // - State transition
  // - Audit trail
  // - Freshness tracking
  const governanceResult = await submitRpsGovernance(rpsId, options.actorUserId);

  // STEP 3: Create notifications
  const rps = await prisma.rps.findUnique({
    where: { id: rpsId },
    select: {
      koordinatorRmkId: true,
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

  await createNotifications(prisma, [
    {
      recipientUserId: rps.koordinatorRmkId,
      rpsId,
      type: "submitted_to_rmk",
      title: "RPS menunggu review RMK",
      message: `${rps.mataKuliah.kode} • ${rps.mataKuliah.nama} diajukan untuk review RMK.`,
      href: `/rps/${rpsId}`,
    },
  ]);

  // Return updated RPS
  return governanceResult.rps;
}
