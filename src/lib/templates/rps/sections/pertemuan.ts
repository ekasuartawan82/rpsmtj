import type { RpsDocumentData } from "@/services/rps/export/types";

import {
  escapeHtml,
  formatList,
  formatMeetingTypeLabel,
  formatPercent,
} from "../helpers";

function isExtraSession(weekLabel: string): boolean {
  // Non-standard week labels contain letters (e.g. "15A", "15B")
  return /[A-Za-z]/.test(weekLabel);
}

function formatWeekLabel(weekLabel: string): string {
  if (isExtraSession(weekLabel)) {
    return `${escapeHtml(weekLabel)} <span class="extra-session-badge">Tambahan</span>`;
  }
  return escapeHtml(weekLabel);
}

export function renderPertemuanSection(data: RpsDocumentData) {
  return `
    <section class="section">
      <h2 class="section-title">Tabel Pertemuan</h2>
      <div class="table-wrap">
        <table class="meeting-table">
          <thead>
            <tr>
              <th style="width: 26px;">No</th>
              <th style="width: 52px;">Minggu</th>
              <th style="width: 44px;">Tipe</th>
              <th style="width: 98px;">Sub-CPMK</th>
              <th style="width: 130px;">Indikator</th>
              <th style="width: 108px;">Teknik / Kriteria</th>
              <th style="width: 130px;">Pembelajaran</th>
              <th style="width: 78px;">Tugas</th>
              <th style="width: 78px;">Estimasi Waktu</th>
              <th style="width: 110px;">Materi</th>
              <th style="width: 108px;">Pustaka</th>
              <th style="width: 54px;">Bobot</th>
            </tr>
          </thead>
          <tbody>
            ${data.pertemuan
              .map(
                (row) => `
                  <tr class="${row.tipe === "ets" ? "meeting-row-ets" : row.tipe === "eas" ? "meeting-row-eas" : isExtraSession(row.weekLabel) ? "meeting-row-extra" : ""}">
                    <td class="text-center">${row.orderNo}</td>
                    <td>${formatWeekLabel(row.weekLabel)}</td>
                    <td>${escapeHtml(formatMeetingTypeLabel(row.tipe))}</td>
                    <td>${escapeHtml(row.subCpmkLabel)}</td>
                    <td>${formatList(row.indikatorPenilaian)}</td>
                    <td>
                      <strong>Teknik:</strong> ${escapeHtml(row.teknikPenilaian)}<br />
                      <strong>Kriteria:</strong> ${escapeHtml(row.kriteriaPenilaian)}
                    </td>
                    <td>
                      <strong>Luring:</strong> ${formatList(row.bentukPembelajaranLuring)}<br />
                      <strong>Daring:</strong> ${formatList(row.bentukPembelajaranDaring)}<br />
                      <strong>Metode:</strong> ${formatList(row.metodePembelajaran)}
                    </td>
                    <td>
                      <strong>Penugasan:</strong> ${escapeHtml(row.penugasanMahasiswa)}<br />
                      <strong>Evaluasi:</strong> ${escapeHtml(row.deskripsiEvaluasi)}
                    </td>
                    <td>
                      <strong>PB:</strong> ${escapeHtml(row.estimasiWaktuPb)}<br />
                      <strong>PT:</strong> ${escapeHtml(row.estimasiWaktuPt)}<br />
                      <strong>KM:</strong> ${escapeHtml(row.estimasiWaktuKm)}
                    </td>
                    <td>
                      ${escapeHtml(row.materiPembelajaran)}
                      ${row.notes !== "-" ? `<br /><span class="text-muted">Catatan: ${escapeHtml(row.notes)}</span>` : ""}
                    </td>
                    <td>${formatList(row.pustakaLabels)}</td>
                    <td class="text-right">${formatPercent(row.bobotPenilaianPersen)}</td>
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
