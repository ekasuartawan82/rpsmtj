# Implementasi Modul Tabel Pertemuan RPS

## Ringkasan

Modul ini mengimplementasikan tabel pertemuan minggu 1-16 sesuai format RPS resmi FR.09.049 Poltrada Bali.

## Yang Sudah Selesai

### 1. Database Schema
- ✅ Migration database untuk menambahkan field baru ke `RpsPertemuan`
- ✅ Field `week_label` untuk mendukung format gabungan (misal "4,5", "14,15")
- ✅ Field `order_no` untuk pengurutan yang lebih fleksibel
- ✅ Field estimasi waktu terpisah (PB, PT, KM) dengan format string
- ✅ Field `pustaka_refs` untuk referensi pustaka per pertemuan
- ✅ Field `notes` untuk catatan tambahan

### 2. Type Definitions
- ✅ `src/types/rps-pertemuan.ts` - Type definitions dan helper functions
- ✅ Tipe `PertemuanType`: 'reguler' | 'uts' | 'uas'
- ✅ Interface `RpsPertemuanFormData` untuk form input
- ✅ Helper functions untuk parsing week label

### 3. Validation Service
- ✅ `src/services/rps-pertemuan-validation.ts`
- ✅ Validasi pertemuan individual
- ✅ Validasi set pertemuan (total bobot = 100%, minggu 1-16 lengkap)
- ✅ Validasi kelengkapan untuk UTS (minggu 8) dan UAS (minggu 16)
- ✅ Summary calculator dengan status isComplete

### 4. API Routes
- ✅ `GET /api/rps/[rpsId]/pertemuan` - List semua pertemuan dengan summary
- ✅ `POST /api/rps/[rpsId]/pertemuan` - Create pertemuan baru
- ✅ `PUT /api/rps/[rpsId]/pertemuan/[pertemuanId]` - Update pertemuan
- ✅ `DELETE /api/rps/[rpsId]/pertemuan/[pertemuanId]` - Delete pertemuan

### 5. UI Components
- ✅ `RpsPertemuanTable` - Table component dengan:
  - Summary card (total bobot, status UTS/UAS)
  - Table view dengan kolom sesuai format RPS
  - Edit dan Delete actions
  - Visual indicators untuk status kelengkapan
- ✅ `RpsPertemuanForm` - Form component dengan:
  - Auto-detect tipe (UTS/UAS) berdasarkan week label
  - Sub-CPMK selector dengan auto-fill deskripsi
  - Array inputs untuk indikator, metode pembelajaran
  - Pustaka multi-select
  - Estimasi waktu inputs (PB, PT, KM)

## Cara Penggunaan

### 1. Import di Halaman RPS Detail

```tsx
import { RpsPertemuanTable } from '@/components/rps/rps-pertemuan-table'

// Di dalam RPS detail page
<RpsPertemuanTable
  rpsId={rpsId}
  isReadOnly={isApproved}
  isApproved={status === 'approved'}
/>
```

### 2. Tambahkan Route untuk Create/Edit

```tsx
// app/rps/[id]/pertemuan/new/page.tsx
// app/rps/[id]/pertemuan/[pertemuanId]/edit/page.tsx

import { RpsPertemuanForm } from '@/components/rps/rps-pertemuan-form'
```

## Workflow Pengisian

1. **Isi CPL, CPMK, Sub-CPMK dulu**
   - User harus mengisi CPL → CPMK → Sub-CPMK sebelum mengisi tabel pertemuan
   - Sub-CPMK akan muncul sebagai dropdown di form pertemuan

2. **Isi Tabel Pertemuan**
   - Create pertemuan untuk minggu 1, 2, 3, dst.
   - Bisa buat pertemuan gabungan (misal "4,5")
   - Minggu 8 otomatis terdeteksi sebagai UTS
   - Minggu 16 otomatis terdeteksi sebagai UAS

3. **Validasi Otomatis**
   - Total bobot harus 100%
   - Semua minggu 1-16 harus tercakup
   - UTS dan UAS harus ada

4. **Export PDF**
   - Hanya bisa di-export jika `isComplete = true`
   - PDF akan mengikuti format RPS resmi

## Struktur Data

### Contoh Data Pertemuan Reguler

```json
{
  "orderNo": 1,
  "weekLabel": "1",
  "tipe": "reguler",
  "subCpmkId": "uuid",
  "subCpmkText": "Mahasiswa mampu menjelaskan konsep dasar...",
  "indikatorPenilaian": [
    "Menjelaskan definisi transportasi",
    "Mengidentifikasi moda transportasi"
  ],
  "teknikPenilaian": "Tes Tertulis",
  "kriteriaPenilaian": "Rubrik Deskriptif",
  "metodePembelajaran": ["Ceramah", "Diskusi"],
  "estimasiWaktuPb": "1x(2x50”)",
  "estimasiWaktuPt": "1mgx(2sksx60”)",
  "estimasiWaktuKm": "1x(2x60”)",
  "materiPembelajaran": "Konsep dasar transportasi jalan",
  "bobotPenilaianPersen": 5.0,
  "pustakaRefs": ["uuid1", "uuid2"]
}
```

### Contoh Data Pertemuan UTS

```json
{
  "orderNo": 8,
  "weekLabel": "8",
  "tipe": "uts",
  "deskripsiEvaluasi": "ETS / Evaluasi Tengah Semester: Melakukan validasi hasil penilaian, evaluasi dan perbaikan proses pembelajaran berikutnya."
}
```

## Next Steps (Belum Selesai)

### 1. PDF Export dengan Template RPS
- Buat route `/api/rps/[rpsId]/export/pdf`
- Gunakan Puppeteer untuk generate PDF dari HTML template
- Template HTML harus mengikuti format FR.09.049

### 2. Print Route
- Buat route `/rps/[rpsId]/print`
- Render dokumen RPS dalam format print-ready
- Styling khusus untuk print (A4, margin, pagination)

### 3. Integrasi dengan Wizard RPS
- Add step khusus untuk tabel pertemuan di wizard
- Auto-save setiap perubahan
- Validation sebelum allow move to next step

## Testing

```bash
# Test API endpoints
curl -X GET http://localhost:3000/api/rps/{rpsId}/pertemuan
curl -X POST http://localhost:3000/api/rps/{rpsId}/pertemuan \
  -H "Content-Type: application/json" \
  -d '{"orderNo":1,"weekLabel":"1","tipe":"reguler",...}'
```

## Catatan Penting

1. **Relasi ke Sub-CPMK**: Tabel pertemuan harus terhubung ke Sub-CPMK yang sudah dibuat
2. **Total Bobot 100%**: Sistem akan memvalidasi total bobot = 100% sebelum allow export
3. **Minggu Gabungan**: Format seperti "4,5" akan di-parse sebagai minggu 4 dan 5
4. **Immutability**: RPS yang approved atau superseded tidak bisa di-edit
5. **Permission**: Hanya dosen pengembang dan admin yang bisa edit

## Troubleshooting

### Error: "Total bobot penilaian saat ini X%, harus 100%"
- Pastikan jumlah bobot semua pertemuan reguler = 100
- UTS dan UAS biasanya tidak memiliki bobot

### Error: "Minggu yang belum tercakup: X, Y, Z"
- Pastikan semua minggu 1-16 ada di pertemuan
- Bisa gunakan week label gabungan (misal "4,5")

### Warning: "Minggu ke-8 belum ditandai sebagai UTS"
- Pastikan ada pertemuan dengan weekLabel "8" dan tipe "uts"
