/**
 * Validation Service untuk RPS Pertemuan
 * Memastikan data tabel pertemuan sesuai aturan RPS
 */

import { RpsPertemuanFormData, RpsPertemuanValidationResult, RpsPertemuanSummary, parseWeekLabel } from '@/types/rps-pertemuan'

export class RpsPertemuanValidator {
  /**
   * Validasi satu pertemuan
   */
  static validatePertemuan(data: RpsPertemuanFormData): RpsPertemuanValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validasi dasar
    if (!data.weekLabel || data.weekLabel.trim() === '') {
      errors.push('Label minggu wajib diisi')
    }

    if (!data.orderNo || data.orderNo < 1) {
      errors.push('Nomor urut wajib diisi dengan angka yang valid')
    }

    // Validasi berdasarkan tipe
    if (data.tipe === 'reguler') {
      // Untuk pertemuan reguler, field berikut wajib diisi
      if (!data.subCpmkId && !data.subCpmkText) {
        errors.push('Sub-CPMK wajib dipilih atau diisi untuk pertemuan reguler')
      }

      if (!data.indikatorPenilaian || data.indikatorPenilaian.length === 0) {
        errors.push('Indikator penilaian wajib diisi untuk pertemuan reguler')
      }

      if (!data.teknikPenilaian || data.teknikPenilaian.trim() === '') {
        errors.push('Teknik penilaian wajib diisi untuk pertemuan reguler')
      }

      if (!data.kriteriaPenilaian || data.kriteriaPenilaian.trim() === '') {
        errors.push('Kriteria penilaian wajib diisi untuk pertemuan reguler')
      }

      if (!data.metodePembelajaran || data.metodePembelajaran.length === 0) {
        errors.push('Metode pembelajaran wajib diisi untuk pertemuan reguler')
      }

      if (!data.materiPembelajaran || data.materiPembelajaran.trim() === '') {
        errors.push('Materi pembelajaran wajib diisi untuk pertemuan reguler')
      }

      if (data.bobotPenilaianPersen === undefined || data.bobotPenilaianPersen === null) {
        errors.push('Bobot penilaian wajib diisi untuk pertemuan reguler')
      }

      // Warnings untuk best practices
      if (!data.estimasiWaktuPb && !data.estimasiWaktuPt && !data.estimasiWaktuKm) {
        warnings.push('Belum ada estimasi waktu yang diisi (PB/PT/KM)')
      }

      if (!data.catatanPenugasan || data.catatanPenugasan.trim() === '') {
        warnings.push('Belum ada catatan penugasan mahasiswa')
      }

    } else if (data.tipe === 'uts' || data.tipe === 'uas') {
      // Untuk UTS/UAS, deskripsi evaluasi yang jelas
      if (!data.deskripsiEvaluasi || data.deskripsiEvaluasi.trim() === '') {
        warnings.push('Deskripsi evaluasi untuk UTS/UAS sebaiknya diisi secara jelas')
      }

      // UTS/UAS biasanya tidak memiliki bobot atau memiliki bobot khusus
      if (data.bobotPenilaianPersen && data.bobotPenilaianPersen > 0) {
        warnings.push('Pertemuan UTS/UAS biasanya tidak memiliki bobot penilaian terpisah')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validasi seluruh set pertemuan dalam satu RPS
   */
  static validatePertemuanSet(pertemuans: RpsPertemuanFormData[]): RpsPertemuanValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 1. Validasi cakupan minggu 1-16
    const summary = this.calculateSummary(pertemuans)
    const allWeeks = new Set<number>()
    pertemuans.forEach(p => {
      const weeks = parseWeekLabel(p.weekLabel)
      weeks.forEach(w => allWeeks.add(w))
    })

    // Cek apakah semua minggu 1-16 tercakup
    const missingWeeks: number[] = []
    for (let i = 1; i <= 16; i++) {
      if (!allWeeks.has(i)) {
        missingWeeks.push(i)
      }
    }

    if (missingWeeks.length > 0) {
      errors.push(`Minggu yang belum tercakup: ${missingWeeks.join(', ')}`)
    }

    // 2. Validasi minggu ke-8 ada UTS
    if (!summary.hasUts) {
      warnings.push('Minggu ke-8 belum ditandai sebagai UTS')
    }

    // 3. Validasi minggu ke-16 ada UAS
    if (!summary.hasUas) {
      warnings.push('Minggu ke-16 belum ditandai sebagai UAS')
    }

    // 4. Validasi total bobot = 100%
    const totalBobot = summary.totalBobot
    if (Math.abs(totalBobot - 100) > 0.1) {
      errors.push(`Total bobot penilaian saat ini ${totalBobot}%, harus 100%`)
    }

    // 5. Validasi urutan tidak ada gap
    const sortedOrders = pertemuans.map(p => p.orderNo).sort((a, b) => a - b)
    for (let i = 0; i < sortedOrders.length - 1; i++) {
      if (sortedOrders[i + 1] - sortedOrders[i] > 1) {
        warnings.push(`Ada gap pada nomor urut: ${sortedOrders[i]} ke ${sortedOrders[i + 1]}`)
      }
    }

    // 6. Validasi setiap pertemuan
    pertemuans.forEach((pertemuan, idx) => {
      const validation = this.validatePertemuan(pertemuan)
      if (!validation.valid) {
        errors.push(`Pertemuan ke-${idx + 1}: ${validation.errors.join('; ')}`)
      }
      if (validation.warnings.length > 0) {
        warnings.push(`Pertemuan ke-${idx + 1}: ${validation.warnings.join('; ')}`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Hitung summary statistik untuk set pertemuan
   */
  static calculateSummary(pertemuans: RpsPertemuanFormData[]): RpsPertemuanSummary {
    let totalBobot = 0
    const weeksCovered: string[] = []
    let hasUts = false
    let hasUas = false

    const allWeeks = new Set<number>()

    pertemuans.forEach(p => {
      // Hitung bobot (hanya dari pertemuan reguler)
      if (p.tipe === 'reguler' && p.bobotPenilaianPersen) {
        totalBobot += p.bobotPenilaianPersen
      }

      // Track minggu yang tercakup
      weeksCovered.push(p.weekLabel)
      const weeks = parseWeekLabel(p.weekLabel)
      weeks.forEach(w => allWeeks.add(w))

      // Track UTS dan UAS
      if (p.tipe === 'uts') hasUts = true
      if (p.tipe === 'uas') hasUas = true
    })

    // Cek kelengkapan: harus ada minggu 1-16, UTS, UAS, dan total bobot 100
    const isComplete =
      allWeeks.size === 16 &&
      hasUts &&
      hasUas &&
      Math.abs(totalBobot - 100) < 0.1

    return {
      totalBobot: Math.round(totalBobot * 100) / 100,
      totalPertemuan: pertemuans.length,
      weeksCovered,
      hasUts,
      hasUas,
      isComplete
    }
  }

  /**
   * Cek apakah RPS siap di-export ke PDF
   */
  static canExportPdf(pertemuans: RpsPertemuanFormData[]): {
    canExport: boolean
    reason?: string
  } {
    const summary = this.calculateSummary(pertemuans)

    if (!summary.isComplete) {
      return {
        canExport: false,
        reason: 'Tabel pertemuan belum lengkap. Pastikan semua minggu 1-16 tercakup, UTS dan UAS ada, serta total bobot 100%.'
      }
    }

    const validation = this.validatePertemuanSet(pertemuans)
    if (!validation.valid) {
      return {
        canExport: false,
        reason: `Masih ada error validasi: ${validation.errors.join('; ')}`
      }
    }

    return { canExport: true }
  }
}
