"use client";

import { useState, useEffect, useCallback } from "react";

import { RpsPertemuanForm } from "./rps-pertemuan-form";

// ── Types ──────────────────────────────────────────────────────────────────

interface SubCpmk {
  id: string;
  kode: string;
  deskripsi: string;
  rpsCpmk: { id: string; kode: string };
}

interface Pustaka {
  id: string;
  kategori: "utama" | "pendukung";
  teksLengkap: string;
  urutan: number | null;
}

interface RpsPertemuan {
  id: string;
  orderNo: number;
  weekLabel: string;
  tipe: "reguler" | "ets" | "eas";
  subCpmkId?: string | null;
  subCpmkText?: string | null;
  indikatorPenilaian: string[];
  teknikPenilaian?: string | null;
  kriteriaPenilaian?: string | null;
  bentukPembelajaranLuring: string[];
  bentukPembelajaranDaring: string[];
  metodePembelajaran: string[];
  catatanPenugasan?: string | null;
  estimasiWaktuPb?: string | null;
  estimasiWaktuPt?: string | null;
  estimasiWaktuKm?: string | null;
  materiPembelajaran?: string | null;
  bobotPenilaianPersen?: number | null;
  deskripsiEvaluasi?: string | null;
  pustakaRefs: string[];
  notes?: string | null;
}

interface RpsPertemuanSummary {
  totalBobot: number;
  totalPertemuan: number;
  weeksCovered: string[];
  hasUts: boolean;
  hasUas: boolean;
  isComplete: boolean;
}

interface RpsPertemuanTableProps {
  rpsId: string;
  isReadOnly?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function TipeBadge({ tipe }: { tipe: string }) {
  const styles: Record<string, string> = {
    reguler: "bg-blue-100 text-blue-800",
    ets: "bg-yellow-100 text-yellow-800",
    eas: "bg-green-100 text-green-800",
  };
  const labels: Record<string, string> = {
    reguler: "Reguler",
    ets: "ETS / UTS",
    eas: "EAS / UAS",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[tipe] ?? ""}`}>
      {labels[tipe] ?? tipe}
    </span>
  );
}

// "initial"/"loading" → full-page spinner (first paint only)
// "refreshing"        → table stays visible, small inline indicator
// "loaded"            → normal view
// "error"             → initial load failed, show error screen
type TableLoadState = "initial" | "loading" | "loaded" | "refreshing" | "error";

// ── Component ──────────────────────────────────────────────────────────────

export function RpsPertemuanTable({ rpsId, isReadOnly = false }: RpsPertemuanTableProps) {
  const [pertemuans, setPertemuans] = useState<RpsPertemuan[]>([]);
  const [summary, setSummary] = useState<RpsPertemuanSummary | null>(null);
  const [loadState, setLoadState] = useState<TableLoadState>("initial");
  // fetchError: fatal — only set on initial load failure
  const [fetchError, setFetchError] = useState<string | null>(null);
  // refreshError: non-fatal — shown inline while table stays visible
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Form-related state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPertemuan, setEditingPertemuan] = useState<RpsPertemuan | null>(null);
  const [subCpmkList, setSubCpmkList] = useState<SubCpmk[]>([]);
  const [pustakaList, setPustakaList] = useState<Pustaka[]>([]);
  // No cache: always fetch fresh on each form open so Sub-CPMK/pustaka additions
  // made elsewhere on the page are immediately reflected without a page reload.
  const [isListsLoading, setIsListsLoading] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);

  // Per-row delete errors
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string | null>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchPertemuans = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") {
      setLoadState("loading");
      setFetchError(null);
    } else {
      setLoadState("refreshing");
      setRefreshError(null);
    }
    try {
      const res = await fetch(`/api/rps/${rpsId}/pertemuan`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Gagal memuat data pertemuan.");
      }
      const data = (await res.json()) as { pertemuans: RpsPertemuan[]; summary: RpsPertemuanSummary };
      setPertemuans(data.pertemuans);
      setSummary(data.summary);
      setLoadState("loaded");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data pertemuan.";
      if (mode === "initial") {
        // Fatal: no data yet, show error screen
        setFetchError(msg);
        setLoadState("error");
      } else {
        // Non-fatal: keep table visible, show inline error banner
        setRefreshError(msg);
        setLoadState("loaded");
      }
    }
  }, [rpsId]);

  useEffect(() => {
    fetchPertemuans("initial");
  }, [fetchPertemuans]);

  const loadFormLists = useCallback(async () => {
    setIsListsLoading(true);
    setListsError(null);
    try {
      const [subCpmkRes, pustakaRes] = await Promise.all([
        fetch(`/api/rps/${rpsId}/sub-cpmk`),
        fetch(`/api/rps/${rpsId}/pustaka`),
      ]);

      if (!subCpmkRes.ok || !pustakaRes.ok) {
        throw new Error("Gagal memuat daftar Sub-CPMK / Pustaka.");
      }

      const [subCpmkData, pustakaData] = await Promise.all([
        subCpmkRes.json() as Promise<{ data: SubCpmk[] }>,
        pustakaRes.json() as Promise<{ data: Pustaka[] }>,
      ]);

      setSubCpmkList(subCpmkData.data);
      setPustakaList(pustakaData.data);
    } catch (err) {
      setListsError(err instanceof Error ? err.message : "Gagal memuat data pendukung.");
    } finally {
      setIsListsLoading(false);
    }
  }, [rpsId]);

  // ── Actions ────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    await loadFormLists();
    setEditingPertemuan(null);
    setShowAddForm(true);
  };

  const handleEdit = async (pertemuan: RpsPertemuan) => {
    await loadFormLists();
    setShowAddForm(false);
    setEditingPertemuan(pertemuan);
  };

  const handleFormSuccess = () => {
    setShowAddForm(false);
    setEditingPertemuan(null);
    fetchPertemuans("refresh");
  };

  const handleFormCancel = () => {
    setShowAddForm(false);
    setEditingPertemuan(null);
  };

  const handleDelete = async (pertemuan: RpsPertemuan) => {
    if (!confirm(`Hapus pertemuan minggu "${pertemuan.weekLabel}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    setDeletingId(pertemuan.id);
    setDeleteErrors((prev) => ({ ...prev, [pertemuan.id]: null }));

    try {
      const res = await fetch(`/api/rps/${rpsId}/pertemuan/${pertemuan.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: { message?: string } | string }
          | null;
        const msg =
          typeof body?.error === "string"
            ? body.error
            : (body?.error as { message?: string })?.message;
        throw new Error(msg ?? "Gagal menghapus pertemuan.");
      }
      await fetchPertemuans("refresh");
    } catch (err) {
      setDeleteErrors((prev) => ({
        ...prev,
        [pertemuan.id]: err instanceof Error ? err.message : "Gagal menghapus.",
      }));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render states ──────────────────────────────────────────────────────

  // Full spinner only on first paint — never on subsequent refreshes
  if (loadState === "initial" || loadState === "loading") {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
        Memuat data pertemuan…
      </div>
    );
  }

  // Initial load failed entirely — no data to show
  if (loadState === "error") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {fetchError}
      </div>
    );
  }

  // "loaded" | "refreshing" — table always visible past this point
  const isRefreshing = loadState === "refreshing";
  const isFormActive = showAddForm || editingPertemuan !== null;

  return (
    <div className="space-y-6">
      {/* ── Refresh indicators (non-fatal, table stays visible) ───────── */}
      {isRefreshing && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
          Memperbarui data…
        </div>
      )}
      {refreshError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ Gagal memperbarui: {refreshError}
        </div>
      )}

      {/* ── Inline Form ───────────────────────────────────────────────── */}
      {isFormActive && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">
              {editingPertemuan ? `Edit Pertemuan — Minggu ${editingPertemuan.weekLabel}` : "Tambah Pertemuan Baru"}
            </h3>
            {listsError && (
              <p className="mt-1 text-sm text-amber-700">
                Peringatan: {listsError} — Beberapa fitur mungkin tidak tersedia.
              </p>
            )}
          </div>
          <RpsPertemuanForm
            rpsId={rpsId}
            pertemuanId={editingPertemuan?.id}
            initialValues={
              editingPertemuan
                ? {
                    orderNo: editingPertemuan.orderNo,
                    weekLabel: editingPertemuan.weekLabel,
                    tipe: editingPertemuan.tipe,
                    subCpmkId: editingPertemuan.subCpmkId,
                    subCpmkText: editingPertemuan.subCpmkText ?? "",
                    indikatorPenilaian: editingPertemuan.indikatorPenilaian,
                    teknikPenilaian: editingPertemuan.teknikPenilaian ?? "",
                    kriteriaPenilaian: editingPertemuan.kriteriaPenilaian ?? "",
                    bentukPembelajaranLuring: editingPertemuan.bentukPembelajaranLuring,
                    bentukPembelajaranDaring: editingPertemuan.bentukPembelajaranDaring,
                    metodePembelajaran: editingPertemuan.metodePembelajaran,
                    catatanPenugasan: editingPertemuan.catatanPenugasan ?? "",
                    estimasiWaktuPb: editingPertemuan.estimasiWaktuPb ?? "",
                    estimasiWaktuPt: editingPertemuan.estimasiWaktuPt ?? "",
                    estimasiWaktuKm: editingPertemuan.estimasiWaktuKm ?? "",
                    materiPembelajaran: editingPertemuan.materiPembelajaran ?? "",
                    bobotPenilaianPersen: editingPertemuan.bobotPenilaianPersen ?? undefined,
                    deskripsiEvaluasi: editingPertemuan.deskripsiEvaluasi ?? "",
                    pustakaRefs: editingPertemuan.pustakaRefs,
                    notes: editingPertemuan.notes ?? "",
                  }
                : undefined
            }
            subCpmkList={subCpmkList}
            pustakaList={pustakaList}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {/* ── Summary Card ──────────────────────────────────────────────── */}
      {summary && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Ringkasan Tabel Pertemuan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Total Pertemuan</p>
              <p className="text-2xl font-bold text-slate-900">{summary.totalPertemuan}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Total Bobot</p>
              <p
                className={`text-2xl font-bold ${
                  Math.abs(summary.totalBobot - 100) < 0.1 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {summary.totalBobot}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">ETS / UTS</p>
              <p className={`text-sm font-semibold ${summary.hasUts ? "text-emerald-600" : "text-rose-500"}`}>
                {summary.hasUts ? "✓ Sudah ada" : "✗ Belum ada"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">EAS / UAS</p>
              <p className={`text-sm font-semibold ${summary.hasUas ? "text-emerald-600" : "text-rose-500"}`}>
                {summary.hasUas ? "✓ Sudah ada" : "✗ Belum ada"}
              </p>
            </div>
          </div>

          {summary.isComplete ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              ✓ Tabel pertemuan sudah lengkap dan siap di-export.
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠ Tabel pertemuan belum lengkap.
              {summary.totalBobot !== 100 && " Total bobot belum 100%."}
              {!summary.hasUts && " Pertemuan ETS (minggu 8) belum diisi."}
              {!summary.hasUas && " Pertemuan EAS (minggu 16) belum diisi."}
              {summary.totalPertemuan < 16 && ` Baru ${summary.totalPertemuan} dari minimal 16 pertemuan.`}
            </div>
          )}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-12">
                  No
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-20">
                  Minggu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-28">
                  Tipe
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Kemampuan Akhir / Evaluasi
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Penilaian
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Metode & Waktu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-20">
                  Bobot
                </th>
                {!isReadOnly && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-36">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pertemuans.map((pertemuan) => {
                const isEditing = editingPertemuan?.id === pertemuan.id;
                const isDeleting = deletingId === pertemuan.id;
                const deleteErr = deleteErrors[pertemuan.id];
                return (
                  <>
                    <tr
                      key={pertemuan.id}
                      className={`transition-colors ${isEditing ? "bg-blue-50" : "hover:bg-slate-50"}`}
                    >
                      <td className="px-4 py-4 text-slate-700 font-medium">{pertemuan.orderNo}</td>
                      <td className="px-4 py-4 text-slate-700">{pertemuan.weekLabel}</td>
                      <td className="px-4 py-4">
                        <TipeBadge tipe={pertemuan.tipe} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-xs space-y-1">
                          {pertemuan.tipe === "reguler" ? (
                            <>
                              {pertemuan.subCpmkText && (
                                <p className="text-slate-800 leading-snug">{pertemuan.subCpmkText}</p>
                              )}
                              {pertemuan.notes && (
                                <p className="text-xs text-slate-500">{pertemuan.notes}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-slate-600 italic text-xs">
                              {pertemuan.deskripsiEvaluasi || (pertemuan.tipe === "ets" ? "Evaluasi Tengah Semester" : "Evaluasi Akhir Semester")}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {pertemuan.tipe === "reguler" ? (
                          <div className="space-y-1 max-w-xs">
                            {pertemuan.teknikPenilaian && (
                              <div>
                                <span className="text-xs font-medium text-slate-500">Teknik: </span>
                                <span className="text-xs text-slate-700">{pertemuan.teknikPenilaian}</span>
                              </div>
                            )}
                            {pertemuan.kriteriaPenilaian && (
                              <div>
                                <span className="text-xs font-medium text-slate-500">Kriteria: </span>
                                <span className="text-xs text-slate-700">{pertemuan.kriteriaPenilaian}</span>
                              </div>
                            )}
                            {pertemuan.indikatorPenilaian.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-slate-500">Indikator: </span>
                                <span className="text-xs text-slate-700">
                                  {pertemuan.indikatorPenilaian.join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {pertemuan.tipe === "reguler" ? (
                          <div className="space-y-1 max-w-xs">
                            {pertemuan.metodePembelajaran.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-slate-500">Metode: </span>
                                <span className="text-xs text-slate-700">
                                  {pertemuan.metodePembelajaran.join(", ")}
                                </span>
                              </div>
                            )}
                            {pertemuan.estimasiWaktuPb && (
                              <div className="text-xs text-slate-600">PB: {pertemuan.estimasiWaktuPb}</div>
                            )}
                            {pertemuan.estimasiWaktuPt && (
                              <div className="text-xs text-slate-600">PT: {pertemuan.estimasiWaktuPt}</div>
                            )}
                            {pertemuan.estimasiWaktuKm && (
                              <div className="text-xs text-slate-600">KM: {pertemuan.estimasiWaktuKm}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {pertemuan.bobotPenilaianPersen != null ? (
                          <span className="font-semibold text-slate-800">{pertemuan.bobotPenilaianPersen}%</span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      {!isReadOnly && (
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(pertemuan)}
                              disabled={isFormActive || isDeleting || isListsLoading}
                              className="text-xs font-medium text-[#0071e3] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Edit
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(pertemuan)}
                              disabled={isDeleting || isFormActive}
                              className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isDeleting ? "Menghapus…" : "Hapus"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {deleteErr && (
                      <tr key={`${pertemuan.id}-err`} className="bg-rose-50">
                        <td colSpan={isReadOnly ? 7 : 8} className="px-4 py-2 text-xs text-rose-700">
                          ⚠ {deleteErr}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {pertemuans.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">
            Belum ada data pertemuan. Klik &ldquo;Tambah Pertemuan&rdquo; untuk mulai mengisi tabel.
          </div>
        )}
      </div>

      {/* ── Add Button ────────────────────────────────────────────────── */}
      {!isReadOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={isFormActive || isListsLoading}
            className="rounded-2xl bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isListsLoading ? "Memuat data…" : "+ Tambah Pertemuan"}
          </button>
        </div>
      )}
    </div>
  );
}
