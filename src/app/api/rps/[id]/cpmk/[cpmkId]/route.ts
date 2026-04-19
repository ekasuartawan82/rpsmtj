import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { deleteRpsCpmk, updateRpsCpmk, updateRpsCpmkSchema } from "@/services/rps";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function PATCH(
  request: Request,
  context: NestedRouteContext
) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, cpmkId } = (await context.params) as { id: string; cpmkId: string };
    const rpsId = ensureRecordId(id);
    const parsedCpmkId = ensureRecordId(cpmkId);
    const payload = updateRpsCpmkSchema.parse(await request.json());
    const cpmk = await updateRpsCpmk(rpsId, parsedCpmkId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: cpmk });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: NestedRouteContext
) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, cpmkId } = (await context.params) as { id: string; cpmkId: string };
    const rpsId = ensureRecordId(id);
    const parsedCpmkId = ensureRecordId(cpmkId);
    const cpmk = await deleteRpsCpmk(rpsId, parsedCpmkId, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: cpmk });
  } catch (error) {
    return handleRouteError(error);
  }
}
