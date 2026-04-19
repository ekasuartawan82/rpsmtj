import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { deleteWhitelistKko } from "@/services/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireRole("admin", { mode: "throw" });
    const { id } = await context.params;
    const whitelistKkoId = ensureRecordId(id);
    const whitelistKko = await deleteWhitelistKko(whitelistKkoId);

    return NextResponse.json({ data: whitelistKko });
  } catch (error) {
    return handleRouteError(error);
  }
}
