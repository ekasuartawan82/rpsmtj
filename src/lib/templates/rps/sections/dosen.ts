import type { RpsDocumentData } from "@/services/rps/export/types";

import { escapeHtml } from "../helpers";

export function renderDosenSection(data: RpsDocumentData) {
  return `
    <section class="section keep-together">
      <h2 class="section-title">Dosen Pengampu</h2>
      <div class="table-wrap">
        <table class="compact-table">
          <thead>
            <tr>
              <th style="width: 36px;">No</th>
              <th>Nama</th>
              <th>Email</th>
              <th style="width: 140px;">Peran</th>
            </tr>
          </thead>
          <tbody>
            ${data.dosenPengampu
              .map(
                (item, index) => `
                  <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${escapeHtml(item.nama)}</td>
                    <td>${escapeHtml(item.email)}</td>
                    <td>${escapeHtml(item.peran)}</td>
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

