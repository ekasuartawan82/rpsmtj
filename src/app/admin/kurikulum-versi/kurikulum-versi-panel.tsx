"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type KurikulumVersiRecord = {
  id: string;
  tahun: string;
  label: string;
  isActive: boolean;
  createdAt: Date;
};

type KurikulumVersiPanelProps = {
  items: KurikulumVersiRecord[];
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

export function KurikulumVersiPanel({ items }: KurikulumVersiPanelProps) {
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateErrors, setUpdateErrors] = useState<Record<string, string | null>>({});
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string | null>>({});
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          Create Kurikulum
        </p>
        <h2 className="mt-4 font-heading text-3xl text-slate-950">
          Tambah versi kurikulum baru dan tentukan apakah langsung aktif.
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

                await submitJson("/api/admin/kurikulum-versi", "POST", {
                  tahun: String(formData.get("tahun") ?? ""),
                  label: String(formData.get("label") ?? ""),
                  isActive: formData.get("isActive") === "on",
                });

                form.reset();
                router.refresh();
              } catch (error) {
                setCreateError(
                  error instanceof Error ? error.message : "Gagal membuat kurikulum versi."
                );
              }
            });
          }}
        >
          <input
            name="tahun"
            required
            maxLength={4}
            placeholder="2025"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <input
            name="label"
            required
            placeholder="Kurikulum 2025"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 md:col-span-2">
            <input name="isActive" type="checkbox" className="h-4 w-4" />
            Jadikan versi aktif setelah dibuat
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
            {isPending ? "Menyimpan..." : "Simpan Kurikulum Versi"}
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
                <p className="font-semibold text-slate-950">{item.label}</p>
                <p className="text-sm text-slate-600">Tahun {item.tahun}</p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  item.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {item.isActive ? "Aktif" : "Tidak aktif"}
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

                    await submitJson(`/api/admin/kurikulum-versi/${item.id}`, "PATCH", {
                      action: "update",
                      data: {
                        tahun: String(formData.get("tahun") ?? ""),
                        label: String(formData.get("label") ?? ""),
                      },
                    });

                    router.refresh();
                  } catch (error) {
                    setUpdateErrors((current) => ({
                      ...current,
                      [item.id]:
                        error instanceof Error
                          ? error.message
                          : "Gagal memperbarui kurikulum versi.",
                    }));
                  }
                });
              }}
            >
              <input
                name="tahun"
                defaultValue={item.tahun}
                required
                maxLength={4}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />
              <input
                name="label"
                defaultValue={item.label}
                required
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />

              {updateErrors[item.id] ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
                  {updateErrors[item.id]}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="rounded-2xl bg-[#0071e3] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-60"
              >
                {isPending ? "Menyimpan..." : "Update"}
              </button>

              <button
                type="button"
                disabled={isPending || item.isActive}
                onClick={() => {
                  if (!confirm(`Aktifkan kurikulum "${item.label}"? Kurikulum aktif saat ini akan dinonaktifkan.`)) {
                    return;
                  }

                  startTransition(async () => {
                    try {
                      setUpdateErrors((current) => ({ ...current, [item.id]: null }));

                      await submitJson(`/api/admin/kurikulum-versi/${item.id}/activate`, "PATCH", {
                        action: "set_active",
                      });

                      router.refresh();
                    } catch (error) {
                      setUpdateErrors((current) => ({
                        ...current,
                        [item.id]:
                          error instanceof Error
                            ? error.message
                            : "Gagal mengubah kurikulum aktif.",
                      }));
                    }
                  });
                }}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {item.isActive ? "Sudah Aktif" : "Jadikan Aktif"}
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
                disabled={isPending || item.isActive}
                title={item.isActive ? "Kurikulum aktif tidak dapat dihapus" : undefined}
                onClick={() => {
                  if (!confirm(`Hapus kurikulum "${item.label}"? Tindakan ini tidak dapat dibatalkan.`)) {
                    return;
                  }

                  startTransition(async () => {
                    try {
                      setDeleteErrors((current) => ({ ...current, [item.id]: null }));
                      await deleteRecord(`/api/admin/kurikulum-versi/${item.id}`);
                      router.refresh();
                    } catch (error) {
                      setDeleteErrors((current) => ({
                        ...current,
                        [item.id]:
                          error instanceof Error ? error.message : "Gagal menghapus kurikulum versi.",
                      }));
                    }
                  });
                }}
                className="rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hapus kurikulum ini
              </button>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
