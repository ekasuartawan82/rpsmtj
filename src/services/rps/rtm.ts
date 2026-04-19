import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";

import { assertOwnedMutableRps } from "./shared";

const metodePenugasanSchema = z.enum(["terstruktur", "mandiri", "akhir"]);

const bobotInternalSchema = z.coerce
  .number()
  .min(0, "Bobot internal tidak boleh negatif.")
  .max(100, "Bobot internal tidak boleh lebih dari 100.")
  .optional();

const subCpmkIdRequiredSchema = z.string().uuid("Sub-CPMK tidak valid.");

export const createRpsRtmSchema = z.object({
  nomorTugas: z.string().trim().min(1, "Nomor tugas wajib diisi."),
  judulTugas: z.string().trim().min(1, "Judul tugas wajib diisi."),
  subCpmkId: subCpmkIdRequiredSchema,
  metodePenugasan: metodePenugasanSchema,
  deskripsi: z.string().optional(),
  langkahPengerjaan: z.string().optional(),
  bentukLuaran: z.string().optional(),
  indikatorPenilaian: z.string().optional(),
  bobotInternalPersen: bobotInternalSchema,
  jadwalPelaksanaan: z.string().optional(),
  catatan: z.string().optional(),
  daftarRujukan: z.string().optional(),
});

export const updateRpsRtmSchema = z.object({
  nomorTugas: z.string().trim().min(1, "Nomor tugas wajib diisi."),
  judulTugas: z.string().trim().min(1, "Judul tugas wajib diisi."),
  subCpmkId: subCpmkIdRequiredSchema,
  metodePenugasan: metodePenugasanSchema,
  deskripsi: z.string().optional(),
  langkahPengerjaan: z.string().optional(),
  bentukLuaran: z.string().optional(),
  indikatorPenilaian: z.string().optional(),
  bobotInternalPersen: bobotInternalSchema,
  jadwalPelaksanaan: z.string().optional(),
  catatan: z.string().optional(),
  daftarRujukan: z.string().optional(),
});

export const linkRtmToPertemuanSchema = z.object({
  pertemuanId: z.string().uuid("ID pertemuan tidak valid."),
  keterangan: z.string().optional(),
});

export const unlinkRtmFromPertemuanSchema = z.object({
  pertemuanId: z.string().uuid("ID pertemuan tidak valid."),
});

export type CreateRpsRtmInput = z.infer<typeof createRpsRtmSchema>;
export type UpdateRpsRtmInput = z.infer<typeof updateRpsRtmSchema>;
export type LinkRtmToPertemuanInput = z.infer<typeof linkRtmToPertemuanSchema>;
export type UnlinkRtmFromPertemuanInput = z.infer<typeof unlinkRtmFromPertemuanSchema>;

type RpsMutationOptions = {
  actorUserId: string;
};

async function getRpsRtmOrThrow(rpsId: string, rtmId: string) {
  const rtm = await prisma.rpsRtm.findFirst({
    where: {
      id: rtmId,
      rpsId,
    },
    select: {
      id: true,
      nomorTugas: true,
      judulTugas: true,
    },
  });

  if (!rtm) {
    throw new NotFoundError("RTM tidak ditemukan pada RPS ini.");
  }

  return rtm;
}

async function validateSubCpmkBelongsToRps(rpsId: string, subCpmkId: string) {
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

async function getPertemuanBelongsToRps(rpsId: string, pertemuanId: string) {
  const pertemuan = await prisma.rpsPertemuan.findFirst({
    where: {
      id: pertemuanId,
      rpsId,
    },
    select: {
      id: true,
      weekLabel: true,
      orderNo: true,
    },
  });

  if (!pertemuan) {
    throw new ValidationError("Pertemuan tidak ditemukan pada RPS ini.");
  }

  return pertemuan;
}

export async function createRpsRtm(
  rpsId: string,
  input: CreateRpsRtmInput,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  await validateSubCpmkBelongsToRps(rpsId, input.subCpmkId);

  return prisma.rpsRtm.create({
    data: {
      rpsId,
      nomorTugas: input.nomorTugas,
      judulTugas: input.judulTugas,
      subCpmkId: input.subCpmkId,
      metodePenugasan: input.metodePenugasan,
      deskripsi: input.deskripsi ?? null,
      langkahPengerjaan: input.langkahPengerjaan ?? null,
      bentukLuaran: input.bentukLuaran ?? null,
      indikatorPenilaian: input.indikatorPenilaian ?? null,
      bobotInternalPersen: input.bobotInternalPersen
        ? new Prisma.Decimal(input.bobotInternalPersen)
        : null,
      jadwalPelaksanaan: input.jadwalPelaksanaan ?? null,
      catatan: input.catatan ?? null,
      daftarRujukan: input.daftarRujukan ?? null,
    },
    select: {
      id: true,
      nomorTugas: true,
      judulTugas: true,
      subCpmkId: true,
      metodePenugasan: true,
      deskripsi: true,
      langkahPengerjaan: true,
      bentukLuaran: true,
      indikatorPenilaian: true,
      bobotInternalPersen: true,
      jadwalPelaksanaan: true,
      catatan: true,
      daftarRujukan: true,
    },
  });
}

export async function updateRpsRtm(
  rpsId: string,
  rtmId: string,
  input: UpdateRpsRtmInput,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  await getRpsRtmOrThrow(rpsId, rtmId);
  await validateSubCpmkBelongsToRps(rpsId, input.subCpmkId);

  return prisma.rpsRtm.update({
    where: { id: rtmId },
    data: {
      nomorTugas: input.nomorTugas,
      judulTugas: input.judulTugas,
      subCpmkId: input.subCpmkId,
      metodePenugasan: input.metodePenugasan,
      deskripsi: input.deskripsi ?? null,
      langkahPengerjaan: input.langkahPengerjaan ?? null,
      bentukLuaran: input.bentukLuaran ?? null,
      indikatorPenilaian: input.indikatorPenilaian ?? null,
      bobotInternalPersen: input.bobotInternalPersen
        ? new Prisma.Decimal(input.bobotInternalPersen)
        : null,
      jadwalPelaksanaan: input.jadwalPelaksanaan ?? null,
      catatan: input.catatan ?? null,
      daftarRujukan: input.daftarRujukan ?? null,
    },
    select: {
      id: true,
      nomorTugas: true,
      judulTugas: true,
      subCpmkId: true,
      metodePenugasan: true,
      deskripsi: true,
      langkahPengerjaan: true,
      bentukLuaran: true,
      indikatorPenilaian: true,
      bobotInternalPersen: true,
      jadwalPelaksanaan: true,
      catatan: true,
      daftarRujukan: true,
    },
  });
}

export async function deleteRpsRtm(
  rpsId: string,
  rtmId: string,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  await getRpsRtmOrThrow(rpsId, rtmId);

  await prisma.$transaction(async (tx) => {
    // Delete all rps_rtm_pertemuan links first
    await tx.rpsRtmPertemuan.deleteMany({
      where: {
        rpsRtmId: rtmId,
      },
    });

    // Then delete the RTM itself
    await tx.rpsRtm.delete({
      where: {
        id: rtmId,
      },
    });
  });

  return {
    id: rtmId,
    success: true,
  };
}

export async function linkRtmToPertemuan(
  rpsId: string,
  rtmId: string,
  input: LinkRtmToPertemuanInput,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  await getRpsRtmOrThrow(rpsId, rtmId);
  await getPertemuanBelongsToRps(rpsId, input.pertemuanId);

  // Check if link already exists
  const existing = await prisma.rpsRtmPertemuan.findUnique({
    where: {
      rpsRtmId_rpsPertemuanId: {
        rpsRtmId: rtmId,
        rpsPertemuanId: input.pertemuanId,
      },
    },
  });

  if (existing) {
    throw new ValidationError("RTM sudah terhubung ke pertemuan ini.");
  }

  return prisma.rpsRtmPertemuan.create({
    data: {
      rpsRtmId: rtmId,
      rpsPertemuanId: input.pertemuanId,
      keterangan: input.keterangan ?? null,
    },
    select: {
      id: true,
      rpsRtmId: true,
      rpsPertemuanId: true,
      keterangan: true,
    },
  });
}

export async function unlinkRtmFromPertemuan(
  rpsId: string,
  rtmId: string,
  input: UnlinkRtmFromPertemuanInput,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);
  await getRpsRtmOrThrow(rpsId, rtmId);
  await getPertemuanBelongsToRps(rpsId, input.pertemuanId);

  const link = await prisma.rpsRtmPertemuan.findUnique({
    where: {
      rpsRtmId_rpsPertemuanId: {
        rpsRtmId: rtmId,
        rpsPertemuanId: input.pertemuanId,
      },
    },
  });

  if (!link) {
    throw new ValidationError("Tautan RTM ke pertemuan tidak ditemukan.");
  }

  await prisma.rpsRtmPertemuan.delete({
    where: {
      id: link.id,
    },
    select: {
      id: true,
    },
  });

  return {
    id: link.id,
    success: true,
  };
}
