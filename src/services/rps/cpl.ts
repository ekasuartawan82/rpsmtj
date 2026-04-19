import { prisma } from "@/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";

import { assertOwnedMutableRps } from "./shared";

type RpsMutationOptions = {
  actorUserId: string;
};

export async function addRpsCpl(
  rpsId: string,
  cplProdiId: string,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);

  const [rps, cplProdi] = await Promise.all([
    prisma.rps.findUnique({
      where: { id: rpsId },
      select: {
        id: true,
        kurikulumVersiId: true,
      },
    }),
    prisma.cplProdi.findUnique({
      where: { id: cplProdiId },
      select: {
        id: true,
        kode: true,
        kurikulumVersiId: true,
      },
    }),
  ]);

  if (!rps) {
    throw new NotFoundError("RPS tidak ditemukan.");
  }

  if (!cplProdi) {
    throw new NotFoundError("CPL Prodi tidak ditemukan.");
  }

  if (cplProdi.kurikulumVersiId !== rps.kurikulumVersiId) {
    throw new ValidationError("CPL Prodi harus berasal dari kurikulum versi yang sama dengan RPS.");
  }

  const existing = await prisma.rpsCpl.findUnique({
    where: {
      rpsId_cplId: {
        rpsId,
        cplId: cplProdi.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new ValidationError("CPL Prodi sudah terdaftar pada RPS ini.");
  }

  const order = await prisma.rpsCpl.aggregate({
    where: { rpsId },
    _max: {
      urutan: true,
    },
  });

  return prisma.rpsCpl.create({
    data: {
      rpsId,
      cplId: cplProdi.id,
      urutan: (order._max.urutan ?? 0) + 1,
    },
    select: {
      id: true,
      urutan: true,
      cpl: {
        select: {
          id: true,
          kode: true,
          kategori: true,
          deskripsi: true,
          urutan: true,
        },
      },
    },
  });
}

export async function removeRpsCpl(
  rpsId: string,
  cplProdiId: string,
  options: RpsMutationOptions
) {
  await assertOwnedMutableRps(rpsId, options.actorUserId);

  const rpsCpl = await prisma.rpsCpl.findUnique({
    where: {
      rpsId_cplId: {
        rpsId,
        cplId: cplProdiId,
      },
    },
    select: {
      id: true,
      cpmkLinks: {
        select: {
          id: true,
        },
        take: 1,
      },
      cpl: {
        select: {
          id: true,
          kode: true,
        },
      },
    },
  });

  if (!rpsCpl) {
    throw new NotFoundError("CPL Prodi tidak ditemukan pada RPS ini.");
  }

  if (rpsCpl.cpmkLinks.length > 0) {
    throw new ValidationError("CPL masih terhubung ke CPMK. Lepaskan link CPMK-CPL terlebih dahulu.");
  }

  return prisma.rpsCpl.delete({
    where: { id: rpsCpl.id },
    select: {
      id: true,
      urutan: true,
      cpl: {
        select: {
          id: true,
          kode: true,
          kategori: true,
          deskripsi: true,
          urutan: true,
        },
      },
    },
  });
}
