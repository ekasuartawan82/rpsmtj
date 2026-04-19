"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type WhitelistKkoRecord = {
  id: string;
  kata: string;
  createdAt: Date;
  updatedAt: Date;
};

type WhitelistKkoPanelProps = {
  items: WhitelistKkoRecord[];
};

async function submitJson(url: string, method: "POST" | "DELETE", body?: unknown) {
  const response = await fetch(url, {
    method,
    headers:
      method === "POST"
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(payload?.error?.message ?? "Permintaan gagal diproses.");
  }
}

export function WhitelistKkoPanel({ items }: WhitelistKkoPanelProps) {
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string | null>>({});
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">
          Create Whitelist
        </p>
        <h2 className="mt-4 font-heading text-3xl text-slate-950">
          Tambah kata kerja operasional untuk dipakai warning W-02.
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

                await submitJson("/api/admin/whitelist-kko", "POST", {
                  kata: String(formData.get("kata") ?? ""),
                });

                form.reset();
                router.refresh();
              } catch (error) {
                setCreateError(
                  error instanceof Error ? error.message : "Gagal menambahkan whitelist KKO."
                );
              }
            });
          }}
        >
          <input
            name="kata"
            required
            placeholder="Contoh: menganalisis"
            className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#0071e3]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? "Menyimpan..." : "Tambah"}
          </button>

          {createError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
              {createError}
            </div>
          ) : null}
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Kata Kerja
            </p>
            <h3 className="mt-3 font-heading text-2xl text-slate-950">{item.kata}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Digunakan oleh generator soft warning W-02.
            </p>

            {deleteErrors[item.id] ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {deleteErrors[item.id]}
              </div>
            ) : null}

            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    setDeleteErrors((current) => ({ ...current, [item.id]: null }));

                    await submitJson(`/api/admin/whitelist-kko/${item.id}`, "DELETE");
                    router.refresh();
                  } catch (error) {
                    setDeleteErrors((current) => ({
                      ...current,
                      [item.id]:
                        error instanceof Error ? error.message : "Gagal menghapus whitelist KKO.",
                    }));
                  }
                });
              }}
              className="mt-5 rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
            >
              {isPending ? "Memproses..." : "Hapus"}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
