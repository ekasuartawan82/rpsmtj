import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/http";
import {
  createMataKuliah,
  createMataKuliahSchema,
  listMataKuliah,
  listMataKuliahQuerySchema,
} from "@/services/admin";

export async function GET(request: Request) {
  try {
    await requireRole("admin", { mode: "throw" });
    const searchParams = new URL(request.url).searchParams;
    const query = listMataKuliahQuerySchema.parse({
      kurikulumVersiId: searchParams.get("kurikulumVersiId") ?? undefined,
    });
    const mataKuliah = await listMataKuliah(query);

    return NextResponse.json({ data: mataKuliah });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin", { mode: "throw" });
    const payload = createMataKuliahSchema.parse(await request.json());
    const mataKuliah = await createMataKuliah(payload);

    return NextResponse.json({ data: mataKuliah }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
