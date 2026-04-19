import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/http";
import { listNotifications } from "@/services/notifications";

export async function GET() {
  try {
    const session = await requireAuth({ mode: "throw" });
    const notifications = await listNotifications(session.user.id);

    return NextResponse.json({ data: notifications });
  } catch (error) {
    return handleRouteError(error);
  }
}
