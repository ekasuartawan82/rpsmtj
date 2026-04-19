# Memo Koreksi: Implementation Plan vs PRD v3.0
**Kepada:** Web Developer
**Dari:** Ka Prodi MTJ Poltrada Bali
**Tanggal:** April 2026
**Perihal:** Review implementation_plan_rps_app.md — koreksi sebelum eksekusi dimulai

Dokumen ini adalah instruksi resmi. Setiap item berlabel **KOREKSI WAJIB** harus diselesaikan sebelum baris kode pertama ditulis. Item berlabel **DITERIMA** tidak perlu diubah. Item berlabel **TAMBAHAN WAJIB** adalah hal yang tidak ada di plan Anda tetapi harus masuk sebelum eksekusi.

---

## BAGIAN A — KOREKSI WAJIB

### K-01: Deviasi Backend Stack — FastAPI diganti Next.js Route Handlers

**Status:** DITERIMA DENGAN KONDISI

PRD menyebut FastAPI (Python). Plan Anda mengusulkan Next.js Route Handlers. Perubahan ini diterima dengan satu alasan teknis yang kuat: Puppeteer adalah Node.js — memanggil Puppeteer dari Python berarti menjalankan cross-runtime call yang menambah kompleksitas tanpa manfaat nyata untuk skala proyek ini.

**Namun, kondisi berikut tidak bisa dinegosiasi:**

1. Semua business logic — hard block validators, soft warning generators, clone transaction, state machine lifecycle — **wajib tinggal di service layer backend**, bukan di Route Handler langsung. Route Handler hanya boleh menjadi thin controller yang mendelegasikan ke service. Jangan campuri logika domain dengan HTTP handler.

2. Kalimat "Next.js Route Handlers **atau** service layer terpisah di dalam monorepo" di plan Anda **tidak dapat diterima**. Ini bukan pilihan — ini keputusan arsitektur yang harus dikunci sekarang. Jawaban yang benar: **service layer terpisah di dalam monorepo**, bukan Route Handler langsung. Struktur yang diharapkan:

```
/src
  /app           ← Next.js pages, route handlers (thin)
  /services      ← domain logic: rps-draft, rps-validation,
                    rps-workflow, rps-versioning, exports
  /lib           ← shared utilities
  /db            ← Prisma client, generated types
```

3. Semua operasi yang menyentuh lebih dari satu tabel **wajib menggunakan `prisma.$transaction()`**. Tidak ada pengecualian. Ini berlaku untuk: clone revision, submit workflow, approve/reject, supersede.

---

### K-02: Urutan Fase PDF Terlalu Akhir — Harus Dimulai Fase 2

**Status:** KOREKSI WAJIB

Plan menempatkan PDF export di Fase 6 (minggu 16–18). Ini **salah urutan** dan berisiko tinggi.

Template HTML untuk PDF harus mulai dikerjakan di **Fase 2, bersamaan dengan wizard step 1–4**. Alasannya: jika ditemukan bahwa struktur data yang diinput tidak bisa dirender ke format FR.09.049 dengan benar, Anda harus refactor data model di saat paling buruk — ketika wizard sudah selesai dan workflow sudah berjalan.

**Instruksi konkret:**
- Di akhir Fase 2: buat satu halaman `/rps/[id]/preview` dengan template HTML statis yang merender data dari step 1–4. Tidak perlu sempurna — cukup untuk membuktikan bahwa struktur tabel matriks korelasi CPL–Sub-CPMK bisa dirender tanpa distorsi.
- Di akhir Fase 3: preview halaman sudah mencakup tabel mingguan 16 baris termasuk baris ETS/EAS yang berbeda format.
- Di Fase 6: sempurnakan — header institusional, font serif, page break, optimasi ukuran file, acceptance test.

**Ubah exit criteria Fase 2 menjadi:**
> - dosen bisa membuat draft lengkap step 1–4
> - halaman preview statis `/rps/[id]/preview` merender data step 1–4 tanpa error visual
> - tabel matriks korelasi sudah terbaca dengan benar di preview

---

### K-03: Integration Test Clone Harus Ada Sebelum Fase 4

**Status:** KOREKSI WAJIB

Plan menempatkan integration test untuk clone di Fase 4. Ini terlambat.

**Instruksi:** Integration test untuk operasi clone revision **harus ditulis dan harus lulus sebelum Fase 3 selesai**. Clone menyentuh semua tabel relasi sekaligus — `rps`, `rps_cpl`, `rps_cpmk`, `rps_cpmk_cpl`, `rps_sub_cpmk`, `rps_korelasi_cpl`, `rps_pertemuan`, `rps_pustaka`, `rps_rtm`, `rps_rtm_pertemuan`, `rps_dosen_pengampu`. Bug di sini yang baru ditemukan di QA akhir akan sangat mahal diperbaiki.

Test yang harus ada (semua harus lulus sebelum Fase 4 dimulai):
```
✓ clone menghasilkan version_no = parent + 1
✓ clone menghasilkan parent_rps_id yang menunjuk ke versi lama
✓ semua tabel relasi tersalin dengan FK yang benar ke ID baru
✓ versi lama statusnya tidak berubah setelah clone
✓ aksi 'clone_for_revision' tercatat di rps_approval_log
✓ clone adalah atomic — jika satu tabel gagal, seluruh transaksi rollback
✓ clone hanya bisa dilakukan dari status revision_requested_rmk atau revision_requested_kaprodi
```

---

### K-04: Unique Index RPS Approved — Harus Partial Index, Bukan UNIQUE Constraint

**Status:** KOREKSI WAJIB

Plan menyebut "buat unique index dan constraint penting" tanpa spesifikasi. Ini berbahaya karena developer bisa mengimplementasikan `UNIQUE(mata_kuliah_id, tahun_akademik)` biasa, yang akan memblokir pembuatan draft kedua untuk MK yang sama di tahun yang sama.

**Instruksi — tulis ini persis di migrasi Prisma/SQL:**

```sql
CREATE UNIQUE INDEX uq_rps_approved
  ON rps (mata_kuliah_id, tahun_akademik)
  WHERE (status = 'approved');
```

Bukan `UNIQUE` constraint biasa. Bukan index tanpa `WHERE`. Partial index ini mengizinkan banyak draft dari MK yang sama, tapi hanya satu yang boleh `approved`. Ini adalah constraint paling kritis di seluruh schema.

Pastikan ini ada di migration Fase 1 dan ada unit test yang memverifikasi bahwa dua draft untuk MK dan tahun yang sama **bisa** dibuat, tetapi mencoba approve keduanya **harus gagal**.

---

### K-05: Immutability Approved Version Harus Dijaga di Service Layer, Bukan Hanya Prinsip

**Status:** KOREKSI WAJIB

Plan menyebut `approved` adalah immutable snapshot sebagai prinsip. Prinsip saja tidak cukup.

**Instruksi:** Buat satu fungsi guard di service layer yang dipanggil di awal setiap operasi update:

```typescript
// /src/services/rps-draft/guards.ts
export async function assertRpsMutable(rpsId: string): Promise<void> {
  const rps = await prisma.rps.findUniqueOrThrow({ where: { id: rpsId } });
  if (rps.status === 'approved' || rps.status === 'superseded') {
    throw new ForbiddenError(
      `RPS ${rpsId} berstatus '${rps.status}' dan tidak dapat diubah.`
    );
  }
}
```

Fungsi ini dipanggil di **setiap** service method yang melakukan update ke `rps` atau tabel relasinya. Tidak ada pengecualian. Jangan andalkan middleware HTTP saja — guard harus ada di domain layer.

---

### K-06: Pesan Soft Warning Harus Menggunakan Framing yang Benar

**Status:** KOREKSI WAJIB

Plan menyebut soft warning tanpa menentukan framing pesan. Ini penting karena framing yang salah akan membuat dosen merasa digurui.

**Instruksi:** Setiap pesan soft warning **wajib** menggunakan framing berikut:

```
"Catatan panduan institusional MTJ: [isi pesan]"
```

Bukan:
- ❌ "Indikator tidak memenuhi standar"
- ❌ "Kesalahan: indikator terlalu pendek"
- ❌ "Peringatan: indikator tidak valid"

Contoh yang benar:
- ✓ "Catatan panduan institusional MTJ: indikator sebaiknya dirumuskan dalam kalimat yang spesifik dan terukur (disarankan minimal 8 kata)."
- ✓ "Catatan panduan institusional MTJ: indikator sebaiknya mengandung kata kerja operasional yang dapat diobservasi."

Ini bukan kosmetik — ini kebijakan yang sudah diputuskan di PRD dan harus konsisten di seluruh UI.

---

## BAGIAN B — TAMBAHAN WAJIB (tidak ada di plan, harus ditambahkan)

### T-01: Junction Table `rps_dosen_pengampu` Harus Eksplisit di Breakdown

Plan tidak menyebut tabel `rps_dosen_pengampu` secara eksplisit. Tabel ini wajib ada karena satu RPS bisa memiliki lebih dari satu dosen pengampu.

**Tambahkan ke Fase 1 (Foundation):**
- Implementasi tabel `rps_dosen_pengampu (id, rps_id, user_id, is_pengembang, urutan)`
- Di Step 1 wizard: field "Dosen Pengampu Tambahan" berupa multi-select user dengan role `dosen`
- Dosen Pengembang otomatis masuk sebagai entry pertama dengan `is_pengembang = true`

---

### T-02: Junction Table `rps_rtm_pertemuan` Harus Eksplisit di Breakdown

Plan tidak menyebut tabel `rps_rtm_pertemuan` secara eksplisit. PRD menetapkan bahwa **satu RTM dapat terhubung ke lebih dari satu minggu** — ini bukan implementasi opsional.

**Tambahkan ke Fase 3 (Step 5–6):**
- Implementasi tabel `rps_rtm_pertemuan (id, rps_rtm_id, rps_pertemuan_id, keterangan)`
- Di Step 6, field "Minggu Terkait" adalah multi-select, bukan single FK
- Minggu yang memuat `catatan_penugasan` yang sama di-pre-select otomatis
- Validasi: setiap RTM harus memiliki minimal satu entry di `rps_rtm_pertemuan`

---

### T-03: Aksi `acknowledge_warning` Harus Dicatat di `rps_approval_log`

Plan menyebut "simpan acknowledgement warnings ke log" tetapi tidak menspesifikasikan strukturnya.

**Instruksi:** Ketika dosen men-dismiss soft warning, backend mencatat:

```typescript
await prisma.rpsApprovalLog.create({
  data: {
    rpsId: rpsId,
    versionNo: rps.version_no,
    actorUserId: userId,
    action: 'acknowledge_warning',
    catatanReview: `Warning ${warningId} di-acknowledge: ${warningMessage}`,
  }
});
```

Ini bukan UX feature — ini adalah bukti audit bahwa dosen sudah membaca dan mengakui potensi kekurangan sebelum submit. Catatan ini harus tampil di halaman review Ka Prodi jika ada warning yang di-acknowledge.

---

### T-04: Supersede Logic Harus Eksplisit — Kapan Triggered

Plan menyebut "supersede approved version lama" di fase workflow tetapi tidak menspesifikasikan kapan trigger-nya.

**Instruksi:** Supersede dipicu tepat satu kali: ketika Ka Prodi meng-approve **versi baru** dari RPS yang sebelumnya sudah ada versi `approved`. Prosesnya harus atomic:

```typescript
await prisma.$transaction([
  // Set versi lama jadi superseded
  prisma.rps.update({
    where: { id: previousApprovedId },
    data: { status: 'superseded' }
  }),
  // Set versi baru jadi approved
  prisma.rps.update({
    where: { id: newVersionId },
    data: { status: 'approved' }
  }),
  // Catat di log untuk KEDUA record
  prisma.rpsApprovalLog.createMany({
    data: [
      { rpsId: previousApprovedId, action: 'supersede', ... },
      { rpsId: newVersionId, action: 'approve_kaprodi', ... }
    ]
  })
]);
```

Jika tidak ada versi `approved` sebelumnya (RPS pertama untuk MK ini), tidak ada yang di-supersede — langsung set `approved`.

---

### T-05: Catatan Reject Wajib Divalidasi di Backend, Bukan Hanya UI

Plan tidak menyebut ini secara eksplisit.

**Instruksi:** Backend menolak request dengan HTTP 422 jika:
- `action` adalah `reject_rmk` atau `reject_kaprodi`, DAN
- `catatan_review` kosong atau panjangnya kurang dari 20 karakter

Validasi ini **wajib ada di service layer**, bukan hanya di form validation UI. Ini adalah satu-satunya cara memastikan audit trail tidak kotor dengan rejection tanpa alasan.

---

## BAGIAN C — DITERIMA TANPA PERUBAHAN

Item berikut sudah sesuai dengan PRD dan tidak perlu diubah:

- ✓ Prinsip immutability versi approved
- ✓ PDF-first, DOCX di luar scope v1.0
- ✓ Stack: Next.js + Prisma + PostgreSQL + Redis + BullMQ + Puppeteer
- ✓ Auth: NextAuth/Auth.js dengan credentials + role
- ✓ 6 hard block rules (Bagian 4.1 PRD sudah dicantumkan)
- ✓ 4 soft warning W-01 sampai W-04
- ✓ Clone revision sebagai operasi terpisah (bukan edit in-place)
- ✓ `rps_approval_log` sebagai audit trail
- ✓ Admin panel mengelola master data
- ✓ Strategi seeding: admin, kaprodi, koordinator, dosen, kurikulum, CPL, MK dummy
- ✓ Urutan prioritas build (schema → auth → master data → wizard → validation → workflow → dashboard → PDF)
- ✓ E2E test coverage yang direncanakan sudah mencakup skenario utama

---

## Ringkasan: Apa yang Harus Dilakukan Sebelum Mulai Coding

| # | Item | Aksi |
|---|------|------|
| K-01 | Backend stack | Kunci pilihan: service layer di monorepo, bukan Route Handler langsung |
| K-02 | PDF timing | Tambahkan `/rps/[id]/preview` ke exit criteria Fase 2 |
| K-03 | Clone integration test | Pindahkan ke akhir Fase 3, sebelum Fase 4 dimulai |
| K-04 | Partial index | Ganti semua rencana UNIQUE constraint dengan partial index |
| K-05 | Guard immutability | Tambahkan `assertRpsMutable()` ke service layer |
| K-06 | Framing warning | Update semua teks warning dengan prefix "Catatan panduan institusional MTJ:" |
| T-01 | `rps_dosen_pengampu` | Tambahkan ke Fase 1 breakdown |
| T-02 | `rps_rtm_pertemuan` | Tambahkan ke Fase 3 breakdown secara eksplisit |
| T-03 | `acknowledge_warning` log | Tambahkan ke spesifikasi validation engine |
| T-04 | Supersede logic | Tambahkan spesifikasi atomic transaction ke workflow breakdown |
| T-05 | Reject validation di backend | Tambahkan ke service layer, bukan hanya UI |

Setelah semua item di atas direvisi ke dalam implementation plan, implementation plan versi tersebut baru disetujui untuk eksekusi.

---

*Memo ini berlaku sebagai dokumen instruksi resmi. Pertanyaan teknis dikembalikan ke Ka Prodi untuk keputusan domain, bukan diputuskan unilateral oleh developer.*
