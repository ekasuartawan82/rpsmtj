export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatList(items: string[]) {
  if (items.length === 0) {
    return "-";
  }

  return items.map((item) => escapeHtml(item)).join("<br />");
}

export function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${value.toFixed(2)}%`;
}

export function formatStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted_to_rmk: "Submitted ke RMK",
    revision_requested_by_rmk: "Revisi oleh RMK",
    approved_by_rmk: "Disetujui RMK",
    submitted_to_kaprodi: "Submitted ke Kaprodi",
    revision_requested_by_kaprodi: "Revisi oleh Kaprodi",
    approved: "Approved",
    superseded: "Superseded",
  };

  return labels[status] ?? status;
}

export function formatMeetingTypeLabel(
  tipe: "regular" | "ets" | "eas"
) {
  if (tipe === "regular") return "Reguler";
  if (tipe === "ets") return "ETS";
  return "EAS";
}

