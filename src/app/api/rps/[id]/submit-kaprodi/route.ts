import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { submitToKaprodi } from "@/services/rps-workflow/submit-kaprodi";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function POST(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("koordinator_rmk", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const result = await submitToKaprodi(rpsId, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
