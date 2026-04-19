/**
 * PDF Generator Service
 * Menggunakan Puppeteer untuk generate PDF RPS sesuai format FR.09.049
 */

import puppeteer from 'puppeteer'

export interface RpsPdfData {
  // Identitas Mata Kuliah
  mataKuliah: {
    kode: string
    nama: string
    sksTeori: number
    sksPraktik: number
    semester: number
    rumpun?: string
  }
  tahunAkademik: string
  tanggalPenyusunan: string

  // Dosen Pengampu
  dosenPengembang: string
  dosenPengampuLain?: string[]
  koordinatorRmk: string
  kaprodi: string

  // CPL yang dibebankan
  cplProdi: Array<{
    kode: string
    kategori: string
    deskripsi: string
  }>

  // CPMK
  cpmk: Array<{
    kode: string
    deskripsi: string
  }>

  // Sub-CPMK
  subCpmk: Array<{
    kode: string
    deskripsi: string
    korelasiCpl: Array<{
      cplKode: string
      persentase: number
    }>
  }>

  // Matriks Korelasi
  matriksKorelasi: {
    subCpmk: string[]
    cpl: string[]
    matrix: number[][]
  }

  // Deskripsi Singkat
  deskripsiSingkat?: string

  // Bahan Kajian
  bahanKajian?: string

  // Pustaka
  pustaka: {
    utama: string[]
    pendukung: string[]
  }

  // Tabel Pertemuan
  pertemuan: Array<{
    orderNo: number
    weekLabel: string
    tipe: 'reguler' | 'uts' | 'uas'
    subCpmkText?: string
    indikatorPenilaian?: string[]
    teknikPenilaian?: string
    kriteriaPenilaian?: string
    bentukPembelajaranLuring?: string[]
    bentukPembelajaranDaring?: string[]
    metodePembelajaran?: string[]
    catatanPenugasan?: string
    estimasiWaktuPb?: string
    estimasiWaktuPt?: string
    estimasiWaktuKm?: string
    materiPembelajaran?: string
    bobotPenilaianPersen?: number
    deskripsiEvaluasi?: string
    notes?: string
  }>

  // Total Bobot
  totalBobot: number

  // Catatan Tambahan
  catatanTambahan?: string
}

export class PdfGenerator {
  /**
   * Generate PDF dari data RPS
   */
  static async generatePdf(data: RpsPdfData): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    try {
      const page = await browser.newPage()

      // Generate HTML template
      const html = this.generateHtmlTemplate(data)

      // Set content
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      })

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; color: #666; text-align: center; width: 100%;">
            RPS - ${data.mataKuliah.kode} ${data.mataKuliah.nama}
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; color: #666; text-align: center; width: 100%;">
            Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span>
          </div>
        `
      })

      return pdfBuffer as Buffer
    } finally {
      await browser.close()
    }
  }

  /**
   * Generate HTML template untuk PDF
   */
  private static generateHtmlTemplate(data: RpsPdfData): string {
    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RPS - ${data.mataKuliah.kode} ${data.mataKuliah.nama}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
    }

    .page-break {
      page-break-before: always;
    }

    .avoid-break {
      page-break-inside: avoid;
    }

    h1 {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 12pt;
      text-align: center;
    }

    h2 {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 8pt;
    }

    h3 {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 10pt;
      margin-bottom: 6pt;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12pt;
    }

    th, td {
      border: 1px solid #000;
      padding: 6pt;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }

    .header {
      text-align: center;
      margin-bottom: 20pt;
    }

    .header-logo {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 6pt;
    }

    .header-sub {
      font-size: 11pt;
      margin-bottom: 4pt;
    }

    .info-table {
      margin-bottom: 12pt;
    }

    .info-table td:first-child {
      width: 30%;
      font-weight: bold;
      background-color: #f9f9f9;
    }

    .matrix-table td {
      text-align: center;
    }

    .meeting-table {
      font-size: 10pt;
    }

    .meeting-table th {
      font-size: 9pt;
    }

    .meeting-table td {
      vertical-align: top;
    }

    .badge {
      display: inline-block;
      padding: 2pt 6pt;
      border-radius: 3pt;
      font-size: 9pt;
      font-weight: bold;
    }

    .badge-regular {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .badge-uts {
      background-color: #fff3e0;
      color: #e65100;
    }

    .badge-uas {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .signature-section {
      margin-top: 24pt;
      page-break-inside: avoid;
    }

    .signature-table td {
      border: none;
      text-align: center;
      vertical-align: bottom;
      height: 80pt;
    }

    .ul-list {
      padding-left: 20pt;
      margin-bottom: 8pt;
    }

    .total-box {
      background-color: #f5f5f5;
      padding: 8pt;
      border: 2px solid #000;
      margin-top: 12pt;
      text-align: center;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-logo">POLITEKNIK TRANSPORTASI DARAT BALI</div>
    <div class="header-sub">PROGRAM STUDI D3 MANAJEMEN TRANSPORTASI JALAN</div>
    <div class="header-sub">Rencana Pembelajaran Semester (RPS)</div>
  </div>

  <div class="page-break"></div>

  <!-- Identitas Mata Kuliah -->
  <h1>IDENTITAS MATA KULIAH</h1>
  <table class="info-table">
    <tr>
      <td>Nama Mata Kuliah</td>
      <td>: ${data.mataKuliah.nama}</td>
    </tr>
    <tr>
      <td>Kode Mata Kuliah</td>
      <td>: ${data.mataKuliah.kode}</td>
    </tr>
    <tr>
      <td>Rumpun Mata Kuliah</td>
      <td>: ${data.mataKuliah.rumpun || '-'}</td>
    </tr>
    <tr>
      <td>Bobot (T/P)</td>
      <td>: ${data.mataKuliah.sksTeori}/${data.mataKuliah.sksPraktik} SKS</td>
    </tr>
    <tr>
      <td>Semester</td>
      <td>: ${data.mataKuliah.semester}</td>
    </tr>
    <tr>
      <td>Tahun Akademik</td>
      <td>: ${data.tahunAkademik}</td>
    </tr>
    <tr>
      <td>Tanggal Penyusunan</td>
      <td>: ${data.tanggalPenyusunan}</td>
    </tr>
  </table>

  <div class="page-break"></div>

  <!-- Capaian Pembelajaran -->
  <h1>CAPAIAN PEMBELAJARAN</h1>

  <h2>CPL Prodi yang Dibebankan pada MK</h2>
  <table class="avoid-break">
    <thead>
      <tr>
        <th>No</th>
        <th>Kode</th>
        <th>Kategori</th>
        <th>Deskripsi</th>
      </tr>
    </thead>
    <tbody>
      ${data.cplProdi.map((cpl, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${cpl.kode}</td>
          <td>${cpl.kategori}</td>
          <td>${cpl.deskripsi}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>CPMK</h2>
  <table class="avoid-break">
    <thead>
      <tr>
        <th>No</th>
        <th>Kode</th>
        <th>Deskripsi</th>
      </tr>
    </thead>
    <tbody>
      ${data.cpmk.map((cpmk, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${cpmk.kode}</td>
          <td>${cpmk.deskripsi}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- Sub-CPMK -->
  <h1>SUB-CPMK</h1>
  <table class="avoid-break">
    <thead>
      <tr>
        <th>No</th>
        <th>Kode</th>
        <th>Deskripsi</th>
        <th>CPL Terkait</th>
      </tr>
    </thead>
    <tbody>
      ${data.subCpmk.map((sub, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${sub.kode}</td>
          <td>${sub.deskripsi}</td>
          <td>
            ${sub.korelasiCpl.map(k => `${k.cplKode} (${k.persentase}%)`).join(', ')}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- Matriks Korelasi -->
  <h1>MATRIKS KORELASI CPL - SUB CPMK</h1>
  <table class="matrix-table avoid-break">
    <thead>
      <tr>
        <th>Sub-CPMK \\ CPL</th>
        ${data.matriksKorelasi.cpl.map(cpl => `<th>${cpl}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.matriksKorelasi.subCpmk.map((subCpmk, rowIdx) => `
        <tr>
          <td style="text-align: left;">${subCpmk}</td>
          ${data.matriksKorelasi.cpl.map((_, colIdx) => {
            const value = data.matriksKorelasi.matrix[rowIdx][colIdx]
            return `<td>${value > 0 ? value : '-'}</td>`
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- Deskripsi Singkat -->
  ${data.deskripsiSingkat ? `
    <h1>DESKRIPSI SINGKAT MATA KULIAH</h1>
    <p>${data.deskripsiSingkat}</p>
    <div class="page-break"></div>
  ` : ''}

  <!-- Bahan Kajian -->
  ${data.bahanKajian ? `
    <h1>BAHAN KAJIAN / MATERI PEMBELAJARAN</h1>
    <p>${data.bahanKajian}</p>
    <div class="page-break"></div>
  ` : ''}

  <!-- Pustaka -->
  <h1>PUSTAKA</h1>

  <h3>Pustaka Utama</h3>
  <ol class="ul-list">
    ${data.pustaka.utama.map(p => `<li>${p}</li>`).join('')}
  </ol>

  <h3>Pustaka Pendukung</h3>
  <ol class="ul-list">
    ${data.pustaka.pendukung.map(p => `<li>${p}</li>`).join('')}
  </ol>

  <div class="page-break"></div>

  <!-- Tabel Pertemuan -->
  <h1>TABEL PERTEMUAN MINGGU 1-16</h1>
  <table class="meeting-table">
    <thead>
      <tr>
        <th style="width: 5%;">No</th>
        <th style="width: 8%;">Mg Ke-</th>
        <th style="width: 7%;">Tipe</th>
        <th style="width: 18%;">Kemampuan Akhir<br/>(Sub-CPMK)</th>
        <th style="width: 22%;">Penilaian<br/>(Indikator, Teknik, Kriteria)</th>
        <th style="width: 25%;">Bentuk/Metode &<br/>Penugasan & Estimasi Waktu</th>
        <th style="width: 10%;">Materi<br/>Pembelajaran</th>
        <th style="width: 5%;">Bobot</th>
      </tr>
    </thead>
    <tbody>
      ${data.pertemuan.map(p => `
        <tr>
          <td>${p.orderNo}</td>
          <td>${p.weekLabel}</td>
          <td>
            <span class="badge badge-${p.tipe}">
              ${p.tipe === 'reguler' ? 'Reguler' : p.tipe.toUpperCase()}
            </span>
          </td>
          <td>
            ${p.tipe === 'reguler' ? `
              <strong>${p.subCpmkText || ''}</strong>
              ${p.notes ? `<br/><small>${p.notes}</small>` : ''}
            ` : `
              <em>${p.deskripsiEvaluasi || ''}</em>
            `}
          </td>
          <td>
            ${p.tipe === 'reguler' ? `
              ${p.indikatorPenilaian && p.indikatorPenilaian.length > 0 ? `
                <strong>Indikator:</strong><br/>
                <ul style="padding-left: 12pt; margin: 2pt 0;">
                  ${p.indikatorPenilaian.map(i => `<li>${i}</li>`).join('')}
                </ul>
              ` : ''}
              ${p.teknikPenilaian ? `<strong>Teknik:</strong> ${p.teknikPenilaian}<br/>` : ''}
              ${p.kriteriaPenilaian ? `<strong>Kriteria:</strong> ${p.kriteriaPenilaian}` : ''}
            ` : '-'}
          </td>
          <td>
            ${p.tipe === 'reguler' ? `
              ${p.metodePembelajaran && p.metodePembelajaran.length > 0 ? `
                <strong>Metode:</strong> ${p.metodePembelajaran.join(', ')}<br/>
              ` : ''}
              ${p.estimasiWaktuPb ? `<small>PB: ${p.estimasiWaktuPb}</small><br/>` : ''}
              ${p.estimasiWaktuPt ? `<small>PT: ${p.estimasiWaktuPt}</small><br/>` : ''}
              ${p.estimasiWaktuKm ? `<small>KM: ${p.estimasiWaktuKm}</small><br/>` : ''}
              ${p.catatanPenugasan ? `<small><em>Tugas: ${p.catatanPenugasan}</em></small>` : ''}
            ` : '-'}
          </td>
          <td>
            ${p.materiPembelajaran || '-'}
          </td>
          <td style="text-align: center;">
            ${p.bobotPenilaianPersen !== undefined && p.bobotPenilaianPersen !== null
              ? `<strong>${p.bobotPenilaianPersen}%</strong>`
              : '-'}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total-box">
    Total Bobot Penilaian: ${data.totalBobot}%
  </div>

  <div class="page-break"></div>

  <!-- Catatan Tambahan -->
  ${data.catatanTambahan ? `
    <h1>CATATAN TAMBAHAN</h1>
    <p>${data.catatanTambahan}</p>
    <div class="page-break"></div>
  ` : ''}

  <!-- Signature -->
  <div class="signature-section">
    <table class="signature-table">
      <tr>
        <td style="width: 30%;">
          <strong>Dosen Pengembang</strong><br/>
          <br/>
          <br/>
          <br/>
          <u>${data.dosenPengembang}</u><br/>
          NIDN. ${this.extractNidn(data.dosenPengembang)}
        </td>
        <td style="width: 30%;">
          <strong>Koordinator RMK</strong><br/>
          <br/>
          <br/>
          <br/>
          <u>${data.koordinatorRmk}</u><br/>
          NIDN. ${this.extractNidn(data.koordinatorRmk)}
        </td>
        <td style="width: 40%;">
          <strong>Kaprodi</strong><br/>
          <br/>
          <br/>
          <br/>
          <u>${data.kaprodi}</u><br/>
          NIDN. ${this.extractNidn(data.kaprodi)}
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
    `
  }

  /**
   * Extract NIDN from nama string
   * Ini placeholder, actual implementation might vary
   */
  private static extractNidn(nama: string): string {
    // Placeholder - seharusnya ada field NIDN terpisah
    return '......................'
  }
}
