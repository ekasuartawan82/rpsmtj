"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { NotificationNavLink } from "@/components/notification-nav-link";

type DosenSidebarProps = {
  userName: string;
};

const dosenLinks = [
  { href: "/rps", label: "Daftar RPS", icon: "description" },
];

export function DosenSidebar({ userName }: DosenSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[220px] flex-col border-r border-[#d2d2d7] bg-[#f0f0f2] md:flex">

      {/* Identity block */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
            <Image
              src="/logo.png"
              alt="Logo Poltrada Bali"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold leading-tight text-[#1d1d1f]">RPS MTJ</p>
            <p className="text-[11px] leading-tight text-[#6e6e73]">Poltrada Bali</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-white/60 px-2.5 py-1.5">
          <span
            className="material-symbols-outlined text-[13px] leading-none text-[#6e6e73]"
            style={{ fontVariationSettings: "'FILL' 1, 'opsz' 13" }}
          >
            person
          </span>
          <p className="truncate text-[11px] text-[#6e6e73]">
            <span className="font-semibold text-[#3a3a3c]">{userName}</span>
            <span> · Dosen</span>
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        <div className="space-y-1">
          {dosenLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-white text-[#0071e3] shadow-sm border border-[#d2d2d7]"
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
                  {link.icon}
                </span>
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
          <NotificationNavLink compact />
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[#d2d2d7] px-3 py-3 space-y-1">
        <Link
          href="/rps/new"
          className="flex w-full items-center gap-3 rounded-lg bg-[#0071e3] px-3 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <span
            className="material-symbols-outlined shrink-0 text-[18px] leading-none"
            style={{ fontVariationSettings: "'FILL' 1, 'opsz' 18" }}
          >
            add
          </span>
          <span>Buat RPS Baru</span>
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#6e6e73] transition-colors hover:bg-[#e8e8eb] hover:text-[#1d1d1f]"
        >
          <span
            className="material-symbols-outlined shrink-0 text-[18px] leading-none"
            style={{ fontVariationSettings: "'opsz' 18" }}
          >
            logout
          </span>
          <span>Keluar</span>
        </button>
      </div>

    </aside>
  );
}
