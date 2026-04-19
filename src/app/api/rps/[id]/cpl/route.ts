import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { addRpsCpl, removeRpsCpl } from "@/services/rps";

const cplPayloadSchema = z.object({
  cplProdiId: z.string().uuid("ID CPL tidak valid."),
});

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function POST(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const payload = cplPayloadSchema.parse(await request.json());
    const cplProdiId = ensureRecordId(payload.cplProdiId);
    const rpsCpl = await addRpsCpl(rpsId, cplProdiId, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: rpsCpl }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const payload = cplPayloadSchema.parse(await request.json());
    const cplProdiId = ensureRecordId(payload.cplProdiId);
    const rpsCpl = await removeRpsCpl(rpsId, cplProdiId, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: rpsCpl });
  } catch (error) {
    return handleRouteError(error);
  }
}
