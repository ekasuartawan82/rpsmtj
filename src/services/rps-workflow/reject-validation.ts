import { ValidationError } from "@/lib/errors";

const MIN_REJECT_NOTE_LENGTH = 20;

export function assertRejectReasonValid(action: string, catatanReview?: string | null): void {
  const isRejectAction = action === "reject_rmk" || action === "reject_kaprodi";

  if (!isRejectAction) {
    return;
  }

  if (!catatanReview || catatanReview.trim().length < MIN_REJECT_NOTE_LENGTH) {
    throw new ValidationError(
      "Catatan review wajib diisi minimal 20 karakter untuk aksi reject."
    );
  }
}
