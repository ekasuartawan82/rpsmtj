import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { deleteRpsKorelasiCpl, upsertRpsKorelasiCpl } from "@/services/rps";

const upsertKorelasiSchema = z.object({
  rpsSubCpmkId: z.string().uuid("Invalid Sub-CPMK ID."),
  rpsCplId: z.string().uuid("Invalid CPL ID."),
  persentase: z.number().min(0).max(100),
});

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function POST(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);

    const body = await request.json();
    const input = upsertKorelasiSchema.parse(body);

    const korelasi = await upsertRpsKorelasiCpl(rpsId, input, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: korelasi }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);

    // Get correlationId from query parameter
    const { searchParams } = new URL(request.url);
    const correlationId = searchParams.get("correlationId");

    if (!correlationId) {
      return NextResponse.json(
        { error: { message: "correlationId query parameter is required." } },
        { status: 400 }
      );
    }

    const result = await deleteRpsKorelasiCpl(rpsId, correlationId, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
