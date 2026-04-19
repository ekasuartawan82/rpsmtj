import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { deleteRumpunMk, updateRumpunMk, updateRumpunMkSchema } from "@/services/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireRole("admin", { mode: "throw" });
    const { id } = await context.params;
    const rumpunMkId = ensureRecordId(id);
    const payload = updateRumpunMkSchema.parse(await request.json());
    const rumpunMk = await updateRumpunMk(rumpunMkId, payload);

    return NextResponse.json({ data: rumpunMk });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireRole("admin", { mode: "throw" });
    const { id } = await context.params;
    const rumpunMkId = ensureRecordId(id);
    await deleteRumpunMk(rumpunMkId);

    return NextResponse.json({ data: { id: rumpunMkId } });
  } catch (error) {
    return handleRouteError(error);
  }
}
