import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError } from "@/lib/errors";

export const createRumpunMkSchema = z.object({
  nama: z.string().trim().min(3, "Nama rumpun minimal 3 karakter."),
});

export const updateRumpunMkSchema = z.object({
  nama: z.string().trim().min(3, "Nama rumpun minimal 3 karakter."),
});

export type CreateRumpunMkInput = z.infer<typeof createRumpunMkSchema>;
export type UpdateRumpunMkInput = z.infer<typeof updateRumpunMkSchema>;

export async function listRumpunMk() {
  return prisma.rumpunMk.findMany({
    orderBy: [{ nama: "asc" }],
    select: {
      id: true,
      nama: true,
    },
  });
}

export async function createRumpunMk(input: CreateRumpunMkInput) {
  return prisma.rumpunMk.create({
    data: {
      nama: input.nama,
    },
    select: {
      id: true,
      nama: true,
    },
  });
}

export async function deleteRumpunMk(rumpunMkId: string) {
  const existing = await prisma.rumpunMk.findUnique({
    where: { id: rumpunMkId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError("Rumpun MK tidak ditemukan.");
  }

  return prisma.rumpunMk.delete({
    where: { id: rumpunMkId },
  });
}

export async function updateRumpunMk(rumpunMkId: string, input: UpdateRumpunMkInput) {
  const existing = await prisma.rumpunMk.findUnique({
    where: { id: rumpunMkId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError("Rumpun MK tidak ditemukan.");
  }

  return prisma.rumpunMk.update({
    where: { id: rumpunMkId },
    data: {
      nama: input.nama,
    },
    select: {
      id: true,
      nama: true,
    },
  });
}
