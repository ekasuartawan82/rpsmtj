import type { RpsDocumentData } from "@/services/rps/export/types";

import { escapeHtml } from "../helpers";

/**
 * Render approval history section.
 * This section displays the complete audit trail of RPS document approvals.
 *
 * Positioning: Should appear BEFORE document footer/metadata
 * as it is part of the main document content, not metadata.
 * Order: Header → Info → Dosen → CPL → CPMK → SubCPMK → Matriks → Pertemuan → ApprovalHistory → Footer
 */
export function renderApprovalHistorySection(data: RpsDocumentData): string {
  // Early return if no approval history (should not happen in validated documents)
  if (!data.approvalHistory || data.approvalHistory.length === 0) {
    return `
      <section class="section">
        <h2 class="section-title">Riwayat Persetujuan</h2>
        <p class="warning-text">⚠️ Riwayat persetujuan tidak tersedia. Dokumen mungkin belum melalui proses approval.</p>
      </section>
    `;
  }

  const historyRows = data.approvalHistory
    .map((entry) => {
      const { version, action, actorName, note, createdAt } = entry;

      return `
        <tr>
          <td>${escapeHtml(version)}</td>
          <td>${escapeHtml(createdAt)}</td>
          <td>${escapeHtml(action)}</td>
          <td>${escapeHtml(actorName)}</td>
          <td>${escapeHtml(note)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <section class="section">
      <h2 class="section-title">Riwayat Persetujuan</h2>
      <div class="approval-history">
        <table class="data-table">
          <thead>
            <tr>
              <th>Versi</th>
              <th>Tanggal & Waktu</th>
              <th>Aksi</th>
              <th>Oleh</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
        <p class="info-text">
          Total ${data.approvalHistory.length} aktivitas approval tercatat dalam riwayat dokumen ini.
        </p>
      </div>
    </section>
  `;
}
