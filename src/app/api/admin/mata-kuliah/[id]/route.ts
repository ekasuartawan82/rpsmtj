import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import {
  setMataKuliahActiveState,
  toggleMataKuliahActiveSchema,
  updateMataKuliah,
  updateMataKuliahSchema,
} from "@/services/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const patchMataKuliahSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    data: updateMataKuliahSchema,
  }),
  toggleMataKuliahActiveSchema,
]);

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireRole("admin", { mode: "throw" });
    const { id } = await context.params;
    const mataKuliahId = ensureRecordId(id);
    const payload = patchMataKuliahSchema.parse(await request.json());

    if (payload.action === "toggle_active") {
      const mataKuliah = await setMataKuliahActiveState(mataKuliahId, payload.isActive);
      return NextResponse.json({ data: mataKuliah });
    }

    const mataKuliah = await updateMataKuliah(mataKuliahId, payload.data);
    return NextResponse.json({ data: mataKuliah });
  } catch (error) {
    return handleRouteError(error);
  }
}
