import { prisma } from "@/db/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  parseIndikatorPenilaian,
  parseMetodePembelajaran,
  type IndikatorPenilaian,
  type MetodePembelajaran,
} from "@/lib/types/rps";

type GetRpsDetailOptions = {
  actorUserId: string;
  actorRole: string;
};

type RpsDetail = {
  id: string;
  tahunAkademik: string;
  status: string;
  versionNo: number;
  kurikulumVersiId: string;
  tanggalPenyusunan: Date | null;
  deskripsiSingkat: string | null;
  bahanKajian: string | null;
  catatanTambahan: string | null;
  mataKuliah: {
    id: string;
    kode: string;
    nama: string;
    sksTeori: number | null;
    sksPraktik: number | null;
  };
  dosenPengembang: {
    id: string;
    nama: string;
    email: string;
  };
  dosenPengampu: Array<{
    id: string;
    userId: string;
    isPengembang: boolean;
    urutan: number | null;
    user: {
      id: string;
      nama: string;
      email: string;
    };
  }>;
  rpsCplEntries: Array<{
    id: string;
    urutan: number | null;
    cpl: {
      id: string;
      kode: string;
      kategori: string;
      deskripsi: string;
      urutan: number | null;
    };
  }>;
  rpsCpmkEntries: Array<{
    id: string;
    kode: string;
    deskripsi: string;
    urutan: number;
    subCpmkEntries: Array<{
      id: string;
      rpsCpmkId: string;
      kode: string;
      deskripsi: string;
      urutan: number;
      targetKetercapaianPersen: number | null;
    }>;
    cplLinks: Array<{
      id: string;
      rpsCplId: string;
      rpsCpl: {
        id: string;
        urutan: number | null;
        cpl: {
          id: string;
          kode: string;
          kategori: string;
        };
      };
    }>;
  }>;
  pertemuanEntries: Array<{
    id: string;
    weekLabel: string;
    orderNo: number;
    tipe: string;
    subCpmkId: string | null;
    indikatorPenilaian: IndikatorPenilaian;
    teknikPenilaian: string | null;
    kriteriaPenilaian: string | null;
    metodePembelajaran: MetodePembelajaran;
    materiPembelajaran: string | null;
    catatanPenugasan: string | null;
    bobotPenilaianPersen: number | null;
    estimasiWaktuPb: string | null;
    estimasiWaktuPt: string | null;
    estimasiWaktuKm: string | null;
    rtmLinks: Array<{
      id: string;
      rpsRtm: {
        id: string;
        nomorTugas: string;
        judulTugas: string;
      };
      keterangan: string | null;
    }>;
  }>;
  rpsPustakaEntries: Array<{
    id: string;
    kategori: string;
    teksLengkap: string;
    urutan: number | null;
  }>;
  rpsRtmEntries: Array<{
    id: string;
    nomorTugas: string;
    judulTugas: string;
    subCpmk: {
      id: string;
      kode: string;
    };
    pertemuanLinks: Array<{
      id: string;
      rpsPertemuanId: string;
      keterangan: string | null;
    }>;
  }>;
  approvalLogs: Array<{
    id: string;
    versionNo: number;
    action: string;
    catatanReview: string | null;
    createdAt: Date;
    actorUser: {
      id: string;
      nama: string;
      nidn: string | null;
    };
  }>;
};

export async function getRpsDetail(
  rpsId: string,
  options: GetRpsDetailOptions
): Promise<RpsDetail> {
  const rps = await prisma.rps.findUnique({
    where: { id: rpsId },
    select: {
      id: true,
      tahunAkademik: true,
      status: true,
      versionNo: true,
      kurikulumVersiId: true,
      tanggalPenyusunan: true,
      deskripsiSingkat: true,
      bahanKajian: true,
      catatanTambahan: true,
      dosenPengembangId: true,
      koordinatorRmkId: true,
      kaprodiId: true,
      mataKuliah: {
        select: {
          id: true,
          kode: true,
          nama: true,
          sksTeori: true,
          sksPraktik: true,
        },
      },
      dosenPengembang: {
        select: {
          id: true,
          nama: true,
          email: true,
        },
      },
      dosenPengampu: {
        orderBy: [{ urutan: "asc" }, { user: { nama: "asc" } }],
        select: {
          id: true,
          userId: true,
          isPengembang: true,
          urutan: true,
          user: {
            select: {
              id: true,
              nama: true,
              email: true,
            },
          },
        },
      },
      rpsCplEntries: {
        orderBy: [{ urutan: "asc" }, { cpl: { kode: "asc" } }],
        select: {
          id: true,
          urutan: true,
          cpl: {
            select: {
              id: true,
              kode: true,
              kategori: true,
              deskripsi: true,
              urutan: true,
            },
          },
        },
      },
      rpsCpmkEntries: {
        orderBy: [{ urutan: "asc" }, { kode: "asc" }],
        select: {
          id: true,
          kode: true,
          deskripsi: true,
          urutan: true,
          subCpmkEntries: {
            orderBy: [{ urutan: "asc" }, { kode: "asc" }],
            select: {
              id: true,
              rpsCpmkId: true,
              kode: true,
              deskripsi: true,
              urutan: true,
              targetKetercapaianPersen: true,
            },
          },
          cplLinks: {
            orderBy: [{ rpsCpl: { urutan: "asc" } }, { rpsCpl: { cpl: { kode: "asc" } } }],
            select: {
              id: true,
              rpsCplId: true,
              rpsCpl: {
                select: {
                  id: true,
                  urutan: true,
                  cpl: {
                    select: {
                      id: true,
                      kode: true,
                      kategori: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      pertemuanEntries: {
        orderBy: { orderNo: "asc" },
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
          materiPembelajaran: true,
          catatanPenugasan: true,
          bobotPenilaianPersen: true,
          estimasiWaktuPb: true,
          estimasiWaktuPt: true,
          estimasiWaktuKm: true,
          rtmLinks: {
            select: {
              id: true,
              rpsRtm: {
                select: {
                  id: true,
                  nomorTugas: true,
                  judulTugas: true,
                },
              },
              keterangan: true,
            },
          },
        },
      },
      rpsPustakaEntries: {
        orderBy: [{ urutan: "asc" }, { id: "asc" }],
        select: {
          id: true,
          kategori: true,
          teksLengkap: true,
          urutan: true,
        },
      },
      rpsRtmEntries: {
        orderBy: { nomorTugas: "asc" },
        select: {
          id: true,
          nomorTugas: true,
          judulTugas: true,
          subCpmk: {
            select: {
              id: true,
              kode: true,
            },
          },
          pertemuanLinks: {
            select: {
              id: true,
              rpsPertemuanId: true,
              keterangan: true,
            },
          },
        },
      },
      approvalLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          versionNo: true,
          action: true,
          catatanReview: true,
          createdAt: true,
          actorUser: {
            select: {
              id: true,
              nama: true,
              nidn: true,
            },
          },
        },
      },
    },
  });

  if (!rps) {
    throw new NotFoundError("RPS tidak ditemukan.");
  }

  // Role-based access control
  if (options.actorRole === "dosen") {
    const isDosenPengembang = rps.dosenPengembangId === options.actorUserId;
    const isDosenPengampu = rps.dosenPengampu.some(
      (dosen) => dosen.userId === options.actorUserId
    );

    if (!isDosenPengembang && !isDosenPengampu) {
      throw new ForbiddenError(
        "Anda tidak memiliki akses ke RPS ini. Hanya dosen pengembang dan dosen pengampu yang dapat mengakses."
      );
    }
  } else if (options.actorRole === "koordinator_rmk") {
    if (rps.koordinatorRmkId !== options.actorUserId) {
      throw new ForbiddenError("Anda tidak memiliki akses ke RPS ini.");
    }
  } else if (options.actorRole === "kaprodi") {
    if (rps.kaprodiId !== options.actorUserId) {
      throw new ForbiddenError("Anda tidak memiliki akses ke RPS ini.");
    }
  }

  // Parse JSONB fields for each pertemuan
  const pertemuanEntries = rps.pertemuanEntries.map((pertemuan) => ({
    ...pertemuan,
    indikatorPenilaian: parseIndikatorPenilaian(pertemuan.indikatorPenilaian),
    metodePembelajaran: parseMetodePembelajaran(pertemuan.metodePembelajaran),
    bobotPenilaianPersen: pertemuan.bobotPenilaianPersen
      ? parseFloat(pertemuan.bobotPenilaianPersen.toString())
      : null,
  }));

  // Convert Decimal in subCpmkEntries
  const rpsCpmkEntries = rps.rpsCpmkEntries.map((cpmk) => ({
    ...cpmk,
    subCpmkEntries: cpmk.subCpmkEntries.map((subCpmk) => ({
      ...subCpmk,
      targetKetercapaianPersen: subCpmk.targetKetercapaianPersen
        ? parseFloat(subCpmk.targetKetercapaianPersen.toString())
        : null,
    })),
  }));

  const {
    dosenPengembangId: _dosenPengembangId,
    koordinatorRmkId: _koordinatorRmkId,
    kaprodiId: _kaprodiId,
    ...rpsDetail
  } = rps;

  return {
    ...rpsDetail,
    pertemuanEntries,
    rpsCpmkEntries,
  };
}

export async function getRpsApprovalLogs(rpsId: string) {
  const logs = await prisma.rpsApprovalLog.findMany({
    where: { rpsId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      versionNo: true,
      action: true,
      catatanReview: true,
      createdAt: true,
      actorUser: {
        select: {
          id: true,
          nama: true,
          nidn: true,
        },
      },
    },
  });

  return logs;
}

export async function getRpsDetailForDosen(
  rpsId: string,
  options: { actorUserId: string }
) {
  return getRpsDetail(rpsId, {
    actorUserId: options.actorUserId,
    actorRole: "dosen",
  });
}

export async function listActiveDosenOptions() {
  return prisma.user.findMany({
    where: {
      role: "dosen",
      isActive: true,
    },
    orderBy: [{ nama: "asc" }],
    select: {
      id: true,
      nama: true,
      email: true,
    },
  });
}

export async function listRpsCreationMataKuliahOptions() {
  return prisma.mataKuliah.findMany({
    where: {
      isActive: true,
      kurikulumVersi: {
        isActive: true,
      },
    },
    orderBy: [{ semester: "asc" }, { kode: "asc" }],
    select: {
      id: true,
      kode: true,
      nama: true,
    },
  });
}

export async function listCplProdiOptionsByKurikulum(kurikulumVersiId: string) {
  return prisma.cplProdi.findMany({
    where: {
      kurikulumVersiId,
    },
    orderBy: [{ urutan: "asc" }, { kode: "asc" }],
    select: {
      id: true,
      kode: true,
      kategori: true,
      deskripsi: true,
      urutan: true,
    },
  });
}
