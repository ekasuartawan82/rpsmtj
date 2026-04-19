import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { deleteRps, updateRpsDraft, updateRpsDraftSchema } from "@/services/rps";

export async function PATCH(request: Request, context: RouteContext<"/api/rps/[id]">) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = await context.params;
    const rpsId = ensureRecordId(id);
    const payload = updateRpsDraftSchema.parse(await request.json());
    const rps = await updateRpsDraft(rpsId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: rps });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/rps/[id]">) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = await context.params;
    const rpsId = ensureRecordId(id);
    const result = await deleteRps(rpsId, session.user.id);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
