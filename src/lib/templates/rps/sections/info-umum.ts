import type { RpsDocumentData } from "@/services/rps/export/types";

import { escapeHtml, formatPercent, formatStatusLabel } from "../helpers";

export function renderInfoUmumSection(data: RpsDocumentData) {
  return `
    <section class="section keep-together">
      <h2 class="section-title">Informasi Umum</h2>
      <div class="two-column">
        <article class="content-card">
          <h3>Identitas Penyusunan</h3>
          <p><strong>Status:</strong> ${escapeHtml(formatStatusLabel(data.infoUmum.status))}</p>
          <p><strong>Tanggal Penyusunan:</strong> ${escapeHtml(data.infoUmum.tanggalPenyusunan)}</p>
          <p><strong>Dosen Pengembang:</strong> ${escapeHtml(data.infoUmum.dosenPengembang)}</p>
          <p><strong>Email:</strong> ${escapeHtml(data.infoUmum.email)}</p>
          <p><strong>Total Bobot:</strong> ${formatPercent(data.infoUmum.totalBobot)}</p>
        </article>
        <article class="content-card">
          <h3>Deskripsi dan Bahan Kajian</h3>
          <p><strong>Deskripsi Singkat</strong></p>
          <p>${escapeHtml(data.infoUmum.deskripsi)}</p>
          <p style="margin-top: 10px;"><strong>Bahan Kajian</strong></p>
          <p>${escapeHtml(data.infoUmum.bahanKajian)}</p>
        </article>
      </div>
    </section>
  `;
}

