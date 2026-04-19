import { z } from "zod";

import { prisma } from "@/db/prisma";

import { assertOwnedMutableRps } from "./shared";

const nullableTextField = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    }

    return value;
  },
  z.string().nullable().optional()
);

const optionalTanggalPenyusunanSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    return value;
  },
  z.coerce.date().optional()
);

export const updateRpsDraftSchema = z
  .object({
    deskripsiSingkat: nullableTextField,
    bahanKajian: nullableTextField,
    catatanTambahan: nullableTextField,
    tanggalPenyusunan: optionalTanggalPenyusunanSchema,
  })
  .refine(
    (value) =>
      value.deskripsiSingkat !== undefined ||
      value.bahanKajian !== undefined ||
      value.catatanTambahan !== undefined ||
      value.tanggalPenyusunan !== undefined,
    {
      message: "Minimal satu field draft harus dikirim untuk diperbarui.",
    }
  );

export type UpdateRpsDraftInput = z.infer<typeof updateRpsDraftSchema>;

type UpdateRpsDraftOptions = {
  actorUserId: string;
};

export async function updateRpsDraft(
  rpsId: string,
  input: UpdateRpsDraftInput,
  options: UpdateRpsDraftOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);

  return prisma.rps.update({
    where: { id: rpsId },
    data: {
      ...(input.deskripsiSingkat !== undefined
        ? {
            deskripsiSingkat: input.deskripsiSingkat,
          }
        : {}),
      ...(input.bahanKajian !== undefined
        ? {
            bahanKajian: input.bahanKajian,
          }
        : {}),
      ...(input.catatanTambahan !== undefined
        ? {
            catatanTambahan: input.catatanTambahan,
          }
        : {}),
      ...(input.tanggalPenyusunan !== undefined
        ? {
            tanggalPenyusunan: input.tanggalPenyusunan,
          }
        : {}),
    },
    select: {
      id: true,
      deskripsiSingkat: true,
      bahanKajian: true,
      catatanTambahan: true,
      tanggalPenyusunan: true,
      updatedAt: true,
    },
  });
}
