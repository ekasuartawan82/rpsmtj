import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { getVersionHistory } from "@/services/rps";

export async function GET(request: Request, context: RouteContext<"/api/rps/[id]/versions">) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = await context.params;
    const rpsId = ensureRecordId(id);
    const versions = await getVersionHistory(rpsId, session.user.id);

    return NextResponse.json({ data: versions });
  } catch (error) {
    return handleRouteError(error);
  }
}
