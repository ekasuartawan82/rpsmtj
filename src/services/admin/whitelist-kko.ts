import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/db/prisma";
import { ValidationError } from "@/lib/errors";

export const createWhitelistKkoSchema = z.object({
  kata: z
    .string()
    .trim()
    .min(2, "Kata kerja minimal 2 karakter.")
    .transform((value) => value.toLowerCase()),
});

export type CreateWhitelistKkoInput = z.infer<typeof createWhitelistKkoSchema>;

function mapWhitelistKkoConstraintError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ValidationError("Kata kerja operasional sudah ada di whitelist.");
  }

  throw error;
}

export async function listWhitelistKko() {
  return prisma.whitelistKataKerjaOperasional.findMany({
    orderBy: [{ kata: "asc" }],
    select: {
      id: true,
      kata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createWhitelistKko(input: CreateWhitelistKkoInput) {
  try {
    return await prisma.whitelistKataKerjaOperasional.create({
      data: {
        kata: input.kata,
      },
      select: {
        id: true,
        kata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    mapWhitelistKkoConstraintError(error);
  }
}

export async function deleteWhitelistKko(whitelistKkoId: string) {
  return prisma.whitelistKataKerjaOperasional.delete({
    where: { id: whitelistKkoId },
    select: {
      id: true,
      kata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
