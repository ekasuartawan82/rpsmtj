import { prisma } from "@/db/prisma";
import { ForbiddenError } from "@/lib/errors";

export async function assertRpsMutable(rpsId: string): Promise<void> {
  const rps = await prisma.rps.findUniqueOrThrow({
    where: { id: rpsId },
    select: { id: true, status: true },
  });

  if (rps.status === "approved" || rps.status === "superseded") {
    throw new ForbiddenError(`RPS ${rps.id} berstatus '${rps.status}' dan tidak dapat diubah.`);
  }
}
