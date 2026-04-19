import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import {
  deleteRpsPustaka,
  updateRpsPustaka,
  updateRpsPustakaSchema,
} from "@/services/rps/pustaka";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function PATCH(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, pustakaId } = (await context.params) as { id: string; pustakaId: string };
    const rpsId = ensureRecordId(id);
    const parsedPustakaId = ensureRecordId(pustakaId);
    const payload = updateRpsPustakaSchema.parse(await request.json());
    const pustaka = await updateRpsPustaka(rpsId, parsedPustakaId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: pustaka });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, pustakaId } = (await context.params) as { id: string; pustakaId: string };
    const rpsId = ensureRecordId(id);
    const parsedPustakaId = ensureRecordId(pustakaId);
    const result = await deleteRpsPustaka(rpsId, parsedPustakaId, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
