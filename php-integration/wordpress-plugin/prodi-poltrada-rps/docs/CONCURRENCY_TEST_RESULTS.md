# True HTTP Concurrency Test Results

Dokumen ini mencatat hasil pengujian konkurensi (HTTP paralel) terhadap WordPress RPS Governance Service menggunakan **k6**.
Pengujian ini adalah syarat wajib (*mandatory checkpoint*) sebelum sistem RPS dinyatakan 100% aman untuk di-deploy.

## Protokol Pengujian

Jalankan setiap skenario dengan pola berikut:
1. Reset/siapkan RPS ke state awal yang valid.
2. Ambil state awal via endpoint `wp_ajax_prodi_rps_test_state`.
3. Jalankan skrip k6 dengan **10 request paralel**.
4. Ambil state akhir via `wp_ajax_prodi_rps_test_state`.
5. Bandingkan delta dan pastikan memenuhi *Acceptance Criteria*.

---

## Skenario 1: Double Submit (Dosen)

* **Skrip:** `tests/k6/submit-concurrency.js`
* **Precondition:** RPS dalam status `draft`, `lock_version` = X
* **Target:** `wp_ajax_prodi_rps_submit_to_rmk`

### Hasil Eksekusi

| Metric | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| HTTP 200 (Success) | 1 | [ ] | |
| HTTP 409 (Conflict) | 9 | [ ] | |
| HTTP 500 (Error) | 0 | [ ] | |
| Audit Log Tambahan | 1 baris | [ ] | |
| Final Status | `submitted_to_rmk` | [ ] | |
| Delta Lock Version | +1 | [ ] | |

**Catatan/Observasi:**
[Isi dengan catatan tambahan jika ada anomali atau pesan error PHP]

---

## Skenario 2: Parallel Approve RMK

* **Skrip:** `tests/k6/approve-rmk-concurrency.js`
* **Precondition:** RPS dalam status `submitted_to_rmk`, `lock_version` = X
* **Target:** `wp_ajax_prodi_rps_approve_rmk`

### Hasil Eksekusi

| Metric | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| HTTP 200 (Success) | 1 | [ ] | |
| HTTP 409 (Conflict) | 9 | [ ] | |
| HTTP 500 (Error) | 0 | [ ] | |
| Audit Log Tambahan | 1 baris | [ ] | |
| Final Status | `submitted_to_kaprodi` | [ ] | |
| Delta Lock Version | +1 | [ ] | |

**Catatan/Observasi:**
[Isi dengan catatan tambahan jika ada anomali atau pesan error PHP]

---

## Skenario 3: Parallel Approve Kaprodi

* **Skrip:** `tests/k6/approve-kaprodi-concurrency.js`
* **Precondition:** RPS dalam status `submitted_to_kaprodi`, `lock_version` = X
* **Target:** `wp_ajax_prodi_rps_approve_kaprodi`

### Hasil Eksekusi

| Metric | Expected | Actual | Pass/Fail |
|--------|----------|--------|-----------|
| HTTP 200 (Success) | 1 | [ ] | |
| HTTP 409 (Conflict) | 9 | [ ] | |
| HTTP 500 (Error) | 0 | [ ] | |
| Audit Log Tambahan | 1 baris | [ ] | |
| Final Status | `approved` | [ ] | |
| Delta Lock Version | +1 | [ ] | |

**Catatan/Observasi:**
[Isi dengan catatan tambahan jika ada anomali atau pesan error PHP]

---

## Kesimpulan
Status Uji Konkurensi: **[PENDING / PASSED / FAILED]**

*(Dokumen ini wajib diisi dengan angka riil dari pengujian sebelum mengklaim Governance Service telah tervalidasi secara penuh.)*
