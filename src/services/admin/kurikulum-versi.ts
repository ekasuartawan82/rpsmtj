import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError } from "@/lib/errors";

export const createKurikulumVersiSchema = z.object({
  tahun: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Tahun harus terdiri dari 4 digit."),
  label: z.string().trim().min(3, "Label minimal 3 karakter."),
  isActive: z.boolean().default(false),
});

export const updateKurikulumVersiSchema = z.object({
  tahun: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Tahun harus terdiri dari 4 digit."),
  label: z.string().trim().min(3, "Label minimal 3 karakter."),
});

export const activateKurikulumVersiSchema = z.object({
  action: z.literal("set_active"),
});

export type CreateKurikulumVersiInput = z.infer<typeof createKurikulumVersiSchema>;
export type UpdateKurikulumVersiInput = z.infer<typeof updateKurikulumVersiSchema>;

export async function listKurikulumVersi() {
  return prisma.kurikulumVersi.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      tahun: true,
      label: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function createKurikulumVersi(input: CreateKurikulumVersiInput) {
  if (input.isActive) {
    return prisma.$transaction(async (tx) => {
      await tx.kurikulumVersi.updateMany({
        data: { isActive: false },
      });

      return tx.kurikulumVersi.create({
        data: {
          tahun: input.tahun,
          label: input.label,
          isActive: true,
        },
        select: {
          id: true,
          tahun: true,
          label: true,
          isActive: true,
          createdAt: true,
        },
      });
    });
  }

  return prisma.kurikulumVersi.create({
    data: {
      tahun: input.tahun,
      label: input.label,
      isActive: false,
    },
    select: {
      id: true,
      tahun: true,
      label: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function updateKurikulumVersi(
  kurikulumVersiId: string,
  input: UpdateKurikulumVersiInput
) {
  return prisma.kurikulumVersi.update({
    where: { id: kurikulumVersiId },
    data: {
      tahun: input.tahun,
      label: input.label,
    },
    select: {
      id: true,
      tahun: true,
      label: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function deleteKurikulumVersi(kurikulumVersiId: string) {
  const existing = await prisma.kurikulumVersi.findUnique({
    where: { id: kurikulumVersiId },
    select: { id: true, isActive: true },
  });

  if (!existing) {
    throw new NotFoundError("Kurikulum versi tidak ditemukan.");
  }

  if (existing.isActive) {
    throw new Error("Kurikulum versi yang sedang aktif tidak dapat dihapus.");
  }

  return prisma.kurikulumVersi.delete({
    where: { id: kurikulumVersiId },
  });
}

export async function setKurikulumVersiActive(kurikulumVersiId: string) {
  const target = await prisma.kurikulumVersi.findUnique({
    where: { id: kurikulumVersiId },
    select: { id: true },
  });

  if (!target) {
    throw new NotFoundError("Kurikulum versi tidak ditemukan.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.kurikulumVersi.updateMany({
      where: { id: { not: kurikulumVersiId } }, // Deactivate all other versions to preserve the single-active invariant.
      data: { isActive: false },
    });

    return tx.kurikulumVersi.update({
      where: { id: kurikulumVersiId },
      data: { isActive: true },
      select: {
        id: true,
        tahun: true,
        label: true,
        isActive: true,
        createdAt: true,
      },
    });
  });
}
