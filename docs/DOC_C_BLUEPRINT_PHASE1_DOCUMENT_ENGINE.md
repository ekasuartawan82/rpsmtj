# DOC-C Blueprint - Fase 1 Production Document Engine

Dokumen ini mendefinisikan `DOC-C` sebagai edge-case document resmi untuk menutup `ST-15` pada smoke test Fase 1. `DOC-C` bukan dokumen invalid. Ia harus tetap lolos export, tetapi sengaja dirancang untuk menekan titik lemah layout, parity, fallback, dan page behavior.

## Tujuan

`DOC-C` dipakai untuk menguji apakah document engine tetap stabil ketika menghadapi kombinasi kondisi yang legal tetapi berat:

- parity preview vs PDF
- wrapping tabel
- page break
- fallback field kosong
- approval history panjang
- relasi data yang legal tetapi tidak ideal
- derivasi `bentukPembelajaranDaring`

## Constraint Utama

`DOC-C` harus memenuhi semua syarat berikut:

1. Tetap valid untuk export
2. Bukan dokumen gagal validasi
3. Menggabungkan beberapa pressure case sekaligus
4. Masih realistis sebagai dokumen RPS lapangan

## Basis Dokumen

Jangan mulai dari nol jika tidak perlu.

Gunakan satu RPS approved yang sudah stabil sebagai basis, lalu modifikasi menjadi edge-case legal:

- status: `approved`
- punya `CPL`, `CPMK`, `Sub-CPMK` lengkap
- punya tabel pertemuan `1–16`
- total bobot reguler = `100`
- lolos preview HTML dan export PDF

## Komposisi Minimal DOC-C

`DOC-C` minimal harus memuat:

- `16` pertemuan
- `3` row sangat panjang
- `2` row dengan banyak field kosong tetapi legal
- `1` row `ETS`
- `1` row `EAS`
- `1` row yang mengandalkan `bentukPembelajaranDaring` JSON tanpa override manual
- `6–8` approval history entries
- `6` pustaka dengan variasi panjang
- `5–6` CPL
- `5–6` CPMK
- `10+` Sub-CPMK

## Blueprint Per Section

### 1. Identitas Dokumen

Gunakan identitas normal dan legal:

- mata kuliah aktif dan nyata
- kode MK pendek-normal
- tahun akademik normal
- status tetap `approved`
- versi tetap sah

Jangan buat identitas absurd. Pressure test harus datang dari isi dokumen, bukan dari nama yang aneh.

### 2. CPL Prodi

Target:

- `5–6` CPL dibebankan
- campuran deskripsi pendek dan panjang
- setidaknya `2` CPL dengan deskripsi panjang satu paragraf penuh

Tujuan:

- menekan section list awal
- memicu kemungkinan pindah halaman sebelum CPMK

### 3. CPMK

Target:

- `5–6` CPMK
- setiap CPMK tetap terkait ke satu atau lebih CPL
- panjang deskripsi tidak seragam

Distribusi yang disarankan:

- `2` CPMK dengan deskripsi pendek
- `2` CPMK dengan deskripsi menengah
- `1–2` CPMK dengan deskripsi panjang

### 4. Sub-CPMK

Target:

- minimal `10` item
- tersebar di semua CPMK
- panjang deskripsi campuran

Distribusi yang disarankan:

- `4` sub-CPMK pendek
- `3` sub-CPMK menengah
- `3+` sub-CPMK panjang

Tujuan:

- memaksa section `Sub-CPMK` dan `Matriks` menjadi non-trivial
- menguji kesinambungan page break sebelum tabel pertemuan

### 5. Matriks CPL - Sub-CPMK

Pastikan matriks tetap legal dan tidak kosong:

- tiap sub-CPMK punya minimal satu korelasi
- ada variasi target ketercapaian
- tidak semua persentase identik

Tujuan:

- membuat matriks cukup padat untuk diuji wrapping dan alignment

### 6. Pustaka

Gunakan `6` referensi dengan komposisi berikut:

- `2` referensi pendek
- `2` referensi sangat panjang
- `1` referensi multi-penulis
- `1` referensi regulasi/peraturan

Distribusi yang disarankan:

1. buku pendek biasa
2. artikel pendek
3. buku panjang dengan subjudul panjang
4. artikel/prosiding dengan judul sangat panjang
5. multi-author reference
6. peraturan/regulasi resmi

Tujuan:

- menguji wrapping daftar pustaka
- memastikan numbering atau alignment tidak berantakan

### 7. Approval History

Target:

- `6–8` entry
- urutan harus masuk akal secara workflow

Pola yang disarankan:

1. submit awal
2. revisi reviewer pertama
3. submit ulang
4. revisi reviewer kedua
5. submit ulang
6. approval reviewer
7. approval akhir
8. optional: event superseded / version follow-up jika model mendukung tanpa merusak status export

Tujuan:

- menekan section history
- memverifikasi history tidak hilang di preview atau PDF
- menguji page break setelah section panjang

## Blueprint Tabel Pertemuan 1–16

### Aturan Umum

Gunakan campuran label minggu berikut:

- `1`
- `2`
- `4,5`
- `6,7`
- `8` sebagai `ETS`
- `9`
- `10`
- `11`
- `12`
- `13`
- `14,15`
- `16` sebagai `EAS`

Jika sistem tetap menyimpan `16` row, label gabungan boleh muncul di beberapa row sambil mempertahankan `orderNo` unik.

### Distribusi Wajib

- `3` row sangat panjang
- `2` row dengan banyak field kosong legal
- `1` row derived `bentukPembelajaranDaring`
- `1` row `ETS`
- `1` row `EAS`

### Row Pressure Case

#### Row Panjang 1

Gunakan satu row reguler awal, misalnya minggu `4,5`.

Isi:

- `indikatorPenilaian`: `4–5` butir, masing-masing cukup panjang
- `kriteriaPenilaian`: panjang
- `materiPembelajaran`: panjang
- `penugasanMahasiswa`: panjang
- `notes`: terisi

Tujuan:

- memicu wrapping awal tabel
- menguji apakah satu row panjang tetap terbaca

#### Row Panjang 2

Gunakan satu row reguler tengah, misalnya minggu `10`.

Isi:

- `indikatorPenilaian`: panjang
- `metodePembelajaran`: lebih dari satu item
- `bentukPembelajaranLuring`: beberapa item
- `materiPembelajaran`: paragraf panjang
- `deskripsiEvaluasi`: terisi

Tujuan:

- menekan kombinasi list + teks panjang di tengah tabel

#### Row Panjang 3

Gunakan satu row reguler akhir, misalnya minggu `14,15`.

Isi:

- `indikatorPenilaian`: panjang
- `kriteriaPenilaian`: panjang
- `penugasanMahasiswa`: panjang
- `materiPembelajaran`: sangat panjang
- `notes`: terisi

Tujuan:

- menguji row panjang dekat transisi halaman akhir

### Row Kosong Legal 1

Gunakan satu row reguler, misalnya minggu `2`.

Isi:

- `notes = null`
- `deskripsiEvaluasi = null`
- `bentukPembelajaranDaring = []`
- `pustakaRefs = []`
- `penugasanMahasiswa = null`

Tetap pastikan:

- `subCpmkId` ada
- row tetap valid

Tujuan:

- menguji fallback kosong tanpa placeholder kacau

### Row Kosong Legal 2

Gunakan satu row reguler lain, misalnya minggu `11`.

Isi:

- `notes = null`
- `deskripsiEvaluasi = null`
- `bentukPembelajaranDaring = []`
- sebagian besar field opsional kosong
- `subCpmkText = null`, tetapi `subCpmkId` tetap ada

Tujuan:

- memastikan template memakai relasi yang benar
- tidak memunculkan fallback yang berisik

### Row Derived Bentuk Pembelajaran Daring

Gunakan satu row reguler, misalnya minggu `9`.

Isi:

- `bentukPembelajaranDaring = ["LMS", "Video Conference", "Diskusi Asinkron"]`
- field legacy/manual override daring kosong
- row lain tetap normal

Tujuan:

- memastikan derive logic benar-benar muncul di output preview dan PDF
- menutup risiko silent data loss

### Row ETS

Gunakan minggu `8`.

Isi:

- tipe `ETS`
- styling dan label harus tetap berbeda dari reguler
- konten tidak harus sepanjang row pressure case

Tujuan:

- memverifikasi row `ETS` tidak dirender seperti reguler biasa

### Row EAS

Gunakan minggu `16`.

Isi:

- tipe `EAS`
- styling dan label harus berbeda dari reguler

Tujuan:

- memverifikasi row `EAS` tetap benar pada halaman akhir

## Tiga Pembacaan ST-15

### ST-15A - Preview Structure

Expected:

- semua section muncul
- field kosong legal tidak merusak layout
- row panjang tetap terbaca
- approval history tampil utuh

### ST-15B - PDF Parity

Expected:

- urutan section sama
- row `ETS` dan `EAS` tetap benar
- pustaka tidak hilang
- approval history tidak hilang atau berubah urutan
- row derived `bentukPembelajaranDaring` muncul

### ST-15C - Page Behavior

Expected:

- page break tetap masuk akal
- heading section tidak yatim
- tabel tidak terpotong brutal
- running header/footer tetap stabil setelah section panjang

## Kondisi FAIL DOC-C

Anggap `FAIL` bila salah satu ini terjadi:

1. Preview tampil, tetapi PDF kehilangan sebagian data
2. Approval history hilang atau berubah urutan
3. Row tabel panjang membuat kolom tidak terbaca
4. `bentukPembelajaranDaring` derived tidak muncul di output
5. Field kosong legal memunculkan placeholder kacau
6. `ETS` atau `EAS` dirender seperti reguler tanpa pembeda
7. Running header/footer rusak setelah section panjang

## Strategi Eksekusi yang Disarankan

Gunakan dokumen approved yang sudah stabil sebagai basis, lalu:

1. clone atau siapkan varian uji
2. tambahkan pressure case di atas
3. pastikan dokumen tetap lolos export
4. jalankan `ST-15A`, `ST-15B`, `ST-15C`
5. simpan artefak preview HTML dan PDF

## Deliverable Minimal

Saat `DOC-C` dieksekusi, QA harus menyimpan:

- `1` preview HTML
- `1` PDF hasil export
- `1` catatan parity preview vs PDF
- `1` catatan page behavior
- `1` verdict akhir untuk `ST-15A/B/C`

## Catatan

`DOC-C` tidak boleh dibuat terlalu absurd. Nilainya justru datang dari fakta bahwa ia:

- sah untuk diexport
- terasa seperti dokumen nyata
- tetapi berada di tepi kemampuan engine

Jika perlu, `DOC-C` boleh dibangun dari `DOC-A` yang diperluas, selama seluruh pressure case di dokumen ini benar-benar terpenuhi.

Dataset tetap untuk instantiate:
- `docs/DOC_C_DATASET_PHASE1_DOCUMENT_ENGINE.md`
