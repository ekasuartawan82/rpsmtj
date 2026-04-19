import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import { deleteRpsSubCpmk, updateRpsSubCpmk, updateRpsSubCpmkSchema } from "@/services/rps";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function PATCH(
  request: Request,
  context: NestedRouteContext
) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, subCpmkId } = (await context.params) as { id: string; subCpmkId: string };
    const rpsId = ensureRecordId(id);
    const parsedSubCpmkId = ensureRecordId(subCpmkId);
    const payload = updateRpsSubCpmkSchema.parse(await request.json());
    const subCpmk = await updateRpsSubCpmk(rpsId, parsedSubCpmkId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: subCpmk });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: NestedRouteContext
) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id, subCpmkId } = (await context.params) as { id: string; subCpmkId: string };
    const rpsId = ensureRecordId(id);
    const parsedSubCpmkId = ensureRecordId(subCpmkId);
    const subCpmk = await deleteRpsSubCpmk(rpsId, parsedSubCpmkId, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: subCpmk });
  } catch (error) {
    return handleRouteError(error);
  }
}
