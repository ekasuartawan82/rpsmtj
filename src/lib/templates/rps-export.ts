import type { RpsExportData } from "@/services/rps/export";

function escapeHtml(s: string | null): string {
  if (!s) return "-";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderRpsHtml(data: RpsExportData): string {
  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const groupedMatrixRows = data.rpsCpmkEntries.map((cpmk) => ({
    cpmkId: cpmk.id,
    cpmkKode: cpmk.kode,
    cpmkDeskripsi: cpmk.deskripsi,
    rows: data.cplSubCpmkMatrix.filter((row) => row.cpmkId === cpmk.id),
  }));

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RPS ${escapeHtml(data.mataKuliah.kode)} - ${escapeHtml(data.mataKuliah.nama)}</title>
  <style>
    @font-face {
      font-family: 'RpsSerif';
      src: local('Times New Roman'), local('TimesNewRomanPSMT'), local('Liberation Serif');
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'RpsSerif', 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #1a1a1a;
      background: #ffffff;
      padding: 20mm;
      max-width: 210mm;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 24pt;
      border-bottom: 2pt solid #1a1a1a;
      padding-bottom: 12pt;
    }

    .header h1 {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 6pt;
      text-transform: uppercase;
    }

    .header h2 {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 6pt;
    }

    .header p {
      font-size: 11pt;
      margin-bottom: 3pt;
    }

    .institution-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12pt;
      margin-bottom: 12pt;
    }

    .institution-mark {
      width: 54pt;
      height: 54pt;
      border: 1.5pt solid #1a1a1a;
      border-radius: 999pt;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      font-weight: bold;
      text-align: center;
      line-height: 1.2;
    }

    .institution-copy {
      flex: 1;
      text-align: center;
    }

    .doc-code {
      min-width: 90pt;
      border: 1pt solid #1a1a1a;
      padding: 6pt 8pt;
      text-align: center;
      font-size: 10pt;
      font-weight: bold;
    }

    .section {
      margin-bottom: 18pt;
    }

    .section-title {
      font-size: 13pt;
      font-weight: bold;
      margin-bottom: 9pt;
      text-transform: uppercase;
      border-bottom: 1pt solid #666;
      padding-bottom: 3pt;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 9pt;
      margin-bottom: 12pt;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-weight: bold;
      font-size: 10pt;
      color: #444;
      margin-bottom: 2pt;
    }

    .info-value {
      font-size: 11pt;
    }

    .status-badge {
      display: inline-block;
      padding: 3pt 9pt;
      border-radius: 4pt;
      font-size: 9pt;
      font-weight: bold;
      text-transform: uppercase;
    }

    .status-draft {
      background: #fffbeb;
      color: #92400e;
      border: 1pt solid #fcd34d;
    }

    .status-submitted {
      background: #e0f2fe;
      color: #075985;
      border: 1pt solid #7dd3fc;
    }

    .status-approved {
      background: #d1fae5;
      color: #065f46;
      border: 1pt solid #6ee7b7;
    }

    .status-revision {
      background: #fee2e2;
      color: #991b1b;
      border: 1pt solid #fca5a5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12pt;
      font-size: 10pt;
    }

    .table-section {
      page-break-inside: avoid;
    }

    .wide-table {
      font-size: 8.5pt;
    }

    .wide-table th,
    .wide-table td {
      padding: 4pt;
    }

    .meeting-row-ets td,
    .meeting-row-eas td {
      font-weight: bold;
      background: #eef2ff;
    }

    .meeting-row-eas td {
      background: #ecfeff;
    }

    .muted {
      color: #666;
    }

    .small-text {
      font-size: 9pt;
    }

    th, td {
      border: 1pt solid #333;
      padding: 6pt;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #f5f5f5;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 9pt;
    }

    .number-cell {
      text-align: center;
      width: 30pt;
    }

    .code-cell {
      width: 60pt;
      font-weight: bold;
    }

    .description-cell {
      min-width: 200pt;
    }

    .percentage-cell {
      text-align: right;
      width: 60pt;
    }

    ul, ol {
      margin-left: 18pt;
      margin-bottom: 9pt;
    }

    li {
      margin-bottom: 3pt;
    }

    .footer {
      margin-top: 24pt;
      padding-top: 12pt;
      border-top: 1pt solid #ccc;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }

    @media print {
      body {
        padding: 0;
      }

      .section {
        page-break-inside: avoid;
      }

      table {
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="institution-bar">
      <div class="institution-mark">KEMENHUB</div>
      <div class="institution-copy">
        <p style="font-size: 10pt; letter-spacing: 0.08em; text-transform: uppercase;">Kementerian Perhubungan</p>
        <h1>Rencana Pembelajaran Semester</h1>
        <h2>Politeknik Transportasi Darat Bali</h2>
      </div>
      <div class="doc-code">FR.09.049</div>
    </div>
    <p><strong>${escapeHtml(data.mataKuliah.kode)} - ${escapeHtml(data.mataKuliah.nama)}</strong></p>
    <p>Tahun Akademik: ${escapeHtml(data.tahunAkademik)} | Versi: ${data.versionNo}</p>
  </div>

  <div class="section">
    <div class="section-title">Informasi Umum</div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Status</span>
        <span class="info-value">
          <span class="status-badge ${
            data.status === "approved" ? "status-approved" :
            data.status.startsWith("submitted") ? "status-submitted" :
            data.status.startsWith("revision") ? "status-revision" :
            "status-draft"
          }">${data.status.replace(/_/g, " ").toUpperCase()}</span>
        </span>
      </div>
      <div class="info-item">
        <span class="info-label">Tanggal Penyusunan</span>
        <span class="info-value">${formatDate(data.tanggalPenyusunan)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Dosen Pengembang</span>
        <span class="info-value">${escapeHtml(data.dosenPengembang.nama)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Email Dosen Pengembang</span>
        <span class="info-value">${escapeHtml(data.dosenPengembang.email)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Total SKS</span>
        <span class="info-value">${data.totalSks} SKS</span>
      </div>
      <div class="info-item">
        <span class="info-label">Total Bobot Penilaian</span>
        <span class="info-value">${data.totalBobotPenilaian}%</span>
      </div>
    </div>

    ${data.deskripsiSingkat ? `
    <div style="margin-bottom: 9pt;">
      <span class="info-label">Deskripsi Singkat:</span>
      <p style="margin-top: 3pt;">${escapeHtml(data.deskripsiSingkat)}</p>
    </div>
    ` : ""}

    ${data.bahanKajian ? `
    <div style="margin-bottom: 9pt;">
      <span class="info-label">Bahan Kajian:</span>
      <p style="margin-top: 3pt;">${escapeHtml(data.bahanKajian)}</p>
    </div>
    ` : ""}
  </div>

  <div class="section">
    <div class="section-title">Dosen Pengampu</div>
    <table>
      <thead>
        <tr>
          <th class="number-cell">No</th>
          <th>Nama</th>
          <th>Email</th>
          <th class="number-cell">Peran</th>
        </tr>
      </thead>
      <tbody>
        ${data.dosenPengampu.map((dosen: RpsExportData["dosenPengampu"][number], idx: number) => `
          <tr>
            <td class="number-cell">${idx + 1}</td>
            <td>${escapeHtml(dosen.user.nama)}</td>
            <td>${escapeHtml(dosen.user.email)}</td>
            <td class="number-cell">${dosen.isPengembang ? "Pengembang" : "Pengampu"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">CPL Prodi (${data.rpsCplEntries.length} CPL)</div>
    <table>
      <thead>
        <tr>
          <th class="number-cell">No</th>
          <th class="code-cell">Kode</th>
          <th>Kategori</th>
          <th class="description-cell">Deskripsi</th>
        </tr>
      </thead>
      <tbody>
        ${data.rpsCplEntries.map((entry: RpsExportData["rpsCplEntries"][number], idx: number) => `
          <tr>
            <td class="number-cell">${idx + 1}</td>
            <td class="code-cell">${escapeHtml(entry.cpl.kode)}</td>
            <td>${escapeHtml(entry.cpl.kategori)}</td>
            <td class="description-cell">${escapeHtml(entry.cpl.deskripsi)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <div class="section table-section">
    <div class="section-title">CPMK (${data.totalCpmk} CPMK, ${data.totalSubCpmk} Sub-CPMK)</div>
    ${data.rpsCpmkEntries.map((cpmk: RpsExportData["rpsCpmkEntries"][number], cpmkIdx: number) => `
      <div style="margin-bottom: 12pt; page-break-inside: avoid;">
        <h3 style="font-size: 11pt; font-weight: bold; margin-bottom: 6pt;">
          ${cpmkIdx + 1}. ${escapeHtml(cpmk.kode)} - ${escapeHtml(cpmk.deskripsi)}
        </h3>
        <table style="margin-top: 6pt; font-size: 9pt;">
          <thead>
            <tr>
              <th class="number-cell">No</th>
              <th class="code-cell">Kode</th>
              <th class="description-cell">Deskripsi</th>
              <th class="percentage-cell">Target (%)</th>
            </tr>
          </thead>
          <tbody>
            ${cpmk.subCpmkEntries.map((subCpmk: RpsExportData["rpsCpmkEntries"][number]["subCpmkEntries"][number], subIdx: number) => `
              <tr>
                <td class="number-cell">${subIdx + 1}</td>
                <td class="code-cell">${escapeHtml(subCpmk.kode)}</td>
                <td class="description-cell">${escapeHtml(subCpmk.deskripsi)}</td>
                <td class="percentage-cell">${subCpmk.targetKetercapaianPersen ?? "-"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `).join("")}
  </div>

  <div class="section table-section">
    <div class="section-title">Matriks Korelasi CPL–Sub-CPMK</div>
    <table class="wide-table">
      <thead>
        <tr>
          <th rowspan="2" class="number-cell">No</th>
          <th rowspan="2" class="code-cell">CPMK</th>
          <th rowspan="2" class="code-cell">Sub-CPMK</th>
          <th rowspan="2" class="description-cell">Deskripsi Sub-CPMK</th>
          <th rowspan="2" class="percentage-cell">Target (%)</th>
          <th colspan="${Math.max(data.cplMatrixColumns.length, 1)}">Korelasi ke CPL</th>
        </tr>
        <tr>
          ${
            data.cplMatrixColumns.length > 0
              ? data.cplMatrixColumns
                  .map(
                    (cpl) =>
                      `<th class="number-cell">${escapeHtml(cpl.kode)}<br><span class="muted">${escapeHtml(cpl.kategori)}</span></th>`
                  )
                  .join("")
              : `<th class="number-cell">-</th>`
          }
        </tr>
      </thead>
      <tbody>
        ${
          groupedMatrixRows.length > 0
            ? groupedMatrixRows
                .map((group, groupIndex) =>
                  group.rows
                    .map(
                      (row, rowIndex) => `
                        <tr>
                          ${
                            rowIndex === 0
                              ? `<td class="number-cell" rowspan="${Math.max(group.rows.length, 1)}">${groupIndex + 1}</td>
                                 <td class="code-cell" rowspan="${Math.max(group.rows.length, 1)}">
                                   <strong>${escapeHtml(group.cpmkKode)}</strong><br>
                                   <span class="small-text">${escapeHtml(group.cpmkDeskripsi)}</span>
                                 </td>`
                              : ""
                          }
                          <td class="code-cell">${escapeHtml(row.subCpmkKode)}</td>
                          <td class="description-cell">${escapeHtml(row.subCpmkDeskripsi)}</td>
                          <td class="percentage-cell">${row.targetKetercapaianPersen ?? "-"}</td>
                          ${
                            data.cplMatrixColumns.length > 0
                              ? data.cplMatrixColumns
                                  .map((cpl) => {
                                    const percentage = row.correlations[cpl.id];
                                    return `<td class="number-cell">${percentage ? `${percentage}%` : "-"}</td>`;
                                  })
                                  .join("")
                              : `<td class="number-cell">-</td>`
                          }
                        </tr>
                      `
                    )
                    .join("")
                )
                .join("")
            : `
              <tr>
                <td class="number-cell">-</td>
                <td colspan="${4 + Math.max(data.cplMatrixColumns.length, 1)}">Belum ada data korelasi CPL–Sub-CPMK.</td>
              </tr>
            `
        }
      </tbody>
    </table>
  </div>

  <div class="section table-section">
    <div class="section-title">Rencana Pertemuan (16 Minggu)</div>
    <table class="wide-table">
      <thead>
        <tr>
          <th class="number-cell">Mgg</th>
          <th style="width: 48pt;">Tipe</th>
          <th style="width: 60pt;">Sub-CPMK</th>
          <th class="description-cell">Materi, Metode, dan Penugasan</th>
          <th class="description-cell">Indikator & Evaluasi</th>
          <th class="percentage-cell">Bobot</th>
        </tr>
      </thead>
      <tbody>
        ${data.pertemuanTableRows.map((pertemuan) => `
          <tr class="${
            pertemuan.tipe === "ets"
              ? "meeting-row-ets"
              : pertemuan.tipe === "eas"
                ? "meeting-row-eas"
                : ""
          }">
            <td class="number-cell">${escapeHtml(pertemuan.weekLabel)}</td>
            <td style="font-size: 9pt; text-transform: capitalize;">${escapeHtml(pertemuan.tipe.replace(/_/g, " "))}</td>
            <td class="code-cell">${escapeHtml(pertemuan.subCpmkKode)}</td>
            <td class="description-cell">
              ${pertemuan.materiPembelajaran ? `<strong>Materi:</strong> ${escapeHtml(pertemuan.materiPembelajaran)}<br>` : ""}
              ${pertemuan.metodePembelajaran.length > 0 ? `<strong>Metode:</strong> ${pertemuan.metodePembelajaran.map((m) => escapeHtml(m)).join(", ")}<br>` : ""}
              ${pertemuan.catatanPenugasan ? `<strong>Penugasan:</strong> ${escapeHtml(pertemuan.catatanPenugasan)}<br>` : ""}
              ${pertemuan.bentukDaring ? `<strong>Bentuk Daring:</strong> ${escapeHtml(pertemuan.bentukDaring)}` : `<span class="muted">-</span>`}
            </td>
            <td class="description-cell">
              ${pertemuan.indikatorPenilaian.length > 0 ? `<strong>Indikator:</strong> ${pertemuan.indikatorPenilaian.map((indikator) => escapeHtml(indikator)).join("; ")}<br>` : ""}
              ${pertemuan.teknikPenilaian ? `<strong>Teknik:</strong> ${escapeHtml(pertemuan.teknikPenilaian)}<br>` : ""}
              ${pertemuan.kriteriaPenilaian ? `<strong>Kriteria:</strong> ${escapeHtml(pertemuan.kriteriaPenilaian)}<br>` : ""}
              ${pertemuan.deskripsiEvaluasi ? `<strong>Evaluasi:</strong> ${escapeHtml(pertemuan.deskripsiEvaluasi)}` : `<span class="muted">-</span>`}
            </td>
            <td class="percentage-cell">${pertemuan.bobotPenilaianPersen ?? "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  ${data.rpsPustakaEntries.length > 0 ? `
  <div class="section">
    <div class="section-title">Pustaka (${data.rpsPustakaEntries.length} Referensi)</div>
    ${data.rpsPustakaEntries.some((p: RpsExportData["rpsPustakaEntries"][number]) => p.kategori === "utama") ? `
      <h3 style="font-size: 11pt; font-weight: bold; margin-bottom: 6pt;">Pustaka Utama</h3>
      <ol>
        ${data.rpsPustakaEntries.filter((p: RpsExportData["rpsPustakaEntries"][number]) => p.kategori === "utama").map((pustaka: RpsExportData["rpsPustakaEntries"][number]) => `
          <li>${escapeHtml(pustaka.teksLengkap)}</li>
        `).join("")}
      </ol>
    ` : ""}

    ${data.rpsPustakaEntries.some((p: RpsExportData["rpsPustakaEntries"][number]) => p.kategori === "pendukung") ? `
      <h3 style="font-size: 11pt; font-weight: bold; margin-bottom: 6pt; margin-top: 9pt;">Pustaka Pendukung</h3>
      <ol>
        ${data.rpsPustakaEntries.filter((p: RpsExportData["rpsPustakaEntries"][number]) => p.kategori === "pendukung").map((pustaka: RpsExportData["rpsPustakaEntries"][number]) => `
          <li>${escapeHtml(pustaka.teksLengkap)}</li>
        `).join("")}
      </ol>
    ` : ""}
  </div>
  ` : ""}

  ${data.rtmExportEntries.length > 0 ? `
  <div class="section table-section" style="page-break-before: always;">
    <div class="section-title">Rencana Tugas Mahasiswa (RTM)</div>
    <table class="wide-table">
      <thead>
        <tr>
          <th class="number-cell">No</th>
          <th class="code-cell">Nomor</th>
          <th class="description-cell">Judul Tugas</th>
          <th class="code-cell">Sub-CPMK</th>
          <th style="width: 80pt;">Pertemuan</th>
          <th class="description-cell">Detail Tugas</th>
        </tr>
      </thead>
      <tbody>
        ${data.rtmExportEntries.map((rtm, idx: number) => `
          <tr>
            <td class="number-cell">${idx + 1}</td>
            <td class="code-cell">${escapeHtml(rtm.nomorTugas)}</td>
            <td class="description-cell">${escapeHtml(rtm.judulTugas)}</td>
            <td class="code-cell">${escapeHtml(rtm.subCpmkKode)}</td>
            <td>
              ${
                rtm.pertemuanRefs.length > 0
                  ? rtm.pertemuanRefs
                      .map(
                        (ref) =>
                          `${escapeHtml(ref.weekLabel)} (${escapeHtml(ref.tipe.toUpperCase())})${ref.keterangan ? `: ${escapeHtml(ref.keterangan)}` : ""}`
                      )
                      .join("<br>")
                  : "-"
              }
            </td>
            <td class="description-cell">
              <strong>Metode:</strong> ${escapeHtml(rtm.metodePenugasan)}<br>
              ${rtm.deskripsi ? `<strong>Deskripsi:</strong> ${escapeHtml(rtm.deskripsi)}<br>` : ""}
              ${rtm.langkahPengerjaan ? `<strong>Langkah:</strong> ${escapeHtml(rtm.langkahPengerjaan)}<br>` : ""}
              ${rtm.bentukLuaran ? `<strong>Luaran:</strong> ${escapeHtml(rtm.bentukLuaran)}<br>` : ""}
              ${rtm.indikatorPenilaian ? `<strong>Indikator:</strong> ${escapeHtml(rtm.indikatorPenilaian)}<br>` : ""}
              ${rtm.bobotInternalPersen !== null ? `<strong>Bobot Internal:</strong> ${rtm.bobotInternalPersen}%<br>` : ""}
              ${rtm.jadwalPelaksanaan ? `<strong>Jadwal:</strong> ${escapeHtml(rtm.jadwalPelaksanaan)}<br>` : ""}
              ${rtm.daftarRujukan ? `<strong>Rujukan:</strong> ${escapeHtml(rtm.daftarRujukan)}<br>` : ""}
              ${rtm.catatan ? `<strong>Catatan:</strong> ${escapeHtml(rtm.catatan)}` : ""}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  ${data.approvalLogs.length > 0 ? `
  <div class="section">
    <div class="section-title">Riwayat Approval</div>
    <table style="font-size: 9pt;">
      <thead>
        <tr>
          <th style="width: 50pt;">Versi</th>
          <th style="width: 80pt;">Aksi</th>
          <th>Oleh</th>
          <th style="width: 100pt;">Waktu</th>
          <th>Catatan</th>
        </tr>
      </thead>
      <tbody>
        ${data.approvalLogs.map((log: RpsExportData["approvalLogs"][number]) => `
          <tr>
            <td>v${log.versionNo}</td>
            <td>${escapeHtml(log.action.replace(/_/g, " ").toUpperCase())}</td>
            <td>${escapeHtml(log.actorUser.nama)}${log.actorUser.nidn ? ` (${escapeHtml(log.actorUser.nidn)})` : ""}</td>
            <td>${formatDate(log.createdAt)}</td>
            <td>${log.catatanReview ? escapeHtml(log.catatanReview) : "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="footer">
    <p>Dokumen ini dihasilkan secara otomatis oleh Sistem RPS MTJ</p>
    <p>Generated: ${formatDateTime(data.generatedAt)}</p>
  </div>
</body>
</html>
  `.trim();
}
