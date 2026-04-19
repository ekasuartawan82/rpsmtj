"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ReviewDecisionPanelProps = {
  actorRole: "koordinator_rmk" | "kaprodi";
  rpsId: string;
  status: string;
};

async function submitAction(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: body
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(payload?.error?.message ?? "Permintaan gagal diproses.");
  }

  return response.json();
}

export function ReviewDecisionPanel({
  actorRole,
  rpsId,
  status,
}: ReviewDecisionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRmk = actorRole === "koordinator_rmk";
  const reviewEndpoint = isRmk
    ? `/api/rps/${rpsId}/review-rmk`
    : `/api/rps/${rpsId}/review-kaprodi`;
  const reviewReadyStatus = isRmk ? "submitted_to_rmk" : "submitted_to_kaprodi";
  const forwardReadyStatus = isRmk ? "approved_by_rmk" : null;

  const handleApprove = () => {
    const confirmationMessage = isRmk
      ? "Setujui RPS ini untuk diteruskan ke tahap Kaprodi?"
      : "Setujui RPS ini sebagai versi final?";

    if (!confirm(confirmationMessage)) {
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        await submitAction(reviewEndpoint, { action: "approve" });
        router.push("/review");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Gagal menyimpan keputusan review."
        );
      }
    });
  };

  const handleReject = (catatan: string) => {
    startTransition(async () => {
      try {
        setError(null);
        await submitAction(reviewEndpoint, { action: "reject", catatan });
        router.push("/review");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Gagal mengembalikan RPS."
        );
      }
    });
  };

  const handleForwardToKaprodi = () => {
    if (!confirm("Teruskan RPS ini ke Kaprodi untuk review final?")) {
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        await submitAction(`/api/rps/${rpsId}/submit-kaprodi`);
        router.push("/review");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Gagal meneruskan RPS ke Kaprodi."
        );
      }
    });
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
        Keputusan Review
      </p>
      <h2 className="mt-4 font-heading text-3xl text-slate-950">
        {isRmk ? "Form keputusan Koordinator RMK" : "Form keputusan Kaprodi"}
      </h2>
      <p className="mt-4 text-sm leading-7 text-slate-700">
        Halaman ini bersifat read-only untuk isi RPS. Reviewer hanya dapat memberi keputusan
        jika status dokumen memang sedang berada pada tahap review yang sesuai.
      </p>

      {status === reviewReadyStatus ? (
        <>
          {!showRejectForm ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
              >
                {isPending ? "Memproses..." : isRmk ? "Setujui dan teruskan" : "Setujui versi final"}
              </button>
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                disabled={isPending}
                className="rounded-2xl border border-rose-300 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
              >
                {isPending ? "Memproses..." : "Kembalikan dengan catatan"}
              </button>
            </div>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const catatan = String(formData.get("catatan") ?? "");

                if (catatan.trim().length < 20) {
                  setError("Catatan penolakan minimal 20 karakter.");
                  return;
                }

                handleReject(catatan);
              }}
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Catatan Review
                </label>
                <textarea
                  name="catatan"
                  required
                  minLength={20}
                  rows={5}
                  placeholder="Jelaskan perbaikan yang diperlukan (minimal 20 karakter)"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Catatan ini akan masuk ke audit trail dan terlihat oleh dosen pengembang.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-2xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {isPending ? "Memproses..." : "Kirim penolakan"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  disabled={isPending}
                  className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </>
      ) : status === forwardReadyStatus ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
            RPS ini sudah disetujui Koordinator RMK dan siap diteruskan ke Kaprodi.
          </div>
          <button
            type="button"
            onClick={handleForwardToKaprodi}
            disabled={isPending}
            className="rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:opacity-60"
          >
            {isPending ? "Memproses..." : "Teruskan ke Kaprodi"}
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
          Dokumen ini saat ini berstatus <strong>{status}</strong>, sehingga tidak ada aksi review
          yang dapat dilakukan dari halaman ini.
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </section>
  );
}
