import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { markNotificationAsRead } from "@/services/notifications";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function POST(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireAuth({ mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const notificationId = ensureRecordId(id);
    const result = await markNotificationAsRead(notificationId, session.user.id);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
