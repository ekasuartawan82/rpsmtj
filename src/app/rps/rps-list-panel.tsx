"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type RpsRecord = {
  id: string;
  tahunAkademik: string;
  status: string;
  versionNo: number;
  versionCount: number;
  mataKuliah: {
    id: string;
    kode: string;
    nama: string;
  };
  dosenPengembang: {
    nama: string;
  };
};

type MataKuliahOption = {
  id: string;
  kode: string;
  nama: string;
};

type RpsListPanelProps = {
  initialRps: RpsRecord[];
  mataKuliahOptions: MataKuliahOption[];
  dosenOptions: Array<{
    id: string;
    nama: string;
    email: string;
    role: string;
  }>;
  currentUserId: string;
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

async function submitJson(url: string, method: "POST", body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(payload?.error?.message ?? "Permintaan gagal diproses.");
  }

  return response.json();
}

async function deleteJson(url: string) {
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(payload?.error?.message ?? "Permintaan gagal diproses.");
  }

  return response.json();
}

export function RpsListPanel({ initialRps, mataKuliahOptions, dosenOptions, currentUserId }: RpsListPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string | null>>({});
  const hasMataKuliahOptions = mataKuliahOptions.length > 0;

  // Filter state
  const [filterTahun, setFilterTahun] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Apply filters
  const filteredRps = initialRps.filter((rps) => {
    const matchTahun = !filterTahun || rps.tahunAkademik.includes(filterTahun);
    const matchStatus = !filterStatus || rps.status === filterStatus;
    return matchTahun && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Filter tahun akademik..."
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-[#0071e3]"
          >
            <option value="">Semua status</option>
            <option value="draft">Draft</option>
            <option value="submitted_to_rmk">Submitted ke RMK</option>
            <option value="revision_requested_by_rmk">Revisi oleh RMK</option>
            <option value="approved_by_rmk">Disetujui RMK</option>
            <option value="submitted_to_kaprodi">Submitted ke Kaprodi</option>
            <option value="revision_requested_by_kaprodi">Revisi oleh Kaprodi</option>
            <option value="approved">Approved</option>
            <option value="superseded">Superseded</option>
          </select>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="ml-auto rounded-full bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0059b5]"
          >
            {showCreateForm ? "Tutup Form" : "Buat RPS Baru"}
          </button>
        </div>
      </section>

      {/* Create Form */}
      {showCreateForm && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
            Buat RPS Baru
          </p>
          <h2 className="mt-4 font-heading text-3xl text-slate-950">
            Tambah RPS draft baru untuk mata kuliah
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            Hanya mata kuliah aktif pada kurikulum versi yang sedang aktif yang dapat dipilih.
          </p>

          {!hasMataKuliahOptions && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Belum ada mata kuliah aktif pada kurikulum versi aktif. Admin perlu mengaktifkan
              kurikulum dan mata kuliah terlebih dahulu sebelum RPS baru bisa dibuat.
            </div>
          )}

          <form
            className="mt-8 grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              startTransition(async () => {
                try {
                  setCreateFormError(null);

                  const result = await submitJson("/api/rps", "POST", {
                    mataKuliahId: String(formData.get("mataKuliahId") ?? ""),
                    tahunAkademik: String(formData.get("tahunAkademik") ?? ""),
                    dosenPengembangId: currentUserId,
                    koordinatorRmkId: String(formData.get("koordinatorRmkId") ?? ""),
                    kaprodiId: String(formData.get("kaprodiId") ?? ""),
                  });

                  const { id } = (result as { data: { id: string } }).data;
                  router.push(`/rps/${id}`);
                } catch (error) {
                  setCreateFormError(error instanceof Error ? error.message : "Gagal membuat RPS.");
                }
              });
            }}
          >
            <select
              name="mataKuliahId"
              required
              disabled={!hasMataKuliahOptions || isPending}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              defaultValue=""
            >
              <option value="" disabled>
                {hasMataKuliahOptions ? "Pilih mata kuliah" : "Belum ada mata kuliah aktif"}
              </option>
              {mataKuliahOptions.map((mk) => (
                <option key={mk.id} value={mk.id}>
                  {mk.kode} - {mk.nama}
                </option>
              ))}
            </select>
            <input
              name="tahunAkademik"
              type="text"
              required
              placeholder="2024/2025"
              pattern="[0-9]{4}/[0-9]{4}"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
            />
            <select
              name="koordinatorRmkId"
              required
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
            >
              <option value="" disabled>
                Pilih Koordinator RMK
              </option>
              {dosenOptions.filter((d) => d.role === "koordinator_rmk").map((dosen) => (
                <option key={dosen.id} value={dosen.id}>
                  {dosen.nama}
                </option>
              ))}
            </select>
            <select
              name="kaprodiId"
              required
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
            >
              <option value="" disabled>
                Pilih Kaprodi
              </option>
              {dosenOptions.filter((d) => d.role === "kaprodi").map((dosen) => (
                <option key={dosen.id} value={dosen.id}>
                  {dosen.nama}
                </option>
              ))}
            </select>

            {createFormError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
                {createFormError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending || !hasMataKuliahOptions}
              className="rounded-full bg-[#0071e3] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-60 md:col-span-2"
            >
              {isPending ? "Menyimpan..." : "Simpan Draft RPS"}
            </button>
          </form>
        </section>
      )}

      {/* RPS List */}
      <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/88 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Dashboard Versi Aktif
          </p>
          <h2 className="mt-2 font-heading text-2xl text-slate-950">
            {filteredRps.length} mata kuliah ditampilkan
          </h2>
        </div>

        {filteredRps.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-heading text-2xl text-slate-950">Tidak ada RPS yang cocok dengan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50/90 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">
                    Mata Kuliah
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">
                    Tahun Akademik
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Status</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Versi Aktif</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">
                    Dosen Pengembang
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-[0.16em]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {filteredRps.map((rps) => (
                  <tr key={rps.id} className="align-top">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-950">{rps.mataKuliah.kode}</p>
                      <p className="mt-1 text-slate-600">{rps.mataKuliah.nama}</p>
                      {rps.versionCount > 1 && (
                        <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                          {rps.versionCount} versi
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700">{rps.tahunAkademik}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                          statusClasses[rps.status] ?? "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {statusLabels[rps.status] ?? rps.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <p className="font-semibold text-slate-900">v{rps.versionNo}</p>
                      <span className="mt-2 inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                        Versi aktif
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{rps.dosenPengembang.nama}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/rps/${rps.id}`}
                            className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                          >
                            Buka Detail
                          </Link>
                          {rps.status === "draft" ? (
                            <button
                              disabled={isPending}
                              onClick={() => {
                                if (!confirm(`Hapus RPS ${rps.mataKuliah.kode} (${rps.tahunAkademik} v${rps.versionNo})? Tindakan ini tidak dapat dibatalkan.`)) return;
                                startTransition(async () => {
                                  try {
                                    setDeleteErrors((prev) => ({ ...prev, [rps.id]: null }));
                                    await deleteJson(`/api/rps/${rps.id}`);
                                    router.refresh();
                                  } catch (error) {
                                    setDeleteErrors((prev) => ({
                                      ...prev,
                                      [rps.id]: error instanceof Error ? error.message : "Gagal menghapus RPS.",
                                    }));
                                  }
                                });
                              }}
                              className="inline-flex rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          ) : null}
                        </div>
                        {deleteErrors[rps.id] ? (
                          <p className="text-xs text-rose-600">{deleteErrors[rps.id]}</p>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
