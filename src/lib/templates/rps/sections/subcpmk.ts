import type { RpsDocumentData } from "@/services/rps/export/types";

import { escapeHtml, formatPercent } from "../helpers";

export function renderSubCpmkSection(data: RpsDocumentData) {
  return `
    <section class="section">
      <h2 class="section-title">Sub-CPMK</h2>
      <div class="table-wrap">
        <table class="compact-table">
          <thead>
            <tr>
              <th style="width: 36px;">No</th>
              <th style="width: 100px;">Kode</th>
              <th style="width: 110px;">Turunan CPMK</th>
              <th>Deskripsi</th>
              <th style="width: 100px;">Target</th>
            </tr>
          </thead>
          <tbody>
            ${data.subCpmk
              .map(
                (item, index) => `
                  <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${escapeHtml(item.kode)}</td>
                    <td>${escapeHtml(item.cpmkKode)}</td>
                    <td>${escapeHtml(item.deskripsi)}</td>
                    <td class="text-right">${formatPercent(item.targetKetercapaianPersen)}</td>
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

