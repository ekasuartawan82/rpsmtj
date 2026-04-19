# Smoke Test Checklist - Fase 1 Production Document Engine

Dokumen ini adalah QA gate runtime untuk Fase 1 production document engine RPS. Status `typecheck` atau code review yang hijau tidak cukup untuk menyatakan Fase 1 lulus tanpa bukti smoke test ini.

## Dokumen Uji Minimal

- `DOC-A`: RPS pendek
- `DOC-B`: RPS panjang / multi-page
- `DOC-C`: edge-case document

Contoh edge case yang disarankan:
- banyak field opsional kosong tetapi masih valid
- approval history panjang
- kombinasi ETS/EAS dan tabel padat

## Urutan Eksekusi

1. Logo enforcement
2. Validation gate
3. Feature flag rollback
4. Preview vs PDF parity
5. Multi-page PDF behavior
6. Asset/style determinism

## Cara Mengisi

- `Actual`: tulis observasi faktual, bukan ringkasan umum.
- `Verdict`: gunakan salah satu nilai `PASS`, `CONDITIONAL PASS`, `FAIL`, atau `KNOWN LIMITATION`.
- `Notes`: sertakan bukti, dugaan akar masalah, dan rekomendasi singkat bila perlu.

Hindari menulis `OK` atau `aman` tanpa bukti.

## Bukti Minimum

- 1 screenshot preview HTML
- 1 screenshot PDF halaman 1
- 1 screenshot PDF halaman >1
- 1 file PDF untuk `DOC-B`
- log singkat yang membuktikan feature flag memakai jalur baru dan legacy

## Template Eksekusi

Duplikasi tabel ini untuk setiap dokumen uji bila diperlukan.

| ID | Scenario | Expected | Actual | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| ST-01 | Logo tersedia, preview HTML | Preview tampil normal |  |  |  |
| ST-02 | Logo tersedia, PDF export | PDF terbentuk dan logo tampil |  |  |  |
| ST-03 | Logo tidak ada, preview HTML | Preview tetap tampil |  |  |  |
| ST-04 | Logo tidak ada, PDF export | Export gagal dengan pesan jelas |  |  |  |
| ST-05 | Tanpa CPL | PDF ditolak |  |  |  |
| ST-06 | Tanpa CPMK/Sub-CPMK | PDF ditolak |  |  |  |
| ST-07 | Tanpa pertemuan | PDF ditolak |  |  |  |
| ST-08 | Bobot != 100% | PDF ditolak dan menyebut total aktual |  |  |  |
| ST-09 | Flag=1, preview | Memakai engine baru |  |  |  |
| ST-10 | Flag=1, PDF | Memakai engine baru |  |  |  |
| ST-11 | Flag=0, preview | Memakai legacy path |  |  |  |
| ST-12 | Flag=0, PDF | Memakai legacy path |  |  |  |
| ST-13 | Parity (pendek) | Struktur dan styling inti sama |  |  |  |
| ST-14 | Parity (panjang) | Source render sama |  |  |  |
| ST-15 | Parity (edge) | Konsisten |  |  |  |
| ST-16 | Multi-page 10+ hlm | PDF > 1 halaman dan tidak kosong |  |  |  |
| ST-17 | Header/footer running | Muncul di semua halaman |  |  |  |
| ST-18 | Tabel panjang | Tidak overflow brutal |  |  |  |
| ST-19 | A4 landscape + margin | Benar di output |  |  |  |
| ST-20 | Inline style (preview) | Tidak tergantung app CSS |  |  |  |
| ST-21 | Style (PDF) | Stabil terhadap preview |  |  |  |
| ST-22 | Asset + header/footer | Stabil, tidak sporadis |  |  |  |
| ST-23 | Font fallback | Tidak merusak layout |  |  |  |
| ST-24 | Sanity output | Buffer valid, ukuran file wajar |  |  |  |
| ST-25 | Access control | Sesuai role dan policy |  |  |  |

## Panduan Penilaian

- `PASS`: sesuai expected tanpa catatan berarti
- `CONDITIONAL PASS`: fungsi inti benar, ada gap kecil non-blocking
- `FAIL`: fungsi inti tidak sesuai atau menyesatkan
- `KNOWN LIMITATION`: perilaku diterima sementara dan sudah didokumentasikan

## Kriteria Lulus Fase 1

Fase 1 dinyatakan `clean PASS` jika seluruh item wajib berikut lulus:

- `ST-02`
- `ST-04`
- `ST-05` s.d. `ST-08`
- `ST-09` s.d. `ST-12`
- `ST-13` dan `ST-14`
- `ST-16` s.d. `ST-19`

## Batas Kondisional

- Maksimal `3` item boleh berstatus `CONDITIONAL PASS`
- Item yang boleh `CONDITIONAL PASS`:
  - `ST-15`
  - `ST-21` s.d. `ST-23`

## Kondisi Gagal

Fase 1 dinyatakan belum lulus jika terjadi salah satu dari kondisi berikut:

- Ada `FAIL` pada item wajib
- Ada `3` atau lebih `CONDITIONAL PASS`
- Ada `KNOWN LIMITATION` tanpa mitigasi tertulis

## Catatan QA Gate

- `Typecheck` hijau tidak sama dengan lulus QA.
- Preview boleh tampil, tetapi PDF adalah artefak resmi; jika PDF gagal pada skenario wajib, status tetap `FAIL`.
- Perbedaan kecil pagination dapat diterima, tetapi tidak boleh mengubah isi, urutan section, atau styling inti dokumen.
- Jika preview menampilkan data yang tidak bisa diekspor ke PDF final, catat warning non-blocking itu di `ST-03`.
