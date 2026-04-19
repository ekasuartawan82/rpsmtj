import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError } from "@/lib/errors";

import { getActiveUserByRole } from "./shared";

const tahunAkademikPattern = /^\d{4}\/\d{4}$/;

const optionalTanggalPenyusunanSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    return value;
  },
  z.coerce.date().optional()
);

export const createRpsSchema = z.object({
  mataKuliahId: z.uuid("Mata kuliah tidak valid."),
  tahunAkademik: z
    .string()
    .trim()
    .regex(tahunAkademikPattern, "Tahun akademik harus berformat YYYY/YYYY."),
  dosenPengembangId: z.uuid("Dosen pengembang tidak valid."),
  koordinatorRmkId: z.uuid("Koordinator RMK tidak valid."),
  kaprodiId: z.uuid("Kaprodi tidak valid."),
  tanggalPenyusunan: optionalTanggalPenyusunanSchema,
});

export type CreateRpsInput = z.infer<typeof createRpsSchema>;

type CreateRpsOptions = {
  actorUserId: string;
};

export async function createRps(input: CreateRpsInput, options: CreateRpsOptions) {
  return prisma.$transaction(async (tx) => {
    const mataKuliah = await tx.mataKuliah.findUnique({
      where: { id: input.mataKuliahId },
      select: {
        id: true,
        kode: true,
        nama: true,
        kurikulumVersiId: true,
      },
    });

    if (!mataKuliah) {
      throw new NotFoundError("Mata kuliah tidak ditemukan.");
    }

    const dosenPengembang = await getActiveUserByRole(
      tx,
      input.dosenPengembangId,
      "dosen",
      "Dosen pengembang tidak ditemukan.",
      "Dosen pengembang harus memiliki role dosen."
    );

    const koordinatorRmk = await getActiveUserByRole(
      tx,
      input.koordinatorRmkId,
      "koordinator_rmk",
      "Koordinator RMK tidak ditemukan.",
      "Koordinator RMK harus memiliki role koordinator_rmk."
    );

    const kaprodi = await getActiveUserByRole(
      tx,
      input.kaprodiId,
      "kaprodi",
      "Kaprodi tidak ditemukan.",
      "Kaprodi harus memiliki role kaprodi."
    );

    const rps = await tx.rps.create({
      data: {
        mataKuliahId: mataKuliah.id,
        kurikulumVersiId: mataKuliah.kurikulumVersiId,
        tahunAkademik: input.tahunAkademik,
        dosenPengembangId: dosenPengembang.id,
        koordinatorRmkId: koordinatorRmk.id,
        kaprodiId: kaprodi.id,
        createdBy: options.actorUserId,
        ...(input.tanggalPenyusunan
          ? {
              tanggalPenyusunan: input.tanggalPenyusunan,
            }
          : {}),
      },
      select: {
        id: true,
        tahunAkademik: true,
        tanggalPenyusunan: true,
        status: true,
        versionNo: true,
        mataKuliah: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
        dosenPengembang: {
          select: {
            id: true,
            nama: true,
          },
        },
        koordinatorRmk: {
          select: {
            id: true,
            nama: true,
          },
        },
        kaprodi: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });

    await tx.rpsDosenPengampu.create({
      data: {
        rpsId: rps.id,
        userId: dosenPengembang.id,
        isPengembang: true,
        urutan: 1,
      },
    });

    return rps;
  });
}
