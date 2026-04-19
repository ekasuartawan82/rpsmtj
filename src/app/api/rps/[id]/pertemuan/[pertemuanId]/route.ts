import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import {
  deleteRpsPertemuan,
  updateRpsPertemuan,
  updateRpsPertemuanSchema,
} from "@/services/rps/pertemuan";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function PATCH(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, pertemuanId } = (await context.params) as { id: string; pertemuanId: string };
    const rpsId = ensureRecordId(id);
    const parsedPertemuanId = ensureRecordId(pertemuanId);
    const payload = updateRpsPertemuanSchema.parse(await request.json());
    const pertemuan = await updateRpsPertemuan(rpsId, parsedPertemuanId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: pertemuan });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, pertemuanId } = (await context.params) as { id: string; pertemuanId: string };
    const rpsId = ensureRecordId(id);
    const parsedPertemuanId = ensureRecordId(pertemuanId);
    const result = await deleteRpsPertemuan(rpsId, parsedPertemuanId, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
