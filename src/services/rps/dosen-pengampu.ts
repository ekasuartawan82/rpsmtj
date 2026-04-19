import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";

import { assertOwnedMutableRps, getActiveUserByRole } from "./shared";

export const upsertRpsDosenPengampuSchema = z.object({
  userId: z.uuid("Dosen pengampu tidak valid."),
});

export const removeRpsDosenPengampuSchema = z.object({
  userId: z.uuid("Dosen pengampu tidak valid."),
});

export type UpsertRpsDosenPengampuInput = z.infer<typeof upsertRpsDosenPengampuSchema>;
export type RemoveRpsDosenPengampuInput = z.infer<typeof removeRpsDosenPengampuSchema>;

type RpsDosenPengampuOptions = {
  actorUserId: string;
};

export async function upsertRpsDosenPengampu(
  rpsId: string,
  input: UpsertRpsDosenPengampuInput,
  options: RpsDosenPengampuOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);

  return prisma.$transaction(async (tx) => {
    const dosen = await getActiveUserByRole(
      tx,
      input.userId,
      "dosen",
      "Dosen pengampu tidak ditemukan.",
      "Dosen pengampu harus memiliki role dosen."
    );

    const existing = await tx.rpsDosenPengampu.findUnique({
      where: {
        rpsId_userId: {
          rpsId,
          userId: dosen.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ValidationError("Dosen pengampu sudah terdaftar pada RPS ini.");
    }

    const currentOrder = await tx.rpsDosenPengampu.aggregate({
      where: { rpsId },
      _max: {
        urutan: true,
      },
    });

    return tx.rpsDosenPengampu.create({
      data: {
        rpsId,
        userId: dosen.id,
        isPengembang: false,
        urutan: (currentOrder._max.urutan ?? 0) + 1,
      },
      select: {
        id: true,
        userId: true,
        isPengembang: true,
        urutan: true,
        user: {
          select: {
            id: true,
            nama: true,
            email: true,
          },
        },
      },
    });
  });
}

export async function removeRpsDosenPengampu(
  rpsId: string,
  input: RemoveRpsDosenPengampuInput,
  options: RpsDosenPengampuOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);

  const existing = await prisma.rpsDosenPengampu.findUnique({
    where: {
      rpsId_userId: {
        rpsId,
        userId: input.userId,
      },
    },
    select: {
      id: true,
      isPengembang: true,
    },
  });

  if (!existing) {
    throw new NotFoundError("Dosen pengampu tidak ditemukan pada RPS ini.");
  }

  if (existing.isPengembang) {
    throw new ValidationError("Dosen pengembang tidak boleh dihapus dari daftar pengampu.");
  }

  return prisma.rpsDosenPengampu.delete({
    where: { id: existing.id },
    select: {
      id: true,
      userId: true,
      isPengembang: true,
      urutan: true,
      user: {
        select: {
          id: true,
          nama: true,
          email: true,
        },
      },
    },
  });
}
