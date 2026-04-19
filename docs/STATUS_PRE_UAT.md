# Status Pre-UAT: Tabel Pertemuan & PDF Export

**Date:** 2026-04-18
**Status:** 🔴 **BLOCKED untuk Test Case A.1-A.9** | 🟢 **READY untuk Test Case B-D**

---

## Ringkasan Status

### ✅ Yang Sudah Berfungsi (Siap UAT)

1. **Database & Schema**
   - ✅ Migration berhasil
   - ✅ Field `weekLabel`, `orderNo`, dll tersimpan
   - ✅ Enum `ets/eas` sesuai schema

2. **API Routes**
   - ✅ `GET /api/rps/[rpsId]/pertemuan` - List pertemuan + summary
   - ✅ `POST /api/rps/[rpsId]/pertemuan` - Create pertemuan
   - ✅ `PUT /api/rps/[rpsId]/pertemuan/[id]` - Update pertemuan
   - ✅ `DELETE /api/rps/[rpsId]/pertemuan/[id]` - Delete pertemuan
   - ✅ `POST /api/rps/[rpsId]/export/pdf` - PDF export
   - ✅ `GET /rps/[rpsId]/print` - Print preview

3. **Validation Service**
   - ✅ Validasi pertemuan individual
   - ✅ Validasi set pertemuan (total bobot 100%)
   - ✅ Summary calculator

4. **UI Display (Read-only)**
   - ✅ `RpsPertemuanTable` bisa menampilkan data
   - ✅ Summary card muncul
   - ✅ Indikator kelengkapan tampil
   - ✅ Component sudah terwire di halaman detail RPS

5. **PDF Generation**
   - ✅ Puppeteer setup
   - ✅ Template HTML
   - ✅ Print preview route

---

### ❌ Yang Belum Berfungsi (Blocked)

1. **Form Add/Edit Pertemuan**
   - ❌ Component `RpsPertemuanForm` sudah dibuat tapi **TIDAK TERINTEGRASI**
   - ❌ Tombol "Tambah" dan "Edit" punya callback props tapi **TIDAK DIBERI HANDLER**
   - ❌ Tidak ada halaman `/rps/[id]/pertemuan/new` atau `/rps/[id]/pertemuan/[pertemuanId]/edit`

**Impact:**
- Test case A.1-A.9 **BLOCKED** - tidak bisa test create/edit pertemuan via UI
- Test case B-D **READY** - bisa test print preview, PDF export, security

---

## Sebab Blocking

### Root Cause
Component `RpsPertemuanTable` menerima props `onEdit` dan `onAdd`, tapi di `page.tsx` kedua props ini **tidak diberikan**:

```tsx
// src/app/rps/[id]/page.tsx line 209-213
<RpsPertemuanTable
  rpsId={rps.id}
  isReadOnly={!isEditable}
  isApproved={rps.status === "approved"}
  // ⚠️ onEdit dan onAdd TIDAK diberikan
/>
```

### Kebutuhan Desain yang Belum Diputuskan
Ada 2 opsi yang valid, tapi **harus dipilih salah satu**:

#### Opsi 1: Inline Modal/Form
- ✅ UX lebih smooth (tidak perlu pindah halaman)
- ✅ Bisa implement cepat (modal di halaman yang sama)
- ❌ Halaman jadi lebih kompleks

#### Opsi 2: Halaman Terpisah
- ✅ Halaman lebih clean (concern separation)
- ✅ URL yang bisa di-share (`/rps/[id]/pertemuan/new`)
- ❌ Perlu buat 2 halaman baru + routing

---

## Next Steps (Urgent)

### Sebelum Test Case A.1-A.9 Bisa Dijalankan:

1. **Pilih desain UI** (Opsi 1 atau Opsi 2)
2. **Implement handler untuk `onEdit` dan `onAdd`**
3. **Buat UI form (modal atau halaman)**
4. **Test manual create/edit pertemuan**

### Implementasi Cepat (Jika pilih Opsi 1 - Modal):

```tsx
// Di page.tsx, tambahkan state dan handler:
const [showAddModal, setShowAddModal] = useState(false)
const [editingPertemuanId, setEditingPertemuanId] = useState<string | null>(null)

const handleAdd = () => setShowAddModal(true)
const handleEdit = (id: string) => setEditingPertemuanId(id)

// Render component dengan props:
<RpsPertemuanTable
  rpsId={rps.id}
  isReadOnly={!isEditable}
  isApproved={rps.status === "approved"}
  onEdit={handleEdit}
  onAdd={handleAdd}
/>

// Tambahkan modal/dialog untuk form
{showAddModal && (
  <PertemuanFormModal
    rpsId={rps.id}
    onClose={() => setShowAddModal(false)}
    onSave={() => {
      setShowAddModal(false)
      // refresh data
    }}
  />
)}
```

---

## UAT Execution Plan

### Phase 1: Test B-D (READY NOW)
- ✅ B.1-B.13: Print Preview
- ✅ C.1-C.10: PDF Export
- ✅ D.1-D.5: Security & Guards

### Phase 2: Test A.1-A.9 (BLOCKED - tunggu implement)
- ❌ A.1-A.9: Tabel Pertemuan (Create/Edit via UI)

**Estimated Time:**
- Phase 1: 2-3 jam (sekarang bisa mulai)
- Phase 2: 3-4 jam (setelah implement form)

---

## Checklist untuk Developer

### Sebelum declare "feature-ready":

- [ ] Implement `onEdit` handler
- [ ] Implement `onAdd` handler
- [ ] Buat UI form untuk add/edit pertemuan
- [ ] Test manual create pertemuan (minggu tunggal)
- [ ] Test manual create pertemuan (minggu gabungan "4,5")
- [ ] Test manual edit pertemuan
- [ ] Test manual delete pertemuan
- [ ] Test validasi total bobot
- [ ] Test auto-detect UTS/UAS

### Baru kemudian:
- [ ] Jalankan UAT checklist lengkap
- [ ] Fix issue yang ditemukan
- [ ] Re-test sampai semua pass
- [ ] Sign-off

---

## Honesty Statement

**Status sebenarnya:**
- API dan backend logic: ✅ READY
- PDF generation: ✅ READY
- Display table (read-only): ✅ READY
- **Form add/edit pertemuan: ❌ NOT READY**

**Verdict:**
- Test case B-D: 🟢 **Dapat mulai sekarang**
- Test case A.1-A.9: 🔴 **Blocked sampai form diimplement**

**Tidak ada overclaim.** Tidak ada "conditional pass" yang menyesatkan. Code compiles tapi fitur belum utuh.

---

## Related Files

- `src/components/rps/rps-pertemuan-table.tsx` - Table UI (READY)
- `src/components/rps/rps-pertemuan-form.tsx` - Form UI (NOT INTEGRATED)
- `src/app/api/rps/[rpsId]/pertemuan/route.ts` - CRUD API (READY)
- `src/app/rps/[id]/page.tsx` - Halaman detail (PARTIAL)
- `docs/UAT_CHECKLIST_TABEL_PERTEMUAN_PDF.md` - Full checklist

---

**Last Updated:** 2026-04-18
**Reviewed By:** QC Team
**Action Required:** Implement form add/edit pertemuan
