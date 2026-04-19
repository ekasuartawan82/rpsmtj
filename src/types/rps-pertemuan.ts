/**
 * Types untuk RPS Pertemuan (Minggu 1-16)
 * Sesuai format RPS resmi FR.09.049
 */

export type PertemuanType = 'reguler' | 'uts' | 'uas'

export interface RpsPertemuanFormData {
  id?: string
  rpsId: string
  orderNo: number
  weekLabel: string // "1", "4,5", "8", "14,15", "16"
  tipe: PertemuanType

  // Kemampuan Akhir Tiap Tahapan Belajar (Sub-CPMK)
  subCpmkId?: string | null
  subCpmkText?: string

  // Penilaian
  indikatorPenilaian?: string[] // Indikator
  teknikPenilaian?: string // Teknik
  kriteriaPenilaian?: string // Kriteria

  // Bentuk/Metode Pembelajaran
  bentukPembelajaranLuring?: string[]
  bentukPembelajaranDaring?: string[]
  metodePembelajaran?: string[]

  // Penugasan Mahasiswa
  catatanPenugasan?: string

  // Estimasi Waktu
  estimasiWaktuPb?: string // "1x(2x50”)"
  estimasiWaktuPt?: string // "1mgx(2sksx60”)"
  estimasiWaktuKm?: string // "1x(2x60”)"

  // Materi Pembelajaran
  materiPembelajaran?: string

  // Pustaka
  pustakaRefs?: string[] // Array of RpsPustaka IDs

  // Bobot Penilaian
  bobotPenilaianPersen?: number

  // Khusus UTS/UAS
  deskripsiEvaluasi?: string // Untuk UTS/UAS

  // Catatan tambahan
  notes?: string
}

export interface RpsPertemuanValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface RpsPertemuanSummary {
  totalBobot: number
  totalPertemuan: number
  weeksCovered: string[]
  hasUts: boolean
  hasUas: boolean
  isComplete: boolean
}

export interface RpsPertemuanWithRelations extends RpsPertemuanFormData {
  id: string
  createdAt: Date
  updatedAt: Date
  subCpmk?: {
    id: string
    kode: string
    deskripsi: string
  }
  pustaka?: Array<{
    id: string
    teksLengkap: string
    kategori: 'utama' | 'pendukung'
  }>
}

// Helper untuk membuat week label yang valid
export function createWeekLabel(weeks: number[]): string {
  return weeks.join(',')
}

// Helper untuk parsing week label
export function parseWeekLabel(label: string): number[] {
  return label.split(',').map(w => parseInt(w.trim())).filter(n => !isNaN(n))
}

// Helper untuk menentukan tipe pertemuan berdasarkan week label
export function determinePertemuanType(weekLabel: string): PertemuanType {
  const weeks = parseWeekLabel(weekLabel)
  if (weeks.includes(8)) return 'uts'
  if (weeks.includes(16)) return 'uas'
  return 'reguler'
}

// Template deskripsi evaluasi default
export const DEFAULT_EVALUATION_DESCRIPTIONS = {
  uts: 'ETS / Evaluasi Tengah Semester: Melakukan validasi hasil penilaian, evaluasi dan perbaikan proses pembelajaran berikutnya.',
  uas: 'EAS / Evaluasi Akhir Semester: Melakukan validasi penilaian akhir dan menentukan kelulusan mahasiswa.'
}
