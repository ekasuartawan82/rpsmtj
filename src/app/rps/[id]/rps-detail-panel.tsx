"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DosenOption = {
  id: string;
  nama: string;
  email: string;
};

type DosenPengampuItem = {
  id: string;
  userId: string;
  isPengembang: boolean;
  urutan: number | null;
  user: {
    id: string;
    nama: string;
    email: string;
  };
};

type CplProdiOption = {
  id: string;
  kode: string;
  kategori: string;
  deskripsi: string;
  urutan: number | null;
};

const CPL_KLASIFIKASI: Record<string, string[]> = {
  "CPL-1":  ["S", "KU"],
  "CPL-2":  ["KK", "KU", "P"],
  "CPL-3":  ["KK", "P"],
  "CPL-4":  ["KK", "P"],
  "CPL-5":  ["KK", "P"],
  "CPL-6":  ["KK", "KU", "P"],
  "CPL-7":  ["KK", "KU"],
  "CPL-8":  ["KK", "P"],
  "CPL-9":  ["KK", "P", "S"],
  "CPL-10": ["KU", "S"],
};

function formatCplLabel(kode: string): string {
  const tags = CPL_KLASIFIKASI[kode];
  if (!tags) return kode;
  return `${kode} ${tags.map((t) => `[${t}]`).join(", ")}`;
}

type RpsCplEntry = {
  id: string;
  urutan: number | null;
  cpl: CplProdiOption;
};

type CpmkCplLink = {
  id: string;
  rpsCplId: string;
  rpsCpl: {
    id: string;
    urutan: number | null;
    cpl: {
      id: string;
      kode: string;
      kategori: string;
    };
  };
};

type SubCpmkEntry = {
  id: string;
  rpsCpmkId: string;
  kode: string;
  deskripsi: string;
  urutan: number;
  targetKetercapaianPersen: string | null;
};

type CpmkEntry = {
  id: string;
  kode: string;
  deskripsi: string;
  urutan: number;
  cplLinks: CpmkCplLink[];
  subCpmkEntries: SubCpmkEntry[];
};

type RpsDetailPanelProps = {
  rps: {
    id: string;
    deskripsiSingkat: string | null;
    bahanKajian: string | null;
    catatanTambahan: string | null;
    tanggalPenyusunan: string;
    dosenPengampu: DosenPengampuItem[];
    rpsCplEntries: RpsCplEntry[];
    rpsCpmkEntries: CpmkEntry[];
  };
  dosenOptions: DosenOption[];
  cplProdiOptions: CplProdiOption[];
};

async function submitJson(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
) {
  const response = await fetch(url, {
    method,
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
}

export function RpsDetailPanel({ rps, dosenOptions, cplProdiOptions }: RpsDetailPanelProps) {
  const router = useRouter();
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string | null>>({});
  const [cplError, setCplError] = useState<string | null>(null);
  const [selectedCplId, setSelectedCplId] = useState("");
  const [cplDeleteErrors, setCplDeleteErrors] = useState<Record<string, string | null>>({});
  const [createCpmkError, setCreateCpmkError] = useState<string | null>(null);
  const [updateCpmkErrors, setUpdateCpmkErrors] = useState<Record<string, string | null>>({});
  const [deleteCpmkErrors, setDeleteCpmkErrors] = useState<Record<string, string | null>>({});
  const [linkCplErrors, setLinkCplErrors] = useState<Record<string, string | null>>({});
  const [unlinkCplErrors, setUnlinkCplErrors] = useState<Record<string, string | null>>({});
  const [createSubCpmkErrors, setCreateSubCpmkErrors] = useState<Record<string, string | null>>(
    {}
  );
  const [updateSubCpmkErrors, setUpdateSubCpmkErrors] = useState<Record<string, string | null>>(
    {}
  );
  const [deleteSubCpmkErrors, setDeleteSubCpmkErrors] = useState<Record<string, string | null>>(
    {}
  );
  const [isPending, startTransition] = useTransition();

  const existingUserIds = new Set(rps.dosenPengampu.map((item) => item.userId));
  const availableDosenOptions = dosenOptions.filter((item) => !existingUserIds.has(item.id));
  const selectedCplIds = new Set(rps.rpsCplEntries.map((item) => item.cpl.id));
  const availableCplOptions = cplProdiOptions.filter((item) => !selectedCplIds.has(item.id));

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          Detail Draft
        </p>
        <h2 className="mt-4 font-heading text-3xl text-slate-950">
          Perbarui deskripsi, bahan kajian, dan catatan penyusunan RPS.
        </h2>

        <form
          className="mt-8 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            startTransition(async () => {
              try {
                setUpdateError(null);

                await submitJson(`/api/rps/${rps.id}`, "PATCH", {
                  deskripsiSingkat: String(formData.get("deskripsiSingkat") ?? ""),
                  bahanKajian: String(formData.get("bahanKajian") ?? ""),
                  catatanTambahan: String(formData.get("catatanTambahan") ?? ""),
                  tanggalPenyusunan: String(formData.get("tanggalPenyusunan") ?? ""),
                });

                router.refresh();
              } catch (error) {
                setUpdateError(
                  error instanceof Error ? error.message : "Gagal memperbarui detail draft RPS."
                );
              }
            });
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Tanggal penyusunan</span>
              <input
                name="tanggalPenyusunan"
                type="date"
                defaultValue={rps.tanggalPenyusunan}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Deskripsi singkat</span>
            <textarea
              name="deskripsiSingkat"
              rows={5}
              defaultValue={rps.deskripsiSingkat ?? ""}
              placeholder="Ringkasan mata kuliah, ruang lingkup, dan orientasi pembelajaran."
              className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm leading-7 outline-none transition focus:border-[#0071e3]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Bahan kajian</span>
            <textarea
              name="bahanKajian"
              rows={6}
              defaultValue={rps.bahanKajian ?? ""}
              placeholder="Topik utama atau ruang lingkup materi yang dibahas di mata kuliah ini."
              className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm leading-7 outline-none transition focus:border-[#0071e3]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Catatan tambahan</span>
            <textarea
              name="catatanTambahan"
              rows={4}
              defaultValue={rps.catatanTambahan ?? ""}
              placeholder="Catatan pelaksanaan, konteks institusi, atau hal penting lain."
              className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm leading-7 outline-none transition focus:border-[#0071e3]"
            />
          </label>

          {updateError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {updateError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? "Menyimpan..." : "Simpan Detail Draft"}
          </button>
        </form>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          Dosen Pengampu
        </p>
        <h2 className="mt-4 font-heading text-3xl text-slate-950">
          Kelola dosen pengampu yang terlibat pada mata kuliah ini.
        </h2>

        <form
          className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            startTransition(async () => {
              try {
                setAddError(null);

                await submitJson(`/api/rps/${rps.id}/dosen-pengampu`, "POST", {
                  userId: String(formData.get("userId") ?? ""),
                });

                form.reset();
                router.refresh();
              } catch (error) {
                setAddError(
                  error instanceof Error ? error.message : "Gagal menambahkan dosen pengampu."
                );
              }
            });
          }}
        >
          <select
            name="userId"
            required
            defaultValue=""
            disabled={availableDosenOptions.length === 0}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3] disabled:bg-slate-100"
          >
            <option value="" disabled>
              {availableDosenOptions.length === 0
                ? "Semua dosen aktif sudah terdaftar"
                : "Pilih dosen pengampu"}
            </option>
            {availableDosenOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nama} • {item.email}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending || availableDosenOptions.length === 0}
            className="rounded-2xl bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-60"
          >
            {isPending ? "Memproses..." : "Tambah Pengampu"}
          </button>

          {addError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
              {addError}
            </div>
          ) : null}
        </form>

        <div className="mt-8 space-y-4">
          {rps.dosenPengampu.map((item) => (
            <article
              key={item.id}
              className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">{item.user.nama}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.user.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                      item.isPengembang
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {item.isPengembang ? "Pengembang" : "Pengampu"}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Urutan {item.urutan ?? "-"}
                  </span>
                  <button
                    type="button"
                    disabled={isPending || item.isPengembang}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          setDeleteErrors((current) => ({ ...current, [item.id]: null }));

                          await submitJson(`/api/rps/${rps.id}/dosen-pengampu`, "DELETE", {
                            userId: item.userId,
                          });

                          router.refresh();
                        } catch (error) {
                          setDeleteErrors((current) => ({
                            ...current,
                            [item.id]:
                              error instanceof Error
                                ? error.message
                                : "Gagal menghapus dosen pengampu.",
                          }));
                        }
                      });
                    }}
                    className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {item.isPengembang ? "Terkunci" : isPending ? "Memproses..." : "Hapus"}
                  </button>
                </div>
              </div>

              {deleteErrors[item.id] ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {deleteErrors[item.id]}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          CPL Mapping
        </p>
        <h2 className="mt-4 font-heading text-3xl text-slate-950">
          Tambahkan CPL prodi yang relevan sebagai fondasi turunan CPMK dan Sub-CPMK.
        </h2>

        <form
          className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            startTransition(async () => {
              try {
                setCplError(null);

                await submitJson(`/api/rps/${rps.id}/cpl`, "POST", {
                  cplProdiId: String(formData.get("cplProdiId") ?? ""),
                });

                form.reset();
                setSelectedCplId("");
                router.refresh();
              } catch (error) {
                setCplError(error instanceof Error ? error.message : "Gagal menambahkan CPL.");
              }
            });
          }}
        >
          <select
            name="cplProdiId"
            required
            value={selectedCplId}
            onChange={(e) => setSelectedCplId(e.target.value)}
            disabled={availableCplOptions.length === 0}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3] disabled:bg-slate-100"
          >
            <option value="" disabled>
              {availableCplOptions.length === 0
                ? "Semua CPL kurikulum sudah dipakai"
                : "Pilih CPL prodi"}
            </option>
            {availableCplOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {formatCplLabel(item.kode)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending || availableCplOptions.length === 0}
            className="rounded-2xl bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-60"
          >
            {isPending ? "Memproses..." : "Tambah CPL"}
          </button>

          {(() => {
            const preview = availableCplOptions.find((o) => o.id === selectedCplId);
            return preview ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600 md:col-span-2">
                <strong className="block font-semibold text-slate-800">
                  {formatCplLabel(preview.kode)}
                </strong>
                <p>{preview.deskripsi}</p>
              </div>
            ) : null;
          })()}

          {cplError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
              {cplError}
            </div>
          ) : null}
        </form>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {rps.rpsCplEntries.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm leading-7 text-slate-600 lg:col-span-2">
              Belum ada CPL yang dipetakan ke RPS ini.
            </div>
          ) : (
            rps.rpsCplEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {entry.cpl.kode} [{entry.cpl.kategori}]
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{entry.cpl.deskripsi}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Urutan {entry.urutan ?? "-"}
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            setCplDeleteErrors((current) => ({ ...current, [entry.id]: null }));

                            await submitJson(`/api/rps/${rps.id}/cpl`, "DELETE", {
                              cplProdiId: entry.cpl.id,
                            });

                            router.refresh();
                          } catch (error) {
                            setCplDeleteErrors((current) => ({
                              ...current,
                              [entry.id]:
                                error instanceof Error ? error.message : "Gagal menghapus CPL.",
                            }));
                          }
                        });
                      }}
                      className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      {isPending ? "Memproses..." : "Hapus"}
                    </button>
                  </div>
                </div>

                {cplDeleteErrors[entry.id] ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {cplDeleteErrors[entry.id]}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          CPMK dan Sub-CPMK
        </p>
        <h2 className="mt-4 font-heading text-3xl text-slate-950">
          Susun CPMK, kaitkan ke CPL, lalu turunkan Sub-CPMK di bawahnya.
        </h2>

        {/* OBE Warning Summary */}
        {(() => {
          const unmappedCpmks = rps.rpsCpmkEntries.filter((cpmk) => cpmk.cplLinks.length === 0);
          if (unmappedCpmks.length > 0) {
            return (
              <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900">
                      {unmappedCpmks.length} CPMK belum di-mapping ke CPL
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      Sesuai prinsip OBE, setiap CPMK harus terhubung ke minimal satu CPL.
                      RPS tidak dapat disubmit sebelum semua CPMK memiliki mapping CPL.
                    </p>
                    <div className="mt-2 text-xs text-amber-700">
                      CPMK terpengaruh: {unmappedCpmks.map((c) => c.kode).join(", ")}
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        <form
          className="mt-8 grid gap-4 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            startTransition(async () => {
              try {
                setCreateCpmkError(null);

                await submitJson(`/api/rps/${rps.id}/cpmk`, "POST", {
                  kode: String(formData.get("kode") ?? ""),
                  deskripsi: String(formData.get("deskripsi") ?? ""),
                  urutan: String(formData.get("urutan") ?? ""),
                });

                form.reset();
                router.refresh();
              } catch (error) {
                setCreateCpmkError(error instanceof Error ? error.message : "Gagal membuat CPMK.");
              }
            });
          }}
        >
          <input
            name="kode"
            required
            placeholder="Kode CPMK"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <input
            name="urutan"
            type="number"
            min={1}
            required
            placeholder="Urutan"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? "Menyimpan..." : "Tambah CPMK"}
          </button>
          <textarea
            name="deskripsi"
            required
            rows={4}
            placeholder="Deskripsi CPMK"
            className="rounded-3xl border border-slate-300 px-4 py-3 text-sm leading-7 outline-none transition focus:border-[#0071e3] md:col-span-3"
          />

          {createCpmkError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-3">
              {createCpmkError}
            </div>
          ) : null}
        </form>

        <div className="mt-8 space-y-6">
          {rps.rpsCpmkEntries.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm leading-7 text-slate-600">
              Belum ada CPMK pada RPS ini.
            </div>
          ) : (
            rps.rpsCpmkEntries.map((cpmk) => {
              const linkedRpsCplIds = new Set(cpmk.cplLinks.map((link) => link.rpsCplId));
              const availableLinkOptions = rps.rpsCplEntries.filter(
                (entry) => !linkedRpsCplIds.has(entry.id)
              );
              const hasNoCplMapping = cpmk.cplLinks.length === 0;

              return (
                <article
                  key={cpmk.id}
                  className={`rounded-[28px] border px-5 py-5 ${
                    hasNoCplMapping
                      ? "border-amber-300 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-heading text-2xl text-slate-950">
                            {cpmk.kode} • CPMK #{cpmk.urutan}
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">{cpmk.deskripsi}</p>
                        </div>
                        {hasNoCplMapping && (
                          <div className="rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                            ⚠️ Belum di-mapping ke CPL
                          </div>
                        )}
                      </div>
                      {hasNoCplMapping && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          <strong>Wajib OBE:</strong> Setiap CPMK harus terhubung ke minimal satu CPL.
                          Silakan pilih CPL pada formulir di bawah ini.
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            setDeleteCpmkErrors((current) => ({ ...current, [cpmk.id]: null }));

                            await submitJson(`/api/rps/${rps.id}/cpmk/${cpmk.id}`, "DELETE");
                            router.refresh();
                          } catch (error) {
                            setDeleteCpmkErrors((current) => ({
                              ...current,
                              [cpmk.id]:
                                error instanceof Error ? error.message : "Gagal menghapus CPMK.",
                            }));
                          }
                        });
                      }}
                      className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      {isPending ? "Memproses..." : "Hapus CPMK"}
                    </button>
                  </div>

                  <form
                    className="mt-6 grid gap-4 md:grid-cols-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);

                      startTransition(async () => {
                        try {
                          setUpdateCpmkErrors((current) => ({ ...current, [cpmk.id]: null }));

                          await submitJson(`/api/rps/${rps.id}/cpmk/${cpmk.id}`, "PATCH", {
                            kode: String(formData.get("kode") ?? ""),
                            deskripsi: String(formData.get("deskripsi") ?? ""),
                            urutan: String(formData.get("urutan") ?? ""),
                          });

                          router.refresh();
                        } catch (error) {
                          setUpdateCpmkErrors((current) => ({
                            ...current,
                            [cpmk.id]:
                              error instanceof Error ? error.message : "Gagal memperbarui CPMK.",
                          }));
                        }
                      });
                    }}
                  >
                    <input
                      name="kode"
                      defaultValue={cpmk.kode}
                      required
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
                    />
                    <input
                      name="urutan"
                      type="number"
                      min={1}
                      defaultValue={cpmk.urutan}
                      required
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
                    />
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-2xl bg-[#0071e3] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-60"
                    >
                      {isPending ? "Menyimpan..." : "Update CPMK"}
                    </button>
                    <textarea
                      name="deskripsi"
                      rows={4}
                      defaultValue={cpmk.deskripsi}
                      required
                      className="rounded-3xl border border-slate-300 px-4 py-3 text-sm leading-7 outline-none transition focus:border-[#0071e3] md:col-span-3"
                    />
                  </form>

                  {updateCpmkErrors[cpmk.id] ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {updateCpmkErrors[cpmk.id]}
                    </div>
                  ) : null}

                  {deleteCpmkErrors[cpmk.id] ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {deleteCpmkErrors[cpmk.id]}
                    </div>
                  ) : null}

                  <div className="mt-8 rounded-[24px] border border-slate-200 bg-white px-5 py-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Link CPL
                    </p>
                    <form
                      className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        const formData = new FormData(form);

                        startTransition(async () => {
                          try {
                            setLinkCplErrors((current) => ({ ...current, [cpmk.id]: null }));

                            await submitJson(`/api/rps/${rps.id}/cpmk/${cpmk.id}/cpl`, "POST", {
                              rpsCplId: String(formData.get("rpsCplId") ?? ""),
                            });

                            form.reset();
                            router.refresh();
                          } catch (error) {
                            setLinkCplErrors((current) => ({
                              ...current,
                              [cpmk.id]:
                                error instanceof Error
                                  ? error.message
                                  : "Gagal menautkan CPMK ke CPL.",
                            }));
                          }
                        });
                      }}
                    >
                      <select
                        name="rpsCplId"
                        required
                        defaultValue=""
                        disabled={availableLinkOptions.length === 0}
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3] disabled:bg-slate-100"
                      >
                        <option value="" disabled>
                          {availableLinkOptions.length === 0
                            ? "Semua CPL sudah tertaut"
                            : "Pilih CPL untuk CPMK ini"}
                        </option>
                        {availableLinkOptions.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.cpl.kode} [{entry.cpl.kategori}]
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={isPending || availableLinkOptions.length === 0}
                        className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {isPending ? "Memproses..." : "Tautkan CPL"}
                      </button>
                    </form>

                    {linkCplErrors[cpmk.id] ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {linkCplErrors[cpmk.id]}
                      </div>
                    ) : null}

                    {unlinkCplErrors[cpmk.id] ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {unlinkCplErrors[cpmk.id]}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      {cpmk.cplLinks.length === 0 ? (
                        <p className="text-sm text-slate-600">Belum ada CPL yang tertaut ke CPMK ini.</p>
                      ) : (
                        cpmk.cplLinks.map((link) => (
                          <div
                            key={link.id}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                              {link.rpsCpl.cpl.kode} [{link.rpsCpl.cpl.kategori}]
                            </span>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    setUnlinkCplErrors((current) => ({ ...current, [cpmk.id]: null }));

                                    await submitJson(
                                      `/api/rps/${rps.id}/cpmk/${cpmk.id}/cpl`,
                                      "DELETE",
                                      {
                                        rpsCplId: link.rpsCplId,
                                      }
                                    );

                                    router.refresh();
                                  } catch (error) {
                                    setUnlinkCplErrors((current) => ({
                                      ...current,
                                      [cpmk.id]:
                                        error instanceof Error
                                          ? error.message
                                          : "Gagal melepas link CPMK-CPL.",
                                    }));
                                  }
                                });
                              }}
                              className="rounded-full border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                            >
                              Lepas
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-8 rounded-[24px] border border-slate-200 bg-white px-5 py-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Sub-CPMK
                    </p>
                    <form
                      className="mt-4 grid gap-4 md:grid-cols-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        const formData = new FormData(form);

                        startTransition(async () => {
                          try {
                            setCreateSubCpmkErrors((current) => ({ ...current, [cpmk.id]: null }));

                            await submitJson(`/api/rps/${rps.id}/sub-cpmk`, "POST", {
                              cpmkId: cpmk.id,
                              kode: String(formData.get("kode") ?? ""),
                              deskripsi: String(formData.get("deskripsi") ?? ""),
                              urutan: String(formData.get("urutan") ?? ""),
                              targetKetercapaianPersen: String(
                                formData.get("targetKetercapaianPersen") ?? ""
                              ),
                            });

                            form.reset();
                            router.refresh();
                          } catch (error) {
                            setCreateSubCpmkErrors((current) => ({
                              ...current,
                              [cpmk.id]:
                                error instanceof Error
                                  ? error.message
                                  : "Gagal membuat Sub-CPMK.",
                            }));
                          }
                        });
                      }}
                    >
                      <input
                        name="kode"
                        required
                        placeholder="Kode Sub-CPMK"
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
                      />
                      <input
                        name="urutan"
                        type="number"
                        min={1}
                        required
                        placeholder="Urutan"
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
                      />
                      <input
                        name="targetKetercapaianPersen"
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        placeholder="Target %"
                        className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
                      />
                      <textarea
                        name="deskripsi"
                        rows={4}
                        required
                        placeholder="Deskripsi Sub-CPMK"
                        className="rounded-3xl border border-slate-300 px-4 py-3 text-sm leading-7 outline-none transition focus:border-[#0071e3] md:col-span-3"
                      />
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-2xl bg-[#0071e3] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-60 md:col-span-3"
                      >
                        {isPending ? "Menyimpan..." : "Tambah Sub-CPMK"}
                      </button>
                    </form>

                    {createSubCpmkErrors[cpmk.id] ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {createSubCpmkErrors[cpmk.id]}
                      </div>
                    ) : null}

                    <div className="mt-6 space-y-4">
                      {cpmk.subCpmkEntries.length === 0 ? (
                        <p className="text-sm text-slate-600">
                          Belum ada Sub-CPMK untuk CPMK ini.
                        </p>
                      ) : (
                        cpmk.subCpmkEntries.map((subCpmk) => (
                          <article
                            key={subCpmk.id}
                            className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="font-semibold text-slate-950">
                                  {subCpmk.kode} • Sub-CPMK #{subCpmk.urutan}
                                </p>
                                <p className="mt-2 text-sm leading-7 text-slate-600">
                                  {subCpmk.deskripsi}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  startTransition(async () => {
                                    try {
                                      setDeleteSubCpmkErrors((current) => ({
                                        ...current,
                                        [subCpmk.id]: null,
                                      }));

                                      await submitJson(
                                        `/api/rps/${rps.id}/sub-cpmk/${subCpmk.id}`,
                                        "DELETE"
                                      );

                                      router.refresh();
                                    } catch (error) {
                                      setDeleteSubCpmkErrors((current) => ({
                                        ...current,
                                        [subCpmk.id]:
                                          error instanceof Error
                                            ? error.message
                                            : "Gagal menghapus Sub-CPMK.",
                                      }));
                                    }
                                  });
                                }}
                                className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                              >
                                {isPending ? "Memproses..." : "Hapus Sub-CPMK"}
                              </button>
                            </div>

                            <form
                              className="mt-5 grid gap-4 md:grid-cols-3"
                              onSubmit={(event) => {
                                event.preventDefault();
                                const formData = new FormData(event.currentTarget);

                                startTransition(async () => {
                                  try {
                                    setUpdateSubCpmkErrors((current) => ({
                                      ...current,
                                      [subCpmk.id]: null,
                                    }));

                                    await submitJson(
                                      `/api/rps/${rps.id}/sub-cpmk/${subCpmk.id}`,
                                      "PATCH",
                                      {
                                        kode: String(formData.get("kode") ?? ""),
                                        deskripsi: String(formData.get("deskripsi") ?? ""),
                                        urutan: String(formData.get("urutan") ?? ""),
                                        targetKetercapaianPersen: String(
                                          formData.get("targetKetercapaianPersen") ?? ""
                                        ),
                                      }
                                    );

                                    router.refresh();
                                  } catch (error) {
                                    setUpdateSubCpmkErrors((current) => ({
                                      ...current,
                                      [subCpmk.id]:
                                        error instanceof Error
                                          ? error.message
                                          : "Gagal memperbarui Sub-CPMK.",
                                    }));
                                  }
                                });
                              }}
                            >
                              <input
                                name="kode"
                                defaultValue={subCpmk.kode}
                                required
                                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
                              />
                              <input
                                name="urutan"
                                type="number"
                                min={1}
                                defaultValue={subCpmk.urutan}
                                required
                                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
                              />
                              <input
                                name="targetKetercapaianPersen"
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                defaultValue={subCpmk.targetKetercapaianPersen ?? ""}
                                placeholder="Target %"
                                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
                              />
                              <textarea
                                name="deskripsi"
                                rows={4}
                                defaultValue={subCpmk.deskripsi}
                                required
                                className="rounded-3xl border border-slate-300 px-4 py-3 text-sm leading-7 outline-none transition focus:border-[#0071e3] md:col-span-3"
                              />
                              <button
                                type="submit"
                                disabled={isPending}
                                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 md:col-span-3"
                              >
                                {isPending ? "Menyimpan..." : "Update Sub-CPMK"}
                              </button>
                            </form>

                            {updateSubCpmkErrors[subCpmk.id] ? (
                              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {updateSubCpmkErrors[subCpmk.id]}
                              </div>
                            ) : null}

                            {deleteSubCpmkErrors[subCpmk.id] ? (
                              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {deleteSubCpmkErrors[subCpmk.id]}
                              </div>
                            ) : null}
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
