import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { ensureRecordId, handleRouteError } from "@/lib/http";
import {
  createRpsPertemuan,
  createRpsPertemuanSchema,
  listRpsPertemuan,
} from "@/services/rps/pertemuan";

type NestedRouteContext = {
  params: Promise<unknown>;
};

export async function GET(_request: Request, context: NestedRouteContext) {
  try {
    await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const pertemuans = await listRpsPertemuan(rpsId);

    // Hitung summary untuk kebutuhan UI
    const totalBobot = pertemuans.reduce(
      (sum, p) => sum + (p.bobotPenilaianPersen ?? 0),
      0
    );
    const summary = {
      totalPertemuan: pertemuans.length,
      totalBobot: Math.round(totalBobot * 100) / 100,
      weeksCovered: pertemuans.map((p) => p.weekLabel),
      hasUts: pertemuans.some((p) => p.tipe === "ets"),
      hasUas: pertemuans.some((p) => p.tipe === "eas"),
      isComplete:
        pertemuans.length >= 16 &&
        Math.abs(totalBobot - 100) < 0.01 &&
        pertemuans.some((p) => p.tipe === "ets") &&
        pertemuans.some((p) => p.tipe === "eas"),
    };

    return NextResponse.json({ pertemuans, summary });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: NestedRouteContext) {
  try {
    const session = await requireRole("dosen", { mode: "throw" });
    const { id } = (await context.params) as { id: string };
    const rpsId = ensureRecordId(id);
    const payload = createRpsPertemuanSchema.parse(await request.json());
    const pertemuan = await createRpsPertemuan(rpsId, payload, {
      actorUserId: session.user.id,
    });

    return NextResponse.json({ data: pertemuan }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
