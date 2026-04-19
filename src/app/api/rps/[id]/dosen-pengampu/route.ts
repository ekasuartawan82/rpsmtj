import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import {
  removeRpsDosenPengampu,
  removeRpsDosenPengampuSchema,
  upsertRpsDosenPengampu,
  upsertRpsDosenPengampuSchema,
} from "@/services/rps";

export async function POST(
  request: Request,
  context: RouteContext<"/api/rps/[id]/dosen-pengampu">
) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = await context.params;
    const rpsId = ensureRecordId(id);
    const payload = upsertRpsDosenPengampuSchema.parse(await request.json());
    const pengampu = await upsertRpsDosenPengampu(rpsId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: pengampu }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/rps/[id]/dosen-pengampu">
) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = await context.params;
    const rpsId = ensureRecordId(id);
    const payload = removeRpsDosenPengampuSchema.parse(await request.json());
    const pengampu = await removeRpsDosenPengampu(rpsId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: pengampu });
  } catch (error) {
    return handleRouteError(error);
  }
}
