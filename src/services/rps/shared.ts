import type { Prisma, PrismaClient, UserRole } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { assertRpsMutable } from "@/services/rps-draft";

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export async function getActiveUserByRole(
  client: PrismaClientLike,
  userId: string,
  expectedRole: UserRole,
  notFoundMessage: string,
  invalidRoleMessage: string
) {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nama: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new NotFoundError(notFoundMessage);
  }

  if (user.role !== expectedRole) {
    throw new ValidationError(invalidRoleMessage);
  }

  return user;
}

export async function assertRpsOwnership(rpsId: string, actorUserId: string) {
  const rps = await prisma.rps.findUnique({
    where: { id: rpsId },
    select: {
      id: true,
      dosenPengembangId: true,
      dosenPengampu: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!rps) {
    throw new NotFoundError("RPS tidak ditemukan.");
  }

  const isOwner = rps.dosenPengembangId === actorUserId;
  const isCoOwner = rps.dosenPengampu.some((entry) => entry.userId === actorUserId);

  if (!isOwner && !isCoOwner) {
    throw new ForbiddenError("Hanya dosen pengembang atau dosen pengampu terkait yang dapat mengubah draft ini.");
  }

  return rps;
}

export async function assertOwnedMutableRps(rpsId: string, actorUserId: string) {
  await assertRpsMutable(rpsId);
  return assertRpsOwnership(rpsId, actorUserId);
}
