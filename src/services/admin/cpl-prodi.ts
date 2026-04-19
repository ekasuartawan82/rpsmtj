import { Prisma, type CplKategori } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";

const cplKategoriOptions = ["S", "P", "KU", "KK"] as const;
const nullablePositiveInt = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return value;
}, z.coerce.number().int().positive().nullable());

export const listCplProdiQuerySchema = z.object({
  kurikulumVersiId: z.uuid().optional(),
});

export const createCplProdiSchema = z.object({
  kurikulumVersiId: z.uuid("Kurikulum versi tidak valid."),
  kode: z.string().trim().min(1, "Kode CPL wajib diisi."),
  kategori: z.enum(cplKategoriOptions).optional().default("S"),
  deskripsi: z.string().trim().min(10, "Deskripsi minimal 10 karakter."),
  urutan: nullablePositiveInt,
});

export const updateCplProdiSchema = z.object({
  kurikulumVersiId: z.uuid("Kurikulum versi tidak valid."),
  kode: z.string().trim().min(1, "Kode CPL wajib diisi."),
  kategori: z.enum(cplKategoriOptions).optional().default("S"),
  deskripsi: z.string().trim().min(10, "Deskripsi minimal 10 karakter."),
  urutan: nullablePositiveInt,
});

export type CreateCplProdiInput = z.infer<typeof createCplProdiSchema>;
export type UpdateCplProdiInput = z.infer<typeof updateCplProdiSchema>;
export type ListCplProdiQuery = z.infer<typeof listCplProdiQuerySchema>;

function mapCplProdiConstraintError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ValidationError("Kode CPL sudah digunakan pada kurikulum versi yang sama.");
  }

  throw error;
}

export async function listCplProdi(query: ListCplProdiQuery = {}) {
  return prisma.cplProdi.findMany({
    where: query.kurikulumVersiId
      ? {
          kurikulumVersiId: query.kurikulumVersiId,
        }
      : undefined,
    orderBy: [{ kurikulumVersiId: "asc" }, { urutan: "asc" }, { kode: "asc" }],
    select: {
      id: true,
      kode: true,
      kategori: true,
      deskripsi: true,
      urutan: true,
      kurikulumVersiId: true,
      kurikulumVersi: {
        select: {
          id: true,
          tahun: true,
          label: true,
          isActive: true,
        },
      },
    },
  });
}

export async function createCplProdi(input: CreateCplProdiInput) {
  try {
    return await prisma.cplProdi.create({
      data: {
        kurikulumVersiId: input.kurikulumVersiId,
        kode: input.kode,
        kategori: input.kategori as CplKategori,
        deskripsi: input.deskripsi,
        urutan: input.urutan,
      },
      select: {
        id: true,
        kode: true,
        kategori: true,
        deskripsi: true,
        urutan: true,
        kurikulumVersiId: true,
      },
    });
  } catch (error) {
    mapCplProdiConstraintError(error);
  }
}

export async function deleteCplProdi(cplProdiId: string) {
  const existing = await prisma.cplProdi.findUnique({
    where: { id: cplProdiId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError("CPL Prodi tidak ditemukan.");
  }

  return prisma.cplProdi.delete({
    where: { id: cplProdiId },
  });
}

export async function updateCplProdi(cplProdiId: string, input: UpdateCplProdiInput) {
  const existing = await prisma.cplProdi.findUnique({
    where: { id: cplProdiId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError("CPL Prodi tidak ditemukan.");
  }

  try {
    return await prisma.cplProdi.update({
      where: { id: cplProdiId },
      data: {
        kurikulumVersiId: input.kurikulumVersiId,
        kode: input.kode,
        kategori: input.kategori as CplKategori,
        deskripsi: input.deskripsi,
        urutan: input.urutan,
      },
      select: {
        id: true,
        kode: true,
        kategori: true,
        deskripsi: true,
        urutan: true,
        kurikulumVersiId: true,
      },
    });
  } catch (error) {
    mapCplProdiConstraintError(error);
  }
}
