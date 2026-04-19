"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type KurikulumOption = {
  id: string;
  tahun: string;
  label: string;
  isActive: boolean;
};

type CplRecord = {
  id: string;
  kode: string;
  kategori: "S" | "P" | "KU" | "KK";
  deskripsi: string;
  urutan: number | null;
  kurikulumVersiId: string;
  kurikulumVersi: KurikulumOption;
};

type CplProdiPanelProps = {
  items: CplRecord[];
  kurikulumOptions: KurikulumOption[];
  selectedKurikulumVersiId?: string;
};

async function submitJson(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(payload?.error?.message ?? "Permintaan gagal diproses.");
  }
}

async function deleteRecord(url: string) {
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(payload?.error?.message ?? "Gagal menghapus data.");
  }
}

export function CplProdiPanel({
  items,
  kurikulumOptions,
  selectedKurikulumVersiId,
}: CplProdiPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateErrors, setUpdateErrors] = useState<Record<string, string | null>>({});
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string | null>>({});
  const [isPending, startTransition] = useTransition();

  function updateFilter(kurikulumVersiId: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (kurikulumVersiId) {
      params.set("kurikulumVersiId", kurikulumVersiId);
    } else {
      params.delete("kurikulumVersiId");
    }

    const queryString = params.toString();
    router.push(queryString ? `/admin/cpl-prodi?${queryString}` : "/admin/cpl-prodi");
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
              Filter
            </p>
            <h2 className="mt-4 font-heading text-3xl text-slate-950">
              Filter list CPL berdasarkan kurikulum versi.
            </h2>
          </div>
          <select
            value={selectedKurikulumVersiId ?? ""}
            onChange={(event) => updateFilter(event.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          >
            <option value="">Semua kurikulum</option>
            {kurikulumOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
                {item.isActive ? " (Aktif)" : ""}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          Create CPL
        </p>
        <h2 className="mt-4 font-heading text-3xl text-slate-950">
          Tambah CPL Prodi untuk kurikulum versi tertentu.
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          <strong>Catatan penting:</strong> Gunakan format kode CPL Prodi (misalnya: CPL-1, CPL-2, dst.),
          bukan kode CPL 4 ranah (S1, P1, KU1, KK1). CPL Prodi adalah capaian operasional yang akan
          digunakan dalam RPS dan di-mapping ke CPMK.
        </p>

        <form
          className="mt-8 grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            startTransition(async () => {
              try {
                setCreateError(null);

                await submitJson("/api/admin/cpl-prodi", "POST", {
                  kurikulumVersiId: String(formData.get("kurikulumVersiId") ?? ""),
                  kode: String(formData.get("kode") ?? ""),
                  deskripsi: String(formData.get("deskripsi") ?? ""),
                  urutan: String(formData.get("urutan") ?? ""),
                });

                form.reset();
                router.refresh();
              } catch (error) {
                setCreateError(error instanceof Error ? error.message : "Gagal membuat CPL Prodi.");
              }
            });
          }}
        >
          <select
            name="kurikulumVersiId"
            required
            defaultValue={selectedKurikulumVersiId ?? ""}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          >
            <option value="" disabled>
              Pilih kurikulum versi
            </option>
            {kurikulumOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
                {item.isActive ? " (Aktif)" : ""}
              </option>
            ))}
          </select>
          <input
            name="kode"
            required
            placeholder="Contoh: CPL-1"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <input
            name="urutan"
            type="number"
            min={1}
            placeholder="Urutan (opsional)"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <textarea
            name="deskripsi"
            required
            rows={4}
            placeholder="Deskripsi CPL"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3] md:col-span-2"
          />

          {createError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
              {createError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 md:col-span-2"
          >
            {isPending ? "Menyimpan..." : "Simpan CPL Prodi"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {items.map((item) => (
          <details
            key={item.id}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <summary className="flex cursor-pointer list-none flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-950">
                  {item.kode}
                </p>
                <p className="text-sm text-slate-600">{item.kurikulumVersi.label}</p>
              </div>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Urutan {item.urutan ?? "-"}
              </span>
            </summary>

            <form
              className="mt-6 grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                startTransition(async () => {
                  try {
                    setUpdateErrors((current) => ({ ...current, [item.id]: null }));

                    await submitJson(`/api/admin/cpl-prodi/${item.id}`, "PATCH", {
                      kurikulumVersiId: String(formData.get("kurikulumVersiId") ?? ""),
                      kode: String(formData.get("kode") ?? ""),
                      kategori: item.kategori,
                      deskripsi: String(formData.get("deskripsi") ?? ""),
                      urutan: String(formData.get("urutan") ?? ""),
                    });

                    router.refresh();
                  } catch (error) {
                    setUpdateErrors((current) => ({
                      ...current,
                      [item.id]:
                        error instanceof Error ? error.message : "Gagal memperbarui CPL Prodi.",
                    }));
                  }
                });
              }}
            >
              <select
                name="kurikulumVersiId"
                defaultValue={item.kurikulumVersiId}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              >
                {kurikulumOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                    {option.isActive ? " (Aktif)" : ""}
                  </option>
                ))}
              </select>
              <input
                name="kode"
                defaultValue={item.kode}
                required
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />
              <input
                name="urutan"
                type="number"
                min={1}
                defaultValue={item.urutan ?? ""}
                placeholder="Urutan (opsional)"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />
              <textarea
                name="deskripsi"
                defaultValue={item.deskripsi}
                required
                rows={4}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3] md:col-span-2"
              />

              {updateErrors[item.id] ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
                  {updateErrors[item.id]}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="rounded-2xl bg-[#0071e3] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-60 md:col-span-2"
              >
                {isPending ? "Menyimpan..." : "Update CPL Prodi"}
              </button>
            </form>

            <div className="mt-4 border-t border-slate-100 pt-4">
              {deleteErrors[item.id] && (
                <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {deleteErrors[item.id]}
                </div>
              )}
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (!confirm(`Hapus CPL "${item.kode}"? Tindakan ini tidak dapat dibatalkan.`)) {
                    return;
                  }

                  startTransition(async () => {
                    try {
                      setDeleteErrors((current) => ({ ...current, [item.id]: null }));
                      await deleteRecord(`/api/admin/cpl-prodi/${item.id}`);
                      router.refresh();
                    } catch (error) {
                      setDeleteErrors((current) => ({
                        ...current,
                        [item.id]: error instanceof Error ? error.message : "Gagal menghapus CPL Prodi.",
                      }));
                    }
                  });
                }}
                className="rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
              >
                Hapus CPL ini
              </button>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
