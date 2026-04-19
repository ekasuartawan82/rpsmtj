import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  indikatorPenilaianSchema,
  metodePembelajaranSchema,
  parseIndikatorPenilaian,
  parseMetodePembelajaran,
} from "@/lib/types/rps";

const bentukPembelajaranSchema = z.array(z.string().trim().min(1)).default([]);
const pustakaRefsSchema = z.array(z.string().uuid()).default([]);

function parseBentukPembelajaran(value: unknown): string[] {
  return bentukPembelajaranSchema.parse(value ?? []);
}

function parsePustakaRefs(value: unknown): string[] {
  return pustakaRefsSchema.parse(value ?? []);
}

import { assertOwnedMutableRps } from "./shared";

// Detects tokens ≥ 40 non-whitespace chars in a row — a strong signal for
// missing spaces due to paste corruption or broken client serialization.
const LONG_UNSPACED_TOKEN = /\S{40,}/;

function containsLongUnsegmentedToken(text: string): boolean {
  return LONG_UNSPACED_TOKEN.test(text);
}

const weekLabelSchema = z.string().min(1, "Week label wajib diisi.");

const orderNoSchema = z.coerce
  .number()
  .int("Order no harus berupa bilangan bulat.")
  .min(1, "Order no harus minimal 1.");

const tipePertemuanSchema = z.enum(["reguler", "ets", "eas"]);

const teknikPenilaianSchema = z.string().optional();

const kriteriaPenilaianSchema = z.string().optional();

const bobotPenilaianSchema = z.coerce
  .number()
  .min(0, "Bobot penilaian tidak boleh negatif.")
  .max(100, "Bobot penilaian tidak boleh lebih dari 100.")
  .optional();

const subCpmkIdSchema = z.string().uuid("Sub-CPMK tidak valid.").nullable();

const sharedPertemuanFields = {
  weekLabel: weekLabelSchema.optional(),
  orderNo: orderNoSchema.optional(),
  tipe: tipePertemuanSchema.optional(),
  subCpmkId: subCpmkIdSchema.optional(),
  subCpmkText: z.string().optional().nullable(),
  indikatorPenilaian: indikatorPenilaianSchema.optional().superRefine((items, ctx) => {
    if (!items) return;
    items.forEach((item, i) => {
      if (containsLongUnsegmentedToken(item)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [i],
          message: `Indikator ke-${i + 1} mengandung teks tanpa spasi yang terlalu panjang. Pastikan setiap kata dipisahkan dengan spasi.`,
        });
      }
    });
  }),
  teknikPenilaian: teknikPenilaianSchema,
  kriteriaPenilaian: kriteriaPenilaianSchema,
  bentukPembelajaranLuring: bentukPembelajaranSchema.optional(),
  bentukPembelajaranDaring: bentukPembelajaranSchema.optional(),
  metodePembelajaran: metodePembelajaranSchema.optional(),
  bobotPenilaianPersen: bobotPenilaianSchema,
  materiPembelajaran: z.string().optional().nullable(),
  catatanPenugasan: z.string().optional().nullable(),
  estimasiWaktuPb: z.string().optional().nullable(),
  estimasiWaktuPt: z.string().optional().nullable(),
  estimasiWaktuKm: z.string().optional().nullable(),
  deskripsiEvaluasi: z.string().optional().nullable(),
  pustakaRefs: pustakaRefsSchema.optional(),
  notes: z.string().optional().nullable(),
};

export const createRpsPertemuanSchema = z.object(sharedPertemuanFields);

export const updateRpsPertemuanSchema = z.object(sharedPertemuanFields);

export type CreateRpsPertemuanInput = z.infer<typeof createRpsPertemuanSchema>;
export type UpdateRpsPertemuanInput = z.infer<typeof updateRpsPertemuanSchema>;

type RpsMutationOptions = {
  actorUserId: string;
};

function mapPertemuanUniqueError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ValidationError("Minggu ke sudah ada pada RPS ini.");
  }
  throw error;
}

async function getRpsPertemuanOrThrow(rpsId: string, pertemuanId: string) {
  const pertemuan = await prisma.rpsPertemuan.findFirst({
    where: {
      id: pertemuanId,
      rpsId,
    },
    select: {
      id: true,
      weekLabel: true,
      orderNo: true,
      rtmLinks: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!pertemuan) {
    throw new NotFoundError("Pertemuan tidak ditemukan pada RPS ini.");
  }

  return pertemuan;
}

async function validatePustakaRefsExist(rpsId: string, pustakaRefs: string[]) {
  if (pustakaRefs.length === 0) return;

  const found = await prisma.rpsPustaka.findMany({
    where: { rpsId, id: { in: pustakaRefs } },
    select: { id: true },
  });

  const foundIds = new Set(found.map((p) => p.id));
  const missing = pustakaRefs.filter((id) => !foundIds.has(id));

  if (missing.length > 0) {
    throw new ValidationError(
      `Pustaka tidak ditemukan pada RPS ini: ${missing.join(", ")}`
    );
  }
}

async function validateSubCpmkBelongsToRps(rpsId: string, subCpmkId: string | null) {
  if (!subCpmkId) return null;

  const subCpmk = await prisma.rpsSubCpmk.findFirst({
    where: {
      id: subCpmkId,
      rpsId,
    },
    select: {
      id: true,
    },
  });

  if (!subCpmk) {
    throw new ValidationError("Sub-CPMK tidak ditemukan pada RPS ini.");
  }

  return subCpmkId;
}

export async function listRpsPertemuan(rpsId: string) {
  const pertemuanList = await prisma.rpsPertemuan.findMany({
    where: { rpsId },
    orderBy: [{ orderNo: "asc" }],
    select: {
      id: true,
      weekLabel: true,
      orderNo: true,
      tipe: true,
      subCpmkId: true,
      subCpmkText: true,
      subCpmk: {
        select: {
          id: true,
          kode: true,
          deskripsi: true,
        },
      },
      indikatorPenilaian: true,
      teknikPenilaian: true,
      kriteriaPenilaian: true,
      bentukPembelajaranLuring: true,
      bentukPembelajaranDaring: true,
      metodePembelajaran: true,
      materiPembelajaran: true,
      catatanPenugasan: true,
      estimasiWaktuPb: true,
      estimasiWaktuPt: true,
      estimasiWaktuKm: true,
      bobotPenilaianPersen: true,
      deskripsiEvaluasi: true,
      pustakaRefs: true,
      notes: true,
    },
  });

  return pertemuanList.map((p) => ({
    ...p,
    indikatorPenilaian: p.indikatorPenilaian
      ? parseIndikatorPenilaian(p.indikatorPenilaian)
      : [],
    bentukPembelajaranLuring: p.bentukPembelajaranLuring
      ? parseBentukPembelajaran(p.bentukPembelajaranLuring)
      : [],
    bentukPembelajaranDaring: p.bentukPembelajaranDaring
      ? parseBentukPembelajaran(p.bentukPembelajaranDaring)
      : [],
    metodePembelajaran: p.metodePembelajaran
      ? parseMetodePembelajaran(p.metodePembelajaran)
      : [],
    pustakaRefs: p.pustakaRefs ? parsePustakaRefs(p.pustakaRefs) : [],
    bobotPenilaianPersen: p.bobotPenilaianPersen
      ? Number(p.bobotPenilaianPersen)
      : null,
  }));
}

export async function createRpsPertemuan(
  rpsId: string,
  input: CreateRpsPertemuanInput,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  await validateSubCpmkBelongsToRps(rpsId, input.subCpmkId ?? null);
  if (input.pustakaRefs !== undefined && input.pustakaRefs.length > 0) {
    await validatePustakaRefsExist(rpsId, input.pustakaRefs);
  }

  try {
    const pertemuan = await prisma.rpsPertemuan.create({
      data: {
        rpsId,
        weekLabel: input.weekLabel ?? String(input.orderNo ?? 1),
        orderNo: input.orderNo ?? 1,
        tipe: input.tipe ?? "reguler",
        subCpmkId: input.subCpmkId ?? null,
        subCpmkText: input.subCpmkText ?? null,
        ...(input.indikatorPenilaian !== undefined && {
          indikatorPenilaian: indikatorPenilaianSchema.parse(
            input.indikatorPenilaian
          ) as Prisma.InputJsonValue,
        }),
        teknikPenilaian: input.teknikPenilaian ?? null,
        kriteriaPenilaian: input.kriteriaPenilaian ?? null,
        ...(input.bentukPembelajaranLuring !== undefined && {
          bentukPembelajaranLuring: bentukPembelajaranSchema.parse(
            input.bentukPembelajaranLuring
          ) as Prisma.InputJsonValue,
        }),
        ...(input.bentukPembelajaranDaring !== undefined && {
          bentukPembelajaranDaring: bentukPembelajaranSchema.parse(
            input.bentukPembelajaranDaring
          ) as Prisma.InputJsonValue,
        }),
        ...(input.metodePembelajaran !== undefined && {
          metodePembelajaran: metodePembelajaranSchema.parse(
            input.metodePembelajaran
          ) as Prisma.InputJsonValue,
        }),
        materiPembelajaran: input.materiPembelajaran ?? null,
        catatanPenugasan: input.catatanPenugasan ?? null,
        estimasiWaktuPb: input.estimasiWaktuPb ?? null,
        estimasiWaktuPt: input.estimasiWaktuPt ?? null,
        estimasiWaktuKm: input.estimasiWaktuKm ?? null,
        deskripsiEvaluasi: input.deskripsiEvaluasi ?? null,
        ...(input.pustakaRefs !== undefined && {
          pustakaRefs: pustakaRefsSchema.parse(
            input.pustakaRefs
          ) as Prisma.InputJsonValue,
        }),
        notes: input.notes ?? null,
        bobotPenilaianPersen: input.bobotPenilaianPersen
          ? new Prisma.Decimal(input.bobotPenilaianPersen)
          : null,
      },
      select: {
        id: true,
        weekLabel: true,
        orderNo: true,
        tipe: true,
        subCpmkId: true,
        subCpmkText: true,
        indikatorPenilaian: true,
        teknikPenilaian: true,
        kriteriaPenilaian: true,
        bentukPembelajaranLuring: true,
        bentukPembelajaranDaring: true,
        metodePembelajaran: true,
        materiPembelajaran: true,
        catatanPenugasan: true,
        estimasiWaktuPb: true,
        estimasiWaktuPt: true,
        estimasiWaktuKm: true,
        deskripsiEvaluasi: true,
        pustakaRefs: true,
        notes: true,
        bobotPenilaianPersen: true,
      },
    });

    return {
      ...pertemuan,
      indikatorPenilaian: pertemuan.indikatorPenilaian
        ? parseIndikatorPenilaian(pertemuan.indikatorPenilaian)
        : [],
      bentukPembelajaranLuring: pertemuan.bentukPembelajaranLuring
        ? parseBentukPembelajaran(pertemuan.bentukPembelajaranLuring)
        : [],
      bentukPembelajaranDaring: pertemuan.bentukPembelajaranDaring
        ? parseBentukPembelajaran(pertemuan.bentukPembelajaranDaring)
        : [],
      metodePembelajaran: pertemuan.metodePembelajaran
        ? parseMetodePembelajaran(pertemuan.metodePembelajaran)
        : [],
      pustakaRefs: pertemuan.pustakaRefs
        ? parsePustakaRefs(pertemuan.pustakaRefs)
        : [],
    };
  } catch (error) {
    mapPertemuanUniqueError(error);
  }
}

export async function updateRpsPertemuan(
  rpsId: string,
  pertemuanId: string,
  input: UpdateRpsPertemuanInput,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  await getRpsPertemuanOrThrow(rpsId, pertemuanId);
  await validateSubCpmkBelongsToRps(rpsId, input.subCpmkId ?? null);
  if (input.pustakaRefs !== undefined && input.pustakaRefs.length > 0) {
    await validatePustakaRefsExist(rpsId, input.pustakaRefs);
  }

  try {
    const pertemuan = await prisma.rpsPertemuan.update({
      where: { id: pertemuanId },
      data: {
        weekLabel: input.weekLabel ?? String(input.orderNo ?? 1),
        orderNo: input.orderNo ?? 1,
        tipe: input.tipe ?? "reguler",
        subCpmkId: input.subCpmkId ?? null,
        subCpmkText: input.subCpmkText ?? null,
        ...(input.indikatorPenilaian !== undefined && {
          indikatorPenilaian: indikatorPenilaianSchema.parse(
            input.indikatorPenilaian
          ) as Prisma.InputJsonValue,
        }),
        teknikPenilaian: input.teknikPenilaian ?? null,
        kriteriaPenilaian: input.kriteriaPenilaian ?? null,
        ...(input.bentukPembelajaranLuring !== undefined && {
          bentukPembelajaranLuring: bentukPembelajaranSchema.parse(
            input.bentukPembelajaranLuring
          ) as Prisma.InputJsonValue,
        }),
        ...(input.bentukPembelajaranDaring !== undefined && {
          bentukPembelajaranDaring: bentukPembelajaranSchema.parse(
            input.bentukPembelajaranDaring
          ) as Prisma.InputJsonValue,
        }),
        ...(input.metodePembelajaran !== undefined && {
          metodePembelajaran: metodePembelajaranSchema.parse(
            input.metodePembelajaran
          ) as Prisma.InputJsonValue,
        }),
        materiPembelajaran: input.materiPembelajaran ?? null,
        catatanPenugasan: input.catatanPenugasan ?? null,
        estimasiWaktuPb: input.estimasiWaktuPb ?? null,
        estimasiWaktuPt: input.estimasiWaktuPt ?? null,
        estimasiWaktuKm: input.estimasiWaktuKm ?? null,
        deskripsiEvaluasi: input.deskripsiEvaluasi ?? null,
        ...(input.pustakaRefs !== undefined && {
          pustakaRefs: pustakaRefsSchema.parse(
            input.pustakaRefs
          ) as Prisma.InputJsonValue,
        }),
        notes: input.notes ?? null,
        bobotPenilaianPersen: input.bobotPenilaianPersen
          ? new Prisma.Decimal(input.bobotPenilaianPersen)
          : null,
      },
      select: {
        id: true,
        weekLabel: true,
        orderNo: true,
        tipe: true,
        subCpmkId: true,
        subCpmkText: true,
        indikatorPenilaian: true,
        teknikPenilaian: true,
        kriteriaPenilaian: true,
        bentukPembelajaranLuring: true,
        bentukPembelajaranDaring: true,
        metodePembelajaran: true,
        materiPembelajaran: true,
        catatanPenugasan: true,
        estimasiWaktuPb: true,
        estimasiWaktuPt: true,
        estimasiWaktuKm: true,
        deskripsiEvaluasi: true,
        pustakaRefs: true,
        notes: true,
        bobotPenilaianPersen: true,
      },
    });

    return {
      ...pertemuan,
      indikatorPenilaian: pertemuan.indikatorPenilaian
        ? parseIndikatorPenilaian(pertemuan.indikatorPenilaian)
        : [],
      bentukPembelajaranLuring: pertemuan.bentukPembelajaranLuring
        ? parseBentukPembelajaran(pertemuan.bentukPembelajaranLuring)
        : [],
      bentukPembelajaranDaring: pertemuan.bentukPembelajaranDaring
        ? parseBentukPembelajaran(pertemuan.bentukPembelajaranDaring)
        : [],
      metodePembelajaran: pertemuan.metodePembelajaran
        ? parseMetodePembelajaran(pertemuan.metodePembelajaran)
        : [],
      pustakaRefs: pertemuan.pustakaRefs
        ? parsePustakaRefs(pertemuan.pustakaRefs)
        : [],
    };
  } catch (error) {
    mapPertemuanUniqueError(error);
  }
}

export async function deleteRpsPertemuan(
  rpsId: string,
  pertemuanId: string,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  const pertemuan = await getRpsPertemuanOrThrow(rpsId, pertemuanId);

  if (pertemuan.rtmLinks.length > 0) {
    throw new ValidationError(
      "Tidak dapat menghapus pertemuan yang masih memiliki tautan ke RTM. Hapus tautan RTM terlebih dahulu."
    );
  }

  await prisma.rpsPertemuan.delete({
    where: { id: pertemuanId },
    select: {
      id: true,
    },
  });

  return {
    id: pertemuanId,
    success: true,
  };
}
