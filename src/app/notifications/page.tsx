import { requireAnyRole } from "@/lib/auth/session";
import { listNotifications } from "@/services/notifications";

import { NotificationsPanel } from "./notifications-panel";

export default async function NotificationsPage() {
  const session = await requireAnyRole(["dosen", "koordinator_rmk", "kaprodi"]);
  const notifications = await listNotifications(session.user.id);

  return (
    <div className="space-y-10">
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-[#6e6e73]">
          Notification Center
        </span>
        <h1 className="mt-2 text-[2rem] font-bold leading-tight tracking-tight text-[#1d1d1f]">
          Notifikasi workflow RPS
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Semua transisi workflow penting dicatat di sini sebagai notifikasi in-app dengan
          deep link ke halaman terkait.
        </p>
      </div>

      <NotificationsPanel
        initialUnreadCount={notifications.unreadCount}
        initialItems={notifications.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          readAt: item.readAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
