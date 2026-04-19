import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import {
  deleteRpsRtm,
  updateRpsRtm,
  updateRpsRtmSchema,
} from "@/services/rps/rtm";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function PATCH(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, rtmId } = (await context.params) as { id: string; rtmId: string };
    const rpsId = ensureRecordId(id);
    const parsedRtmId = ensureRecordId(rtmId);
    const payload = updateRpsRtmSchema.parse(await request.json());
    const rtm = await updateRpsRtm(rpsId, parsedRtmId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: rtm });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, rtmId } = (await context.params) as { id: string; rtmId: string };
    const rpsId = ensureRecordId(id);
    const parsedRtmId = ensureRecordId(rtmId);
    const result = await deleteRpsRtm(rpsId, parsedRtmId, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
