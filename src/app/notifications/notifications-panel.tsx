"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  rps: {
    id: string;
    status: string;
    mataKuliah: {
      kode: string;
      nama: string;
    };
  };
};

type NotificationsPanelProps = {
  initialItems: NotificationItem[];
  initialUnreadCount: number;
};

async function markAsRead(notificationId: string) {
  const response = await fetch(`/api/notifications/${notificationId}/read`, {
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    throw new Error(payload?.error?.message ?? "Gagal menandai notifikasi sebagai dibaca.");
  }
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

export function NotificationsPanel({
  initialItems,
  initialUnreadCount,
}: NotificationsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [error, setError] = useState<string | null>(null);

  const handleMarkAsRead = (notificationId: string) => {
    startTransition(async () => {
      try {
        setError(null);
        await markAsRead(notificationId);
        setItems((current) =>
          current.map((item) =>
            item.id === notificationId
              ? {
                  ...item,
                  isRead: true,
                  readAt: item.readAt ?? new Date().toISOString(),
                }
              : item
          )
        );
        setUnreadCount((current) => Math.max(0, current - 1));
        router.refresh();
      } catch (markError) {
        setError(
          markError instanceof Error ? markError.message : "Gagal memperbarui notifikasi."
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Total Notifikasi
          </p>
          <h2 className="mt-3 font-heading text-2xl text-slate-950">{items.length}</h2>
        </article>
        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Belum Dibaca
          </p>
          <h2 className="mt-3 font-heading text-2xl text-slate-950">{unreadCount}</h2>
        </article>
        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Mode
          </p>
          <h2 className="mt-3 font-heading text-2xl text-slate-950">In-app</h2>
        </article>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <article
              key={item.id}
              className={`rounded-[24px] border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] ${
                item.isRead ? "border-slate-200 bg-white" : "border-sky-200 bg-sky-50/40"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-heading text-xl text-slate-950">{item.title}</p>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                        item.isRead ? "bg-slate-200 text-slate-700" : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {item.isRead ? "Dibaca" : "Baru"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-7 text-slate-700">{item.message}</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <p>
                      <span className="font-semibold">Mata kuliah:</span>{" "}
                      {item.rps.mataKuliah.kode} • {item.rps.mataKuliah.nama}
                    </p>
                    <p>
                      <span className="font-semibold">Waktu:</span> {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:items-end">
                  <Link
                    href={item.href}
                    className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    Buka terkait
                  </Link>
                  {!item.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(item.id)}
                      disabled={isPending}
                      className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {isPending ? "Memproses..." : "Tandai dibaca"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
            Belum ada notifikasi untuk akun ini.
          </div>
        )}
      </section>
    </div>
  );
}
