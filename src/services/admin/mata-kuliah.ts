import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";

const nullableUuid = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return value;
}, z.uuid().nullable());

const semesterSchema = z.coerce
  .number()
  .int("Semester harus bilangan bulat.")
  .min(1, "Semester minimal 1.")
  .max(6, "Semester maksimal 6.");

const sksSchema = z.coerce
  .number()
  .int("Nilai SKS harus bilangan bulat.")
  .min(0, "Nilai SKS tidak boleh negatif.");

export const listMataKuliahQuerySchema = z.object({
  kurikulumVersiId: z.uuid().optional(),
});

export const createMataKuliahSchema = z.object({
  kode: z.string().trim().min(1, "Kode mata kuliah wajib diisi."),
  nama: z.string().trim().min(3, "Nama mata kuliah minimal 3 karakter."),
  rumpunId: nullableUuid,
  kurikulumVersiId: z.uuid("Kurikulum versi tidak valid."),
  sksTeori: sksSchema,
  sksPraktik: sksSchema,
  semester: semesterSchema,
  isActive: z.boolean().default(true),
});

export const updateMataKuliahSchema = z.object({
  kode: z.string().trim().min(1, "Kode mata kuliah wajib diisi."),
  nama: z.string().trim().min(3, "Nama mata kuliah minimal 3 karakter."),
  rumpunId: nullableUuid,
  kurikulumVersiId: z.uuid("Kurikulum versi tidak valid."),
  sksTeori: sksSchema,
  sksPraktik: sksSchema,
  semester: semesterSchema,
});

export const toggleMataKuliahActiveSchema = z.object({
  action: z.literal("toggle_active"),
  isActive: z.boolean(),
});

export type ListMataKuliahQuery = z.infer<typeof listMataKuliahQuerySchema>;
export type CreateMataKuliahInput = z.infer<typeof createMataKuliahSchema>;
export type UpdateMataKuliahInput = z.infer<typeof updateMataKuliahSchema>;

function mapMataKuliahConstraintError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ValidationError("Kode mata kuliah sudah digunakan.");
  }

  throw error;
}

export async function listMataKuliah(query: ListMataKuliahQuery = {}) {
  return prisma.mataKuliah.findMany({
    where: query.kurikulumVersiId
      ? {
          kurikulumVersiId: query.kurikulumVersiId,
        }
      : undefined,
    orderBy: [{ kurikulumVersiId: "asc" }, { semester: "asc" }, { kode: "asc" }],
    select: {
      id: true,
      kode: true,
      nama: true,
      rumpunId: true,
      kurikulumVersiId: true,
      sksTeori: true,
      sksPraktik: true,
      semester: true,
      isActive: true,
      rumpun: {
        select: {
          id: true,
          nama: true,
        },
      },
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

export async function createMataKuliah(input: CreateMataKuliahInput) {
  try {
    return await prisma.mataKuliah.create({
      data: {
        kode: input.kode,
        nama: input.nama,
        rumpunId: input.rumpunId,
        kurikulumVersiId: input.kurikulumVersiId,
        sksTeori: input.sksTeori,
        sksPraktik: input.sksPraktik,
        semester: input.semester,
        isActive: input.isActive,
      },
      select: {
        id: true,
        kode: true,
        nama: true,
        rumpunId: true,
        kurikulumVersiId: true,
        sksTeori: true,
        sksPraktik: true,
        semester: true,
        isActive: true,
      },
    });
  } catch (error) {
    mapMataKuliahConstraintError(error);
  }
}

export async function updateMataKuliah(mataKuliahId: string, input: UpdateMataKuliahInput) {
  const existing = await prisma.mataKuliah.findUnique({
    where: { id: mataKuliahId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError("Mata kuliah tidak ditemukan.");
  }

  try {
    return await prisma.mataKuliah.update({
      where: { id: mataKuliahId },
      data: {
        kode: input.kode,
        nama: input.nama,
        rumpunId: input.rumpunId,
        kurikulumVersiId: input.kurikulumVersiId,
        sksTeori: input.sksTeori,
        sksPraktik: input.sksPraktik,
        semester: input.semester,
      },
      select: {
        id: true,
        kode: true,
        nama: true,
        rumpunId: true,
        kurikulumVersiId: true,
        sksTeori: true,
        sksPraktik: true,
        semester: true,
        isActive: true,
      },
    });
  } catch (error) {
    mapMataKuliahConstraintError(error);
  }
}

export async function setMataKuliahActiveState(mataKuliahId: string, isActive: boolean) {
  const existing = await prisma.mataKuliah.findUnique({
    where: { id: mataKuliahId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError("Mata kuliah tidak ditemukan.");
  }

  return prisma.mataKuliah.update({
    where: { id: mataKuliahId },
    data: { isActive },
    select: {
      id: true,
      kode: true,
      nama: true,
      rumpunId: true,
      kurikulumVersiId: true,
      sksTeori: true,
      sksPraktik: true,
      semester: true,
      isActive: true,
    },
  });
}
