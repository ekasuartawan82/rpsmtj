import puppeteer from "puppeteer";

import { prisma } from "@/db/prisma";
import { ValidationError } from "@/lib/errors";
import {
  parseIndikatorPenilaian,
  parseMetodePembelajaran,
  type IndikatorPenilaian,
  type MetodePembelajaran,
} from "@/lib/types/rps";
import { renderRpsHtml } from "@/lib/templates/rps-export";
import { exportRpsHtml as exportRpsHtmlWithNewEngine } from "@/services/rps/export/export-rps-html";
import { exportRpsPdf as exportRpsPdfWithNewEngine } from "@/services/rps/export/export-rps-pdf";
import type { RpsDocumentActorRole } from "@/services/rps/export/types";
import { getRpsDetailForDosen } from "@/services/rps/read";

function deriveBentukDaring(
  bentukDaring: string | null,
  bentukPembelajaranDaring: unknown
): string | null {
  if (bentukDaring) return bentukDaring;
  if (!Array.isArray(bentukPembelajaranDaring) || bentukPembelajaranDaring.length === 0) return null;
  return (bentukPembelajaranDaring as string[]).join(", ");
}

type ExportRpsOptions = {
  actorUserId: string;
  actorRole: RpsDocumentActorRole;
};

type ExportRpsHtmlOptions = {
  actorUserId: string;
  actorRole: RpsDocumentActorRole;
};

export type RpsExportData = Awaited<ReturnType<typeof getRpsDetailForDosen>> & {
  totalSks: number;
  totalBobotPenilaian: number;
  totalPertemuan: number;
  totalCpmk: number;
  totalSubCpmk: number;
  generatedAt: Date;
  cplMatrixColumns: Array<{
    id: string;
    kode: string;
    kategori: string;
  }>;
  cplSubCpmkMatrix: Array<{
    cpmkId: string;
    cpmkKode: string;
    cpmkDeskripsi: string;
    subCpmkId: string;
    subCpmkKode: string;
    subCpmkDeskripsi: string;
    targetKetercapaianPersen: number | null;
    correlations: Record<string, number>;
  }>;
  pertemuanTableRows: Array<{
    weekLabel: string;
    orderNo: number;
    tipe: string;
    subCpmkKode: string | null;
    indikatorPenilaian: IndikatorPenilaian;
    teknikPenilaian: string | null;
    kriteriaPenilaian: string | null;
    metodePembelajaran: MetodePembelajaran;
    materiPembelajaran: string | null;
    catatanPenugasan: string | null;
    bobotPenilaianPersen: number | null;
    deskripsiEvaluasi: string | null;
    bentukDaring: string | null;
  }>;
  rtmExportEntries: Array<{
    id: string;
    nomorTugas: string;
    judulTugas: string;
    subCpmkKode: string;
    metodePenugasan: string;
    deskripsi: string | null;
    langkahPengerjaan: string | null;
    bentukLuaran: string | null;
    indikatorPenilaian: string | null;
    bobotInternalPersen: number | null;
    jadwalPelaksanaan: string | null;
    catatan: string | null;
    daftarRujukan: string | null;
    pertemuanRefs: Array<{
      weekLabel: string;
      orderNo: number;
      tipe: string;
      keterangan: string | null;
    }>;
  }>;
};

export async function generateRpsExportData(
  rpsId: string,
  options: ExportRpsOptions
): Promise<RpsExportData> {
  const rps = await getRpsDetailForDosen(rpsId, {
    actorUserId: options.actorUserId,
  });

  if (rps.status !== "approved") {
    throw new ValidationError("PDF hanya dapat diekspor untuk RPS yang sudah berstatus approved.");
  }

  const [matrixSource, pertemuanSource, rtmSource] = await Promise.all([
    prisma.rpsCpmk.findMany({
      where: { rpsId },
      orderBy: [{ urutan: "asc" }, { kode: "asc" }],
      select: {
        id: true,
        kode: true,
        deskripsi: true,
        subCpmkEntries: {
          orderBy: [{ urutan: "asc" }, { kode: "asc" }],
          select: {
            id: true,
            kode: true,
            deskripsi: true,
            targetKetercapaianPersen: true,
            korelasiCpl: {
              select: {
                rpsCplId: true,
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
        weekLabel: true,
        orderNo: true,
        tipe: true,
        subCpmk: {
          select: {
            kode: true,
          },
        },
        indikatorPenilaian: true,
        teknikPenilaian: true,
        kriteriaPenilaian: true,
        metodePembelajaran: true,
        materiPembelajaran: true,
        catatanPenugasan: true,
        bobotPenilaianPersen: true,
        deskripsiEvaluasi: true,
        bentukDaring: true,
        bentukPembelajaranDaring: true,
      },
    }),
    prisma.rpsRtm.findMany({
      where: { rpsId },
      orderBy: [{ nomorTugas: "asc" }],
      select: {
        id: true,
        nomorTugas: true,
        judulTugas: true,
        metodePenugasan: true,
        deskripsi: true,
        langkahPengerjaan: true,
        bentukLuaran: true,
        indikatorPenilaian: true,
        bobotInternalPersen: true,
        jadwalPelaksanaan: true,
        catatan: true,
        daftarRujukan: true,
        subCpmk: {
          select: {
            kode: true,
          },
        },
        pertemuanLinks: {
          orderBy: [{ rpsPertemuan: { orderNo: "asc" } }],
          select: {
            keterangan: true,
            rpsPertemuan: {
              select: {
                weekLabel: true,
                orderNo: true,
                tipe: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalSks = (rps.mataKuliah.sksTeori ?? 0) + (rps.mataKuliah.sksPraktik ?? 0);

  const totalBobotPenilaian = rps.pertemuanEntries.reduce((sum, p) => {
    return sum + (p.bobotPenilaianPersen ?? 0);
  }, 0);

  const totalPertemuan = rps.pertemuanEntries.length;

  const totalCpmk = rps.rpsCpmkEntries.length;

  const totalSubCpmk = rps.rpsCpmkEntries.reduce(
    (sum, cpmk) => sum + cpmk.subCpmkEntries.length,
    0
  );

  const cplMatrixColumns = rps.rpsCplEntries.map((entry) => ({
    id: entry.id,
    kode: entry.cpl.kode,
    kategori: entry.cpl.kategori,
  }));

  const cplSubCpmkMatrix = matrixSource.flatMap((cpmk) =>
    cpmk.subCpmkEntries.map((subCpmk) => ({
      cpmkId: cpmk.id,
      cpmkKode: cpmk.kode,
      cpmkDeskripsi: cpmk.deskripsi,
      subCpmkId: subCpmk.id,
      subCpmkKode: subCpmk.kode,
      subCpmkDeskripsi: subCpmk.deskripsi,
      targetKetercapaianPersen: subCpmk.targetKetercapaianPersen
        ? parseFloat(subCpmk.targetKetercapaianPersen.toString())
        : null,
      correlations: Object.fromEntries(
        subCpmk.korelasiCpl.map((korelasi) => [
          korelasi.rpsCplId,
          parseFloat(korelasi.persentase.toString()),
        ])
      ),
    }))
  );

  const pertemuanByOrderNo = new Map(
    pertemuanSource.map((pertemuan) => [
      pertemuan.orderNo,
      {
        weekLabel: pertemuan.weekLabel,
        orderNo: pertemuan.orderNo,
        tipe: pertemuan.tipe,
        subCpmkKode: pertemuan.subCpmk?.kode ?? null,
        indikatorPenilaian: parseIndikatorPenilaian(pertemuan.indikatorPenilaian),
        teknikPenilaian: pertemuan.teknikPenilaian,
        kriteriaPenilaian: pertemuan.kriteriaPenilaian,
        metodePembelajaran: parseMetodePembelajaran(pertemuan.metodePembelajaran),
        materiPembelajaran: pertemuan.materiPembelajaran,
        catatanPenugasan: pertemuan.catatanPenugasan,
        bobotPenilaianPersen: pertemuan.bobotPenilaianPersen
          ? parseFloat(pertemuan.bobotPenilaianPersen.toString())
          : null,
        deskripsiEvaluasi: pertemuan.deskripsiEvaluasi,
        bentukDaring: deriveBentukDaring(pertemuan.bentukDaring, pertemuan.bentukPembelajaranDaring),
      },
    ])
  );

  const pertemuanTableRows = Array.from({ length: 16 }, (_, index) => {
    const orderNo = index + 1;

    return (
      pertemuanByOrderNo.get(orderNo) ?? {
        weekLabel: String(orderNo),
        orderNo,
        tipe: "reguler",
        subCpmkKode: null,
        indikatorPenilaian: [],
        teknikPenilaian: null,
        kriteriaPenilaian: null,
        metodePembelajaran: [],
        materiPembelajaran: null,
        catatanPenugasan: null,
        bobotPenilaianPersen: null,
        deskripsiEvaluasi: null,
        bentukDaring: null,
      }
    );
  });

  const rtmExportEntries = rtmSource.map((rtm) => ({
    id: rtm.id,
    nomorTugas: rtm.nomorTugas,
    judulTugas: rtm.judulTugas,
    subCpmkKode: rtm.subCpmk.kode,
    metodePenugasan: rtm.metodePenugasan,
    deskripsi: rtm.deskripsi,
    langkahPengerjaan: rtm.langkahPengerjaan,
    bentukLuaran: rtm.bentukLuaran,
    indikatorPenilaian: rtm.indikatorPenilaian,
    bobotInternalPersen: rtm.bobotInternalPersen
      ? parseFloat(rtm.bobotInternalPersen.toString())
      : null,
    jadwalPelaksanaan: rtm.jadwalPelaksanaan,
    catatan: rtm.catatan,
    daftarRujukan: rtm.daftarRujukan,
    pertemuanRefs: rtm.pertemuanLinks.map((link) => ({
      weekLabel: link.rpsPertemuan.weekLabel,
      orderNo: link.rpsPertemuan.orderNo,
      tipe: link.rpsPertemuan.tipe,
      keterangan: link.keterangan,
    })),
  }));

  return {
    ...rps,
    totalSks,
    totalBobotPenilaian,
    totalPertemuan,
    totalCpmk,
    totalSubCpmk,
    generatedAt: new Date(),
    cplMatrixColumns,
    cplSubCpmkMatrix,
    pertemuanTableRows,
    rtmExportEntries,
  };
}

function useNewRpsDocumentEngine() {
  return process.env.USE_NEW_RPS_DOCUMENT_ENGINE !== "0";
}

async function exportLegacyRpsToPdf(
  rpsId: string,
  options: ExportRpsOptions
): Promise<{ buffer: Buffer; filename: string }> {
  const data = await generateRpsExportData(rpsId, options);
  const html = renderRpsHtml(data);

  // Launch Puppeteer browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    // Generate filename: RPS_[KODE_MK]_[TAHUN_AKADEMIK]_v[VERSION].pdf
    const filename = `RPS_${data.mataKuliah.kode}_${data.tahunAkademik}_v${data.versionNo}.pdf`;

    return { buffer: Buffer.from(pdfBuffer), filename };
  } finally {
    // Always close browser to prevent memory leaks
    await browser.close();
  }
}

async function exportLegacyRpsHtml(
  rpsId: string,
  options: ExportRpsOptions
): Promise<string> {
  const data = await generateRpsExportData(rpsId, options);
  return renderRpsHtml(data);
}

export async function exportRpsToPdf(
  rpsId: string,
  options: ExportRpsOptions
): Promise<{ buffer: Buffer; filename: string }> {
  if (useNewRpsDocumentEngine()) {
    const { buffer, filename } = await exportRpsPdfWithNewEngine(rpsId, {
      actorUserId: options.actorUserId,
      actorRole: options.actorRole,
    });

    return { buffer, filename };
  }

  return exportLegacyRpsToPdf(rpsId, options);
}

export async function exportRpsHtml(
  rpsId: string,
  options: ExportRpsHtmlOptions
): Promise<string> {
  if (useNewRpsDocumentEngine()) {
    return exportRpsHtmlWithNewEngine(rpsId, {
      actorUserId: options.actorUserId,
      actorRole: options.actorRole,
    });
  }

  return exportLegacyRpsHtml(rpsId, {
    actorUserId: options.actorUserId,
    actorRole: options.actorRole,
  });
}
