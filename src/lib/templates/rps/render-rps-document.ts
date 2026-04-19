import type { RpsDocumentData, RpsDocumentRenderOptions } from "@/services/rps/export/types";

import { escapeHtml } from "./helpers";
import { renderApprovalHistorySection } from "./sections/approval-history";
import { renderCplSection } from "./sections/cpl";
import { renderCpmkSection } from "./sections/cpmk";
import { renderDosenSection } from "./sections/dosen";
import { renderFooterSection } from "./sections/footer";
import { renderHeaderSection } from "./sections/header";
import { renderInfoUmumSection } from "./sections/info-umum";
import { renderMatriksSection } from "./sections/matriks";
import { renderPertemuanSection } from "./sections/pertemuan";
import { renderSubCpmkSection } from "./sections/subcpmk";
import { renderWatermarkSection } from "./sections/watermark";
import { rpsDocumentStyles } from "./styles";

export function renderRpsDocument(
  data: RpsDocumentData,
  _options: RpsDocumentRenderOptions = {}
): string {
  return `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(data.identity.kodeMatkul)} - ${escapeHtml(data.identity.namaMatkul)}</title>
    <style>${rpsDocumentStyles}</style>
  </head>
  <body>
    <div class="document">
      ${renderHeaderSection(data)}
      ${renderWatermarkSection(data)}
      ${renderInfoUmumSection(data)}
      ${renderDosenSection(data)}
      ${renderCplSection(data)}
      ${renderCpmkSection(data)}
      ${renderSubCpmkSection(data)}
      ${renderMatriksSection(data)}
      ${renderPertemuanSection(data)}
      ${renderApprovalHistorySection(data)}
      ${renderFooterSection(data)}
    </div>
  </body>
</html>`;
}

