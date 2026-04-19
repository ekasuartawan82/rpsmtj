# Dokumentasi Arsitektur OBE (Outcome-Based Education)

## 📚 Pendahuluan

Dokumen ini menjelaskan implementasi OBE dalam sistem RPS, termasuk struktur data, validasi, dan workflow yang harus dipahami oleh developer dan dosen.

---

## 🎯 Konsep Kunci: CPL 4 Ranah vs CPL Prodi

### ❌ Kesalahan Umum

Banyak sistem akademik keliru menginput CPL 4 ranah (S1, P1, KU1, KK1) langsung ke RPS.

### ✅ Konsep yang Benar

#### 1. CPL 4 Ranah (Framework Nasional)

Ini adalah referensi normatif dari SN-Dikti/KKNI:

| Ranah | Kode | Contoh |
|-------|------|--------|
| Sikap | S | S1, S2, S3, ... |
| Pengetahuan | P | P1, P2, P3, ... |
| Keterampilan Umum | KU | KU1, KU2, KU3, ... |
| Keterampilan Khusus | KK | KK1, KK2, KK3, ... |

**Ciri-ciri:**
- Generik dan normatif
- Digunakan sebagai referensi penyusunan kurikulum
- **TIDAK diinput langsung ke RPS**

#### 2. CPL Prodi (Operasional)

Ini adalah CPL turunan yang spesifik untuk prodi:

| Kode | Contoh Deskripsi |
|------|------------------|
| CPL-1 | Mampu menerapkan etika profesi dan integritas dalam praktik teknik |
| CPL-2 | Mampu melakukan survei dan analisis data transportasi |
| CPL-3 | Mampu merencanakan sistem transportasi yang berkelanjutan |
| CPL-4 | Mampu menganalisis kinerja simpang dan jaringan jalan |

**Ciri-ciri:**
- Kontekstual ke prodi
- Siap dioperasionalkan
- **INILAH yang diinput ke RPS**
- Diturunkan dari 4 ranah, tetapi sudah spesifik

#### 3. Mapping ke 4 Ranah (Opsional tapi Disarankan)

Untuk keperluan akreditasi, CPL Prodi dapat di-mapping ke CPL 4 ranah:

```
CPL-2 (Survei & analisis data)
  └─ P3 (Mampu menerapkan konsep ilmuiah)
  └─ KK1 (Keterampilan teknis analisis)
```

---

## 🏗️ Struktur Database

### Tabel Utama

#### `cpl_prodi`

Menyimpan CPL Prodi operasional:

```prisma
model CplProdi {
  id               String       @id
  kurikulumVersiId String
  kode             String       // Contoh: "CPL-1", "CPL-2"
  kategori         CplKategori // S | P | KU | KK
  deskripsi         String
  urutan           Int?

  kurikulumVersi   KurikulumVersi @relation(...)
  rpsCplEntries    RpsCpl[]
}
```

**Field `kategori`:**
- Menunjukkan dari ranah mana CPL ini diturunkan
- Berguna untuk reporting ke akreditasi
- BUKAN untuk filtering di RPS

#### `rps_cpmk_cpl` (Inti OBE)

Tabel mapping antara CPMK dan CPL:

```prisma
model RpsCpmkCpl {
  id       String  @id
  rpsCpmkId String
  rpsCplId  String

  rpsCpmk  RpsCpmk @relation(...)
  rpsCpl   RpsCpl  @relation(...)

  @@unique([rpsCpmkId, rpsCplId])
}
```

**Ini adalah jantung dari sistem OBE!**

---

## 🔄 Struktur Hirarki OBE

```
KurikulumVersi (2024/2025)
  └─ CplProdi (CPL Prodi Operasional)
      ├─ CPL-1 (Etika profesi)
      ├─ CPL-2 (Survei & analisis data)
      └─ CPL-3 (Perencanaan transportasi)

Rps (RPS Mata Kuliah)
  ├─ RpsCpl (CPL yang dipilih untuk RPS ini)
  │   ├─ RpsCpl: CPL-1
  │   ├─ RpsCpl: CPL-2
  │   └─ RpsCpl: CPL-3
  │
  ├─ RpsCpmk (CPMK)
  │   ├─ RpsCpmk: CPMK-1
  │   │   └─ RpsCpmkCpl ⭐ (Mapping)
  │   │       ├─ rpsCplId: CPL-1
  │   │       └─ rpsCplId: CPL-2
  │   │
  │   └─ RpsCpmk: CPMK-2
  │       └─ RpsCpmkCpl ⭐ (Mapping)
  │           └─ rpsCplId: CPL-3
  │
  └─ RpsSubCpmk (Sub-CPMK)
      ├─ Sub-CPMK-1.1
      │   └─ RpsKorelasiCpl (Mapping ke CPL)
      └─ Sub-CPMK-1.2
          └─ RpsKorelasiCpl (Mapping ke CPL)
```

---

## ✅ Aturan OBE yang Wajib Dipatuhi

### Rule 1: Setiap CPMK Harus Mapping ke Minimal 1 CPL

**Alasan:**
- Tanpa mapping, tidak bisa tracking CPL achievement
- Melanggar prinsip OBE
- RPS tidak akan lulus akreditasi

**Implementasi:**
```typescript
// Validasi di backend
const cpmkWithoutCplMapping = await prisma.rpsCpmk.count({
  where: {
    rpsId,
    cplLinks: {
      none: {}, // Tidak ada mapping
    },
  },
});

if (cpmkWithoutCplMapping > 0) {
  throw new ValidationError(
    `${cpmkWithoutCplMapping} CPMK belum di-mapping ke CPL.`
  );
}
```

### Rule 2: Setiap RPS Harus Berkontribusi ke Minimal 1 CPL

**Alasan:**
- Setiap mata kuliah harus mendukung CPL prodi
- Tidak boleh ada mata kuliah yang "mengambang"

### Rule 3: Tidak Boleh Ada CPL Orphan

**Definisi:**
CPL orphan adalah CPL yang:
- Dibuat di master data
- Tapi tidak pernah digunakan di RPS manapun

**Solusi:**
- Monitoring rutin
- Review kurikulum berkala

---

## 🚫 Validasi Sistem

### Backend Validation

Saat submit RPS, sistem akan memvalidasi:

1. **Tanggal penyusunan** diisi
2. **Deskripsi singkat** diisi
3. **Bahan kajian** diisi
4. **Minimal 1 CPL** ditambahkan ke RPS
5. **Minimal 1 CPMK** dibuat
6. ⭐ **SEMUA CPMK sudah di-mapping ke CPL** (validasi OBE)
7. **Setiap CPMK** memiliki minimal 1 Sub-CPMK turunan
8. **Minimal 1 pertemuan** dijadwalkan
9. **Setiap Sub-CPMK** memiliki korelasi CPL dengan nilai `> 0%`
10. **Setiap Sub-CPMK** direferensikan oleh minimal 1 pertemuan reguler
11. **Total bobot** seluruh pertemuan reguler = `100%` dengan toleransi `±0.01`
12. **Setiap `catatan_penugasan`** yang terisi memiliki RTM dengan `nomor_tugas` yang sama
13. **Semua RTM terhubung** ke minimal 1 pertemuan

### Frontend Warning

UI menampilkan warning validasi PRD 4.2 jika:

1. **Warning Summary** (bagian atas halaman CPMK)
   - Menampilkan jumlah CPMK yang belum di-mapping
   - List kode CPMK yang bermasalah
   - Penjelasan bahwa RPS tidak bisa disubmit

2. **Warning per CPMK**
   - Border/background amber pada card CPMK
   - Badge "⚠️ Belum di-mapping ke CPL"
   - Pesan: "Wajib OBE: Setiap CPMK harus terhubung ke minimal satu CPL"

Catatan:
- Warning aktif harus di-acknowledge secara eksplisit sebelum tombol submit ke RMK dapat dipakai.
- Setiap acknowledgement dicatat di `rps_approval_log` dengan action `acknowledge_warning`.

---

## 👨‍💻 Panduan Developer

### 1. Membuat CPL Prodi Baru

**Endpoint:** `POST /api/admin/cpl-prodi`

**Request Body:**
```json
{
  "kurikulumVersiId": "uuid-kurikulum",
  "kode": "CPL-1",           // ✅ BENAR - format CPL Prodi
  "kategori": "S",           // S | P | KU | KK
  "deskripsi": "Mampu menerapkan etika profesi...",
  "urutan": 1
}
```

**❌ JANGAN:**
```json
{
  "kode": "S1"               // ❌ SALAH - ini CPL 4 ranah
}
```

### 2. Membuat CPMK

**Endpoint:** `POST /api/rps/{rpsId}/cpmk`

**Request Body:**
```json
{
  "kode": "CPMK-1",
  "deskripsi": "Mahasiswa mampu menganalisis...",
  "urutan": 1
}
```

### 3. Mapping CPMK ke CPL (WAJIB)

**Endpoint:** `POST /api/rps/{rpsId}/cpmk/{cpmkId}/cpl`

**Request Body:**
```json
{
  "rpsCplId": "uuid-rps-cpl"
}
```

**Response:**
```json
{
  "id": "uuid-mapping",
  "rpsCpmkId": "uuid-cpmk",
  "rpsCplId": "uuid-rps-cpl"
}
```

### 4. Submit RPS

**Endpoint:** `POST /api/rps/{rpsId}/submit`

**Validasi yang akan dijalankan:**
- Cek apakah ada CPMK tanpa mapping CPL
- Jika ada, throw error dengan daftar CPMK yang bermasalah

---

## 👨‍🏫 Panduan Dosen

### Workflow Penyusunan RPS

1. **Tambah CPL ke RPS**
   - Pilih CPL Prodi yang relevan dari master data
   - Contoh: CPL-1, CPL-2, CPL-5

2. **Buat CPMK**
   - Tulis CPMK sesuai materi kuliah
   - Contoh: CPMK-1, CPMK-2, CPMK-3

3. **⭐ Mapping CPMK ke CPL (WAJIB)**
   - Setelah CPMK dibuat, langsung pilih CPL yang relevan
   - Satu CPMK bisa mapping ke beberapa CPL
   - Contoh: CPMK-1 → CPL-1, CPL-2

4. **Turunkan Sub-CPMK**
   - Break down CPMK ke pertemuan-peratemuan
   - Setiap Sub-CPMK juga bisa di-mapping ke CPL

5. **Isi komponen lain**
   - Pertemuan, penilaian, RTM, pustaka, dll.

6. **Review & Submit**
   - Sistem akan validasi semua CPMK sudah di-mapping
   - Jika belum, submit akan ditolak

---

## 📊 Contoh Implementasi yang Benar

### Scenario: Mata Kuliah "Perencanaan Transportasi"

#### Langkah 1: Pilih CPL untuk RPS

Dosen memilih CPL berikut untuk RPS ini:
- CPL-2: Mampu melakukan survei dan analisis data transportasi
- CPL-3: Mampu merencanakan sistem transportasi yang berkelanjutan
- CPL-4: Mampu menganalisis kinerja simpang dan jaringan jalan

#### Langkah 2: Buat CPMK

CPMK-1: Mahasiswa mampu mengidentifikasi masalah transportasi
- → Mapping ke: CPL-2

CPMK-2: Mahasiswa mampu mengumpulkan data survei transportasi
- → Mapping ke: CPL-2

CPMK-3: Mahasiswa mampu merancang solusi transportasi
- → Mapping ke: CPL-2, CPL-3

CPMK-4: Mahasiswa mampu menganalisis kapasitas simpang
- → Mapping ke: CPL-2, CPL-4

CPMK-5: Mahasiswa mampu mengevaluasi kinerja jaringan jalan
- → Mapping ke: CPL-2, CPL-4

#### Langkah 3: Turunkan Sub-CPMK

Contoh untuk CPMK-3:
- Sub-CPMK-3.1: Identifikasi parameter perencanaan
  - → Korelasi CPL: CPL-3 (80%)
- Sub-CPMK-3.2: Hitung kebutuhan transportasi
  - → Korelasi CPL: CPL-3 (100%)
- Sub-CPMK-3.3: Desain alternatif solusi
  - → Korelasi CPL: CPL-2 (40%), CPL-3 (60%)

---

## 🔍 Troubleshooting

### Masalah: Error saat submit RPS

**Error Message:**
```
RPS belum siap diajukan: 2 CPMK belum di-mapping ke CPL.
Sesuai prinsip OBE, setiap CPMK harus terhubung ke minimal satu CPL.
```

**Solusi:**
1. Cek bagian "CPMK dan Sub-CPMK"
2. Lihat card CPMK yang berwarna amber
3. Klik CPMK tersebut
4. Di bagian "Mapping CPL", pilih CPL yang relevan
5. Klik "Tautkan CPL"
6. Ulangi untuk semua CPMK yang bermasalah

### Masalah: Bingung memilih CPL

**Pertanyaan:** "CPL mana yang harus dipilih?"

**Jawaban:**
- Lihat deskripsi CPMK
- Pikirkan: CPL prodi manakah yang dicapai oleh CPMK ini?
- Satu CPMK bisa mapping ke beberapa CPL
- Gunakan pertimbangan profesional

**Contoh:**
```
CPMK: "Mahasiswa mampu menganalisis data survei transportasi"

Pertanyaan: CPL apa yang dicapai?
Jawaban:
- CPL-2 (Survei & analisis data) → 100% relevan
- CPL-4 (Kinerja simpang & jaringan) → 60% relevan (data dipakai untuk analisis kinerja)

Action: Mapping ke CPL-2 dan CPL-4
```

---

## 📚 Referensi

1. **SN-Dikti**: Standar Nasional Pendidikan Tinggi
2. **KKNI**: Kerangka Kualifikasi Nasional Indonesia
3. **OBE Guide**: Panduan Implementasi Outcome-Based Education
4. **BAN-PT**: Badan Akreditasi Nasional Perguruan Tinggi

---

## 📝 Changelog

### 2025-04-18
- ✅ Perbaiki placeholder kode CPL di form admin (S1 → CPL-1)
- ✅ Tambah penjelasan CPL Prodi vs 4 ranah di UI
- ✅ Implementasi validasi backend: CPMK wajib mapping ke CPL
- ✅ Tambah warning UI untuk CPMK tanpa mapping
- ✅ Buat dokumentasi OBE lengkap

---

**Dokumen ini adalah bagian dari sistem RPS dan harus diperbarui setiap ada perubahan arsitektur OBE.**
