import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/http";
import {
  createWhitelistKko,
  createWhitelistKkoSchema,
  listWhitelistKko,
} from "@/services/admin";

export async function GET() {
  try {
    await requireRole("admin", { mode: "throw" });
    const whitelistKko = await listWhitelistKko();

    return NextResponse.json({ data: whitelistKko });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin", { mode: "throw" });
    const payload = createWhitelistKkoSchema.parse(await request.json());
    const whitelistKko = await createWhitelistKko(payload);

    return NextResponse.json({ data: whitelistKko }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
