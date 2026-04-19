import { ValidationError } from "@/lib/errors";

const CLONE_ALLOWED_STATUSES = [
  "revision_requested_by_rmk",
  "revision_requested_by_kaprodi",
] as const;

export function assertCanCloneFromStatus(status: string): void {
  if (!CLONE_ALLOWED_STATUSES.includes(status as (typeof CLONE_ALLOWED_STATUSES)[number])) {
    throw new ValidationError(
      "Clone revisi hanya boleh dilakukan dari status revision_requested_by_rmk atau revision_requested_by_kaprodi."
    );
  }
}
