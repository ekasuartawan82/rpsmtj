import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/http";
import {
  createCplProdi,
  createCplProdiSchema,
  listCplProdi,
  listCplProdiQuerySchema,
} from "@/services/admin";

export async function GET(request: Request) {
  try {
    await requireRole("admin", { mode: "throw" });
    const searchParams = new URL(request.url).searchParams;
    const query = listCplProdiQuerySchema.parse({
      kurikulumVersiId: searchParams.get("kurikulumVersiId") ?? undefined,
    });
    const cplProdi = await listCplProdi(query);

    return NextResponse.json({ data: cplProdi });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin", { mode: "throw" });
    const payload = createCplProdiSchema.parse(await request.json());
    const cplProdi = await createCplProdi(payload);

    return NextResponse.json({ data: cplProdi }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
