import type { RpsDocumentData } from "@/services/rps/export/types";

import { escapeHtml, formatList } from "../helpers";

export function renderCpmkSection(data: RpsDocumentData) {
  return `
    <section class="section">
      <h2 class="section-title">CPMK</h2>
      <div class="table-wrap">
        <table class="compact-table">
          <thead>
            <tr>
              <th style="width: 36px;">No</th>
              <th style="width: 110px;">Kode</th>
              <th>Deskripsi</th>
              <th style="width: 160px;">Terkait CPL</th>
            </tr>
          </thead>
          <tbody>
            ${data.cpmk
              .map(
                (item, index) => `
                  <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${escapeHtml(item.kode)}</td>
                    <td>${escapeHtml(item.deskripsi)}</td>
                    <td>${formatList(item.cplLabels)}</td>
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

