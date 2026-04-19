import { NextResponse } from "next/server";

import { requireAnyRole, requireRole } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/errors";
import { handleRouteError } from "@/lib/http";
import { createRps, createRpsSchema, listRps, listRpsQuerySchema } from "@/services/rps";

export async function GET(request: Request) {
  try {
    const session = await requireAnyRole(["dosen", "koordinator_rmk", "kaprodi", "admin"], {
      mode: "throw",
    });
    const searchParams = new URL(request.url).searchParams;
    const query = listRpsQuerySchema.parse({
      status: searchParams.get("status") ?? undefined,
      mataKuliahId: searchParams.get("mataKuliahId") ?? undefined,
      dosenPengembangId: searchParams.get("dosenPengembangId") ?? undefined,
    });
    const rps = await listRps(query, {
      actorUserId: session.user.id,
      actorRole: session.user.role,
    });

    return NextResponse.json({ data: rps });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const payload = createRpsSchema.parse(await request.json());

    if (payload.dosenPengembangId !== session.user.id) {
      throw new ForbiddenError("Dosen pengembang harus merupakan akun Anda sendiri.");
    }

    const rps = await createRps(payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: rps }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
