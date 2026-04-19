import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { exportRpsToPdf } from "@/services/rps/export";
import type { RpsDocumentActorRole } from "@/services/rps/export/types";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function GET(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);

    const { buffer, filename } = await exportRpsToPdf(rpsId, {
      actorUserId: session.user.id,
      actorRole: session.user.role as RpsDocumentActorRole,
    });

    // Next.js/Node Buffer is not assignable to BodyInit in strict TS; double-cast is intentional.
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
