import { writeFile } from "node:fs/promises";

import { assembleRpsDocument } from "../src/services/rps/export/assemble-rps-document";
import { exportRpsHtml } from "../src/services/rps/export/export-rps-html";
import { exportRpsPdf } from "../src/services/rps/export/export-rps-pdf";

const DOC_C_RPS_ID = "c0c00000-0000-4000-8000-000000000003";
const DOC_C_ACTOR_USER_ID = "d23281e7-7da6-4012-932c-826d1ae70b98";

async function main() {
  const context = {
    actorUserId: DOC_C_ACTOR_USER_ID,
    actorRole: "dosen" as const,
    includeApprovalHistory: true,
  };

  const [data, html, pdf] = await Promise.all([
    assembleRpsDocument(DOC_C_RPS_ID, context),
    exportRpsHtml(DOC_C_RPS_ID, context),
    exportRpsPdf(DOC_C_RPS_ID, context),
  ]);

  await writeFile("/tmp/docc-st15-preview.html", html, "utf8");
  await writeFile("/tmp/docc-st15.pdf", pdf.buffer);
  await writeFile(
    "/tmp/docc-st15-summary.json",
    JSON.stringify(
      {
        rpsId: DOC_C_RPS_ID,
        identity: data.identity,
        infoUmum: data.infoUmum,
        counts: {
          cpl: data.cpl.length,
          cpmk: data.cpmk.length,
          subCpmk: data.subCpmk.length,
          pertemuan: data.pertemuan.length,
          approvalHistory: data.approvalHistory.length,
        },
        pressureRows: {
          longRows: data.pertemuan
            .filter((row) => [4, 9, 13].includes(row.orderNo))
            .map((row) => ({
              orderNo: row.orderNo,
              weekLabel: row.weekLabel,
              indikatorCount: row.indikatorPenilaian.length,
              derivedDaringCount: row.bentukPembelajaranDaring.length,
            })),
          sparseRows: data.pertemuan
            .filter((row) => [2, 11].includes(row.orderNo))
            .map((row) => ({
              orderNo: row.orderNo,
              weekLabel: row.weekLabel,
              penugasanMahasiswa: row.penugasanMahasiswa,
              pustakaLabels: row.pustakaLabels,
              deskripsiEvaluasi: row.deskripsiEvaluasi,
              notes: row.notes,
            })),
          etsRow: data.pertemuan.find((row) => row.orderNo === 7) ?? null,
          derivedDaringRow: data.pertemuan.find((row) => row.orderNo === 8) ?? null,
          easRow: data.pertemuan.find((row) => row.orderNo === 14) ?? null,
        },
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        previewPath: "/tmp/docc-st15-preview.html",
        pdfPath: "/tmp/docc-st15.pdf",
        summaryPath: "/tmp/docc-st15-summary.json",
        previewBytes: Buffer.byteLength(html),
        pdfBytes: pdf.buffer.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
