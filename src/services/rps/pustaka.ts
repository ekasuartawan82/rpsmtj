import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError } from "@/lib/errors";

import { assertOwnedMutableRps } from "./shared";

const kategoriPustakaSchema = z.enum(["utama", "pendukung"]);

const teksLengkapSchema = z
  .string()
  .trim()
  .min(1, "Teks lengkap pustaka wajib diisi.");

const urutanSchema = z.coerce
  .number()
  .int("Urutan harus berupa bilangan bulat.")
  .positive("Urutan harus lebih besar dari 0.")
  .optional();

export const createRpsPustakaSchema = z.object({
  kategori: kategoriPustakaSchema,
  teksLengkap: teksLengkapSchema,
  urutan: urutanSchema,
});

export const updateRpsPustakaSchema = z.object({
  kategori: kategoriPustakaSchema,
  teksLengkap: teksLengkapSchema,
  urutan: urutanSchema,
});

export type CreateRpsPustakaInput = z.infer<typeof createRpsPustakaSchema>;
export type UpdateRpsPustakaInput = z.infer<typeof updateRpsPustakaSchema>;

export async function listRpsPustaka(rpsId: string) {
  return prisma.rpsPustaka.findMany({
    where: { rpsId },
    orderBy: [{ urutan: "asc" }],
    select: {
      id: true,
      kategori: true,
      teksLengkap: true,
      urutan: true,
    },
  });
}

type RpsMutationOptions = {
  actorUserId: string;
};

async function getRpsPustakaOrThrow(rpsId: string, pustakaId: string) {
  const pustaka = await prisma.rpsPustaka.findFirst({
    where: {
      id: pustakaId,
      rpsId,
    },
    select: {
      id: true,
      kategori: true,
      teksLengkap: true,
      urutan: true,
    },
  });

  if (!pustaka) {
    throw new NotFoundError("Pustaka tidak ditemukan pada RPS ini.");
  }

  return pustaka;
}

export async function createRpsPustaka(
  rpsId: string,
  input: CreateRpsPustakaInput,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);

  return prisma.rpsPustaka.create({
    data: {
      rpsId,
      kategori: input.kategori,
      teksLengkap: input.teksLengkap,
      urutan: input.urutan,
    },
    select: {
      id: true,
      kategori: true,
      teksLengkap: true,
      urutan: true,
    },
  });
}

export async function updateRpsPustaka(
  rpsId: string,
  pustakaId: string,
  input: UpdateRpsPustakaInput,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  await getRpsPustakaOrThrow(rpsId, pustakaId);

  return prisma.rpsPustaka.update({
    where: { id: pustakaId },
    data: {
      kategori: input.kategori,
      teksLengkap: input.teksLengkap,
      urutan: input.urutan,
    },
    select: {
      id: true,
      kategori: true,
      teksLengkap: true,
      urutan: true,
    },
  });
}

export async function deleteRpsPustaka(
  rpsId: string,
  pustakaId: string,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  await getRpsPustakaOrThrow(rpsId, pustakaId);

  await prisma.$transaction(async (tx) => {
    const pertemuanList = await tx.rpsPertemuan.findMany({
      where: { rpsId },
      select: { id: true, pustakaRefs: true },
    });

    const toRefStringArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

    const toUpdate = pertemuanList.filter((p) =>
      toRefStringArray(p.pustakaRefs).includes(pustakaId)
    );

    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map((p) => {
          const filtered = toRefStringArray(p.pustakaRefs).filter((id) => id !== pustakaId);
          return tx.rpsPertemuan.update({
            where: { id: p.id },
            data: { pustakaRefs: filtered as Prisma.InputJsonValue },
            select: { id: true },
          });
        })
      );
    }

    await tx.rpsPustaka.delete({
      where: { id: pustakaId },
      select: { id: true },
    });
  });

  return {
    id: pustakaId,
    success: true,
  };
}
