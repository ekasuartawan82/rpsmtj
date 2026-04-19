import type { RpsDocumentData } from "@/services/rps/export/types";

import { escapeHtml, formatStatusLabel } from "../helpers";

export function renderFooterSection(data: RpsDocumentData) {
  return `
    <section class="section keep-together">
      <h2 class="section-title">Metadata Dokumen</h2>
      <div class="footer-meta">
        <p><strong>Versi Dokumen:</strong> ${escapeHtml(data.exportMeta.version)}</p>
        <p><strong>Status Saat Dirender:</strong> ${escapeHtml(formatStatusLabel(data.exportMeta.status))}</p>
        <p><strong>Dirender Oleh:</strong> ${escapeHtml(data.exportMeta.exportedBy)}</p>
      </div>
    </section>
  `;
}

