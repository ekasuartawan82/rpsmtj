import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/db/prisma";
import type { UserRole } from "@/lib/constants/roles";

const RPS_STATUSES = [
  "draft",
  "submitted_to_rmk",
  "revision_requested_by_rmk",
  "approved_by_rmk",
  "submitted_to_kaprodi",
  "revision_requested_by_kaprodi",
  "approved",
  "superseded",
] as const;

export const listRpsQuerySchema = z.object({
  status: z.enum(RPS_STATUSES).optional(),
  mataKuliahId: z.uuid("Mata kuliah tidak valid.").optional(),
  dosenPengembangId: z.uuid("Dosen pengembang tidak valid.").optional(),
});

export type ListRpsQuery = z.infer<typeof listRpsQuerySchema>;

type ListRpsOptions = {
  actorUserId: string;
  actorRole: UserRole;
};

export type DosenRpsDashboardItem = {
  id: string;
  tahunAkademik: string;
  status: string;
  versionNo: number;
  versionCount: number;
  mataKuliah: {
    id: string;
    kode: string;
    nama: string;
  };
  dosenPengembang: {
    nama: string;
  };
};

function buildListRpsWhere(query: ListRpsQuery, options: ListRpsOptions): Prisma.RpsWhereInput {
  const where: Prisma.RpsWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.mataKuliahId ? { mataKuliahId: query.mataKuliahId } : {}),
    ...(query.dosenPengembangId ? { dosenPengembangId: query.dosenPengembangId } : {}),
  };

  if (options.actorRole === "dosen") {
    where.dosenPengembangId = options.actorUserId;
  }

  if (options.actorRole === "koordinator_rmk") {
    where.koordinatorRmkId = options.actorUserId;
  }

  if (options.actorRole === "kaprodi") {
    where.kaprodiId = options.actorUserId;
  }

  return where;
}

export async function listRps(query: ListRpsQuery = {}, options: ListRpsOptions) {
  return prisma.rps.findMany({
    where: buildListRpsWhere(query, options),
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      tahunAkademik: true,
      status: true,
      versionNo: true,
      mataKuliah: {
        select: {
          kode: true,
          nama: true,
        },
      },
      dosenPengembang: {
        select: {
          nama: true,
        },
      },
    },
  });
}

function pickDashboardVersion<T extends { status: string; versionNo: number }>(records: T[]): T {
  const nonSuperseded = records.filter((record) => record.status !== "superseded");
  const candidatePool = nonSuperseded.length > 0 ? nonSuperseded : records;

  return [...candidatePool].sort((left, right) => right.versionNo - left.versionNo)[0];
}

export async function listDosenRpsDashboard(actorUserId: string): Promise<DosenRpsDashboardItem[]> {
  const records = await prisma.rps.findMany({
    where: {
      dosenPengembangId: actorUserId,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      tahunAkademik: true,
      status: true,
      versionNo: true,
      createdAt: true,
      updatedAt: true,
      mataKuliah: {
        select: {
          id: true,
          kode: true,
          nama: true,
        },
      },
      dosenPengembang: {
        select: {
          nama: true,
        },
      },
    },
  });

  const groupedRecords = new Map<string, typeof records>();

  for (const record of records) {
    const groupKey = `${record.mataKuliah.id}::${record.tahunAkademik}`;
    const existingGroup = groupedRecords.get(groupKey) ?? [];
    existingGroup.push(record);
    groupedRecords.set(groupKey, existingGroup);
  }

  return [...groupedRecords.values()]
    .map((group) => {
      const latestRecord = pickDashboardVersion(group);

      return {
        latestUpdatedAt: latestRecord.updatedAt,
        item: {
          id: latestRecord.id,
          tahunAkademik: latestRecord.tahunAkademik,
          status: latestRecord.status,
          versionNo: latestRecord.versionNo,
          versionCount: group.length,
          mataKuliah: latestRecord.mataKuliah,
          dosenPengembang: latestRecord.dosenPengembang,
        },
      };
    })
    .sort((left, right) => right.latestUpdatedAt.getTime() - left.latestUpdatedAt.getTime())
    .map((entry) => entry.item);
}
