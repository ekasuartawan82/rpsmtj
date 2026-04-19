import { ValidationError } from "@/lib/errors";

import type { RpsDocumentData } from "./types";

/**
 * Document status categorization for export policy
 *
 * Final/Approved: approved
 *   - Can be used for official purposes
 *   - MUST have approval history
 *   - NO watermark
 *
 * In-Progress: submitted_to_rmk, approved_by_rmk, submitted_to_kaprodi
 *   - Under review/approval workflow
 *   - Watermark: "DOKUMEN DALAM PROSES PENGESAHAN"
 *   - Approval history optional but expected
 *
 * Draft/Revision: draft, revision_requested_by_rmk, revision_requested_by_kaprodi
 *   - Not ready for any official use
 *   - Watermark: "DOKUMEN DRAFT - TIDAK UNTUK DISEBARKAN"
 *   - Approval history optional
 *
 * Superseded: superseded
 *   - Historical reference only
 *   - Watermark: "DOKUMEN KADALUARSA - VERSI BARU TERSEDIA"
 *   - Approval history expected (historical record)
 */
type DocumentStatusCategory =
  | "final" // approved
  | "in_progress" // submitted_to_rmk, approved_by_rmk, submitted_to_kaprodi
  | "draft" // draft, revision_requested_by_*
  | "superseded"; // superseded

function getDocumentStatusCategory(status: string): DocumentStatusCategory {
  if (status === "approved") return "final";
  if (
    status === "submitted_to_rmk" ||
    status === "approved_by_rmk" ||
    status === "submitted_to_kaprodi"
  )
    return "in_progress";
  if (
    status === "draft" ||
    status === "revision_requested_by_rmk" ||
    status === "revision_requested_by_kaprodi"
  )
    return "draft";
  if (status === "superseded") return "superseded";

  // Fallback for unknown statuses
  return "draft";
}

export function validateRpsDocument(data: RpsDocumentData) {
  if (!data.identity.namaMatkul.trim() || !data.identity.kodeMatkul.trim()) {
    throw new ValidationError("Identitas mata kuliah belum lengkap untuk diekspor.");
  }

  if (data.cpl.length === 0) {
    throw new ValidationError("CPL belum diisi.");
  }

  if (data.cpmk.length === 0) {
    throw new ValidationError("CPMK belum diisi.");
  }

  if (data.subCpmk.length === 0) {
    throw new ValidationError("Sub-CPMK belum diisi.");
  }

  if (data.pertemuan.length === 0) {
    throw new ValidationError("Pertemuan kosong.");
  }

  const totalBobotRegular = data.pertemuan
    .filter((row) => row.tipe === "regular")
    .reduce((sum, row) => sum + (row.bobotPenilaianPersen ?? 0), 0);

  if (Math.abs(totalBobotRegular - 100) > 0.01) {
    throw new ValidationError(
      `Total bobot penilaian pertemuan reguler adalah ${totalBobotRegular.toFixed(2)}%, harus 100%.`
    );
  }

  // Audit trail validation: Approved documents MUST have approval history
  const statusCategory = getDocumentStatusCategory(data.infoUmum.status);

  if (statusCategory === "final") {
    if (!data.approvalHistory || data.approvalHistory.length === 0) {
      throw new ValidationError(
        "Dokumen berstatus approved belum memiliki riwayat persetujuan. Dokumen tidak lengkap untuk keperluan audit."
      );
    }
  }

  // Policy check: non-final documents should have clear indication
  // This doesn't throw error, but the render layer should add watermark
  // based on status category (see render-rps-document.ts)
}

/**
 * Export helper for render layer to determine watermark display
 */
export { getDocumentStatusCategory };
export type { DocumentStatusCategory };
