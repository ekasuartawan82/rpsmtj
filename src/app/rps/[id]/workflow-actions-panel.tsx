"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type WorkflowActionsPanelProps = {
  rpsId: string;
  status: string;
};

type ValidationWarning = {
  id: string;
  message: string;
  details: string[];
  acknowledged: boolean;
  acknowledgedAt: string | null;
};

async function submitJson<T>(url: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers:
      method === "POST"
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
    body: method === "POST" && body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(payload?.error?.message ?? "Permintaan gagal diproses.");
  }

  return response.json() as Promise<T>;
}

async function getValidationWarnings(rpsId: string): Promise<ValidationWarning[]> {
  const result = await submitJson<{ data: { warnings: ValidationWarning[] } }>(
    `/api/rps/${rpsId}/validate`,
    "GET"
  );

  return result.data.warnings;
}

async function acknowledgeValidationWarning(
  rpsId: string,
  warningId: string
): Promise<ValidationWarning[]> {
  const result = await submitJson<{ data: { warnings: ValidationWarning[] } }>(
    `/api/rps/${rpsId}/validate`,
    "POST",
    { warningId }
  );

  return result.data.warnings;
}

async function submitPost<T>(url: string, body?: unknown): Promise<T> {
  return submitJson<T>(url, "POST", body);
}

export function WorkflowActionsPanel({ rpsId, status }: WorkflowActionsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const [isLoadingWarnings, setIsLoadingWarnings] = useState(true);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [warningActionError, setWarningActionError] = useState<string | null>(null);
  const [pendingWarningId, setPendingWarningId] = useState<string | null>(null);

  // Warnings hanya relevan saat RPS masih draft — status lain tidak dapat diubah
  const warningsApplicable = status === "draft";

  const loadWarnings = async () => {
    if (!warningsApplicable) return [];
    setIsLoadingWarnings(true);
    try {
      const warningData = await getValidationWarnings(rpsId);
      setWarnings(warningData);
      return warningData;
    } finally {
      setIsLoadingWarnings(false);
    }
  };

  // Load validation warnings on mount (hanya untuk draft)
  useEffect(() => {
    if (!warningsApplicable) {
      setIsLoadingWarnings(false);
      return;
    }

    const initializeWarnings = async () => {
      try {
        setIsLoadingWarnings(true);
        const warningData = await getValidationWarnings(rpsId);
        setWarnings(warningData);
      } catch {
        setWarnings([]);
      } finally {
        setIsLoadingWarnings(false);
      }
    };

    void initializeWarnings();
  }, [rpsId, warningsApplicable]);

  // Determine which buttons to show based on status
  const showSubmitToRmk = status === "draft";
  const showCloneForRevision =
    status === "revision_requested_by_rmk" || status === "revision_requested_by_kaprodi";
  const unacknowledgedWarnings = warnings.filter((warning) => !warning.acknowledged);
  const allWarningsAcknowledged =
    warnings.length > 0 && unacknowledgedWarnings.length === 0;

  const handleSubmitToRmk = () => {
    startTransition(async () => {
      try {
        setActionError(null);
        setWarningActionError(null);
        const latestWarnings = await loadWarnings();

        if (latestWarnings.some((warning) => !warning.acknowledged)) {
          setWarningsExpanded(true);
          setWarningDialogOpen(true);
          return;
        }

        await submitPost(`/api/rps/${rpsId}/submit`);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Gagal mengajukan ke RMK.");
      }
    });
  };

  const handleCloneForRevision = () => {
    startTransition(async () => {
      try {
        setActionError(null);
        const result = await submitPost<{ data: { newRpsId: string } }>(
          `/api/rps/${rpsId}/clone-for-revision`
        );
        router.push(`/rps/${result.data.newRpsId}`);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Gagal memulai revisi.");
      }
    });
  };

  const handleAcknowledgeWarning = (warningId: string) => {
    startTransition(async () => {
      try {
        setWarningActionError(null);
        setPendingWarningId(warningId);
        const updatedWarnings = await acknowledgeValidationWarning(rpsId, warningId);
        setWarnings(updatedWarnings);
      } catch (error) {
        setWarningActionError(
          error instanceof Error ? error.message : "Gagal menyimpan acknowledgement warning."
        );
      } finally {
        setPendingWarningId(null);
      }
    });
  };

  const handleSubmitAfterAcknowledgement = () => {
    startTransition(async () => {
      try {
        setActionError(null);
        setWarningActionError(null);
        await submitPost(`/api/rps/${rpsId}/submit`);
        setWarningDialogOpen(false);
        router.refresh();
      } catch (error) {
        setWarningActionError(
          error instanceof Error ? error.message : "Gagal mengajukan ke RMK."
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Validation Warnings */}
      {!isLoadingWarnings && warnings.length > 0 && (
        <section className="rounded-2xl border border-[#e5e5ea] bg-[#f5f5f7] px-5 py-4">
          <button
            onClick={() => setWarningsExpanded(!warningsExpanded)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <div className="text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
                  {warnings.length} Peringatan Validasi
                </p>
                <p className="mt-1 text-xs text-[#6e6e73]">
                  {allWarningsAcknowledged
                    ? "Semua warning aktif sudah di-acknowledge."
                    : `${unacknowledgedWarnings.length} warning masih perlu di-acknowledge sebelum submit.`}
                </p>
              </div>
            </div>
            <span className="text-sm text-[#6e6e73]">
              {warningsExpanded ? "▼" : "▶"}
            </span>
          </button>

          {warningsExpanded && (
            <ul className="mt-4 space-y-2">
              {warnings.map((warning) => (
                <li
                  key={warning.id}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#1d1d1f]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      [{warning.id}] {warning.message}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        warning.acknowledged
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {warning.acknowledged ? "Di-acknowledge" : "Belum di-acknowledge"}
                    </span>
                  </div>
                  {warning.details.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                      {warning.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Workflow Action Buttons */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          Aksi Workflow
        </p>
        <h2 className="mt-4 font-heading text-3xl text-slate-950">
          Ajukan RPS untuk tahap selanjutnya
        </h2>

        <div className="mt-6 flex flex-wrap gap-3">
          {showSubmitToRmk && (
            <button
              onClick={handleSubmitToRmk}
              disabled={isPending}
              className="rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
            >
              {isPending ? "Mengajukan..." : "Ajukan ke RMK"}
            </button>
          )}

          {showCloneForRevision && (
            <button
              onClick={handleCloneForRevision}
              disabled={isPending}
              className="rounded-2xl bg-orange-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              {isPending ? "Menyiapkan revisi..." : "Mulai Revisi"}
            </button>
          )}

          {actionError && (
            <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {actionError}
            </div>
          )}
        </div>
      </div>

      {warningDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <section className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
              Konfirmasi Warning
            </p>
            <h2 className="mt-4 font-heading text-3xl text-slate-950">
              Baca dan acknowledge seluruh warning sebelum submit
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              PRD meminta setiap warning dibaca dan di-dismiss secara eksplisit sebelum RPS
              diajukan ke RMK. Aksi ini akan dicatat pada audit trail.
            </p>

            <div className="mt-6 space-y-4">
              {warnings.map((warning) => (
                <article
                  key={warning.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {warning.id}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-800">{warning.message}</p>
                    </div>
                    <div className="md:text-right">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          warning.acknowledged
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {warning.acknowledged ? "Sudah di-acknowledge" : "Perlu di-acknowledge"}
                      </span>
                      {warning.acknowledgedAt && (
                        <p className="mt-2 text-xs text-slate-500">
                          Dicatat{" "}
                          {new Intl.DateTimeFormat("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(warning.acknowledgedAt))}
                        </p>
                      )}
                    </div>
                  </div>

                  {warning.details.length > 0 && (
                    <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {warning.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  )}

                  {!warning.acknowledged && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAcknowledgeWarning(warning.id)}
                      className="mt-5 rounded-2xl border border-sky-200 px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 disabled:opacity-60"
                    >
                      {pendingWarningId === warning.id ? "Mencatat..." : "Saya mengerti"}
                    </button>
                  )}
                </article>
              ))}
            </div>

            {warningActionError && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {warningActionError}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setWarningDialogOpen(false)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={isPending || warnings.some((warning) => !warning.acknowledged)}
                onClick={handleSubmitAfterAcknowledgement}
                className="rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
              >
                {isPending ? "Mengajukan..." : "Ajukan ke RMK"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
