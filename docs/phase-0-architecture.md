# Phase 0 Architecture Note

Dokumen ini mengunci keputusan teknis yang dibutuhkan untuk memulai Fase 1 tanpa mengulang diskusi arsitektur.

## Struktur Source

```text
/src
  /app
  /services
  /lib
  /db
```

- `src/app` hanya untuk UI, layout, dan route handler tipis.
- `src/services` menyimpan seluruh domain logic.
- `src/lib` menyimpan constants, errors, auth config, dan type helpers.
- `src/db` menyimpan Prisma client singleton.

## Aturan Domain Layer

- Semua operasi multi-tabel wajib memakai `prisma.$transaction()`.
- Guard mutable document ditempatkan di `src/services/rps-draft/guards.ts`.
- Validasi reject minimal 20 karakter ditempatkan di service layer, bukan UI.
- Clone revision harus dibuka hanya dari status `revision_requested_by_rmk` atau `revision_requested_by_kaprodi`.

## Catatan JSONB

Kolom `indikator_penilaian` dan `metode_pembelajaran` di `rps_pertemuan` akan disimpan sebagai `Json` di Prisma, tetapi service layer wajib memakai alias TypeScript eksplisit:

- `IndikatorPenilaian = string[]`
- `MetodePembelajaran = string[]`

Helper parsing ada di `src/lib/types/rps.ts` agar service tidak bekerja langsung dengan `JsonValue` mentah.

## Catatan Seed

Seed bootstrap awal sudah menyiapkan `whitelist_kata_kerja_operasional` karena dipakai oleh soft warning W-02.

Seed lengkap Fase 1 akan menambahkan:
- admin
- kaprodi
- koordinator RMK
- dosen
- kurikulum aktif
- CPL contoh
- mata kuliah contoh

## Partial Index

Constraint final tetap mengikuti PRD:

```sql
CREATE UNIQUE INDEX uq_rps_approved
  ON rps (mata_kuliah_id, tahun_akademik)
  WHERE (status = 'approved');
```

Partial index ini dibuat lewat raw SQL migration pada migration pertama.
Constraint ini bersifat wajib karena merupakan data integrity rule paling kritis di schema RPS.
