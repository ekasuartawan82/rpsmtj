"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { NotificationNavLink } from "./notification-nav-link";

type AuthenticatedNavProps = {
  userName: string;
  userRole: string;
};

const navLinksByRole: Record<string, Array<{ href: string; label: string }>> = {
  koordinator_rmk: [
    { href: "/review", label: "Antrian Review" },
  ],
  kaprodi: [
    { href: "/review", label: "Antrian Review" },
  ],
};

export function AuthenticatedNav({ userName, userRole }: AuthenticatedNavProps) {
  const pathname = usePathname();
  const navLinks = navLinksByRole[userRole] || [];

  return (
    <nav className="sticky top-0 z-50 border-b border-[#d2d2d7]/50 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[900px] items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Logo Poltrada Bali"
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />
            <span className="text-[15px] font-bold tracking-tight text-[#1d1d1f]">RPS MTJ</span>
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname.startsWith(link.href)
                  ? "text-[#0071e3]"
                  : "text-[#6e6e73] hover:text-[#1d1d1f]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {userRole !== "admin" ? <NotificationNavLink /> : null}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#6e6e73]">
            {userName}
          </span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-full border border-[#d2d2d7] px-4 py-1.5 text-sm font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            Keluar
          </button>
        </div>
      </div>
    </nav>
  );
}
