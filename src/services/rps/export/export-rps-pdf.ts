import { createPdfBrowser } from "@/lib/pdf/browser";
import { ValidationError } from "@/lib/errors";
import { getRpsPdfOptions } from "@/lib/pdf/pdf-options";
import { renderRpsDocument } from "@/lib/templates/rps/render-rps-document";

import { assembleRpsDocument } from "./assemble-rps-document";
import { validateRpsDocument } from "./validate-rps-document";
import type { ExportRpsPdfOptions } from "./types";

export async function exportRpsPdf(rpsId: string, options: ExportRpsPdfOptions) {
  const data = await assembleRpsDocument(rpsId, options);
  validateRpsDocument(data);

  if (!data.assets.logoPoltradaDataUri) {
    throw new ValidationError("Logo Poltrada belum tersedia untuk dokumen PDF.");
  }

  if (data.infoUmum.status !== "approved") {
    throw new ValidationError("PDF hanya dapat diekspor untuk RPS yang sudah berstatus approved.");
  }

  const html = renderRpsDocument(data, options);
  const browser = await createPdfBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf(getRpsPdfOptions(data));
    const filename = `RPS_${data.identity.kodeMatkul}_${data.identity.tahunAkademik}_${data.identity.versi}.pdf`;

    return {
      buffer: Buffer.from(pdfBuffer),
      filename,
      html,
    };
  } finally {
    await browser.close();
  }
}
