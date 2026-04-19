import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import {
  createRpsRtm,
  createRpsRtmSchema,
} from "@/services/rps/rtm";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function POST(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const payload = createRpsRtmSchema.parse(await request.json());
    const rtm = await createRpsRtm(rpsId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: rtm }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
