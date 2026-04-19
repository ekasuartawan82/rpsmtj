import type { RpsDocumentData } from "@/services/rps/export/types";

import { escapeHtml, formatStatusLabel } from "../helpers";

export function renderHeaderSection(data: RpsDocumentData) {
  return `
    <section class="section keep-together">
      <div class="page-header">
        <div class="logo-box">
          <img src="${data.assets.logoPoltradaDataUri}" alt="Logo Poltrada Bali" />
        </div>
        <div>
          <p class="eyebrow">Politeknik Transportasi Darat Bali</p>
          <h1 class="doc-title">Rencana Pembelajaran Semester</h1>
          <p class="doc-subtitle">
            ${escapeHtml(data.identity.kodeMatkul)} · ${escapeHtml(data.identity.namaMatkul)}
          </p>
        </div>
        <div class="doc-code-box">
          <strong>${escapeHtml(data.identity.versi)}</strong>
          <span>${escapeHtml(formatStatusLabel(data.infoUmum.status))}</span>
        </div>
      </div>

      <div class="meta-grid">
        <article class="meta-card">
          <p class="label">Mata Kuliah</p>
          <p class="value">${escapeHtml(data.identity.namaMatkul)}</p>
        </article>
        <article class="meta-card">
          <p class="label">Kode</p>
          <p class="value">${escapeHtml(data.identity.kodeMatkul)}</p>
        </article>
        <article class="meta-card">
          <p class="label">SKS</p>
          <p class="value">${data.identity.sks}</p>
        </article>
        <article class="meta-card">
          <p class="label">Tahun Akademik</p>
          <p class="value">${escapeHtml(data.identity.tahunAkademik)}</p>
        </article>
      </div>
    </section>
  `;
}

