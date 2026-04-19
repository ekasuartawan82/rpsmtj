# Implementasi PDF Export RPS

## Ringkasan

Sistem PDF export untuk mengenerate dokumen RPS sesuai format FR.09.049 Poltrada Bali menggunakan Puppeteer.

## Komponen

### 1. PDF Generator Service
**File:** `src/lib/pdf-generator.ts`

Service yang menggunakan Puppeteer untuk:
- Generate HTML template dari data RPS
- Render HTML ke PDF dengan format A4
- Menambahkan header dan footer pada PDF
- Handle page break untuk dokumen multi-halaman

### 2. API Route PDF Export
**File:** `src/app/api/rps/[rpsId]/export/pdf/route.ts`

Endpoint API untuk:
- Validasi permission dan status RPS
- Fetch semua data RPS dengan relasi
- Validasi kelengkapan data pertemuan
- Generate PDF dan return sebagai download

### 3. Print Route
**File:** `src/app/rps/[rpsId]/print/page.tsx`

Route untuk preview HTML print-ready:
- Render dokumen RPS dalam format HTML
- Styling khusus untuk print (CSS @media print)
- Tombol "Cetak / Simpan PDF"
- Bisa diakses langsung di browser

## Cara Penggunaan

### 1. Export PDF via API

```typescript
// Di frontend component
const handleExportPdf = async () => {
  const response = await fetch(`/api/rps/${rpsId}/export/pdf`, {
    method: 'POST'
  })

  if (response.ok) {
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `RPS-${kodeMk}-${tahunAkademik}.pdf`
    a.click()
  }
}
```

### 2. Preview Print HTML

```typescript
// Buka di tab baru
window.open(`/rps/${rpsId}/print`, '_blank')
```

### 3. Tambahkan Tombol Export di RPS Detail

```tsx
// Di halaman detail RPS
<button
  onClick={handleExportPdf}
  disabled={status !== 'approved'}
  className="px-4 py-2 bg-red-600 text-white rounded-md"
>
  Export PDF
</button>
```

## Format PDF

### Layout
- **Paper size:** A4 Portrait
- **Margins:** 1cm (top, right, bottom, left)
- **Font:** Times New Roman, 12pt
- **Line height:** 1.5

### Sections
1. Header Institusi
2. Identitas Mata Kuliah
3. Capaian Pembelajaran (CPL, CPMK, Sub-CPMK)
4. Matriks Korelasi CPL - Sub CPMK
5. Deskripsi Singkat MK (opsional)
6. Bahan Kajian (opsional)
7. Pustaka (Utama & Pendukung)
8. Tabel Pertemuan Minggu 1-16
9. Total Bobot Penilaian
10. Catatan Tambahan (opsional)
11. Signature Section

### Styling Table

**Identitas MK:**
- Kolom 1 (30%): Label field
- Kolom 2 (70%): Value

**Tabel Pertemuan:**
- No (5%)
- Minggu (8%)
- Tipe (7%)
- Sub-CPMK (18%)
- Penilaian (22%)
- Metode & Penugasan (25%)
- Materi (10%)
- Bobot (5%)

## Validasi Sebelum Export

Sistem akan memvalidasi:
1. ✅ Status RPS harus `approved`
2. ✅ Semua minggu 1-16 tercakup
3. ✅ Total bobot penilaian = 100%
4. ✅ Ada pertemuan UTS (minggu 8)
5. ✅ Ada pertemuan UAS (minggu 16)

Jika validasi gagal, API akan return error dengan pesan yang jelas.

## Data Structure

### RpsPdfData Interface

```typescript
interface RpsPdfData {
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
  dosenPengembang: string
  dosenPengampuLain?: string[]
  koordinatorRmk: string
  kaprodi: string
  cplProdi: Array<{ kode, kategori, deskripsi }>
  cpmk: Array<{ kode, deskripsi }>
  subCpmk: Array<{
    kode, deskripsi,
    korelasiCpl: Array<{ cplKode, persentase }>
  }>
  matriksKorelasi: {
    subCpmk: string[]
    cpl: string[]
    matrix: number[][]
  }
  deskripsiSingkat?: string
  bahanKajian?: string
  pustaka: {
    utama: string[]
    pendukung: string[]
  }
  pertemuan: Array<{
    orderNo, weekLabel, tipe,
    subCpmkText, indikatorPenilaian,
    teknikPenilaian, kriteriaPenilaian,
    metodePembelajaran, estimasiWaktuPb,
    estimasiWaktuPt, estimasiWaktuKm,
    materiPembelajaran, bobotPenilaianPersen,
    deskripsiEvaluasi, notes
  }>
  totalBobot: number
  catatanTambahan?: string
}
```

## Dependensi

```json
{
  "puppeteer": "^24.41.0"
}
```

Puppeteer membutuhkan:
- Chromium/Chrome browser
- Node.js environment
- Sufficient memory untuk render PDF

## Environment Notes

### Development
```bash
# Pastikan Puppeteer terinstall dengan benar
npm install puppeteer

# Puppeteer akan download Chromium secara otomatis
# Ukuran ~300MB
```

### Production
```bash
# Di server, pastikan dependencies berikut terinstall:
# - libnss3
# - libatk-bridge2.0-0
# - libdrm2
# - libxcomposite1
# - libxdamage1
# - libxrandr2
# - libgbm1
# - libasound2

# Ubuntu/Debian:
sudo apt-get install \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libasound2
```

## Troubleshooting

### Error: "Failed to launch browser"
**Solusi:** Install dependencies Puppeteer untuk OS yang digunakan

### Error: "RPS harus sudah disetujui"
**Solusi:** Pastikan RPS sudah melalui workflow approval dan status = 'approved'

### Error: "Total bobot penilaian saat ini X%, harus 100%"
**Solusi:** Cek kembali bobot penilaian di tabel pertemuan

### PDF terlalu besar
**Solusi:** Optimasi gambar atau kurangi content di deskripsi

### Page break tidak sesuai
**Solusi:** Tambahkan CSS class `.page-break` atau `.avoid-break` pada element yang sesuai

## Performance

- **Waktu generate:** ~5-15 detik per dokumen (tergantung complexity)
- **Memory usage:** ~200-500MB saat generate PDF
- **File size:** ~500KB - 2MB per PDF

## Best Practices

1. **Validate data sebelum export** - Gunakan `RpsPertemuanValidator.canExportPdf()`
2. **Gunakan print preview untuk testing** - Buka `/rps/[id]/print` sebelum generate PDF
3. **Cache PDF jika diperlukan** - Simpan PDF di storage jika sering diakses
4. **Handle error dengan baik** - Berikan feedback yang jelas ke user
5. **Optimasi Puppeteer** - Gunakan mode headless, matikan fitur yang tidak diperlukan

## Future Enhancements

1. **Queue System** - Gunakan BullMQ untuk antrian generate PDF
2. **Progress Tracking** - Berikan progress bar saat generate
3. **Template Variants** - Support multiple template formats
4. **Digital Signature** - Tambahkan digital signature pada PDF
5. **Versioning** - Simpan historis PDF di database/storage

## Testing

```bash
# Test PDF generation
curl -X POST http://localhost:3000/api/rps/{rpsId}/export/pdf \
  -o test.pdf

# Test print preview
curl http://localhost:3000/rps/{rpsId}/print
```

## Related Files

- `src/lib/pdf-generator.ts` - Core PDF generation logic
- `src/app/api/rps/[rpsId]/export/pdf/route.ts` - Export API endpoint
- `src/app/rps/[rpsId]/print/page.tsx` - Print preview route
- `src/services/rps-pertemuan-validation.ts` - Validation service
- `src/components/rps/rps-pertemuan-table.tsx` - Table UI component
