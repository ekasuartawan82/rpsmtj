import type { ReactNode } from "react";

import { requireAnyRole } from "@/lib/auth/session";

import { AuthenticatedNav } from "@/components/authenticated-nav";
import { DosenSidebar } from "./dosen-sidebar";

type RpsLayoutProps = {
  children: ReactNode;
};

export default async function RpsLayout({ children }: RpsLayoutProps) {
  const session = await requireAnyRole(["dosen", "koordinator_rmk", "kaprodi"]);
  const isDosen = session.user.role === "dosen";

  if (isDosen) {
    return (
      <div className="min-h-screen bg-white text-[#1d1d1f]">
        <DosenSidebar userName={session.user.name ?? "Dosen"} />
        <main className="min-h-screen md:ml-[220px]">
          <div className="mx-auto max-w-[900px] px-6 py-10">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <AuthenticatedNav userName={session.user.name ?? session.user.role} userRole={session.user.role} />
      <main className="mx-auto max-w-[900px] px-6 py-8">
        {children}
      </main>
    </div>
  );
}
