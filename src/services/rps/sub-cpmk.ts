import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";

import { assertOwnedMutableRps } from "./shared";

const positiveIntSchema = z.coerce.number().int("Urutan harus berupa bilangan bulat.").positive(
  "Urutan harus lebih besar dari 0."
);

const nullablePersenSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    return value;
  },
  z.coerce
    .number()
    .min(0, "Target ketercapaian minimal 0.")
    .max(100, "Target ketercapaian maksimal 100.")
    .nullable()
);

export const createRpsSubCpmkSchema = z.object({
  cpmkId: z.uuid("CPMK tidak valid."),
  kode: z.string().trim().min(1, "Kode Sub-CPMK wajib diisi."),
  deskripsi: z.string().trim().min(3, "Deskripsi Sub-CPMK minimal 3 karakter."),
  urutan: positiveIntSchema,
  targetKetercapaianPersen: nullablePersenSchema,
});

export const updateRpsSubCpmkSchema = z.object({
  kode: z.string().trim().min(1, "Kode Sub-CPMK wajib diisi."),
  deskripsi: z.string().trim().min(3, "Deskripsi Sub-CPMK minimal 3 karakter."),
  urutan: positiveIntSchema,
  targetKetercapaianPersen: nullablePersenSchema,
});

export type CreateRpsSubCpmkInput = z.infer<typeof createRpsSubCpmkSchema>;
export type UpdateRpsSubCpmkInput = z.infer<typeof updateRpsSubCpmkSchema>;

export async function listRpsSubCpmk(rpsId: string) {
  return prisma.rpsSubCpmk.findMany({
    where: { rpsId },
    orderBy: [{ urutan: "asc" }, { kode: "asc" }],
    select: {
      id: true,
      kode: true,
      deskripsi: true,
      urutan: true,
      rpsCpmk: {
        select: {
          id: true,
          kode: true,
        },
      },
    },
  });
}

type RpsMutationOptions = {
  actorUserId: string;
};

async function getRpsCpmkForSubCpmkOrThrow(rpsId: string, cpmkId: string) {
  const cpmk = await prisma.rpsCpmk.findFirst({
    where: {
      id: cpmkId,
      rpsId,
    },
    select: {
      id: true,
    },
  });

  if (!cpmk) {
    throw new NotFoundError("CPMK tidak ditemukan pada RPS ini.");
  }

  return cpmk;
}

async function getRpsSubCpmkOrThrow(rpsId: string, subCpmkId: string) {
  const subCpmk = await prisma.rpsSubCpmk.findFirst({
    where: {
      id: subCpmkId,
      rpsId,
    },
    select: {
      id: true,
      rpsCpmkId: true,
      pertemuanEntries: {
        select: {
          id: true,
        },
        take: 1,
      },
      rtmEntries: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!subCpmk) {
    throw new NotFoundError("Sub-CPMK tidak ditemukan pada RPS ini.");
  }

  return subCpmk;
}

export async function createRpsSubCpmk(
  rpsId: string,
  input: CreateRpsSubCpmkInput,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  const cpmk = await getRpsCpmkForSubCpmkOrThrow(rpsId, input.cpmkId);

  return prisma.rpsSubCpmk.create({
    data: {
      rpsId,
      rpsCpmkId: cpmk.id,
      kode: input.kode,
      deskripsi: input.deskripsi,
      urutan: input.urutan,
      targetKetercapaianPersen: input.targetKetercapaianPersen,
    },
    select: {
      id: true,
      rpsCpmkId: true,
      kode: true,
      deskripsi: true,
      urutan: true,
      targetKetercapaianPersen: true,
    },
  });
}

export async function updateRpsSubCpmk(
  rpsId: string,
  subCpmkId: string,
  input: UpdateRpsSubCpmkInput,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  await getRpsSubCpmkOrThrow(rpsId, subCpmkId);

  return prisma.rpsSubCpmk.update({
    where: { id: subCpmkId },
    data: {
      kode: input.kode,
      deskripsi: input.deskripsi,
      urutan: input.urutan,
      targetKetercapaianPersen: input.targetKetercapaianPersen,
    },
    select: {
      id: true,
      rpsCpmkId: true,
      kode: true,
      deskripsi: true,
      urutan: true,
      targetKetercapaianPersen: true,
    },
  });
}

export async function deleteRpsSubCpmk(
  rpsId: string,
  subCpmkId: string,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  const subCpmk = await getRpsSubCpmkOrThrow(rpsId, subCpmkId);

  if (subCpmk.pertemuanEntries.length > 0 || subCpmk.rtmEntries.length > 0) {
    throw new ValidationError(
      "Sub-CPMK masih direferensikan oleh pertemuan atau RTM. Hapus referensi tersebut terlebih dahulu."
    );
  }

  return prisma.rpsSubCpmk.delete({
    where: { id: subCpmk.id },
    select: {
      id: true,
      rpsCpmkId: true,
      kode: true,
      deskripsi: true,
      urutan: true,
      targetKetercapaianPersen: true,
    },
  });
}
