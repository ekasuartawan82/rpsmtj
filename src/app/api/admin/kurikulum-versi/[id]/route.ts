import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import {
  activateKurikulumVersiSchema,
  deleteKurikulumVersi,
  setKurikulumVersiActive,
  updateKurikulumVersi,
  updateKurikulumVersiSchema,
} from "@/services/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const patchKurikulumVersiSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    data: updateKurikulumVersiSchema,
  }),
  activateKurikulumVersiSchema,
]);

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireRole("admin", { mode: "throw" });
    const { id } = await context.params;
    const kurikulumVersiId = ensureRecordId(id);
    const payload = patchKurikulumVersiSchema.parse(await request.json());

    if (payload.action === "set_active") {
      const kurikulumVersi = await setKurikulumVersiActive(kurikulumVersiId);
      return NextResponse.json({ data: kurikulumVersi });
    }

    const kurikulumVersi = await updateKurikulumVersi(kurikulumVersiId, payload.data);
    return NextResponse.json({ data: kurikulumVersi });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireRole("admin", { mode: "throw" });
    const { id } = await context.params;
    const kurikulumVersiId = ensureRecordId(id);
    await deleteKurikulumVersi(kurikulumVersiId);

    return NextResponse.json({ data: { id: kurikulumVersiId } });
  } catch (error) {
    return handleRouteError(error);
  }
}
