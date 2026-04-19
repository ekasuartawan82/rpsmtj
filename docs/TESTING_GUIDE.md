# Quick Reference: Testing RPS Print & PDF Export

## Status Saat Ini: ⚠️ CODE-LEVEL PASS, FEATURE-LEVEL RETEST REQUIRED

### Apa yang sudah selesai:
- ✅ TypeScript compilation successful
- ✅ Database structure updated
- ✅ API routes created
- ✅ UI components built
- ✅ PDF generator service implemented

### Apa yang BELUM teruji:
- ❌ Functional testing
- ❌ Integration testing
- ❌ End-to-end validation
- ❌ Security guards verification
- ❌ PDF generation in production environment

---

## Panduan UAT Cepat

### 1. Setup Environment

```bash
# Pastikan server berjalan
npm run dev

# Pastikan database terupdate
npx prisma migrate deploy

# Cek Puppeteer dependencies
npm list puppeteer
```

### 2. Siapkan Data Test

```sql
-- Buat RPS test dengan data lengkap di database
-- Pastikan:
-- - Status: approved
-- - CPL, CPMK, Sub-CPMK terisi
-- - Tabel pertemuan 16 minggu lengkap
-- - Total bobot = 100%
-- - Ada UTS (minggu 8) dan UAS (minggu 16)
```

### 3. Jalankan Test Script

```bash
# Automated test (basic)
./scripts/test-rps-export.sh <rps_id>

# Contoh
./scripts/test-rps-export.sh "abc-123-def-456"
```

### 4. Manual Testing - Checklist

#### A. Tabel Pertemuan (UI)
- [ ] Buka halaman detail RPS
- [ ] Klik "Tambah Pertemuan"
- [ ] Test input minggu tunggal: "1"
- [ ] Test input minggu gabungan: "4,5"
- [ ] Test auto-detect UTS untuk minggu "8"
- [ ] Test auto-detect UAS untuk minggu "16"
- [ ] Test validasi total bobot < 100%
- [ ] Test validasi total bobot = 100%
- [ ] Test validasi total bobot > 100%
- [ ] Test urutan pertemuan setelah edit

#### B. Print Preview
- [ ] Buka `/rps/<rps_id>/print`
- [ ] Cek header institusi
- [ ] Cek identitas MK lengkap
- [ ] Cek CPL, CPMK, Sub-CPMK
- [ ] Cek matriks korelasi
- [ ] Cek tabel pertemuan 16 minggu
- [ ] Tekan Ctrl+P untuk print
- [ ] Cek page break tidak memotong baris
- [ ] Save as PDF dari browser

#### C. PDF Export (API)
- [ ] Panggil `POST /api/rps/<rps_id>/export/pdf`
- [ ] Cek HTTP status = 200
- [ ] Cek Content-Type = application/pdf
- [ ] Download file
- [ ] Buka file di PDF reader
- [ ] Cek semua halaman
- [ ] Cek font dan layout
- [ ] Cek ukuran A4

#### D. Security
- [ ] Test akses tanpa login
- [ ] Test akses user lain (bukan pemilik)
- [ ] Test akses koordinator RMK
- [ ] Test akses admin
- [ ] Test export RPS draft (harus gagal)
- [ ] Test export RPS superseded (harus gagal)

---

## Common Issues & Troubleshooting

### Issue: "RPS harus sudah disetujui"
**Cause:** RPS status bukan `approved`
**Fix:** Lakukan workflow approval sampai status = `approved`

### Issue: "Total bobot penilaian saat ini X%, harus 100%"
**Cause:** Total bobot pertemuan reguler ≠ 100
**Fix:** Cek kembali bobot di setiap pertemuan

### Issue: PDF tidak ter-generate
**Cause:** Puppeteer tidak terinstall atau chromium missing
**Fix:**
```bash
# Reinstall puppeteer
npm uninstall puppeteer
npm install puppeteer

# Di Ubuntu/Debian, install dependencies:
sudo apt-get install libnss3 libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2
```

### Issue: Print preview blank
**Cause:** Data RPS tidak lengkap
**Fix:** Pastikan CPL, CPMK, Sub-CPMK, dan tabel pertemuan terisi

### Issue: Auth error saat export
**Cause:** Session expired atau permission tidak cukup
**Fix:** Login ulang, pastikan user memiliki akses

---

## Debug Tips

### 1. Cek Database
```sql
-- Cek status RPS
SELECT id, status, "mataKuliahId"
FROM rps
WHERE id = '<rps_id>';

-- Cek pertemuan
SELECT "orderNo", "weekLabel", tipe, "bobotPenilaianPersen"
FROM "rps_pertemuan"
WHERE "rpsId" = '<rps_id>'
ORDER BY "orderNo";

-- Hitung total bobot
SELECT SUM("bobotPenilaianPersen")
FROM "rps_pertemuan"
WHERE "rpsId" = '<rps_id>' AND tipe = 'reguler';
```

### 2. Cek API Response
```bash
# Test print preview
curl -i http://localhost:3000/rps/<rps_id>/print

# Test export (perlu session cookie)
curl -i -X POST http://localhost:3000/api/rps/<rps_id>/export/pdf \
  -H "Cookie: <your-session-cookie>"
```

### 3. Enable Debug Logs
```typescript
// Di API route, tambahkan:
console.log('[DEBUG] RPS Data:', JSON.stringify(rps, null, 2));
console.log('[DEBUG] Pertemuan Data:', JSON.stringify(pertemuanData, null, 2));
```

---

## Next Steps

### Setelah UAT Selesai:
1. ✅ Semua test di checklist tercentang
2. 📸 Screenshot/lampirkan bukti tiap test
3. 🐛 Issue yang ditemukan diperbaiki
4. 🔄 Re-test setelah perbaikan
5. ✅ Sign-off document

### Setelah Sign-Off:
- Fitur siap untuk production
- Dokumentasi bisa digunakan oleh user
- Maintenance mode bisa dimatikan

---

## Kontak & Support

**Technical Lead:** [Name]
**QA Lead:** [Name]
**Product Owner:** [Name]

**Dokumentasi Lengkap:**
- `docs/IMPLEMENTATION_TABEL_PERTEMUAN.md`
- `docs/IMPLEMENTASI_PDF_EXPORT.md`
- `docs/SMOKE_TEST_CHECKLIST_PHASE1_DOCUMENT_ENGINE.md`
- `docs/UAT_CHECKLIST_TABEL_PERTEMUAN_PDF.md`

---

**Status Document:** v1.0
**Last Updated:** 2026-04-18
