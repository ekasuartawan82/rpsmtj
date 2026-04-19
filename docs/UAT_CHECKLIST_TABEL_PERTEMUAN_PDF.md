# UAT Checklist: RPS Print & PDF Export
## Status: Code-Level Pass, Feature-Level Retest Required

**Tanggal Implementasi:** 2026-04-18
**Status Saat Ini:**
- ✅ TypeScript compilation: PASS
- ✅ Database migration: PASS
- ❌ Feature testing: NOT EXECUTED
- ❌ Integration testing: NOT EXECUTED
- ❌ End-to-end validation: NOT EXECUTED

---

## Catatan Penting

Verdict "code-level pass" hanya berarti:
- Kode dapat dikompilasi tanpa error TypeScript
- Structure files dan routes telah dibuat
- API endpoints tersedia

Verdict ini **TIDAK** membuktikan:
- Fitur bekerja sesuai spesifikasi
- UX memenuhi ekspektasi user
- Security guards konsisten di semua path
- PDF generation berhasil di production environment

**Status berubah menjadi "feature sign-off" hanya setelah:**
1. Semua test case di bawah ini dieksekusi
2. Hasil test terdokumentasi (screenshot/log)
3. Issue yang ditemukan diperbaiki
4. Re-test setelah perbaikan

---

## A. Tabel Pertemuan 1–16

### A1. Input minggu tunggal (contoh: "1")

**Test Steps:**
1. Buka halaman detail RPS
2. Klik "Tambah Pertemuan"
3. Isi "Label Minggu" dengan "1"
4. Isi field wajib lainnya (Sub-CPMK, indikator, dll)
5. Klik "Simpan"

**Expected Result:**
- Data tersimpan di database
- Tampil di tabel sebagai baris dengan minggu "1"
- `weekLabel` di database = "1"
- `orderNo` = 1

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### A2. Input minggu gabungan (contoh: "4,5")

**Test Steps:**
1. Buat pertemuan baru
2. Isi "Label Minggu" dengan "4,5"
3. Isi field wajib
4. Simpan

**Expected Result:**
- Data tersimpan sebagai string "4,5" (bukan array)
- Tampil satu baris di tabel dengan label "4,5"
- Di PDF juga tampil satu baris

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### A3. Tandai minggu 8 sebagai UTS

**Test Steps:**
1. Buat pertemuan dengan minggu "8"
2. Sistem auto-detect tipe sebagai "uts" ATAU manual pilih tipe "UTS"
3. Simpan tanpa mengisi Sub-CPMK

**Expected Result:**
- `tipe` = "uts"
- Kolom Sub-CPMK tidak wajib diisi
- Label menampilkan badge "UTS" atau "ETS"
- Validasi tidak menuntut Sub-CPMK

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### A4. Tandai minggu 16 sebagai UAS

**Test Steps:**
1. Buat pertemuan dengan minggu "16"
2. Pilih tipe "uas" atau biarkan auto-detect
3. Simpan tanpa Sub-CPMK

**Expected Result:**
- `tipe` = "uas"
- Badge "UAS" atau "EAS" muncul
- Field Sub-CPMK tidak required
- `deskripsiEvaluasi` bisa diisi

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### A5. Total bobot < 100%

**Test Steps:**
1. Buat beberapa pertemuan reguler
2. Set total bobot < 100% (misal 80%)
3. Coba simpan/submit

**Expected Result:**
- Validasi menolak dengan pesan jelas
- Atau UI menampilkan warning yang jelas
- API return error 400 dengan message ter struktur

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### A6. Total bobot = 100 persis

**Test Steps:**
1. Buat pertemuan dengan total bobot = 100%
2. Coba simpan/submit

**Expected Result:**
- Validasi lolos
- Data tersimpan
- Summary menampilkan "Total Bobot: 100%"
- Status `isComplete` = true (jika syarat lain terpenuhi)

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### A7. Total bobot > 100%

**Test Steps:**
1. Set total bobot > 100% (misal 120%)
2. Coba simpan

**Expected Result:**
- API menolak dengan error
- Pesan error menyebutkan total melebihi 100%

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### A8. Pertemuan reguler tanpa Sub-CPMK

**Test Steps:**
1. Buat pertemuan tipe "reguler"
2. Kosongkan field Sub-CPMK
3. Coba simpan

**Expected Result:**
- Validasi menolak
- Error message menyebutkan Sub-CPMK wajib untuk reguler

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### A9. Urutan pertemuan setelah edit

**Test Steps:**
1. Buat 3 pertemuan dengan orderNo 1, 2, 3
2. Edit pertemuan ke-2, ganti orderNo jadi 5
3. Refresh halaman

**Expected Result:**
- Urutan tampil: 1, 3, 5
- `orderNo` di database tersimpan benar
- Tidak ada duplikasi atau data hilang

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

## B. Print Preview (`/rps/[id]/print`)

### B1. Akses print saat status `draft`

**Test Steps:**
1. Buat RPS baru dengan status `draft`
2. Buka `/rps/[id]/print`

**Expected Result:**
- Tidak error 500
- Menampilkan halaman info "belum siap cetak" atau redirect
- Pesan user-friendly, bukan technical error

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### B2. Akses print saat status `approved`

**Test Steps:**
1. Gunakan RPS status `approved` dengan data lengkap
2. Buka `/rps/[id]/print`

**Expected Result:**
- HTML RPS lengkap ter-render
- Tampil mirip format FR.09.049
- Semua section muncul (identitas, CPL, tabel pertemuan, dll)

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### B3. Auth: akses tanpa login

**Test Steps:**
1. Logout dari sistem
2. Langsung akses `/rps/[id]/print`

**Expected Result:**
- Redirect ke halaman login
- Atau return 401/403
- Tidak bisa melihat konten RPS

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### B4. Auth: akses user bukan pemilik/reviewer

**Test Steps:**
1. Login sebagai Dosen A
2. Coba akses `/rps/[id]/print` untuk RPS milik Dosen B
3. Pastikan bukan admin/kaprodi/rmk

**Expected Result:**
- Return 403 Forbidden
- Atau redirect dengan pesan "tidak memiliki akses"
- Data RPS tidak tampil

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### B5. Header institusi muncul

**Test Steps:**
1. Buka print preview untuk RPS approved
2. Cek bagian atas halaman

**Expected Result:**
- "POLITEKNIK TRANSPORTASI DARAT BALI" muncul
- "PROGRAM STUDI D3 MANAJEMEN TRANSPORTASI JALAN" muncul
- "Rencana Pembelajaran Semester (RPS)" muncul
- Font bold, center alignment

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### B6. Identitas MK lengkap

**Test Steps:**
1. Buka print preview
2. Cek tabel identitas MK

**Expected Result:**
- Nama MK, kode MK terisi
- Rumpun MK (jika ada)
- Bobot T/P (contoh: 2/1 SKS)
- Semester
- Tahun akademik
- Tanggal penyusunan

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### B7. CPL → CPMK → Sub-CPMK berurutan

**Test Steps:**
1. Scroll ke bagian CPL/CPMK
2. Cek apakah data tampil benar

**Expected Result:**
- Tidak ada baris kosong
- Tidak ada "[object Object]"
- Kode dan deskripsi terbaca jelas
- Urutan: CPL dulu, baru CPMK, baru Sub-CPMK

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### B8. Matriks korelasi ter-render

**Test Steps:**
1. Cek bagian matriks korelasi
2. Bandingkan dengan data di database

**Expected Result:**
- Tabel korelasi tampil
- CPL sebagai kolom header
- Sub-CPMK sebagai row header
- Persentase muncul (bukan 0 atau kosong)

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### B9. Tabel pertemuan 1–16 complete

**Test Steps:**
1. Cek tabel pertemuan di print preview
2. Hitung jumlah baris

**Expected Result:**
- Semua 16 minggu tercakup
- Minggu 8 menampilkan "UTS"
- Minggu 16 menampilkan "UAS"
- Tidak ada minggu yang terlewat

**Actual Result:** |
**Pass/fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### B10. Minggu gabungan tampil benar

**Test Steps:**
1. Buat pertemuan dengan minggu "4,5"
2. Buka print preview
3. Cek tabel pertemuan

**Expected Result:**
- "4,5" tampil dalam satu baris
- Bukan dua baris terpisah
- Kolom "Mg Ke-" berisi "4,5"

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### B11. Kolom panjang tidak merusak layout

**Test Steps:**
1. Buat pertemuan dengan indikator/materi yang sangat panjang
2. Buka print preview
3. Cek apakah layout tetap rapi

**Expected Result:**
- Teks wrap dengan benar
- Tidak overflow ke kolom lain
- Tabel tetap terbaca rapi
- Tidak horizontal scroll pada tampilan normal

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### B12. Page break saat print

**Test Steps:**
1. Buka print preview
2. Tekan Ctrl+P (Print)
3. Cek preview print dialog browser

**Expected Result:**
- Tabel tidak terpotong di tengah baris
- Page break terjadi di antara row/section
- Header dan footer konsisten

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### B13. Browser print dialog menghasilkan PDF wajar

**Test Steps:**
1. Dari print preview, klik "Cetak / Simpan PDF"
2. Pilih "Save as PDF" di print dialog
3. Buka PDF hasil

**Expected Result:**
- Ukuran A4
- Margin normal
- Konten lengkap
- Font terbaca

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

## C. PDF Export (`/api/rps/[id]/export/pdf`)

### C1. Export saat RPS `draft`

**Test Steps:**
1. Buat RPS status `draft`
2. Panggil API `POST /api/rps/[id]/export/pdf` via Postman/curl

**Expected Result:**
- Return 422 Unprocessable Entity (atau 400)
- Response body berupa JSON error, bukan PDF
- Error message menjelaskan kenapa tidak bisa export

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Response Body:** (copy-paste)
**Notes:**

---

### C2. Export saat RPS `approved`

**Test Steps:**
1. Gunakan RPS `approved` lengkap
2. Panggil API export
3. Simpan response sebagai file .pdf

**Expected Result:**
- Return 200 OK
- Content-Type: application/pdf
- File PDF bisa diunduh
- File size reasonable (bukan 0KB atau sangat kecil)

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**File Size:** KB
**Notes:**

---

### C3. PDF bisa dibuka

**Test Steps:**
1. Buka file PDF dari C2
2. Buka di PDF reader (Adobe, browser, dll)

**Expected Result:**
- File tidak corrupt
- Bisa dibuka tanpa error
- Semua halaman bisa diakses

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**PDF Reader Used:**
**Notes:**

---

### C4. Halaman pertama: header + identitas MK

**Test Steps:**
1. Buka PDF
2. Cek halaman pertama

**Expected Result:**
- Header institusi muncul
- Tabel identitas MK lengkap
- Format sesuai FR.09.049

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### C5. Halaman berisi tabel 16 minggu

**Test Steps:**
1. Scroll ke halaman yang berisi tabel pertemuan
2. Hitung jumlah baris

**Expected Result:**
- Semua pertemuan muncul
- Termasuk UTS dan UAS
- Total bobot 100% ditampilkan

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### C6. Tabel multi-halaman tidak terpotong

**Test Steps:**
1. Cek tabel pertemuan yang span ke halaman berikutnya
2. Perhatikan page break

**Expected Result:**
- Row tidak terpotong di tengah
- Page break terjadi di antara baris
- Tabel tetap readable

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### C7. Font konsisten

**Test Steps:**
1. Cek semua halaman PDF
2. Perhatikan font

**Expected Result:**
- Font Times New Roman (atau serif similar)
- Tidak ada kotak/karakter aneh
- Tidak ada font fallback yang jelas

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### C8. Ukuran halaman A4

**Test Steps:**
1. Buka PDF
2. Cek page properties (di PDF reader)

**Expected Result:**
- Page size: 210×297mm
- Atau 8.27×11.69 inches
- Bukan Letter atau ukuran lain

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Measured Size:**
**Notes:**

---

### C9. Export RPS versi lama (superseded)

**Test Steps:**
1. Buat versi baru RPS, approve
2. Versi lama sekarang status `superseded`
3. Coba export versi lama

**Expected Result:**
- Export versi lama diblokir
- Atau hanya versi `approved` terbaru yang bisa diexport
- Error message jelas

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Notes:**

---

### C10. Puppeteer timeout pada dokumen panjang

**Test Steps:**
1. Buat RPS dengan sangat banyak data
2. Panggil export PDF
3. Tunggu proses

**Expected Result:**
- Tidak error 500
- Ada timeout handler yang graceful
- Atau selesai dalam waktu reasonable (<30 detik)

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Time Taken:** seconds
**Notes:**

---

## D. Security & State Guards

### D1. Dosen lain akses print RPS milik dosen lain

**Test Steps:**
1. Login sebagai Dosen A
2. Coba akses `/rps/[id]/print` untuk RPS milik Dosen B
3. Pastikan bukan role admin/kaprodi/rmk

**Expected Result:**
- Return 403 Forbidden
- Atau redirect dengan pesan jelas
- Data tidak bocor

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### D2. Koordinator RMK akses print approved RPS

**Test Steps:**
1. Login sebagai Koordinator RMK
2. Akses `/rps/[id]/print` untuk RPS dalam RMKnya
3. Pastikan RPS sudah approved

**Expected Result:**
- Bisa akses (reviewer boleh lihat)
- Halaman print tampil lengkap

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Screenshot:** (lampirkan)
**Notes:**

---

### D3. Admin akses export semua RPS

**Test Steps:**
1. Login sebagai admin
2. Coba export PDF untuk RPS siapa pun

**Expected Result:**
- Bisa export semua RPS
- Atau sesuai kebijakan permission admin

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Notes:**

---

### D4. Session expired saat generate PDF

**Test Steps:**
1. Mulai proses export PDF
2. Selama proses, invalidate session (hapus token/cookie)
3. Tunggu response

**Expected Result:**
- Server tidak crash
- Return 401 dengan error message bersih
- Tidak ada zombie process atau memory leak

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Server Logs:** (lampirkan jika ada error)
**Notes:**

---

### D5. RPS dengan pertemuan 0 baris dipaksa export

**Test Steps:**
1. Buat RPS approved tapi tidak ada pertemuan sama sekali
2. Coba export PDF

**Expected Result:**
- Validasi menolak
- Atau PDF berisi tabel kosong yang informatif
- Tidak crash/error 500

**Actual Result:** |
**Pass/Fail:** ☐ Pass / ☐ Fail / ☐ Blocked
**Notes:**

---

## Summary

### Total Test Cases: 36
- Passed: ☐ / 36
- Failed: ☐ / 36
- Blocked: ☐ / 36
- Not Executed: ☐ / 36

### Critical Issues (Blocker):
1. (list jika ada)

### High Priority Issues:
1. (list jika ada)

### Medium Priority Issues:
1. (list jika ada)

### Low Priority / Enhancement:
1. (list jika ada)

---

## Sign-Off

### Tested By:
**Name:**
**Role:**
**Date:**

### Reviewed By:
**Name:**
**Role:**
**Date:**

### Approved By:
**Name:**
**Role:**
**Date:**

---

**Status:**
☐ **Code-Level Pass** — TypeScript compiles, files exist
☐ **Feature Sign-Off** — Semua test pass + documented
☐ **Retest Required** — Issue found, perlu perbaikan

**Next Steps:**
- Jika "Code-Level Pass": Jalankan semua test case di atas
- Jika "Retest Required": Perbaiki issue, lalu re-test
- Jika "Feature Sign-Off": Fitur siap release
