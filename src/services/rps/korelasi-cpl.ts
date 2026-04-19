import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { assertOwnedMutableRps } from "@/services/rps/shared";

const persentaseSchema = {
  min: 0,
  max: 100,
};

type UpsertKorelasiInput = {
  rpsSubCpmkId: string;
  rpsCplId: string;
  persentase: number;
};

type UpdateKorelasiOptions = {
  actorUserId: string;
};

/**
 * Upsert a correlation between Sub-CPMK and CPL.
 * Uses unique constraint on (rpsSubCpmkId, rpsCplId).
 */
export async function upsertRpsKorelasiCpl(
  rpsId: string,
  input: UpsertKorelasiInput,
  options: UpdateKorelasiOptions
) {
  // Verify ownership and mutability
  await assertOwnedMutableRps(rpsId, options.actorUserId);

  // Validate persentase
  if (
    input.persentase < persentaseSchema.min ||
    input.persentase > persentaseSchema.max
  ) {
    throw new ValidationError(
      `Persentase korelasi harus antara ${persentaseSchema.min} dan ${persentaseSchema.max}.`
    );
  }

  // Verify that rpsSubCpmkId belongs to the RPS
  const subCpmk = await prisma.rpsSubCpmk.findUnique({
    where: { id: input.rpsSubCpmkId },
    select: { rpsId: true },
  });

  if (!subCpmk || subCpmk.rpsId !== rpsId) {
    throw new ValidationError("Sub-CPMK tidak ditemukan dalam RPS ini.");
  }

  // Verify that rpsCplId belongs to the RPS
  const cpl = await prisma.rpsCpl.findUnique({
    where: { id: input.rpsCplId },
    select: { rpsId: true },
  });

  if (!cpl || cpl.rpsId !== rpsId) {
    throw new ValidationError("CPL tidak ditemukan dalam RPS ini.");
  }

  // Upsert using unique constraint
  const korelasi = await prisma.rpsKorelasiCpl.upsert({
    where: {
      rpsSubCpmkId_rpsCplId: {
        rpsSubCpmkId: input.rpsSubCpmkId,
        rpsCplId: input.rpsCplId,
      },
    },
    create: {
      rpsSubCpmkId: input.rpsSubCpmkId,
      rpsCplId: input.rpsCplId,
      persentase: input.persentase,
    },
    update: {
      persentase: input.persentase,
    },
    select: {
      id: true,
      rpsSubCpmkId: true,
      rpsCplId: true,
      persentase: true,
      rpsSubCpmk: {
        select: {
          id: true,
          kode: true,
        },
      },
      rpsCpl: {
        select: {
          id: true,
          cpl: {
            select: {
              kode: true,
            },
          },
        },
      },
    },
  });

  return korelasi;
}

/**
 * Delete a correlation by ID.
 */
export async function deleteRpsKorelasiCpl(
  rpsId: string,
  correlationId: string,
  options: UpdateKorelasiOptions
) {
  // Verify ownership and mutability
  await assertOwnedMutableRps(rpsId, options.actorUserId);

  // Verify correlation exists and belongs to RPS
  const korelasi = await prisma.rpsKorelasiCpl.findUnique({
    where: { id: correlationId },
    select: {
      id: true,
      rpsSubCpmk: {
        select: {
          rpsId: true,
        },
      },
    },
  });

  if (!korelasi) {
    throw new NotFoundError("Korelasi tidak ditemukan.");
  }

  if (korelasi.rpsSubCpmk.rpsId !== rpsId) {
    throw new ValidationError("Korelasi tidak ditemukan dalam RPS ini.");
  }

  await prisma.rpsKorelasiCpl.delete({
    where: { id: correlationId },
  });

  return { success: true };
}
