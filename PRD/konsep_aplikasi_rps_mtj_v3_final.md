# Konsep Aplikasi Manajemen RPS — Versi Final
## Program Studi D3 Manajemen Transportasi Jalan — Politeknik Transportasi Darat Bali
**Versi:** 3.0 — FINAL untuk Developer Handoff
**Status:** CLOSED — semua blocker QC telah diselesaikan
**Tanggal:** April 2026

---

## Daftar Keputusan Desain yang Sudah Dikunci

Semua item berikut adalah keputusan final. Developer tidak boleh menginterpretasikan ulang tanpa persetujuan Ka Prodi.

| # | Keputusan | Nilai |
|---|-----------|-------|
| D-01 | Entitas unik RPS | Satu MK + satu tahun akademik = satu RPS approved. Semua kelas paralel dan semua pengampu menggunakan RPS yang sama. |
| D-02 | Koordinator RMK | Node approval aktif, bukan metadata. Wajib mereview dan memberikan keputusan sebelum naik ke Ka Prodi. |
| D-03 | Versioning | Requirement inti. Versi approved adalah immutable snapshot. |
| D-04 | Perilaku revisi pasca-reject | Ketika dosen memulai edit setelah reject, sistem melakukan clone ke versi baru. |
| D-05 | RTM multi-minggu | Satu RTM dapat terhubung ke lebih dari satu minggu via junction table. |
| D-06 | Scope v1.0 | Fondasi tata kelola dokumen RPS yang disiapkan untuk ekspansi ke sistem mutu pembelajaran. Bukan sistem mutu terintegrasi. |
| D-07 | Ekspor | PDF wajib dengan acceptance criteria terdefinisi. DOCX opsional bersyarat. |
| D-08 | Standardisasi template | Inkonsistensi redaksional template lama (Desen, Diskripsi, Kreteria) dibersihkan dalam sistem baru. |
| D-09 | Notifikasi v1.0 | In-app notification cukup untuk v1.0. Email masuk backlog v1.1. |

---

## 0. Pernyataan Scope

Aplikasi ini adalah **sistem tata kelola dokumen RPS** — mengelola penyusunan, validasi, persetujuan tiga-tahap, versioning, dan produksi dokumen RPS sesuai format FR.09.049 Poltrada Bali.

Yang berada dalam scope v1.0: input, validasi, approval, versioning, ekspor.

Yang tidak dalam scope v1.0 tetapi schema-nya disiapkan sejak sekarang: monitoring ketercapaian CPMK, rekaman realisasi pertemuan, evaluasi pasca-semester, dashboard mutu lintas prodi.

---

## 1. Model Domain — Entitas dan Relasinya

### 1.1 Prinsip Entitas RPS

Satu dokumen RPS merepresentasikan satu mata kuliah pada satu tahun akademik. Tidak ada RPS per kelas, per rombel, atau per dosen pengampu. Jika ada dua dosen yang mengampu MK yang sama di semester yang sama, mereka menggunakan RPS yang sama — salah satu menjadi Pengembang, yang lain terdaftar sebagai Pengampu Tambahan.

Constraint database yang mengimplementasikan prinsip ini:

```sql
-- Hanya satu RPS berstatus 'approved' per MK per tahun akademik
CREATE UNIQUE INDEX uq_rps_approved
  ON rps (mata_kuliah_id, tahun_akademik)
  WHERE (status = 'approved');
```

### 1.2 Schema Database Final

```sql
-- ============================================================
-- MASTER DATA
-- ============================================================

CREATE TABLE kurikulum_versi (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tahun         VARCHAR(9) NOT NULL,       -- misal: "2025"
  label         VARCHAR NOT NULL,          -- misal: "Kurikulum 2025"
  is_active     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama          VARCHAR NOT NULL,
  nidn          VARCHAR UNIQUE,
  email         VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role          VARCHAR NOT NULL
                CHECK (role IN ('dosen','koordinator_rmk','kaprodi','admin')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rumpun_mk (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama  VARCHAR NOT NULL
);

CREATE TABLE mata_kuliah (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode                VARCHAR UNIQUE NOT NULL,
  nama                VARCHAR NOT NULL,
  rumpun_id           UUID REFERENCES rumpun_mk,
  sks_teori           INTEGER NOT NULL DEFAULT 0 CHECK (sks_teori >= 0),
  sks_praktik         INTEGER NOT NULL DEFAULT 0 CHECK (sks_praktik >= 0),
  semester            INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 6),
  kurikulum_versi_id  UUID NOT NULL REFERENCES kurikulum_versi,
  is_active           BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE cpl_prodi (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kurikulum_versi_id  UUID NOT NULL REFERENCES kurikulum_versi,
  kode                VARCHAR NOT NULL,     -- misal: S1, P3, KU2, KK5
  kategori            VARCHAR NOT NULL
                      CHECK (kategori IN ('S','P','KU','KK')),
  deskripsi           TEXT NOT NULL,
  urutan              INTEGER,
  UNIQUE (kurikulum_versi_id, kode)
);

-- ============================================================
-- DOKUMEN RPS
-- ============================================================

CREATE TABLE rps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mata_kuliah_id      UUID NOT NULL REFERENCES mata_kuliah,
  kurikulum_versi_id  UUID NOT NULL REFERENCES kurikulum_versi,
  tahun_akademik      VARCHAR NOT NULL
                      CHECK (tahun_akademik ~ '^\d{4}/\d{4}$'),

  tanggal_penyusunan  DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Otorisasi (tiga aktor wajib)
  dosen_pengembang_id UUID NOT NULL REFERENCES users,
  koordinator_rmk_id  UUID NOT NULL REFERENCES users,
  kaprodi_id          UUID NOT NULL REFERENCES users,

  -- Konten
  deskripsi_singkat   TEXT,
  bahan_kajian        TEXT,
  catatan_tambahan    TEXT,

  -- Versioning
  version_no          INTEGER NOT NULL DEFAULT 1,
  parent_rps_id       UUID REFERENCES rps(id),  -- NULL = versi pertama

  -- Status lifecycle
  status              VARCHAR NOT NULL DEFAULT 'draft'
                      CHECK (status IN (
                        'draft',
                        'submitted_to_rmk',
                        'revision_requested_by_rmk',
                        'approved_by_rmk',
                        'submitted_to_kaprodi',
                        'revision_requested_by_kaprodi',
                        'approved',
                        'superseded'
                      )),

  created_by          UUID NOT NULL REFERENCES users,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint: hanya satu RPS approved per MK per tahun akademik
CREATE UNIQUE INDEX uq_rps_approved
  ON rps (mata_kuliah_id, tahun_akademik)
  WHERE (status = 'approved');

-- Dosen pengampu (bisa lebih dari satu; pengembang selalu ada di tabel ini juga)
CREATE TABLE rps_dosen_pengampu (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_id      UUID NOT NULL REFERENCES rps,
  user_id     UUID NOT NULL REFERENCES users,
  is_pengembang BOOLEAN NOT NULL DEFAULT false,
  urutan      INTEGER,
  UNIQUE (rps_id, user_id)
);

-- ============================================================
-- CAPAIAN PEMBELAJARAN
-- ============================================================

-- CPL yang dibebankan pada MK ini (snapshot saat RPS dibuat)
CREATE TABLE rps_cpl (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_id      UUID NOT NULL REFERENCES rps,
  cpl_id      UUID NOT NULL REFERENCES cpl_prodi,
  urutan      INTEGER,
  UNIQUE (rps_id, cpl_id)
);

CREATE TABLE rps_cpmk (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_id      UUID NOT NULL REFERENCES rps,
  kode        VARCHAR NOT NULL,
  deskripsi   TEXT NOT NULL,
  urutan      INTEGER NOT NULL
);

-- Relasi CPMK → CPL (satu CPMK bisa mengacu ke lebih dari satu CPL)
CREATE TABLE rps_cpmk_cpl (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_cpmk_id UUID NOT NULL REFERENCES rps_cpmk,
  rps_cpl_id  UUID NOT NULL REFERENCES rps_cpl,
  UNIQUE (rps_cpmk_id, rps_cpl_id)
);

CREATE TABLE rps_sub_cpmk (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_id          UUID NOT NULL REFERENCES rps,
  rps_cpmk_id     UUID NOT NULL REFERENCES rps_cpmk,
  kode            VARCHAR NOT NULL,
  deskripsi       TEXT NOT NULL,
  urutan          INTEGER NOT NULL,

  -- Nullable di v1.0; digunakan di v1.1 untuk monitoring ketercapaian
  target_ketercapaian_persen  DECIMAL(5,2),
  aktual_ketercapaian_persen  DECIMAL(5,2)
);

-- Matriks korelasi Sub-CPMK ↔ CPL
CREATE TABLE rps_korelasi_cpl (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_sub_cpmk_id UUID NOT NULL REFERENCES rps_sub_cpmk,
  rps_cpl_id      UUID NOT NULL REFERENCES rps_cpl,
  persentase      DECIMAL(5,2) NOT NULL DEFAULT 0
                  CHECK (persentase >= 0 AND persentase <= 100),
  UNIQUE (rps_sub_cpmk_id, rps_cpl_id)
);

-- ============================================================
-- TABEL MINGGUAN
-- ============================================================

CREATE TABLE rps_pertemuan (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_id                  UUID NOT NULL REFERENCES rps,
  minggu_ke               INTEGER NOT NULL CHECK (minggu_ke BETWEEN 1 AND 16),
  tipe                    VARCHAR NOT NULL DEFAULT 'reguler'
                          CHECK (tipe IN ('reguler','ets','eas')),

  -- Kolom untuk tipe 'reguler' (NULL untuk ets/eas)
  sub_cpmk_id             UUID REFERENCES rps_sub_cpmk,
  indikator_penilaian     JSONB,     -- array of string
  teknik_penilaian        VARCHAR
                          CHECK (teknik_penilaian IN ('test','non_test')),
  kriteria_penilaian      VARCHAR
                          CHECK (kriteria_penilaian IN (
                            'rubrik_holistik',
                            'rubrik_deskriptif',
                            'marking_scheme'
                          )),
  metode_pembelajaran     JSONB,     -- array: kuliah|diskusi|sgd|pbl|dll
  catatan_penugasan       VARCHAR,   -- misal: "Tugas-3"
  pb_formula              VARCHAR,   -- misal: "1x(2x50')"
  pt_formula              VARCHAR,   -- misal: "1mgx(2sksx60')"
  km_formula              VARCHAR,
  bentuk_daring           TEXT,
  materi_pembelajaran     TEXT,
  bobot_penilaian_persen  DECIMAL(5,2),

  -- Kolom untuk tipe 'ets' dan 'eas'
  deskripsi_evaluasi      TEXT,

  -- Kolom v1.1 — monitoring realisasi (nullable di v1.0)
  status_pelaksanaan      VARCHAR
                          CHECK (status_pelaksanaan IN (
                            'terlaksana','tidak_terlaksana','diganti'
                          )),
  materi_aktual           TEXT,
  catatan_deviasi         TEXT,
  tanggal_pelaksanaan     DATE,

  UNIQUE (rps_id, minggu_ke)
);

-- ============================================================
-- PUSTAKA
-- ============================================================

CREATE TABLE rps_pustaka (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_id        UUID NOT NULL REFERENCES rps,
  kategori      VARCHAR NOT NULL CHECK (kategori IN ('utama','pendukung')),
  teks_lengkap  TEXT NOT NULL,
  urutan        INTEGER
);

-- ============================================================
-- RENCANA TUGAS MAHASISWA
-- ============================================================

CREATE TABLE rps_rtm (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_id                UUID NOT NULL REFERENCES rps,
  nomor_tugas           VARCHAR NOT NULL,  -- harus match ke catatan_penugasan
  judul_tugas           VARCHAR NOT NULL,
  sub_cpmk_id           UUID NOT NULL REFERENCES rps_sub_cpmk,
  metode_penugasan      VARCHAR NOT NULL
                        CHECK (metode_penugasan IN (
                          'terstruktur','mandiri','akhir'
                        )),
  deskripsi             TEXT,
  langkah_pengerjaan    TEXT,
  bentuk_luaran         TEXT,
  indikator_penilaian   TEXT,
  bobot_internal_persen DECIMAL(5,2),
  jadwal_pelaksanaan    TEXT,
  catatan               TEXT,
  daftar_rujukan        TEXT
);

-- Junction table: satu RTM dapat direferensikan di banyak minggu
CREATE TABLE rps_rtm_pertemuan (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_rtm_id      UUID NOT NULL REFERENCES rps_rtm,
  rps_pertemuan_id UUID NOT NULL REFERENCES rps_pertemuan,
  keterangan      VARCHAR,   -- misal: "mulai", "pengumpulan", "presentasi"
  UNIQUE (rps_rtm_id, rps_pertemuan_id)
);

-- ============================================================
-- WORKFLOW DAN AUDIT TRAIL
-- ============================================================

CREATE TABLE rps_approval_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rps_id          UUID NOT NULL REFERENCES rps,
  version_no      INTEGER NOT NULL,
  actor_user_id   UUID NOT NULL REFERENCES users,
  action          VARCHAR NOT NULL
                  CHECK (action IN (
                    'submit_to_rmk',
                    'approve_rmk',
                    'reject_rmk',
                    'submit_to_kaprodi',
                    'approve_kaprodi',
                    'reject_kaprodi',
                    'clone_for_revision',
                    'supersede'
                  )),
  catatan_review  TEXT,  -- NOT NULL bila action IN ('reject_rmk','reject_kaprodi')
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 2. Versioning dan Lifecycle Status

### 2.1 Status Lifecycle

```
draft
  └─► submitted_to_rmk
        ├─► revision_requested_by_rmk
        │         └─► (dosen klik "Mulai Revisi" → clone ke versi baru: draft)
        └─► approved_by_rmk
              └─► submitted_to_kaprodi
                    ├─► revision_requested_by_kaprodi
                    │         └─► (dosen klik "Mulai Revisi" → clone ke versi baru: draft)
                    └─► approved
                          └─► (bila ada revisi pasca-approval)
                                    └─► superseded (versi lama)
                                          dan versi baru: draft
```

### 2.2 Perilaku Clone Saat Revisi

Ketika dosen mengklik tombol "Mulai Revisi" pada RPS yang berstatus `revision_requested_by_rmk` atau `revision_requested_by_kaprodi`, backend melakukan operasi berikut dalam satu transaksi:

1. Buat record `rps` baru dengan `version_no = versi_lama.version_no + 1` dan `parent_rps_id = versi_lama.id`. Status baru: `draft`.
2. Salin semua data relasi: `rps_cpl`, `rps_cpmk`, `rps_cpmk_cpl`, `rps_sub_cpmk`, `rps_korelasi_cpl`, `rps_pertemuan`, `rps_pustaka`, `rps_rtm`, `rps_rtm_pertemuan`, `rps_dosen_pengampu`. Semua FK disesuaikan ke ID baru.
3. Status versi lama **tidak diubah** (tetap `revision_requested_*`).
4. Catat aksi `clone_for_revision` di `rps_approval_log`.
5. Redirect dosen ke wizard dengan ID versi baru.

Dashboard dosen menampilkan baris per RPS (dikelompokkan per MK), dengan indikator versi aktif dan tombol "Lihat Riwayat Versi" yang membuka semua versi historis beserta catatan reviewer masing-masing.

### 2.3 Immutability Versi Approved

RPS berstatus `approved` tidak boleh diubah melalui endpoint apapun. Setiap `PUT` atau `PATCH` ke record `rps` atau tabel relasinya harus diblokir di layer backend jika `status = 'approved'`. Jika perlu revisi pasca-approval (misalnya perubahan dosen pengampu), prosesnya adalah: buat versi baru, ajukan ulang melalui workflow penuh, dan versi lama berubah menjadi `superseded` setelah versi baru diapprove.

---

## 3. Workflow Tiga-Tahap — Definisi Final

### 3.1 Alur Lengkap

```
[Dosen: isi wizard, simpan draft]
          │
          ▼
[Dosen: klik "Ajukan ke Koordinator RMK"]
  → status: submitted_to_rmk
  → notifikasi in-app ke Koordinator RMK
          │
          ▼
[Koordinator RMK: review via halaman read-only]
[Koordinator RMK: isi form keputusan]
          │
     ┌────┴────────────────────────────────────┐
     │                                          │
[Setujui]                           [Kembalikan + catatan WAJIB]
  → status: approved_by_rmk           → status: revision_requested_by_rmk
  → notif ke Dosen                    → notif ke Dosen dengan catatan
     │
     ▼
[Dosen: klik "Ajukan ke Ka Prodi"]
  → status: submitted_to_kaprodi
  → notifikasi in-app ke Ka Prodi
          │
          ▼
[Ka Prodi: review via halaman read-only]
[Ka Prodi: isi form keputusan]
          │
     ┌────┴────────────────────────────────────┐
     │                                          │
[Setujui]                           [Kembalikan + catatan WAJIB]
  → status: approved                  → status: revision_requested_by_kaprodi
  → tersedia untuk ekspor             → notif ke Dosen dengan catatan
  → notif ke Dosen & RMK
```

### 3.2 Catatan Review — Wajib Saat Menolak

Backend menolak request dengan HTTP 422 jika action adalah `reject_rmk` atau `reject_kaprodi` dan `catatan_review` kosong atau kurang dari 20 karakter. Ini bukan hanya validasi UI — ini dikerjakan di level API.

### 3.3 Permission Matrix

| Aksi | dosen | koordinator_rmk | kaprodi | admin |
|------|:-----:|:---------------:|:-------:|:-----:|
| Buat RPS baru | ✓ | — | — | ✓ |
| Edit RPS (status draft, pemilik) | ✓ | — | — | ✓ |
| Ajukan ke RMK | ✓ (pemilik) | — | — | — |
| Approve / reject (RMK) | — | ✓ (RMK yang ditunjuk di RPS) | — | — |
| Ajukan ke Ka Prodi | ✓ (pemilik) | — | — | — |
| Approve / reject (Ka Prodi) | — | — | ✓ | — |
| Lihat RPS milik sendiri (semua status) | ✓ | — | — | ✓ |
| Lihat semua RPS (semua status) | — | ✓ | ✓ | ✓ |
| Ekspor PDF (RPS approved) | ✓ | ✓ | ✓ | ✓ |
| Kelola master data | — | — | — | ✓ |

---

## 4. Validasi Bisnis — Dua Lapisan

### 4.1 Hard Block (mencegah submit)

Backend menolak submit ke workflow jika salah satu kondisi berikut terpenuhi:

1. Ada CPMK yang tidak memiliki satu pun Sub-CPMK turunan.
2. Ada Sub-CPMK yang tidak memiliki satu pun korelasi CPL dengan nilai > 0%.
3. Ada Sub-CPMK yang tidak direferensikan di satu pun baris pertemuan reguler.
4. Jumlah `bobot_penilaian_persen` seluruh baris `tipe = 'reguler'` tidak sama dengan 100 (toleransi: ±0.01 untuk floating point).
5. Ada nilai `catatan_penugasan` yang terisi di tabel pertemuan, tetapi tidak ada `rps_rtm` dengan `nomor_tugas` yang sama.
6. Ada `rps_rtm` yang tidak memiliki satu pun entri di `rps_rtm_pertemuan`.

### 4.2 Soft Warning (tampil sebagai peringatan, tidak memblokir)

Sistem menampilkan peringatan kuning sebelum submit. Dosen wajib membaca dan men-dismiss setiap peringatan secara eksplisit. Aksi dismiss dicatat di `rps_approval_log` dengan action `acknowledge_warning`.

Peringatan yang diimplementasikan:

| ID | Kondisi | Pesan yang ditampilkan |
|----|---------|----------------------|
| W-01 | Indikator penilaian < 8 kata | Catatan panduan institusional MTJ: indikator sebaiknya dirumuskan secara spesifik dan terukur. |
| W-02 | Tidak ada kata kerja operasional dari daftar whitelist Taksonomi Bloom | Catatan panduan institusional MTJ: indikator sebaiknya mengandung kata kerja operasional yang dapat diobservasi. |
| W-03 | Teks materi pembelajaran tidak mengandung substring dari judul pustaka manapun | Referensi pustaka tidak terdeteksi. Pastikan referensi sudah masuk daftar pustaka. |
| W-04 | Sub-CPMK satu minggu dengan bobot > 25% | Bobot penilaian relatif tinggi untuk capaian satu minggu. Pastikan ini proporsional. |

Framing penting: semua pesan peringatan menggunakan kalimat "Catatan panduan institusional MTJ", bukan "Kesalahan" atau "Tidak memenuhi standar". Ini adalah heuristic guidance, bukan kebenaran pedagogik universal.

---

## 5. Form Wizard — Spesifikasi Per Step

### Step 1: Identitas Mata Kuliah
- Dropdown mata kuliah (dari master data; hanya yang aktif di kurikulum versi terkini)
- Auto-fill read-only: Kode MK, Rumpun MK, SKS Teori, SKS Praktik, Semester
- Input manual: Tahun Akademik (format YYYY/YYYY, divalidasi regex), Tanggal Penyusunan
- Koordinator RMK dan Ka Prodi: dropdown users dengan role yang sesuai

### Step 2: Capaian Pembelajaran
- **Panel CPL:** Checklist CPL dari kurikulum versi aktif. Minimal satu harus dipilih.
- **Panel CPMK:** Tabel add/remove rows. Setiap CPMK memiliki kode (auto-increment: CPMK 1, 2, ...) dan deskripsi teks.
- **Panel Sub-CPMK:** Tabel add/remove rows. Setiap Sub-CPMK terhubung ke CPMK via dropdown, memiliki kode (auto-increment), dan deskripsi teks.
- Validasi real-time: CPMK tanpa Sub-CPMK diberi indikator merah.

### Step 3: Matriks Korelasi CPL ↔ Sub-CPMK
- Tabel di-generate otomatis dari Step 2. Baris = Sub-CPMK, Kolom = CPL yang dipilih.
- Input persentase per sel (angka; default 0).
- Kolom tambahan: Bobot Penilaian (%) dan Jumlah Minggu (diisi manual di sini, akan divalidasi konsistensinya dengan Step 5).
- Counter di bawah tabel menampilkan total bobot secara real-time dengan indikator hijau/merah.
- Jika dosen kembali ke Step 2 dan menambah atau menghapus Sub-CPMK, matriks disesuaikan tanpa menghapus isian yang sudah ada.

### Step 4: Deskripsi, Bahan Kajian, dan Pustaka
- Textarea deskripsi singkat MK.
- Textarea bahan kajian (atau list poin — bebas dipilih dosen).
- Tabel pustaka Utama: add/remove rows; setiap row adalah teks bebas.
- Tabel pustaka Pendukung: sama.

### Step 5: Rencana Pembelajaran Mingguan
- Tabel 16 baris. Baris 8 dan 16 dibekukan sebagai ETS/EAS — field berbeda, warna berbeda.
- Baris reguler: form inline dengan field berikut:
  - Dropdown Sub-CPMK (hanya Sub-CPMK dari RPS ini)
  - Textarea indikator (list; setiap indikator di baris baru)
  - Dropdown teknik penilaian
  - Dropdown kriteria penilaian
  - Multi-select metode pembelajaran
  - Field catatan penugasan (jika diisi, harus match ke RTM di Step 6)
  - Helper estimasi waktu: input terpisah untuk PB, PT, KM (jumlah pertemuan × SKS × menit) → sistem menghasilkan notasi teks otomatis
  - Field materi pembelajaran
  - Input bobot penilaian (%)
- Running total bobot ditampilkan real-time di bagian bawah tabel.

### Step 6: Rencana Tugas Mahasiswa (RTM)
- Daftar RTM di-generate berdasarkan nilai unik `catatan_penugasan` yang terisi di Step 5. Dosen tidak membuat RTM dari nol — sistem mendeteksi tugas yang disebutkan di tabel mingguan.
- Setiap RTM memiliki form ekspansi dengan field dari schema `rps_rtm`.
- Field "Minggu Terkait": multi-select minggu — menentukan isi tabel `rps_rtm_pertemuan`. Minggu yang memuat referensi tugas ini di-pre-select secara otomatis; dosen bisa menambah minggu lain (misal minggu presentasi).

### Review & Preview
- Tampilan read-only satu halaman yang merepresentasikan layout output akhir.
- Tombol "Ekspor PDF Preview" (generate PDF tanpa watermark).
- Daftar semua soft warning yang belum di-dismiss.
- Tombol "Ajukan ke Koordinator RMK" hanya aktif jika semua hard block terselesaikan dan semua soft warning sudah di-dismiss.

---

## 6. Ekspor

### 6.1 PDF — Wajib

Engine: Puppeteer (Node.js, server-side). Request ekspor masuk ke Redis Queue — tidak boleh blocking HTTP response.

Acceptance criteria — semua harus terpenuhi sebelum fitur dinyatakan selesai:
- [ ] Header institusional: logo Kemenhub, nama institusi, kode FR.09.049
- [ ] Halaman Analisis Pembelajaran: gambar yang diupload dosen dirender sebagai halaman tersendiri (workaround v1.0; lihat TD-01)
- [ ] Tabel matriks korelasi CPL–Sub-CPMK dengan merged cells yang benar
- [ ] Tabel pertemuan 16 baris; baris ETS/EAS memiliki format visual berbeda
- [ ] Halaman RTM mengikuti halaman RPS utama
- [ ] Page break tidak memotong di tengah baris tabel
- [ ] Semua teks menggunakan font serif (Times New Roman atau setara via @font-face)
- [ ] Ukuran file ≤ 5MB untuk RPS standar 16 minggu
- [ ] Waktu proses ≤ 15 detik di server produksi

### 6.2 DOCX — Opsional, Bersyarat

Kondisi sebelum development DOCX dimulai (semua harus terpenuhi):
1. PDF lulus semua acceptance criteria di atas.
2. Pilot testing dengan minimal 3 dosen tidak menemukan bug kritis.
3. Ada keputusan institusional eksplisit bahwa RPS yang sudah Approved tidak boleh diedit manual di Word.

Engine: `docxtpl` (Jinja2 template untuk DOCX). Template `.docx` master disiapkan satu kali oleh developer.

---

## 7. Manajemen Master Data (Admin Panel)

Role `admin` mengelola:

| Entitas | Operasi | Constraint |
|---------|---------|-----------|
| Kurikulum Versi | Create, set active | Hanya satu versi aktif pada satu waktu. Non-aktif tidak bisa dihapus jika ada RPS yang mengacu. |
| CPL Prodi | Create per versi, edit | Edit CPL pada versi aktif hanya boleh jika belum ada RPS yang menggunakan CPL tersebut. |
| Mata Kuliah | Create, edit, deactivate | Deactivate hanya jika tidak ada RPS approved yang aktif untuk MK tersebut. |
| Rumpun MK | Create, edit | — |
| Pengguna | Create, edit role, deactivate | — |
| Whitelist Kata Kerja Operasional | Edit list | Digunakan oleh soft warning W-02. |

---

## 8. Technical Debt Register

| ID | Deskripsi | Kategori | Target Versi |
|----|-----------|----------|-------------|
| TD-01 | Halaman Analisis Pembelajaran di-upload manual sebagai gambar | Workaround operasional | v1.1 |
| TD-02 | Validasi pedagogik berbasis whitelist, bukan analisis semantik | Heuristic guideline | v1.2 |
| TD-03 | Notifikasi hanya in-app, belum email | Fitur | v1.1 |
| TD-04 | Kolom monitoring realisasi pertemuan nullable di v1.0 | Extensibility | v1.1 |
| TD-05 | Tidak ada import dari dokumen Word lama | Fitur | Evaluasi post-pilot |
| TD-06 | `rps_pertemuan` mencampur plan dan realisasi dalam satu tabel | Arsitektur (diterima sebagai pragmatic compromise) | v1.1 bila log historis dibutuhkan |

---

## 9. Milestone Pengembangan

| Fase | Isi | Estimasi |
|------|-----|---------|
| 1 | Setup project + auth + schema database lengkap + admin panel master data | 4 minggu |
| 2 | Form Wizard Step 1–4 + auto-save + validasi struktural | 4 minggu |
| 3 | Form Wizard Step 5–6 + validasi silang RTM↔Pertemuan + soft warning | 3 minggu |
| 4 | Workflow tiga-tahap + audit trail + dashboard per role + notifikasi in-app | 3 minggu |
| 5 | Ekspor PDF + Redis Queue + template HTML + acceptance testing | 3 minggu |
| 6 | Pilot testing (3–5 dosen MTJ) + perbaikan + deployment produksi | 2–3 minggu |
| 6+ | Ekspor DOCX (bersyarat, setelah kondisi Bagian 6.2 terpenuhi) | 2 minggu |

Total estimasi: 19–20 minggu untuk satu developer full-stack ditambah satu QA.

---

## 10. Checklist Go/No-Go untuk Developer Handoff

Semua item berikut harus centang sebelum developer mulai menulis kode.

**Keputusan domain:**
- [x] Entitas unik RPS: satu MK + satu tahun akademik = satu RPS approved
- [x] Koordinator RMK = node approval aktif
- [x] Dosen pengampu lebih dari satu: ditangani via junction table `rps_dosen_pengampu`
- [x] RTM multi-minggu: ditangani via junction table `rps_rtm_pertemuan`
- [x] Perilaku clone saat revisi: didefinisikan eksplisit di Bagian 2.2

**Keputusan teknis:**
- [x] Schema database final (Bagian 1.2)
- [x] Status lifecycle lengkap (Bagian 2.1)
- [x] Hard block vs soft warning dibedakan (Bagian 4)
- [x] PDF-first strategy dengan acceptance criteria (Bagian 6.1)
- [x] DOCX bersyarat dengan kondisi eksplisit (Bagian 6.2)

**Keputusan institusional:**
- [x] Standardisasi template: inkonsistensi lama dibersihkan
- [x] Scope v1.0 dideklarasikan secara tegas
- [ ] Kebijakan DOCX pasca-ekspor: apakah file Word boleh diedit manual? *(perlu keputusan Ka Prodi sebelum Fase 6+)*
- [ ] Notifikasi email: in-app cukup untuk v1.0? *(sudah diasumsikan ya; konfirmasi formal direkomendasikan)*

Dua item terakhir tidak memblokir dimulainya Fase 1–5. Keduanya hanya relevan saat Fase 6+.

---

*Dokumen ini adalah versi final yang menutup semua temuan dari dua putaran QC independent. Semua blocker sudah diselesaikan. Dokumen ini siap digunakan sebagai dasar backlog development.*
