import type { RpsDocumentData } from "@/services/rps/export/types";

import { getDocumentStatusCategory } from "@/services/rps/export/validate-rps-document";

/**
 * Render watermark banner based on document status.
 *
 * Purpose: Clearly mark non-final documents to prevent misuse
 * (e.g., submitting draft for official purposes).
 *
 * Position: First element in document, immediately after header
 */
export function renderWatermarkSection(data: RpsDocumentData): string {
  const statusCategory = getDocumentStatusCategory(data.infoUmum.status);

  // No watermark for final documents
  if (statusCategory === "final") {
    return "";
  }

  let watermarkText = "";
  let bgColor = "";
  let textColor = "";

  switch (statusCategory) {
    case "in_progress":
      watermarkText = "⚠️ DOKUMEN DALAM PROSES PENGESAHAN — Belum final untuk keperluan resmi";
      bgColor = "#fef3c7"; // Yellow warning
      textColor = "#92400e";
      break;
    case "draft":
      watermarkText =
        "🚫 DOKUMEN DRAFT — TIDAK UNTUK DISEBARKAN — Hanya untuk keperluan internal";
      bgColor = "#fee2e2"; // Red danger
      textColor = "#991b1b";
      break;
    case "superseded":
      watermarkText = "ℹ️ DOKUMEN KADALUARSA — Versi baru telah tersedia";
      bgColor = "#e0e7ff"; // Indigo info
      textColor = "#3730a3";
      break;
  }

  return `
    <div class="watermark-banner" style="
      background-color: ${bgColor};
      color: ${textColor};
      padding: 12px 16px;
      border-radius: 8px;
      margin: 16px 0 20px 0;
      text-align: center;
      font-weight: 600;
      font-size: 12px;
      border: 2px solid ${textColor}33;
    ">
      ${watermarkText}
    </div>
  `;
}
