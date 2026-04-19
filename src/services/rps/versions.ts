import { prisma } from "@/db/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export type RpsVersionHistoryItem = {
  id: string;
  versionNo: number;
  status: string;
  createdAt: Date;
  latestApprovalLog: {
    action: string;
    catatanReview: string | null;
    createdAt: Date;
    actorUser: {
      nama: string;
    };
  } | null;
};

async function resolveRootRpsId(rpsId: string): Promise<string> {
  let currentId = rpsId;

  while (true) {
    const current = await prisma.rps.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        parentRpsId: true,
      },
    });

    if (!current) {
      throw new NotFoundError("RPS tidak ditemukan.");
    }

    if (!current.parentRpsId) {
      return current.id;
    }

    currentId = current.parentRpsId;
  }
}

async function resolveChainIds(rootRpsId: string): Promise<string[]> {
  const chainIds = [rootRpsId];
  let currentId = rootRpsId;

  while (true) {
    const nextVersion = await prisma.rps.findFirst({
      where: {
        parentRpsId: currentId,
      },
      orderBy: [{ versionNo: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
      },
    });

    if (!nextVersion) {
      return chainIds;
    }

    chainIds.push(nextVersion.id);
    currentId = nextVersion.id;
  }
}

export async function getVersionHistory(
  rpsId: string,
  actorUserId: string
): Promise<RpsVersionHistoryItem[]> {
  const anchorRps = await prisma.rps.findUnique({
    where: { id: rpsId },
    select: {
      id: true,
      dosenPengembangId: true,
      dosenPengampu: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!anchorRps) {
    throw new NotFoundError("RPS tidak ditemukan.");
  }

  const isDosenPengembang = anchorRps.dosenPengembangId === actorUserId;
  const isDosenPengampu = anchorRps.dosenPengampu.some(
    (dosenPengampu) => dosenPengampu.userId === actorUserId
  );

  if (!isDosenPengembang && !isDosenPengampu) {
    throw new ForbiddenError("Anda tidak memiliki akses ke riwayat versi RPS ini.");
  }

  const rootRpsId = await resolveRootRpsId(anchorRps.id);
  const chainIds = await resolveChainIds(rootRpsId);

  const versions = await prisma.rps.findMany({
    where: {
      id: {
        in: chainIds,
      },
    },
    orderBy: [{ versionNo: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      versionNo: true,
      status: true,
      createdAt: true,
      approvalLogs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          action: true,
          catatanReview: true,
          createdAt: true,
          actorUser: {
            select: {
              nama: true,
            },
          },
        },
      },
    },
  });

  return versions.map((version) => ({
    id: version.id,
    versionNo: version.versionNo,
    status: version.status,
    createdAt: version.createdAt,
    latestApprovalLog: version.approvalLogs[0] ?? null,
  }));
}
