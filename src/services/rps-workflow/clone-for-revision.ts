import { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { assertCanCloneFromStatus } from "@/services/rps-versioning";

type CloneForRevisionOptions = {
  actorUserId: string;
};

function toNullableJsonInput(
  value: Prisma.JsonValue | null
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return value === null ? Prisma.JsonNull : value;
}

function getMappedId(
  idMap: Map<string, string>,
  oldId: string,
  entityLabel: string
): string {
  const mappedId = idMap.get(oldId);

  if (!mappedId) {
    throw new ValidationError(`Gagal memetakan ${entityLabel} saat clone revisi.`);
  }

  return mappedId;
}

export async function cloneForRevision(
  rpsId: string,
  options: CloneForRevisionOptions
) {
  return prisma.$transaction(async (tx) => {
    const sourceRps = await tx.rps.findUnique({
      where: { id: rpsId },
      select: {
        id: true,
        mataKuliahId: true,
        kurikulumVersiId: true,
        tahunAkademik: true,
        tanggalPenyusunan: true,
        dosenPengembangId: true,
        koordinatorRmkId: true,
        kaprodiId: true,
        deskripsiSingkat: true,
        bahanKajian: true,
        catatanTambahan: true,
        versionNo: true,
        status: true,
        rpsCplEntries: {
          orderBy: [{ urutan: "asc" }, { id: "asc" }],
          select: {
            id: true,
            cplId: true,
            urutan: true,
          },
        },
        rpsCpmkEntries: {
          orderBy: [{ urutan: "asc" }, { id: "asc" }],
          select: {
            id: true,
            kode: true,
            deskripsi: true,
            urutan: true,
            cplLinks: {
              select: {
                rpsCplId: true,
              },
            },
          },
        },
        subCpmkEntries: {
          orderBy: [{ urutan: "asc" }, { id: "asc" }],
          select: {
            id: true,
            rpsCpmkId: true,
            kode: true,
            deskripsi: true,
            urutan: true,
            targetKetercapaianPersen: true,
            aktualKetercapaianPersen: true,
            korelasiCpl: {
              select: {
                rpsCplId: true,
                persentase: true,
              },
            },
          },
        },
        pertemuanEntries: {
          orderBy: [{ orderNo: "asc" }, { id: "asc" }],
          select: {
            id: true,
            weekLabel: true,
            orderNo: true,
            tipe: true,
            subCpmkId: true,
            indikatorPenilaian: true,
            teknikPenilaian: true,
            kriteriaPenilaian: true,
            metodePembelajaran: true,
            catatanPenugasan: true,
            estimasiWaktuPb: true,
            estimasiWaktuPt: true,
            estimasiWaktuKm: true,
            bentukDaring: true,
            materiPembelajaran: true,
            bobotPenilaianPersen: true,
            deskripsiEvaluasi: true,
            statusPelaksanaan: true,
            materiAktual: true,
            catatanDeviasi: true,
            tanggalPelaksanaan: true,
          },
        },
        rpsPustakaEntries: {
          orderBy: [{ urutan: "asc" }, { id: "asc" }],
          select: {
            kategori: true,
            teksLengkap: true,
            urutan: true,
          },
        },
        rpsRtmEntries: {
          orderBy: [{ nomorTugas: "asc" }, { id: "asc" }],
          select: {
            id: true,
            nomorTugas: true,
            judulTugas: true,
            subCpmkId: true,
            metodePenugasan: true,
            deskripsi: true,
            langkahPengerjaan: true,
            bentukLuaran: true,
            indikatorPenilaian: true,
            bobotInternalPersen: true,
            jadwalPelaksanaan: true,
            catatan: true,
            daftarRujukan: true,
            pertemuanLinks: {
              select: {
                rpsPertemuanId: true,
                keterangan: true,
              },
            },
          },
        },
        dosenPengampu: {
          orderBy: [{ urutan: "asc" }, { id: "asc" }],
          select: {
            userId: true,
            isPengembang: true,
            urutan: true,
          },
        },
      },
    });

    if (!sourceRps) {
      throw new NotFoundError("RPS tidak ditemukan.");
    }

    if (sourceRps.dosenPengembangId !== options.actorUserId) {
      throw new ValidationError("Hanya dosen pengembang yang dapat memulai revisi.");
    }

    assertCanCloneFromStatus(sourceRps.status);

    const supersedeSource = await tx.rps.updateMany({
      where: {
        id: sourceRps.id,
        status: {
          in: ["revision_requested_by_rmk", "revision_requested_by_kaprodi"],
        },
      },
      data: {
        status: "superseded",
      },
    });

    if (supersedeSource.count !== 1) {
      throw new ValidationError(
        "RPS revisi ini sudah berubah status dan tidak dapat dikloning ulang."
      );
    }

    const clonedRps = await tx.rps.create({
      data: {
        mataKuliahId: sourceRps.mataKuliahId,
        kurikulumVersiId: sourceRps.kurikulumVersiId,
        tahunAkademik: sourceRps.tahunAkademik,
        tanggalPenyusunan: sourceRps.tanggalPenyusunan,
        dosenPengembangId: sourceRps.dosenPengembangId,
        koordinatorRmkId: sourceRps.koordinatorRmkId,
        kaprodiId: sourceRps.kaprodiId,
        deskripsiSingkat: sourceRps.deskripsiSingkat,
        bahanKajian: sourceRps.bahanKajian,
        catatanTambahan: sourceRps.catatanTambahan,
        versionNo: sourceRps.versionNo + 1,
        parentRpsId: sourceRps.id,
        status: "draft",
        createdBy: options.actorUserId,
      },
      select: {
        id: true,
        versionNo: true,
      },
    });

    const cplIdMap = new Map<string, string>();
    const cpmkIdMap = new Map<string, string>();
    const subCpmkIdMap = new Map<string, string>();
    const pertemuanIdMap = new Map<string, string>();
    const rtmIdMap = new Map<string, string>();

    for (const cplEntry of sourceRps.rpsCplEntries) {
      const clonedCpl = await tx.rpsCpl.create({
        data: {
          rpsId: clonedRps.id,
          cplId: cplEntry.cplId,
          urutan: cplEntry.urutan,
        },
        select: {
          id: true,
        },
      });

      cplIdMap.set(cplEntry.id, clonedCpl.id);
    }

    for (const cpmkEntry of sourceRps.rpsCpmkEntries) {
      const clonedCpmk = await tx.rpsCpmk.create({
        data: {
          rpsId: clonedRps.id,
          kode: cpmkEntry.kode,
          deskripsi: cpmkEntry.deskripsi,
          urutan: cpmkEntry.urutan,
        },
        select: {
          id: true,
        },
      });

      cpmkIdMap.set(cpmkEntry.id, clonedCpmk.id);
    }

    for (const cpmkEntry of sourceRps.rpsCpmkEntries) {
      for (const cplLink of cpmkEntry.cplLinks) {
        await tx.rpsCpmkCpl.create({
          data: {
            rpsCpmkId: getMappedId(cpmkIdMap, cpmkEntry.id, "CPMK"),
            rpsCplId: getMappedId(cplIdMap, cplLink.rpsCplId, "CPL"),
          },
          select: {
            id: true,
          },
        });
      }
    }

    for (const subCpmkEntry of sourceRps.subCpmkEntries) {
      const clonedSubCpmk = await tx.rpsSubCpmk.create({
        data: {
          rpsId: clonedRps.id,
          rpsCpmkId: getMappedId(cpmkIdMap, subCpmkEntry.rpsCpmkId, "CPMK"),
          kode: subCpmkEntry.kode,
          deskripsi: subCpmkEntry.deskripsi,
          urutan: subCpmkEntry.urutan,
          targetKetercapaianPersen: subCpmkEntry.targetKetercapaianPersen,
          aktualKetercapaianPersen: subCpmkEntry.aktualKetercapaianPersen,
        },
        select: {
          id: true,
        },
      });

      subCpmkIdMap.set(subCpmkEntry.id, clonedSubCpmk.id);
    }

    for (const subCpmkEntry of sourceRps.subCpmkEntries) {
      for (const korelasiEntry of subCpmkEntry.korelasiCpl) {
        await tx.rpsKorelasiCpl.create({
          data: {
            rpsSubCpmkId: getMappedId(subCpmkIdMap, subCpmkEntry.id, "Sub-CPMK"),
            rpsCplId: getMappedId(cplIdMap, korelasiEntry.rpsCplId, "CPL"),
            persentase: korelasiEntry.persentase,
          },
          select: {
            id: true,
          },
        });
      }
    }

    for (const pertemuanEntry of sourceRps.pertemuanEntries) {
      const clonedPertemuan = await tx.rpsPertemuan.create({
        data: {
          rpsId: clonedRps.id,
          weekLabel: pertemuanEntry.weekLabel,
          orderNo: pertemuanEntry.orderNo,
          tipe: pertemuanEntry.tipe,
          subCpmkId: pertemuanEntry.subCpmkId
            ? getMappedId(subCpmkIdMap, pertemuanEntry.subCpmkId, "Sub-CPMK")
            : null,
          indikatorPenilaian: toNullableJsonInput(pertemuanEntry.indikatorPenilaian),
          teknikPenilaian: pertemuanEntry.teknikPenilaian,
          kriteriaPenilaian: pertemuanEntry.kriteriaPenilaian,
          metodePembelajaran: toNullableJsonInput(pertemuanEntry.metodePembelajaran),
          catatanPenugasan: pertemuanEntry.catatanPenugasan,
          estimasiWaktuPb: pertemuanEntry.estimasiWaktuPb,
          estimasiWaktuPt: pertemuanEntry.estimasiWaktuPt,
          estimasiWaktuKm: pertemuanEntry.estimasiWaktuKm,
          bentukDaring: pertemuanEntry.bentukDaring,
          materiPembelajaran: pertemuanEntry.materiPembelajaran,
          bobotPenilaianPersen: pertemuanEntry.bobotPenilaianPersen,
          deskripsiEvaluasi: pertemuanEntry.deskripsiEvaluasi,
          statusPelaksanaan: pertemuanEntry.statusPelaksanaan,
          materiAktual: pertemuanEntry.materiAktual,
          catatanDeviasi: pertemuanEntry.catatanDeviasi,
          tanggalPelaksanaan: pertemuanEntry.tanggalPelaksanaan,
        },
        select: {
          id: true,
        },
      });

      pertemuanIdMap.set(pertemuanEntry.id, clonedPertemuan.id);
    }

    for (const pustakaEntry of sourceRps.rpsPustakaEntries) {
      await tx.rpsPustaka.create({
        data: {
          rpsId: clonedRps.id,
          kategori: pustakaEntry.kategori,
          teksLengkap: pustakaEntry.teksLengkap,
          urutan: pustakaEntry.urutan,
        },
        select: {
          id: true,
        },
      });
    }

    for (const rtmEntry of sourceRps.rpsRtmEntries) {
      const clonedRtm = await tx.rpsRtm.create({
        data: {
          rpsId: clonedRps.id,
          nomorTugas: rtmEntry.nomorTugas,
          judulTugas: rtmEntry.judulTugas,
          subCpmkId: getMappedId(subCpmkIdMap, rtmEntry.subCpmkId, "Sub-CPMK"),
          metodePenugasan: rtmEntry.metodePenugasan,
          deskripsi: rtmEntry.deskripsi,
          langkahPengerjaan: rtmEntry.langkahPengerjaan,
          bentukLuaran: rtmEntry.bentukLuaran,
          indikatorPenilaian: rtmEntry.indikatorPenilaian,
          bobotInternalPersen: rtmEntry.bobotInternalPersen,
          jadwalPelaksanaan: rtmEntry.jadwalPelaksanaan,
          catatan: rtmEntry.catatan,
          daftarRujukan: rtmEntry.daftarRujukan,
        },
        select: {
          id: true,
        },
      });

      rtmIdMap.set(rtmEntry.id, clonedRtm.id);
    }

    for (const rtmEntry of sourceRps.rpsRtmEntries) {
      for (const pertemuanLink of rtmEntry.pertemuanLinks) {
        await tx.rpsRtmPertemuan.create({
          data: {
            rpsRtmId: getMappedId(rtmIdMap, rtmEntry.id, "RTM"),
            rpsPertemuanId: getMappedId(
              pertemuanIdMap,
              pertemuanLink.rpsPertemuanId,
              "Pertemuan"
            ),
            keterangan: pertemuanLink.keterangan,
          },
          select: {
            id: true,
          },
        });
      }
    }

    for (const dosenPengampuEntry of sourceRps.dosenPengampu) {
      await tx.rpsDosenPengampu.create({
        data: {
          rpsId: clonedRps.id,
          userId: dosenPengampuEntry.userId,
          isPengembang: dosenPengampuEntry.isPengembang,
          urutan: dosenPengampuEntry.urutan,
        },
        select: {
          id: true,
        },
      });
    }

    await tx.rpsApprovalLog.createMany({
      data: [
        {
          rpsId: clonedRps.id,
          versionNo: clonedRps.versionNo,
          actorUserId: options.actorUserId,
          action: "clone_for_revision",
          catatanReview: null,
        },
        {
          rpsId: sourceRps.id,
          versionNo: sourceRps.versionNo,
          actorUserId: options.actorUserId,
          action: "supersede",
          catatanReview: null,
        },
      ],
    });

    return {
      newRpsId: clonedRps.id,
    };
  });
}
