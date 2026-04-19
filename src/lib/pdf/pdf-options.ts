import type { PDFOptions } from "puppeteer";

import type { RpsDocumentData } from "@/services/rps/export/types";
import { formatStatusLabel } from "@/lib/templates/rps/helpers";

function escapeTemplateText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHeaderTemplate(data: RpsDocumentData) {
  return `
    <div style="width: 100%; font-size: 8px; color: #475569; padding: 0 12mm; display: flex; justify-content: space-between; align-items: center;">
      <span>RPS MTJ</span>
      <span>${escapeTemplateText(data.identity.kodeMatkul)} | ${escapeTemplateText(data.identity.versi)} | ${escapeTemplateText(formatStatusLabel(data.infoUmum.status))}</span>
    </div>
  `;
}

function buildFooterTemplate(data: RpsDocumentData) {
  return `
    <div style="width: 100%; font-size: 8px; color: #475569; padding: 0 12mm; display: flex; justify-content: space-between; align-items: center;">
      <span>${escapeTemplateText(data.identity.kodeMatkul)} - ${escapeTemplateText(data.identity.namaMatkul)}</span>
      <span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span>
    </div>
  `;
}

export function getRpsPdfOptions(data: RpsDocumentData): PDFOptions {
  return {
    format: "A4",
    landscape: true,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: buildHeaderTemplate(data),
    footerTemplate: buildFooterTemplate(data),
    margin: {
      top: "18mm",
      right: "12mm",
      bottom: "18mm",
      left: "12mm",
    },
  };
}

