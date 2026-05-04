# Backup & DR Review Response

Tanggal: `2026-04-20`

Status:
- Review teknis diterima
- Belum ada implementasi backup/WAL nyata di repo saat ini
- Temuan di bawah menjadi baseline wajib saat backup & disaster recovery diimplementasikan

## Konteks

Saat review ini dicatat, repo belum memiliki:
- script `pg_dump` backup
- konfigurasi PostgreSQL WAL archiving
- cron backup / offsite sync
- prosedur restore / PITR yang dieksekusi lewat script di repo

Karena itu, temuan berikut diperlakukan sebagai **implementation contract** untuk fitur backup database sebelum production.

## Blocker Wajib Sebelum Deploy

### 1. Jangan gabungkan `pg_dump -F c` dengan `gzip`

`pg_dump -F c` sudah menghasilkan custom-format dump yang terkompresi dan ditujukan untuk `pg_restore`.

Jangan gunakan pola ini:

```bash
pg_dump -U "$DB_USER" -F c -b -v -f "$FILE" "$DB_NAME"
gzip "$FILE"
```

Pilihan yang benar:

```bash
# Opsi A — custom format, direkomendasikan
pg_dump -U "$DB_USER" -F c -b -f "$FILE.dump" "$DB_NAME"
```

atau

```bash
# Opsi B — plain SQL + gzip
pg_dump -U "$DB_USER" -F p "$DB_NAME" | gzip > "$FILE.sql.gz"
```

Catatan:
- Jika memilih `-F c`, restore harus memakai `pg_restore`
- Jika memilih plain SQL + gzip, restore harus memakai `gunzip -c ... | psql ...`

### 2. Semua script backup/restore wajib memakai strict shell mode

Tambahkan:

```bash
set -euo pipefail
```

Tanpa ini:
- `pg_dump` bisa gagal
- script tetap lanjut
- file kosong bisa tetap dikompresi / diupload
- backup lama bisa terhapus tanpa alarm yang benar

### 3. `archive_timeout` wajib diset jika target RPO <= 15 menit

Konfigurasi ini tidak cukup:

```ini
archive_command = 'cp %p /var/backups/rps/wal/%f'
```

Tambahkan:

```ini
archive_timeout = 900
```

Alasan:
- WAL segment default tidak selalu penuh cepat saat traffic rendah
- tanpa `archive_timeout`, RPO aktual bisa jauh lebih buruk dari target

### 4. WAL archive wajib punya cleanup policy

WAL yang diarchive tidak boleh dibiarkan tumbuh tanpa batas.

Minimal:

```bash
find /var/backups/rps/wal -type f -mtime +10 -delete
```

Opsi yang lebih proper:
- `pg_archivecleanup`
- cleanup berbasis retention dan restore policy

### 5. Prosedur PITR wajib lengkap, bukan hanya “restore full backup + apply WAL”

Untuk PostgreSQL 12+, PITR harus menyertakan konfigurasi restore eksplisit:

```ini
restore_command = 'cp /var/backups/rps/wal/%f %p'
recovery_target_time = '2026-04-20 10:15:00'
recovery_target_action = 'promote'
```

Dan file signal:

```bash
touch /var/lib/postgresql/<version>/main/recovery.signal
```

Tanpa ini, PostgreSQL tidak akan masuk ke mode recovery yang benar.

## Penting Sebelum Production

### 6. `.env` harus dibackup secara encrypted

Secret seperti:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- kredensial object storage / SMTP / monitoring

tidak ada di Git dan harus tersedia untuk recovery server baru.

Simpan di:
- password manager institusi
- secret manager
- encrypted offline copy

### 7. Offsite sync jangan dipisah terlalu lama dari backup lokal

Jangan biarkan window yang panjang antara:
- backup selesai
- file baru diupload offsite

Arah yang disetujui:
- jalankan offsite copy langsung setelah backup sukses dalam script yang sama
- lebih aman memakai `rclone copy` untuk file baru daripada `sync` yang lambat dan lebih berisiko bila salah target

### 8. PITR harus diuji, bukan hanya `pg_restore`

Checklist validasi wajib memisahkan:
- restore dari full dump
- restore berbasis WAL / PITR

PITR minimal diuji berkala, misalnya bulanan.

### 9. Restore ke database aktif harus memasukkan langkah stop aplikasi

Sebelum restore ke database yang sedang dipakai aplikasi:

```bash
pm2 stop rps-app
pg_restore --clean --if-exists -U postgres -d rps_db /backup/file.dump
pm2 start rps-app
```

Atau padanan `systemctl`, sesuai deployment yang dipakai.

## Yang Sudah Dinilai Benar Secara Arsitektur

Poin berikut dinilai tetap benar dan perlu dipertahankan saat implementasi:
- pendekatan `3-2-1`
- kombinasi full backup + WAL
- offsite object storage via `rclone` atau setara
- retention policy yang eksplisit dan bisa diaudit
- roadmap ke `pgBackRest` atau `WAL-G` untuk tier berikutnya

## Keputusan Teknis

Review ini diterima sebagai keputusan teknis final:

- `#1` s.d. `#5` = blocker implementasi
- `#6` s.d. `#9` = production-readiness requirements

Selama backup/WAL belum diimplementasikan di repo, belum ada patch kode yang bisa diverifikasi untuk area ini. Tetapi saat implementasi dimulai, dokumen ini menjadi baseline review yang harus dipenuhi.

## Pre-condition Deployment

Untuk target production pertama, WAL archiving harus aktif **sebelum** data production masuk.

Urutan minimum yang disetujui:

```text
1. Install PostgreSQL
2. Set archive_mode, archive_command, archive_timeout -> restart PostgreSQL
3. Ambil base backup pertama
4. Baru jalankan aplikasi / migrasi final / seed data production
```

Catatan penting:
- Jangan menjalankan aplikasi production lebih dulu lalu baru mengaktifkan archiving
- PITR hanya valid dari titik ketika WAL archiving mulai aktif
- Data yang masuk sebelum `archive_mode + archive_command + archive_timeout` aktif tidak tercakup penuh oleh strategi PITR

Implikasi:
- item `#3` (`archive_timeout`) bukan hanya checklist tuning
- item ini adalah bagian dari **initial deployment sequence** dan harus selesai sebelum cutover production

## Ringkasan Action

| # | Item | Severity | Keputusan |
| --- | --- | --- | --- |
| 1 | `pg_dump -F c` + `gzip` redundant | Blocker | Pakai salah satu format, jangan keduanya |
| 2 | Tidak ada `set -euo pipefail` | Blocker | Wajib di semua script |
| 3 | `archive_timeout` belum diset | Blocker | Wajib set `900` untuk target 15 menit |
| 4 | WAL cleanup belum ada | Blocker | Wajib ada retention/cleanup |
| 5 | PITR procedure belum lengkap | Blocker | Wajib tambahkan `restore_command` + `recovery.signal` |
| 6 | `.env` belum dibackup | Penting | Simpan encrypted di luar repo |
| 7 | Window lokal → offsite terlalu longgar | Penting | Upload offsite langsung setelah backup sukses |
| 8 | PITR belum diuji | Penting | Tambahkan test berkala |
| 9 | Restore belum stop app | Penting | Tambahkan langkah shutdown/startup aplikasi |
