import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { activateKurikulumVersiSchema, setKurikulumVersiActive } from "@/services/admin";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/kurikulum-versi/[id]/activate">
) {
  try {
    await requireRole("admin", { mode: "throw" });
    const { id } = await context.params;
    const kurikulumVersiId = ensureRecordId(id);
    activateKurikulumVersiSchema.parse(await request.json());
    const kurikulumVersi = await setKurikulumVersiActive(kurikulumVersiId);

    return NextResponse.json({ data: kurikulumVersi });
  } catch (error) {
    return handleRouteError(error);
  }
}
