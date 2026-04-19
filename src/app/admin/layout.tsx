import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/session";

import { AdminSidebar } from "./admin-sidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await requireRole("admin");

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <AdminSidebar userName={session.user.name ?? "Admin"} />
      <main className="min-h-screen md:ml-[220px]">
        <div className="mx-auto max-w-[900px] px-6 py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
