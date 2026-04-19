import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/http";
import { createUser, createUserSchema, listUsers } from "@/services/admin";

export async function GET() {
  try {
    await requireRole("admin", { mode: "throw" });
    const users = await listUsers();

    return NextResponse.json({ data: users });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin", { mode: "throw" });
    const payload = createUserSchema.parse(await request.json());
    const user = await createUser(payload);

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
