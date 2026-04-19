"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type RumpunMkRecord = {
  id: string;
  nama: string;
};

type RumpunMkPanelProps = {
  items: RumpunMkRecord[];
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

export function RumpunMkPanel({ items }: RumpunMkPanelProps) {
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateErrors, setUpdateErrors] = useState<Record<string, string | null>>({});
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string | null>>({});
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          Create Rumpun MK
        </p>
        <h2 className="mt-4 font-heading text-3xl text-slate-950">
          Tambah rumpun mata kuliah sebelum dipakai oleh master mata kuliah.
        </h2>

        <form
          className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            startTransition(async () => {
              try {
                setCreateError(null);

                await submitJson("/api/admin/rumpun-mk", "POST", {
                  nama: String(formData.get("nama") ?? ""),
                });

                form.reset();
                router.refresh();
              } catch (error) {
                setCreateError(
                  error instanceof Error ? error.message : "Gagal membuat rumpun mata kuliah."
                );
              }
            });
          }}
        >
          <input
            name="nama"
            required
            placeholder="Contoh: Keilmuan Dasar Transportasi"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? "Menyimpan..." : "Simpan"}
          </button>

          {createError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
              {createError}
            </div>
          ) : null}
        </form>
      </section>

      <section className="grid gap-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <form
              className="grid gap-4 md:grid-cols-[1fr_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                startTransition(async () => {
                  try {
                    setUpdateErrors((current) => ({ ...current, [item.id]: null }));

                    await submitJson(`/api/admin/rumpun-mk/${item.id}`, "PATCH", {
                      nama: String(formData.get("nama") ?? ""),
                    });

                    router.refresh();
                  } catch (error) {
                    setUpdateErrors((current) => ({
                      ...current,
                      [item.id]:
                        error instanceof Error ? error.message : "Gagal memperbarui rumpun MK.",
                    }));
                  }
                });
              }}
            >
              <input
                name="nama"
                defaultValue={item.nama}
                required
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-2xl bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0059b5] disabled:opacity-60"
              >
                {isPending ? "Menyimpan..." : "Update"}
              </button>

              {updateErrors[item.id] ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
                  {updateErrors[item.id]}
                </div>
              ) : null}
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
                  if (!confirm(`Hapus rumpun MK "${item.nama}"? Tindakan ini tidak dapat dibatalkan.`)) {
                    return;
                  }

                  startTransition(async () => {
                    try {
                      setDeleteErrors((current) => ({ ...current, [item.id]: null }));
                      await deleteRecord(`/api/admin/rumpun-mk/${item.id}`);
                      router.refresh();
                    } catch (error) {
                      setDeleteErrors((current) => ({
                        ...current,
                        [item.id]: error instanceof Error ? error.message : "Gagal menghapus rumpun MK.",
                      }));
                    }
                  });
                }}
                className="rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
              >
                Hapus rumpun ini
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
