"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NotificationNavLinkProps = {
  compact?: boolean;
};

async function fetchUnreadCount() {
  const response = await fetch("/api/notifications");
  if (!response.ok) {
    return 0;
  }

  const payload = (await response.json()) as { data: { unreadCount: number } };
  return payload.data.unreadCount;
}

export function NotificationNavLink({ compact = false }: NotificationNavLinkProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const isActive = pathname.startsWith("/notifications");

  useEffect(() => {
    let isMounted = true;

    const loadUnreadCount = async () => {
      const count = await fetchUnreadCount();
      if (isMounted) {
        setUnreadCount(count);
      }
    };

    void loadUnreadCount();
    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
    }, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  if (compact) {
    return (
      <Link
        href="/notifications"
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
          isActive
            ? "border border-[#d2d2d7] bg-white text-[#0071e3] shadow-sm"
            : "text-[#3a3a3c] hover:bg-[#e8e8eb] hover:text-[#1d1d1f]"
        }`}
      >
        <span
          className="material-symbols-outlined shrink-0 text-[18px] leading-none"
          style={{
            fontVariationSettings: isActive
              ? "'FILL' 1, 'opsz' 18"
              : "'FILL' 0, 'opsz' 18",
          }}
        >
          notifications
        </span>
        <span className="truncate">Notifikasi</span>
        {unreadCount > 0 && (
          <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-[#0071e3] px-2 py-0.5 text-[11px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/notifications"
      className={`flex items-center gap-2 text-sm font-medium transition-colors ${
        isActive ? "text-[#0071e3]" : "text-[#6e6e73] hover:text-[#1d1d1f]"
      }`}
    >
      <span>Notifikasi</span>
      {unreadCount > 0 && (
        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#0071e3] px-2 py-0.5 text-[11px] font-semibold text-white">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
