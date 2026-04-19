import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";

import { assertOwnedMutableRps } from "./shared";

const positiveIntSchema = z.coerce.number().int("Urutan harus berupa bilangan bulat.").positive(
  "Urutan harus lebih besar dari 0."
);

const cpmkCodeSchema = z.string().trim().min(1, "Kode CPMK wajib diisi.");
const cpmkDescriptionSchema = z.string().trim().min(3, "Deskripsi CPMK minimal 3 karakter.");

export const createRpsCpmkSchema = z.object({
  kode: cpmkCodeSchema,
  deskripsi: cpmkDescriptionSchema,
  urutan: positiveIntSchema,
});

export const updateRpsCpmkSchema = z.object({
  kode: cpmkCodeSchema,
  deskripsi: cpmkDescriptionSchema,
  urutan: positiveIntSchema,
});

export const linkCpmkToCplSchema = z.object({
  rpsCplId: z.uuid("Relasi CPL RPS tidak valid."),
});

export const unlinkCpmkFromCplSchema = z.object({
  rpsCplId: z.uuid("Relasi CPL RPS tidak valid."),
});

export type CreateRpsCpmkInput = z.infer<typeof createRpsCpmkSchema>;
export type UpdateRpsCpmkInput = z.infer<typeof updateRpsCpmkSchema>;
export type LinkCpmkToCplInput = z.infer<typeof linkCpmkToCplSchema>;
export type UnlinkCpmkFromCplInput = z.infer<typeof unlinkCpmkFromCplSchema>;

type RpsMutationOptions = {
  actorUserId: string;
};

function mapCpmkUniqueError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ValidationError("Kode CPMK sudah digunakan pada RPS ini.");
  }

  throw error;
}

async function getRpsCpmkOrThrow(rpsId: string, cpmkId: string) {
  const cpmk = await prisma.rpsCpmk.findFirst({
    where: {
      id: cpmkId,
      rpsId,
    },
    select: {
      id: true,
      kode: true,
      subCpmkEntries: {
        select: {
          id: true,
        },
        take: 1,
      },
      cplLinks: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!cpmk) {
    throw new NotFoundError("CPMK tidak ditemukan pada RPS ini.");
  }

  return cpmk;
}

async function getRpsCplOrThrow(rpsId: string, rpsCplId: string) {
  const rpsCpl = await prisma.rpsCpl.findFirst({
    where: {
      id: rpsCplId,
      rpsId,
    },
    select: {
      id: true,
    },
  });

  if (!rpsCpl) {
    throw new NotFoundError("Relasi CPL RPS tidak ditemukan.");
  }

  return rpsCpl;
}

export async function createRpsCpmk(
  rpsId: string,
  input: CreateRpsCpmkInput,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);

  try {
    return await prisma.rpsCpmk.create({
      data: {
        rpsId,
        kode: input.kode,
        deskripsi: input.deskripsi,
        urutan: input.urutan,
      },
      select: {
        id: true,
        kode: true,
        deskripsi: true,
        urutan: true,
      },
    });
  } catch (error) {
    mapCpmkUniqueError(error);
  }
}

export async function updateRpsCpmk(
  rpsId: string,
  cpmkId: string,
  input: UpdateRpsCpmkInput,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  await getRpsCpmkOrThrow(rpsId, cpmkId);

  try {
    return await prisma.rpsCpmk.update({
      where: { id: cpmkId },
      data: {
        kode: input.kode,
        deskripsi: input.deskripsi,
        urutan: input.urutan,
      },
      select: {
        id: true,
        kode: true,
        deskripsi: true,
        urutan: true,
      },
    });
  } catch (error) {
    mapCpmkUniqueError(error);
  }
}

export async function deleteRpsCpmk(rpsId: string, cpmkId: string, options: RpsMutationOptions) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  const cpmk = await getRpsCpmkOrThrow(rpsId, cpmkId);

  if (cpmk.subCpmkEntries.length > 0) {
    throw new ValidationError("CPMK masih memiliki Sub-CPMK. Hapus Sub-CPMK terlebih dahulu.");
  }

  if (cpmk.cplLinks.length > 0) {
    throw new ValidationError("CPMK masih terhubung ke CPL. Lepaskan link CPMK-CPL terlebih dahulu.");
  }

  return prisma.rpsCpmk.delete({
    where: { id: cpmk.id },
    select: {
      id: true,
      kode: true,
      deskripsi: true,
      urutan: true,
    },
  });
}

export async function linkCpmkToCpl(
  rpsId: string,
  cpmkId: string,
  rpsCplId: string,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  const [cpmk, rpsCpl] = await Promise.all([
    getRpsCpmkOrThrow(rpsId, cpmkId),
    getRpsCplOrThrow(rpsId, rpsCplId),
  ]);

  const existing = await prisma.rpsCpmkCpl.findUnique({
    where: {
      rpsCpmkId_rpsCplId: {
        rpsCpmkId: cpmk.id,
        rpsCplId: rpsCpl.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new ValidationError("Link CPMK ke CPL ini sudah ada.");
  }

  return prisma.rpsCpmkCpl.create({
    data: {
      rpsCpmkId: cpmk.id,
      rpsCplId: rpsCpl.id,
    },
    select: {
      id: true,
      rpsCpmkId: true,
      rpsCplId: true,
    },
  });
}

export async function unlinkCpmkFromCpl(
  rpsId: string,
  cpmkId: string,
  rpsCplId: string,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  const [cpmk, rpsCpl] = await Promise.all([
    getRpsCpmkOrThrow(rpsId, cpmkId),
    getRpsCplOrThrow(rpsId, rpsCplId),
  ]);

  const link = await prisma.rpsCpmkCpl.findUnique({
    where: {
      rpsCpmkId_rpsCplId: {
        rpsCpmkId: cpmk.id,
        rpsCplId: rpsCpl.id,
      },
    },
    select: {
      id: true,
      rpsCpmkId: true,
      rpsCplId: true,
    },
  });

  if (!link) {
    throw new NotFoundError("Link CPMK ke CPL tidak ditemukan.");
  }

  return prisma.rpsCpmkCpl.delete({
    where: { id: link.id },
    select: {
      id: true,
      rpsCpmkId: true,
      rpsCplId: true,
    },
  });
}
