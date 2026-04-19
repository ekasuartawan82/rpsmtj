import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authConfig } from "@/lib/auth/config";
import type { UserRole } from "@/lib/constants/roles";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

type GuardOptions = {
  mode?: "redirect" | "throw";
};

export async function getAuthSession() {
  return getServerSession(authConfig);
}

export async function requireAuth(options: GuardOptions = {}) {
  const mode = options.mode ?? "redirect";
  const session = await getAuthSession();

  if (!session?.user) {
    if (mode === "throw") {
      throw new UnauthorizedError();
    }

    redirect("/login");
  }

  return session;
}

export async function requireRole(role: UserRole, options: GuardOptions = {}) {
  const mode = options.mode ?? "redirect";
  const session = await requireAuth(options);

  if (session.user.role !== role) {
    if (mode === "throw") {
      throw new ForbiddenError();
    }

    redirect("/unauthorized");
  }

  return session;
}

export async function requireAnyRole(roles: UserRole[], options: GuardOptions = {}) {
  const mode = options.mode ?? "redirect";
  const session = await requireAuth(options);

  if (!roles.includes(session.user.role)) {
    if (mode === "throw") {
      throw new ForbiddenError();
    }

    redirect("/unauthorized");
  }

  return session;
}
