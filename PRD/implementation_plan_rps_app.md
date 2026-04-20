# Implementation Plan Aplikasi RPS MTJ v1.0

Dokumen ini menerjemahkan [PRD final](/Users/putueka/ProjectAplikasi/RPS_App/PRD/konsep_aplikasi_rps_mtj_v3_final.md) menjadi rencana implementasi yang bisa langsung dipakai untuk eksekusi development.

## 1. Tujuan Implementasi

Target v1.0:
- menyediakan sistem tata kelola dokumen RPS end-to-end
- mendukung penyusunan RPS berbasis wizard
- menerapkan validasi hard block dan soft warning sesuai PRD
- menjalankan workflow approval tiga-tahap
- menjaga versioning immutable untuk versi approved
- menghasilkan PDF final yang memenuhi acceptance criteria

Di luar scope v1.0:
- email notification
- monitoring ketercapaian CPMK
- import dari dokumen Word lama
- DOCX export sebelum syarat PDF-first terpenuhi

## 2. Usulan Arsitektur Teknis

Karena repo masih kosong, implementasi paling aman adalah memulai dengan arsitektur modular sederhana yang mengunci domain logic di service layer monorepo:

- Frontend: `Next.js` App Router + TypeScript
- UI: `Tailwind CSS` + `shadcn/ui` atau komponen internal ringan
- Form: `react-hook-form` + `zod`
- Backend API: `Next.js Route Handlers` sebagai thin controller + service layer terpisah di dalam monorepo
- ORM: `Prisma`
- Database: `PostgreSQL`
- Auth: `NextAuth/Auth.js` dengan credentials login berbasis role
- Queue: `BullMQ` + `Redis`
- PDF engine: `Puppeteer`
- State server/client: default React + server actions/route handlers; hindari state global berlebih
- Testing: `Vitest`/`Jest` untuk unit, `Playwright` untuk E2E
- Deployment awal: `Docker` + PostgreSQL + Redis pada VPS/cloud yang mendukung headless Chromium

Alasan pilihan:
- cocok untuk tim kecil dan repo baru
- cepat dibangun untuk admin panel, wizard, dan dashboard role-based
- mudah menggabungkan CRUD, auth, queue worker, dan PDF generation

Struktur minimal yang dikunci:

```text
/src
  /app        <- pages, layouts, route handlers tipis
  /services   <- domain logic: draft, validation, workflow, versioning, exports
  /lib        <- helper bersama, auth, errors, constants
  /db         <- prisma client, raw SQL helpers, generated types
```

Aturan arsitektur yang wajib:
- seluruh business logic tinggal di `/src/services`
- Route Handler hanya parsing request, auth check dasar, lalu memanggil service
- semua operasi multi-tabel wajib menggunakan `prisma.$transaction()`
- operasi kritis yang wajib transaction-safe: clone revision, submit workflow, approve/reject, supersede

## 3. Prinsip Implementasi

- Domain model mengikuti PRD tanpa reinterpretasi.
- Semua rule kritis dijaga di backend, bukan hanya UI.
- `approved` adalah immutable snapshot.
- Revisi pasca reject selalu membuat clone versi baru.
- Workflow dan audit trail harus transaction-safe.
- PDF adalah deliverable utama; DOCX tidak dikerjakan di fase inti.
- Desain schema sudah menyiapkan ekspansi v1.1, tetapi endpoint v1.0 hanya mengaktifkan field yang relevan.
- `approved` dan `superseded` harus dijaga immutable di service layer melalui guard `assertRpsMutable(rpsId)`.
- Soft warning wajib memakai framing `"Catatan panduan institusional MTJ: ..."`.
- Partial index `uq_rps_approved` adalah constraint wajib dan tidak boleh diganti `UNIQUE` biasa.

## 4. Breakdown Modul

### 4.1 Foundation
- bootstrap project
- konfigurasi environment
- logging dasar
- error handling standar
- role-based auth
- seed data awal

### 4.2 Master Data
- kurikulum versi
- CPL prodi
- rumpun MK
- mata kuliah
- pengguna
- whitelist kata kerja operasional

### 4.3 RPS Authoring
- create draft RPS
- wizard step 1-6
- auto-save per step
- review and preview page
- riwayat versi
- multi-pengampu melalui `rps_dosen_pengampu`

### 4.4 Validation Engine
- hard block submit
- soft warning generator
- warning acknowledgement
- cross-step validation RTM dan pertemuan
- reject reason validation di backend
- guard immutability `assertRpsMutable`

### 4.5 Workflow Engine
- submit ke RMK
- approve/reject RMK
- submit ke Ka Prodi
- approve/reject Ka Prodi
- clone for revision
- supersede approved version lama
- audit log `acknowledge_warning`
- supersede atomic saat versi baru disahkan Ka Prodi

### 4.6 Dashboard dan Notification
- dashboard dosen
- dashboard koordinator RMK
- dashboard Ka Prodi
- dashboard admin
- in-app notification center

### 4.7 Export Engine
- preview HTML print layout
- job queue PDF
- Puppeteer renderer
- status tracking export job
- preview dimulai sejak Fase 2, finalisasi export di Fase 6

## 5. Rencana Fase Implementasi

### Fase 0. Inisiasi dan Technical Design
Durasi: 1 minggu

Deliverable:
- struktur repo final
- keputusan stack dikunci
- ERD final dari schema PRD
- API contract level tinggi
- wireframe low fidelity untuk wizard, dashboard, review screen, admin panel
- definisi environment dev/staging/prod

Task utama:
- setup Next.js + TypeScript + linting + formatting
- setup Prisma dan PostgreSQL
- setup Redis lokal
- setup auth skeleton dan role enum
- buat dokumen arsitektur singkat

Exit criteria:
- project bisa jalan lokal
- migrasi database pertama sukses
- login dummy berbasis role sudah berfungsi

### Fase 1. Foundation dan Master Data
Durasi: 3 minggu

Deliverable:
- schema database lengkap sesuai PRD
- migrasi dan seed
- admin panel master data
- permission dasar per role
- implementasi partial index `uq_rps_approved`
- implementasi junction table `rps_dosen_pengampu`

Task utama:
- implement seluruh tabel master dan tabel RPS
- implement `rps_dosen_pengampu (id, rps_id, user_id, is_pengembang, urutan)`
- implement `rps_rtm_pertemuan (id, rps_rtm_id, rps_pertemuan_id, keterangan)` sejak schema awal, walau UI-nya dikerjakan di Fase 3
- buat partial unique index `uq_rps_approved` via SQL:

```sql
CREATE UNIQUE INDEX uq_rps_approved
  ON rps (mata_kuliah_id, tahun_akademik)
  WHERE (status = 'approved');
```

- CRUD admin untuk kurikulum versi, CPL, rumpun MK, mata kuliah, users
- constraint bisnis admin sesuai PRD
- audit field timestamps dan soft delete/deactivate pattern bila diperlukan
- unit/integration test untuk membuktikan dua draft dengan MK dan tahun yang sama bisa dibuat, tetapi dua versi `approved` tidak bisa coexist

Exit criteria:
- admin bisa mengelola semua master data
- hanya satu kurikulum aktif
- data master siap dipakai wizard
- partial index terpasang dan lolos test perilaku draft vs approved

### Fase 2. Wizard Step 1-4
Durasi: 3 minggu

Deliverable:
- create draft RPS
- Step 1 Identitas MK
- Step 2 CPL, CPMK, Sub-CPMK
- Step 3 matriks korelasi
- Step 4 deskripsi, bahan kajian, pustaka
- auto-save
- halaman preview statis `/rps/[id]/preview` untuk data Step 1-4

Task utama:
- bangun service create/update draft
- implement Step 1 dengan field `Dosen Pengampu Tambahan` multi-select untuk user role `dosen`
- dosen pengembang otomatis disimpan sebagai entry pertama di `rps_dosen_pengampu` dengan `is_pengembang = true`
- generate kode CPMK/Sub-CPMK otomatis
- sinkronisasi perubahan Step 2 ke Step 3 tanpa menghapus data valid yang masih relevan
- validasi real-time dasar
- mulai template HTML preview untuk membuktikan struktur Step 1-4 dapat dirender ke layout FR.09.049
- render matriks korelasi CPL-Sub-CPMK di preview tanpa distorsi visual

Exit criteria:
- dosen bisa membuat draft lengkap step 1-4
- halaman preview statis `/rps/[id]/preview` merender data Step 1-4 tanpa error visual
- tabel matriks korelasi sudah terbaca dengan benar di preview
- data reload konsisten
- tidak ada orphan data relasi

### Fase 3. Wizard Step 5-6 dan Validation Engine
Durasi: 3 minggu

Deliverable:
- tabel pertemuan 16 minggu
- baris ETS/EAS khusus
- RTM auto-generated dari `catatan_penugasan`
- warning dan hard block engine
- preview mencakup tabel mingguan 16 baris
- clone revision service dan integration test selesai sebelum Fase 4

Task utama:
- implement form mingguan lengkap
- helper formula PB/PT/KM
- generate RTM berdasarkan unique assignment note
- implement relasi `rps_rtm_pertemuan` secara eksplisit
- field `Minggu Terkait` di Step 6 berupa multi-select, bukan single FK
- minggu yang memuat `catatan_penugasan` yang sama di-preselect otomatis
- implement 6 hard block rules
- implement soft warnings W-01 sampai W-04
- semua teks warning memakai prefix `"Catatan panduan institusional MTJ: "`
- simpan acknowledgement warnings ke `rps_approval_log` dengan action `acknowledge_warning` dan `catatan_review` berisi `Warning {warningId} di-acknowledge: {warningMessage}`
- validasi bahwa setiap RTM memiliki minimal satu entry di `rps_rtm_pertemuan`
- implement awal clone revision service di backend
- tulis dan luluskan integration test clone berikut sebelum Fase 4:
  - `version_no = parent + 1`
  - `parent_rps_id` menunjuk ke versi lama
  - seluruh tabel relasi tersalin dengan FK baru yang benar
  - status versi lama tidak berubah
  - action `clone_for_revision` tercatat di `rps_approval_log`
  - transaksi rollback penuh jika satu langkah gagal
  - clone hanya boleh dari status `revision_requested_by_rmk` atau `revision_requested_by_kaprodi`
- update preview agar tabel mingguan 16 baris termasuk ETS/EAS bisa dirender dengan format berbeda

Exit criteria:
- semua rule submit pada Bagian 4 PRD aktif di backend
- tombol submit hanya aktif saat syarat terpenuhi
- data step 5-6 konsisten terhadap step sebelumnya
- preview sudah mencakup tabel mingguan 16 baris termasuk ETS/EAS
- integration test clone lulus penuh sebelum Fase 4 dimulai

### Fase 4. Workflow, Versioning, Audit Trail
Durasi: 3 minggu

Deliverable:
- alur submit-review-approve lengkap
- halaman review read-only untuk RMK dan Ka Prodi
- catatan reject wajib
- clone version saat revisi
- riwayat versi dan approval log
- warning yang sudah di-acknowledge tampil di halaman review

Task utama:
- implement state machine lifecycle RPS
- enforce permission matrix pada semua endpoint
- sambungkan UI workflow ke clone revision service yang sudah ditest di Fase 3
- implement guard `assertRpsMutable(rpsId)` di awal semua service update untuk `rps` dan tabel relasinya
- validasi backend: reject RMK/Ka Prodi wajib memiliki `catatan_review` minimal 20 karakter, jika tidak return HTTP 422
- implement mekanisme `superseded` secara atomic ketika Ka Prodi meng-approve versi baru dan sudah ada versi `approved` sebelumnya
- catat log untuk kedua record saat supersede: versi lama `supersede`, versi baru `approve_kaprodi`
- tampilkan histori versi per MK
- tampilkan entry `acknowledge_warning` di halaman review RMK/Ka Prodi sebagai bagian audit trail

Exit criteria:
- seluruh lifecycle pada PRD berjalan
- approval/reject tercatat di audit trail
- approved version benar-benar immutable
- supersede hanya terpicu saat approve versi baru di level Ka Prodi dan berjalan atomic

### Fase 5. Dashboard Role dan In-App Notification
Durasi: 2 minggu

Deliverable:
- dashboard dosen
- dashboard RMK
- dashboard Ka Prodi
- dashboard admin
- notifikasi in-app

Task utama:
- list dan filter RPS berdasarkan role
- indicator status, versi aktif, dan aksi yang tersedia
- notification badge dan halaman notifikasi
- deep link dari notifikasi ke halaman terkait

Exit criteria:
- setiap role hanya melihat data dan aksi yang sesuai
- transisi workflow memicu notifikasi yang benar

### Fase 6. PDF Export Engine
Durasi: 3 minggu

Deliverable:
- export request via queue
- worker PDF berbasis Puppeteer
- template HTML print-ready
- preview dan final export untuk RPS approved

Task utama:
- setup BullMQ worker
- simpan status job export
- sempurnakan template HTML preview yang mulai dibangun di Fase 2-3 menjadi export final sesuai FR.09.049
- render logo/header/tabel kompleks/RTM
- dukung upload gambar analisis pembelajaran sebagai halaman terpisah
- optimasi page break, font serif, dan ukuran file

Exit criteria:
- semua acceptance criteria PDF di PRD terpenuhi
- proses export tidak memblokir request HTTP
- PDF standar selesai <= 15 detik pada environment target

### Fase 7. QA, Pilot, Deployment
Durasi: 2-3 minggu

Deliverable:
- test pass untuk skenario utama
- staging environment
- UAT dengan 3-5 dosen
- hardening sebelum production release

Task utama:
- regression test
- uji data nyata dari Prodi
- perbaikan UX, wording, dan edge case
- backup dan observability dasar
- deployment dan SOP support awal

Exit criteria:
- pilot tidak menemukan bug kritis blocker
- user kunci bisa menyusun dan approve RPS end-to-end
- produksi siap dipakai

## 6. Work Breakdown Prioritas

Prioritas build:
1. schema dan auth
2. admin master data
3. draft RPS dan wizard inti
4. preview HTML print layout sejak Step 1-4
5. validation engine
6. workflow dan versioning
7. dashboard dan notification
8. finalisasi PDF export
9. pilot dan hardening

Urutan ini penting karena:
- workflow bergantung pada data authoring yang stabil
- preview PDF harus divalidasi lebih awal agar struktur data wizard tidak salah arah
- acceptance testing PDF akan lebih cepat bila lifecycle sudah lengkap

## 7. Desain API / Service yang Perlu Disiapkan

Minimal service boundary:
- `auth`
- `master-data`
- `rps-draft`
- `rps-validation`
- `rps-workflow`
- `rps-versioning`
- `notifications`
- `exports`

Guard dan helper domain wajib:
- `assertRpsMutable(rpsId)`
- `assertCanCloneFromStatus(status)`
- `assertRejectReasonValid(action, catatanReview)`
- `generateSoftWarnings(rpsId)` dengan pesan berprefix `"Catatan panduan institusional MTJ: "`
- `acknowledgeWarning(rpsId, warningId, warningMessage, actorUserId)`

Endpoint/use case inti:
- create draft RPS
- update per step wizard
- get review preview
- validate submit
- acknowledge warnings
- submit to RMK
- RMK approve/reject
- submit to Ka Prodi
- Ka Prodi approve/reject
- clone for revision
- list version history
- request export PDF
- get export job status

## 8. Strategi Data dan Migrasi

- Mulai dari schema final PRD, bukan schema minimal sementara.
- Gunakan migration berurutan dan seed terpisah untuk data referensi.
- Jika Prisma schema tidak memodelkan partial index secara native, tambahkan raw SQL di migration agar `uq_rps_approved` tetap tercipta persis sesuai PRD.
- Buat seeder untuk:
  - admin default
  - kaprodi dummy
  - koordinator RMK dummy
  - dosen dummy
  - kurikulum aktif
  - CPL contoh
  - mata kuliah contoh
- Tambahkan guard service untuk constraint yang tidak cukup ditangani database saja.

## 9. Strategi Testing

### Unit Test
- permission checks
- status transition rules
- hard block validators
- soft warning generators
- clone version mapping integrity
- `assertRpsMutable()` memblokir update untuk status `approved` dan `superseded`
- partial index behavior: banyak draft boleh, dua approved tidak boleh
- reject reason validator menolak catatan kurang dari 20 karakter

### Integration Test
- create/edit draft dengan relasi penuh
- update Step 1 menyimpan `rps_dosen_pengampu` dengan pengembang otomatis sebagai `is_pengembang = true`
- Step 6 menyimpan relasi `rps_rtm_pertemuan` multi-minggu dengan FK yang benar
- submit workflow end-to-end
- reject lalu clone revisi
- clone revision harus lulus seluruh skenario berikut sebelum Fase 4 dimulai:
  - `version_no = parent + 1`
  - `parent_rps_id` benar
  - semua tabel relasi tersalin benar
  - status versi lama tetap
  - log `clone_for_revision` tercatat
  - rollback penuh saat gagal
  - clone hanya valid dari status `revision_requested_by_rmk` atau `revision_requested_by_kaprodi`
- approved menjadi superseded saat versi baru disahkan
- export request membuat queue job

### E2E Test
- admin kelola master data
- dosen isi wizard sampai submit
- RMK review dan reject
- dosen revisi versi baru
- RMK approve, dosen submit ke kaprodi, kaprodi approve
- export PDF dari RPS approved

## 10. Risiko Implementasi dan Mitigasi

### Risiko tinggi
- clone data relasional kompleks saat revisi
- sinkronisasi Step 2, Step 3, dan Step 5
- render PDF tabel kompleks dan merged cells
- rule validasi yang tersebar antara UI dan backend

Mitigasi:
- bangun service clone dengan test integrasi sejak awal
- treat wizard data model sebagai source of truth tunggal
- siapkan HTML print template dan snapshot test sejak Fase 2
- tempatkan semua rule submit di backend service terpusat

### Risiko menengah
- performa query dashboard saat data tumbuh
- inkonsistensi role dan permission
- mismatch notasi waktu PB/PT/KM dengan ekspektasi user

Mitigasi:
- gunakan pagination dan index dari awal
- buat middleware authz yang seragam
- validasi format helper bersama user saat pilot internal

## 11. Backlog Teknis Non-Fungsional

- audit logging terstruktur
- rate limiting login
- backup database
  - baseline review implementasi: `docs/BACKUP_DR_REVIEW_RESPONSE_2026-04-20.md`
- monitoring worker queue
- error reporting
- staging environment
- seed command dan reset dev database
- import sample data untuk demo/UAT

## 12. Definisi Done per Fitur

Satu fitur dianggap selesai jika:
- lolos unit/integration test relevan
- lolos review UX minimum
- permission dan status transition aman
- error state ditangani dengan pesan yang jelas
- tercatat di changelog internal / release notes
- bila terkait PDF, acceptance criteria PRD sudah lolos

## 13. Rencana Eksekusi Praktis Mingguan

### Minggu 1
- finalisasi stack
- bootstrap project
- auth skeleton
- Prisma schema awal

### Minggu 2-4
- migrasi penuh
- seed data
- admin panel master data
- permission admin

### Minggu 5-7
- wizard step 1-4
- auto-save
- relasi CPL/CPMK/Sub-CPMK
- multi-pengampu via `rps_dosen_pengampu`
- preview `/rps/[id]/preview` untuk Step 1-4

### Minggu 8-10
- step 5-6
- hard block
- soft warning
- relasi multi-minggu `rps_rtm_pertemuan`
- review page
- preview tabel mingguan 16 baris
- clone revision integration test

### Minggu 11-13
- workflow approval
- audit trail
- version history
- integrasi UI ke clone revision service
- supersede atomic

### Minggu 14-15
- dashboard role
- notifikasi in-app

### Minggu 16-18
- export PDF
- queue worker
- acceptance test dokumen

### Minggu 19-20
- pilot
- bugfix
- deployment production

## 14. Next Step yang Paling Disarankan

Urutan kerja setelah dokumen ini:
1. kunci stack dan struktur repo
2. buat ERD dan Prisma schema dari PRD
3. pastikan partial index dan junction table wajib masuk schema awal
4. bootstrap project dan migration awal
5. implement auth + role guard
6. mulai admin panel master data

Jika ingin, langkah berikutnya yang paling efektif adalah saya langsung bootstrap struktur project v1.0 dan menyiapkan fondasi Fase 0-Fase 1 di repo ini.
