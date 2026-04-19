# Field Visibility Contract - RPS Document Engine

**Purpose:** Explicit declaration of which `RpsDocumentData` fields are visible in rendered documents vs internal-only.

**Status:** Fase 1 Production-Ready
**Last Updated:** 2026-04-19

---

## Visible Fields (Rendered to HTML/PDF)

All fields below are intentionally visible in the final document for audit, reference, or operational purposes.

| Category | Fields | Render Location | Purpose |
|----------|--------|-----------------|---------|
| **Identity** | `namaMatkul`, `kodeMatkul`, `sks`, `tahunAkademik`, `versi` | Header section | Document identification |
| **Info Umum** | `status`, `tanggalPenyusunan`, `dosenPengembang`, `email`, `totalBobot`, `deskripsi`, `bahanKajian` | Info Umum section | General course information |
| **Dosen** | `dosenPengampu[].nama`, `dosenPengampu[].email`, `dosenPengampu[].peran` | Dosen section | Teaching team identification |
| **CPL** | `cpl[].kode`, `cpl[].kategori`, `cpl[].deskripsi` | CPL section | Curriculum profile learning outcomes |
| **CPMK** | `cpmk[].kode`, `cpmk[].deskripsi`, `cpmk[].cplLabels[]` | CPMK section | Course learning outcomes |
| **Sub-CPMK** | `subCpmk[].kode`, `subCpmk[].cpmkKode`, `subCpmk[].deskripsi`, `subCpmk[].targetKetercapaianPersen` | Sub-CPMK section | Detailed learning outcomes |
| **Matriks** | `matriksCplSubCpmk.columns[]`, `matriksCplSubCpmk.rows[]` | Matriks section | CPL-SubCPMK correlation matrix |
| **Pertemuan** | All 20 fields in `pertemuan[]` (orderNo, weekLabel, tipe, subCpmkLabel, indikatorPenilaian, etc.) | Pertemuan section | Weekly meeting plans |
| **Approval** | `approvalHistory[].version`, `approvalHistory[].action`, `approvalHistory[].actorName`, `approvalHistory[].note`, `approvalHistory[].createdAt` | Approval History section | Audit trail |
| **Metadata** | `exportMeta.exportedAt`, `exportMeta.exportedBy`, `exportMeta.version`, `exportMeta.status` | Footer section | Export metadata |
| **Assets** | `assets.logoPoltradaDataUri` | Header section | Institutional branding |

**Total Visible Fields:** 50+ fields across 11 sections

---

## Internal-Only Fields (Not Rendered)

These fields are used for data processing, validation, or system operation but are **intentionally excluded** from the final document.

| Field | Type | Purpose | Reason for Exclusion |
|-------|------|---------|----------------------|
| `dosenPengampu[].isPengembang` | boolean | Internal flag for developer identification | Not relevant for document consumers |
| `dosenPengampu[].urutan` | number\|null | Internal ordering for lecturer sequence | Derived into `peran` label |
| `matriksCplSubCpmk.rows[].targetKetercapaianPersen` | number\|null | Duplicate of subCpmk data | Redundant, already shown in Sub-CPMK section |
| `pertemuan[].orderNo` | number | Internal ordering | Used for sorting, displayed as "Pertemuan N" |
| `pertemuan[].estimasiWaktuPb`, `estimasiWaktuPt`, `estimasiWaktuKm` | string | Internal time allocation codes | Decoded into human-readable descriptions |
| `approvalHistory` (raw fields) | various | Temporary processing fields | Mapped into formatted display fields |

**Total Internal-Only Fields:** 8 fields

---

## Intentional Design Decisions

### 1. Raw vs Formatted Data
- **Pattern:** Internal fields (raw) → Formatted fields (visible)
- **Example:**
  - Internal: `urutan: 2`
  - Visible: `peran: "Pengampu 2"`
- **Rationale:** Documents should present human-readable information, not database keys.

### 2. Redundancy Elimination
- **Pattern:** Same data shown once, even if available in multiple forms
- **Example:**
  - `targetKetercapaianPersen` appears in Sub-CPMK section
  - Matriks section shows derived correlations, not duplicate percentage
- **Rationale:** Avoid confusion and document bloat.

### 3. Technical vs Business Data
- **Pattern:** System metadata separated from business content
- **Example:**
  - Visible: `exportMeta.exportedBy` (who generated this PDF)
  - Internal: Database IDs, timestamps in raw format
- **Rationale:** Document consumers care about business context, not technical implementation.

---

## Compliance Statement

✅ **All business-critical fields are visible in the document.**
✅ **All internal-only fields are documented with rationale.**
✅ **No field is hidden accidentally or without intentional design.**

This contract ensures:
- Audit trails are complete (all approval history visible)
- Document consumers have all necessary information
- Internal system details don't leak into documents unintentionally
- Future changes must update this contract explicitly

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-04-19 | Initial contract creation | Document Engine Team |
