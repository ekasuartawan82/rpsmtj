"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type KurikulumOption = {
  id: string;
  tahun: string;
  label: string;
  isActive: boolean;
};

type RumpunOption = {
  id: string;
  nama: string;
};

type MataKuliahRecord = {
  id: string;
  kode: string;
  nama: string;
  rumpunId: string | null;
  kurikulumVersiId: string;
  sksTeori: number;
  sksPraktik: number;
  semester: number;
  isActive: boolean;
  rumpun: RumpunOption | null;
  kurikulumVersi: KurikulumOption;
};

type MataKuliahPanelProps = {
  items: MataKuliahRecord[];
  kurikulumOptions: KurikulumOption[];
  rumpunOptions: RumpunOption[];
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

export function MataKuliahPanel({
  items,
  kurikulumOptions,
  rumpunOptions,
  selectedKurikulumVersiId,
}: MataKuliahPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateErrors, setUpdateErrors] = useState<Record<string, string | null>>({});
  const [isPending, startTransition] = useTransition();

  function updateFilter(kurikulumVersiId: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (kurikulumVersiId) {
      params.set("kurikulumVersiId", kurikulumVersiId);
    } else {
      params.delete("kurikulumVersiId");
    }

    const queryString = params.toString();
    router.push(queryString ? `/admin/mata-kuliah?${queryString}` : "/admin/mata-kuliah");
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
              Filter mata kuliah berdasarkan kurikulum versi.
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
          Create Mata Kuliah
        </p>
        <h2 className="mt-4 font-heading text-3xl text-slate-950">
          Tambah mata kuliah dengan relasi rumpun dan kurikulum versi.
        </h2>

        <form
          className="mt-8 grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            startTransition(async () => {
              try {
                setCreateError(null);

                await submitJson("/api/admin/mata-kuliah", "POST", {
                  kode: String(formData.get("kode") ?? ""),
                  nama: String(formData.get("nama") ?? ""),
                  rumpunId: String(formData.get("rumpunId") ?? ""),
                  kurikulumVersiId: String(formData.get("kurikulumVersiId") ?? ""),
                  sksTeori: String(formData.get("sksTeori") ?? ""),
                  sksPraktik: String(formData.get("sksPraktik") ?? ""),
                  semester: String(formData.get("semester") ?? ""),
                  isActive: formData.get("isActive") === "on",
                });

                form.reset();
                router.refresh();
              } catch (error) {
                setCreateError(
                  error instanceof Error ? error.message : "Gagal membuat mata kuliah."
                );
              }
            });
          }}
        >
          <input
            name="kode"
            required
            placeholder="Contoh: MTJ101"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <input
            name="nama"
            required
            placeholder="Nama mata kuliah"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
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
          <select
            name="rumpunId"
            defaultValue=""
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          >
            <option value="">Tanpa rumpun</option>
            {rumpunOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nama}
              </option>
            ))}
          </select>
          <input
            name="semester"
            type="number"
            min={1}
            max={6}
            required
            placeholder="Semester"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <input
            name="sksTeori"
            type="number"
            min={0}
            required
            placeholder="SKS Teori"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <input
            name="sksPraktik"
            type="number"
            min={0}
            required
            placeholder="SKS Praktik"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 md:col-span-2">
            <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
            Mata kuliah aktif
          </label>

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
            {isPending ? "Menyimpan..." : "Simpan Mata Kuliah"}
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
                  {item.kode} • {item.nama}
                </p>
                <p className="text-sm text-slate-600">
                  {item.kurikulumVersi.label}
                  {item.rumpun ? ` • ${item.rumpun.nama}` : ""}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  item.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {item.isActive ? "Aktif" : "Nonaktif"}
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

                    await submitJson(`/api/admin/mata-kuliah/${item.id}`, "PATCH", {
                      action: "update",
                      data: {
                        kode: String(formData.get("kode") ?? ""),
                        nama: String(formData.get("nama") ?? ""),
                        rumpunId: String(formData.get("rumpunId") ?? ""),
                        kurikulumVersiId: String(formData.get("kurikulumVersiId") ?? ""),
                        sksTeori: String(formData.get("sksTeori") ?? ""),
                        sksPraktik: String(formData.get("sksPraktik") ?? ""),
                        semester: String(formData.get("semester") ?? ""),
                      },
                    });

                    router.refresh();
                  } catch (error) {
                    setUpdateErrors((current) => ({
                      ...current,
                      [item.id]:
                        error instanceof Error ? error.message : "Gagal memperbarui mata kuliah.",
                    }));
                  }
                });
              }}
            >
              <input
                name="kode"
                defaultValue={item.kode}
                required
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />
              <input
                name="nama"
                defaultValue={item.nama}
                required
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />
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
              <select
                name="rumpunId"
                defaultValue={item.rumpunId ?? ""}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              >
                <option value="">Tanpa rumpun</option>
                {rumpunOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.nama}
                  </option>
                ))}
              </select>
              <input
                name="semester"
                type="number"
                min={1}
                max={6}
                defaultValue={item.semester}
                required
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />
              <input
                name="sksTeori"
                type="number"
                min={0}
                defaultValue={item.sksTeori}
                required
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />
              <input
                name="sksPraktik"
                type="number"
                min={0}
                defaultValue={item.sksPraktik}
                required
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />

              {updateErrors[item.id] ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
                  {updateErrors[item.id]}
                </div>
              ) : null}

              <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-2xl bg-[#0071e3] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-60"
                >
                  {isPending ? "Menyimpan..." : "Update Mata Kuliah"}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        setUpdateErrors((current) => ({ ...current, [item.id]: null }));

                        await submitJson(`/api/admin/mata-kuliah/${item.id}`, "PATCH", {
                          action: "toggle_active",
                          isActive: !item.isActive,
                        });

                        router.refresh();
                      } catch (error) {
                        setUpdateErrors((current) => ({
                          ...current,
                          [item.id]:
                            error instanceof Error
                              ? error.message
                              : "Gagal mengubah status aktif mata kuliah.",
                        }));
                      }
                    });
                  }}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>
            </form>
          </details>
        ))}
      </section>
    </div>
  );
}
