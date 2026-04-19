import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { updateUser, updateUserSchema } from "@/services/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireRole("admin", { mode: "throw" });
    const { id } = await context.params;
    const userId = ensureRecordId(id);
    const payload = updateUserSchema.parse(await request.json());
    const user = await updateUser(userId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    return handleRouteError(error);
  }
}
