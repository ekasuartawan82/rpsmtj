import type { ReactNode } from "react";

import { requireAnyRole } from "@/lib/auth/session";

import { AuthenticatedNav } from "@/components/authenticated-nav";

type ReviewLayoutProps = {
  children: ReactNode;
};

export default async function ReviewLayout({ children }: ReviewLayoutProps) {
  const session = await requireAnyRole(["koordinator_rmk", "kaprodi"]);

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <AuthenticatedNav userName={session.user.name ?? "Reviewer"} userRole={session.user.role} />
      <main className="mx-auto max-w-[900px] px-6 py-10">
        {children}
      </main>
    </div>
  );
}
