import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { deleteCplProdi, updateCplProdi, updateCplProdiSchema } from "@/services/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireRole("admin", { mode: "throw" });
    const { id } = await context.params;
    const cplProdiId = ensureRecordId(id);
    const payload = updateCplProdiSchema.parse(await request.json());
    const cplProdi = await updateCplProdi(cplProdiId, payload);

    return NextResponse.json({ data: cplProdi });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireRole("admin", { mode: "throw" });
    const { id } = await context.params;
    const cplProdiId = ensureRecordId(id);
    await deleteCplProdi(cplProdiId);

    return NextResponse.json({ data: { id: cplProdiId } });
  } catch (error) {
    return handleRouteError(error);
  }
}
