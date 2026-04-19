import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { approveByKaprodi, rejectByKaprodi } from "@/services/rps-workflow/review-kaprodi";

const reviewKaprodiSchema = z.object({
  action: z.enum(["approve", "reject"]),
  catatan: z.string().optional(),
});

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function POST(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("kaprodi", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const payload = reviewKaprodiSchema.parse(await request.json());

    let result;
    if (payload.action === "approve") {
      result = await approveByKaprodi(rpsId, {
        actorUserId: session.user.id,
      });
    } else {
      // reject - catatan is validated in service layer
      if (!payload.catatan) {
        throw new ValidationError("Catatan wajib diisi untuk penolakan.");
      }
      result = await rejectByKaprodi(rpsId, payload.catatan, {
        actorUserId: session.user.id,
      });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
