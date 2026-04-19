import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/db/prisma";
import { getRpsDetail } from "@/services/rps/read";
import { parseIndikatorPenilaian, parseMetodePembelajaran } from "@/lib/types/rps";

import type {
  RpsDocumentApprovalHistory,
  RpsDocumentContext,
  RpsDocumentData,
  RpsMeetingRow,
} from "./types";

function formatDate(value: Date | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Makassar",
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Makassar",
  }).format(value);
}

function formatRoleLabel(isPengembang: boolean, urutan: number | null) {
  if (isPengembang) {
    return "Pengembang";
  }

  return urutan ? `Pengampu ${urutan}` : "Pengampu";
}

function mapMeetingType(value: string): RpsMeetingRow["tipe"] {
  if (value === "ets" || value === "eas") {
    return value;
  }

  return "regular";
}

function mapApprovalActionLabel(action: string) {
  const labels: Record<string, string> = {
    submit_to_rmk: "Submit ke RMK",
    approve_rmk: "Disetujui RMK",
    reject_rmk: "Revisi oleh RMK",
    submit_to_kaprodi: "Submit ke Kaprodi",
    approve_kaprodi: "Disetujui Kaprodi",
    reject_kaprodi: "Revisi oleh Kaprodi",
    clone_for_revision: "Clone untuk Revisi",
    supersede: "Digantikan versi baru",
    acknowledge_warning: "Warning di-acknowledge",
  };

  return labels[action] ?? action;
}

async function loadPoltradaLogoDataUri() {
  try {
    const filePath = path.join(process.cwd(), "public", "logo.png");
    const buffer = await readFile(filePath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}

export async function assembleRpsDocument(
  rpsId: string,
  context: RpsDocumentContext
): Promise<RpsDocumentData> {
  const [rps, actorUser, matrixSource, pertemuanSource, approvalLogSource, logoPoltradaDataUri] =
    await Promise.all([
      getRpsDetail(rpsId, {
        actorUserId: context.actorUserId,
        actorRole: context.actorRole,
      }),
      prisma.user.findUnique({
        where: { id: context.actorUserId },
        select: {
          nama: true,
          email: true,
        },
      }),
      prisma.rpsCpmk.findMany({
        where: { rpsId },
        orderBy: [{ urutan: "asc" }, { kode: "asc" }],
        select: {
          kode: true,
          subCpmkEntries: {
            orderBy: [{ urutan: "asc" }, { kode: "asc" }],
            select: {
              kode: true,
              deskripsi: true,
              targetKetercapaianPersen: true,
              korelasiCpl: {
                orderBy: [{ rpsCpl: { urutan: "asc" } }, { rpsCpl: { cpl: { kode: "asc" } } }],
                select: {
                  rpsCpl: {
                    select: {
                      cpl: {
                        select: {
                          kode: true,
                        },
                      },
                    },
                  },
                  persentase: true,
                },
              },
            },
          },
        },
      }),
      prisma.rpsPertemuan.findMany({
        where: { rpsId },
        orderBy: { orderNo: "asc" },
        select: {
          orderNo: true,
          weekLabel: true,
          tipe: true,
          indikatorPenilaian: true,
          teknikPenilaian: true,
          kriteriaPenilaian: true,
          bentukPembelajaranLuring: true,
          bentukPembelajaranDaring: true,
          metodePembelajaran: true,
          catatanPenugasan: true,
          estimasiWaktuPb: true,
          estimasiWaktuPt: true,
          estimasiWaktuKm: true,
          materiPembelajaran: true,
          pustakaRefs: true,
          bobotPenilaianPersen: true,
          deskripsiEvaluasi: true,
          notes: true,
          subCpmk: {
            select: {
              kode: true,
              deskripsi: true,
            },
          },
        },
      }),
      prisma.rpsApprovalLog.findMany({
        where: { rpsId },
        orderBy: { createdAt: "desc" },
        select: {
          versionNo: true,
          action: true,
          catatanReview: true,
          createdAt: true,
          actorUser: {
            select: {
              nama: true,
            },
          },
        },
      }),
      loadPoltradaLogoDataUri(),
    ]);

  const totalSks = (rps.mataKuliah.sksTeori ?? 0) + (rps.mataKuliah.sksPraktik ?? 0);
  const totalBobot = rps.pertemuanEntries.reduce(
    (sum, pertemuan) => sum + (pertemuan.bobotPenilaianPersen ?? 0),
    0
  );
  const pustakaById = new Map(
    rps.rpsPustakaEntries.map((entry) => [entry.id, entry.teksLengkap.trim()])
  );

  const approvalHistory: RpsDocumentApprovalHistory[] = approvalLogSource
    .map((log) => ({
      rawVersion: log.versionNo,
      rawCreatedAt: log.createdAt,
      version: `v${log.versionNo}`,
      action: mapApprovalActionLabel(log.action),
      actorName: log.actorUser.nama,
      note: log.catatanReview?.trim() || "-",
      createdAt: formatDateTime(log.createdAt),
    }))
    .sort((a, b) => {
      // Formal ordering guarantee: Version first, then timestamp
      // This ensures deterministic ordering even with backfilled/migrated data
      if (a.rawVersion !== b.rawVersion) {
        return a.rawVersion - b.rawVersion; // Ascending version
      }
      return a.rawCreatedAt.getTime() - b.rawCreatedAt.getTime(); // Ascending time
    })
    .map(({ rawVersion, rawCreatedAt, ...rest }) => rest);

  const pertemuan: RpsMeetingRow[] = pertemuanSource.map((row) => {
    const pustakaRefs =
      Array.isArray(row.pustakaRefs) && row.pustakaRefs.length > 0
        ? (row.pustakaRefs as string[])
        : [];

    return {
      orderNo: row.orderNo,
      weekLabel: row.weekLabel,
      tipe: mapMeetingType(row.tipe),
      subCpmkLabel: row.subCpmk
        ? `${row.subCpmk.kode} - ${row.subCpmk.deskripsi}`
        : "-",
      indikatorPenilaian: parseIndikatorPenilaian(row.indikatorPenilaian),
      teknikPenilaian: row.teknikPenilaian?.trim() || "-",
      kriteriaPenilaian: row.kriteriaPenilaian?.trim() || "-",
      bentukPembelajaranLuring: Array.isArray(row.bentukPembelajaranLuring)
        ? (row.bentukPembelajaranLuring as string[])
        : [],
      bentukPembelajaranDaring: Array.isArray(row.bentukPembelajaranDaring)
        ? (row.bentukPembelajaranDaring as string[])
        : [],
      metodePembelajaran: parseMetodePembelajaran(row.metodePembelajaran),
      penugasanMahasiswa: row.catatanPenugasan?.trim() || "-",
      estimasiWaktuPb: row.estimasiWaktuPb?.trim() || "-",
      estimasiWaktuPt: row.estimasiWaktuPt?.trim() || "-",
      estimasiWaktuKm: row.estimasiWaktuKm?.trim() || "-",
      materiPembelajaran: row.materiPembelajaran?.trim() || "-",
      pustakaLabels: pustakaRefs.map((id) => pustakaById.get(id) ?? `[Pustaka ${id}]`),
      bobotPenilaianPersen: row.bobotPenilaianPersen
        ? parseFloat(row.bobotPenilaianPersen.toString())
        : null,
      deskripsiEvaluasi: row.deskripsiEvaluasi?.trim() || "-",
      notes: row.notes?.trim() || "-",
    };
  });

  return {
    identity: {
      namaMatkul: rps.mataKuliah.nama,
      kodeMatkul: rps.mataKuliah.kode,
      sks: totalSks,
      tahunAkademik: rps.tahunAkademik,
      versi: `v${rps.versionNo}`,
    },
    infoUmum: {
      status: rps.status,
      tanggalPenyusunan: formatDate(rps.tanggalPenyusunan),
      dosenPengembang: rps.dosenPengembang.nama,
      email: rps.dosenPengembang.email,
      totalBobot,
      deskripsi: rps.deskripsiSingkat?.trim() || "-",
      bahanKajian: rps.bahanKajian?.trim() || "-",
    },
    dosenPengampu: rps.dosenPengampu.map((entry) => ({
      nama: entry.user.nama,
      email: entry.user.email,
      peran: formatRoleLabel(entry.isPengembang, entry.urutan),
    })),
    cpl: rps.rpsCplEntries.map((entry) => ({
      kode: entry.cpl.kode,
      kategori: entry.cpl.kategori,
      deskripsi: entry.cpl.deskripsi,
    })),
    cpmk: rps.rpsCpmkEntries.map((entry) => ({
      kode: entry.kode,
      deskripsi: entry.deskripsi,
      cplLabels: entry.cplLinks.map((link) => link.rpsCpl.cpl.kode),
    })),
    subCpmk: rps.rpsCpmkEntries.flatMap((entry) =>
      entry.subCpmkEntries.map((sub) => ({
        kode: sub.kode,
        cpmkKode: entry.kode,
        deskripsi: sub.deskripsi,
        targetKetercapaianPersen: sub.targetKetercapaianPersen,
      }))
    ),
    matriksCplSubCpmk: {
      columns: rps.rpsCplEntries.map((entry) => ({
        kode: entry.cpl.kode,
        kategori: entry.cpl.kategori,
      })),
      rows: matrixSource.flatMap((cpmk) =>
        cpmk.subCpmkEntries.map((sub) => {
          const correlationByKode = new Map(
            sub.korelasiCpl.map((item) => [
              item.rpsCpl.cpl.kode,
              parseFloat(item.persentase.toString()),
            ])
          );

          return {
            cpmkKode: cpmk.kode,
            subCpmkKode: sub.kode,
            subCpmkDeskripsi: sub.deskripsi,
            targetKetercapaianPersen: sub.targetKetercapaianPersen
              ? parseFloat(sub.targetKetercapaianPersen.toString())
              : null,
            correlations: rps.rpsCplEntries.map(
              (entry) => correlationByKode.get(entry.cpl.kode) ?? null
            ),
          };
        })
      ),
    },
    pertemuan,
    approvalHistory,
    exportMeta: {
      exportedAt: formatDateTime(new Date()),
      exportedBy: actorUser?.nama || actorUser?.email || context.actorUserId,
      version: `v${rps.versionNo}`,
      status: rps.status,
    },
    assets: {
      logoPoltradaDataUri,
    },
  };
}

