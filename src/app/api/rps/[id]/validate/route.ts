import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import {
  acknowledgeWarning,
  getActiveWarnings,
  warningIds,
} from "@/services/rps-validation";

type NestedRouteContext = {
  params: Promise<unknown>;
};

const acknowledgeWarningSchema = z.object({
  warningId: z.enum(warningIds),
});

export async function GET(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const warnings = await getActiveWarnings(rpsId, session.user.id);

    return NextResponse.json({ data: { warnings } });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const payload = acknowledgeWarningSchema.parse(await request.json());
    const warnings = await acknowledgeWarning(
      rpsId,
      payload.warningId,
      session.user.id
    );

    return NextResponse.json({ data: { warnings } });
  } catch (error) {
    return handleRouteError(error);
  }
}
