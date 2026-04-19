import type { RpsDocumentData } from "@/services/rps/export/types";

import { escapeHtml } from "../helpers";

export function renderCplSection(data: RpsDocumentData) {
  return `
    <section class="section">
      <h2 class="section-title">CPL Prodi</h2>
      <div class="table-wrap">
        <table class="compact-table">
          <thead>
            <tr>
              <th style="width: 36px;">No</th>
              <th style="width: 90px;">Kode</th>
              <th style="width: 90px;">Kategori</th>
              <th>Deskripsi</th>
            </tr>
          </thead>
          <tbody>
            ${data.cpl
              .map(
                (item, index) => `
                  <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${escapeHtml(item.kode)}</td>
                    <td>${escapeHtml(item.kategori)}</td>
                    <td>${escapeHtml(item.deskripsi)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

