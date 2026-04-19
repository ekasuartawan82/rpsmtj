"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type VersionHistoryItem = {
  id: string;
  versionNo: number;
  status: string;
  createdAt: string;
  latestApprovalLog: {
    action: string;
    catatanReview: string | null;
    createdAt: string;
    actorUser: {
      nama: string;
    };
  } | null;
};

type VersionHistoryPanelProps = {
  rpsId: string;
};

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

async function fetchVersionHistory(rpsId: string): Promise<VersionHistoryItem[]> {
  const response = await fetch(`/api/rps/${rpsId}/versions`, {
    method: "GET",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(payload?.error?.message ?? "Gagal memuat riwayat versi.");
  }

  const result = (await response.json()) as { data: VersionHistoryItem[] };
  return result.data;
}

function formatActionLabel(action: string) {
  return action.replace(/_/g, " ").toUpperCase();
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function VersionHistoryPanel({ rpsId }: VersionHistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<VersionHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsOpen(false);
    setIsLoading(false);
    setHistory([]);
    setError(null);
  }, [rpsId]);

  const handleToggle = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (!nextOpen || history.length > 0 || isLoading) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const items = await fetchVersionHistory(rpsId);
      setHistory(items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat riwayat versi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
      <button
        type="button"
        onClick={() => {
          void handleToggle();
        }}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
            Riwayat Versi
          </p>
          <h2 className="mt-4 font-heading text-3xl text-slate-950">
            Lihat semua versi historis RPS ini
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            Panel ini menampilkan rantai versi lengkap beserta log workflow terbaru untuk tiap
            versi.
          </p>
        </div>
        <span className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          {isOpen ? "Sembunyikan" : "Lihat Riwayat Versi"}
        </span>
      </button>

      {isOpen && (
        <div className="mt-6 space-y-4">
          {isLoading && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Memuat riwayat versi...
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {!isLoading && !error && history.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Belum ada riwayat versi untuk RPS ini.
            </div>
          )}

          {!isLoading &&
            !error &&
            history.map((version) => {
              const isCurrentVersion = version.id === rpsId;

              return (
                <article
                  key={version.id}
                  className={`rounded-3xl border px-5 py-5 ${
                    isCurrentVersion
                      ? "border-sky-200 bg-sky-50/70"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-heading text-2xl text-slate-950">v{version.versionNo}</p>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                            statusClasses[version.status] ?? "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {statusLabels[version.status] ?? version.status}
                        </span>
                        {isCurrentVersion && (
                          <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                            Versi aktif
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        Dibuat {formatDateTime(version.createdAt)}
                      </p>
                    </div>

                    <Link
                      href={`/rps/${version.id}`}
                      className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white"
                    >
                      Buka Versi Ini
                    </Link>
                  </div>

                  {version.latestApprovalLog ? (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Log Workflow Terbaru
                      </p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {formatActionLabel(version.latestApprovalLog.action)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Oleh {version.latestApprovalLog.actorUser.nama} pada{" "}
                        {formatDateTime(version.latestApprovalLog.createdAt)}
                      </p>
                      {version.latestApprovalLog.catatanReview && (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                            Catatan Reviewer
                          </p>
                          <p className="mt-2 text-sm text-amber-900">
                            {version.latestApprovalLog.catatanReview}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                      Belum ada log workflow untuk versi ini.
                    </div>
                  )}
                </article>
              );
            })}
        </div>
      )}
    </section>
  );
}
