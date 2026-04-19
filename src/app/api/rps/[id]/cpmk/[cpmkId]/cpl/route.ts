import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import {
  linkCpmkToCpl,
  linkCpmkToCplSchema,
  unlinkCpmkFromCpl,
  unlinkCpmkFromCplSchema,
} from "@/services/rps";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function POST(
  request: Request,
  context: NestedRouteContext
) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, cpmkId } = (await context.params) as { id: string; cpmkId: string };
    const rpsId = ensureRecordId(id);
    const parsedCpmkId = ensureRecordId(cpmkId);
    const payload = linkCpmkToCplSchema.parse(await request.json());
    const link = await linkCpmkToCpl(rpsId, parsedCpmkId, payload.rpsCplId, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: link }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: NestedRouteContext
) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, cpmkId } = (await context.params) as { id: string; cpmkId: string };
    const rpsId = ensureRecordId(id);
    const parsedCpmkId = ensureRecordId(cpmkId);
    const payload = unlinkCpmkFromCplSchema.parse(await request.json());
    const link = await unlinkCpmkFromCpl(rpsId, parsedCpmkId, payload.rpsCplId, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: link });
  } catch (error) {
    return handleRouteError(error);
  }
}
