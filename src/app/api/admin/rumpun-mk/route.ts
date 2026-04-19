import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/http";
import { createRumpunMk, createRumpunMkSchema, listRumpunMk } from "@/services/admin";

export async function GET() {
  try {
    await requireRole("admin", { mode: "throw" });
    const rumpunMk = await listRumpunMk();

    return NextResponse.json({ data: rumpunMk });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin", { mode: "throw" });
    const payload = createRumpunMkSchema.parse(await request.json());
    const rumpunMk = await createRumpunMk(payload);

    return NextResponse.json({ data: rumpunMk }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
