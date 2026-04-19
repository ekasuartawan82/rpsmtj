import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { createRpsSubCpmk, createRpsSubCpmkSchema } from "@/services/rps";
import { listRpsSubCpmk } from "@/services/rps/sub-cpmk";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function GET(_request: Request, context: NestedRouteContext) {
  try {
    await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const subCpmkList = await listRpsSubCpmk(rpsId);

    return NextResponse.json({ data: subCpmkList });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const payload = createRpsSubCpmkSchema.parse(await request.json());
    const subCpmk = await createRpsSubCpmk(rpsId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: subCpmk }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
