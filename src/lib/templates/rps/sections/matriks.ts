import type { RpsDocumentData } from "@/services/rps/export/types";

import { escapeHtml, formatPercent } from "../helpers";

export function renderMatriksSection(data: RpsDocumentData) {
  return `
    <section class="section">
      <h2 class="section-title">Matriks Korelasi CPL – Sub-CPMK</h2>
      <div class="table-wrap">
        <table class="compact-table">
          <thead>
            <tr>
              <th style="width: 90px;">CPMK</th>
              <th style="width: 100px;">Sub-CPMK</th>
              <th style="min-width: 130px;">Deskripsi</th>
              <th style="width: 70px;">Target</th>
              ${data.matriksCplSubCpmk.columns
                .map(
                  (column) => `
                    <th style="width: 48px;">${escapeHtml(column.kode)}</th>
                  `
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${data.matriksCplSubCpmk.rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.cpmkKode)}</td>
                    <td>${escapeHtml(row.subCpmkKode)}</td>
                    <td>${escapeHtml(row.subCpmkDeskripsi)}</td>
                    <td class="text-right">${formatPercent(row.targetKetercapaianPersen)}</td>
                    ${row.correlations
                      .map(
                        (value) => `
                          <td class="text-center">${value === null ? "-" : value.toFixed(0)}%</td>
                        `
                      )
                      .join("")}
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

