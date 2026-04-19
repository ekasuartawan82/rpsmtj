import { requireAnyRole } from "@/lib/auth/session";
import { listReviewQueue } from "@/services/review";

import { ReviewDashboardPanel } from "./review-dashboard-panel";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted_to_rmk: "Submitted ke RMK",
  revision_requested_by_rmk: "Revisi oleh RMK",
  approved_by_rmk: "Disetujui RMK",
  submitted_to_kaprodi: "Submitted ke Kaprodi",
  revision_requested_by_kaprodi: "Revisi oleh Kaprodi",
  approved: "Approved",
  superseded: "Superseded",
};

const statusClasses: Record<string, string> = {
  draft: "bg-amber-100 text-amber-900",
  submitted_to_rmk: "bg-sky-100 text-sky-800",
  revision_requested_by_rmk: "bg-rose-100 text-rose-800",
  approved_by_rmk: "bg-emerald-100 text-emerald-800",
  submitted_to_kaprodi: "bg-cyan-100 text-cyan-800",
  revision_requested_by_kaprodi: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  superseded: "bg-slate-200 text-slate-700",
};

export default async function ReviewDashboardPage() {
  const session = await requireAnyRole(["koordinator_rmk", "kaprodi"]);
  const actorRole = session.user.role as "koordinator_rmk" | "kaprodi";
  const queue = await listReviewQueue(session.user.id, actorRole);

  return (
    <div className="space-y-10">
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-[#6e6e73]">
          Dashboard Review
        </span>
        <h1 className="mt-2 text-[2rem] font-bold leading-tight tracking-tight text-[#1d1d1f]">
          Antrian keputusan reviewer
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Pantau RPS yang menunggu keputusan Anda, buka detail read-only, lalu setujui
          atau kembalikan dengan catatan review yang jelas.
        </p>
      </div>

      <ReviewDashboardPanel
        actorRole={actorRole}
        pending={queue.pending}
        other={queue.other}
        statusLabels={statusLabels}
        statusClasses={statusClasses}
      />
    </div>
  );
}
