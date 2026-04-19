import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import {
  createRpsPustaka,
  createRpsPustakaSchema,
  listRpsPustaka,
} from "@/services/rps/pustaka";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function GET(_request: Request, context: NestedRouteContext) {
  try {
    await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const pustakaList = await listRpsPustaka(rpsId);

    return NextResponse.json({ data: pustakaList });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const payload = createRpsPustakaSchema.parse(await request.json());
    const pustaka = await createRpsPustaka(rpsId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: pustaka }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
