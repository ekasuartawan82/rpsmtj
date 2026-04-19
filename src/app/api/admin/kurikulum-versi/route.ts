import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/http";
import {
  createKurikulumVersi,
  createKurikulumVersiSchema,
  listKurikulumVersi,
} from "@/services/admin";

export async function GET() {
  try {
    await requireRole("admin", { mode: "throw" });
    const kurikulumVersi = await listKurikulumVersi();

    return NextResponse.json({ data: kurikulumVersi });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin", { mode: "throw" });
    const payload = createKurikulumVersiSchema.parse(await request.json());
    const kurikulumVersi = await createKurikulumVersi(payload);

    return NextResponse.json({ data: kurikulumVersi }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
