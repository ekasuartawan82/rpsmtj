import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import {
  linkRtmToPertemuan,
  linkRtmToPertemuanSchema,
  unlinkRtmFromPertemuan,
  unlinkRtmFromPertemuanSchema,
} from "@/services/rps/rtm";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function POST(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, rtmId } = (await context.params) as { id: string; rtmId: string };
    const rpsId = ensureRecordId(id);
    const parsedRtmId = ensureRecordId(rtmId);
    const payload = linkRtmToPertemuanSchema.parse(await request.json());
    const link = await linkRtmToPertemuan(rpsId, parsedRtmId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: link }, { status: 201 });
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
    const payload = unlinkRtmFromPertemuanSchema.parse(await request.json());
    const result = await unlinkRtmFromPertemuan(rpsId, parsedRtmId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
