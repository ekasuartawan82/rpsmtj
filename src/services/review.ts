import type { UserRole } from "@/lib/constants/roles";
import { prisma } from "@/db/prisma";

type ReviewerRole = Extract<UserRole, "koordinator_rmk" | "kaprodi">;

export type ReviewQueueItem = {
  id: string;
  tahunAkademik: string;
  status: string;
  versionNo: number;
  updatedAt: Date;
  submittedAt: Date | null;
  mataKuliah: {
    kode: string;
    nama: string;
  };
  dosenPengembang: {
    nama: string;
  };
};

function getPendingStatus(role: ReviewerRole) {
  return role === "koordinator_rmk" ? "submitted_to_rmk" : "submitted_to_kaprodi";
}

function getSubmissionAction(role: ReviewerRole) {
  return role === "koordinator_rmk" ? "submit_to_rmk" : "submit_to_kaprodi";
}

export async function listReviewQueue(actorUserId: string, actorRole: ReviewerRole) {
  const pendingStatus = getPendingStatus(actorRole);
  const submissionAction = getSubmissionAction(actorRole);

  const records = await prisma.rps.findMany({
    where: {
      ...(actorRole === "koordinator_rmk"
        ? { koordinatorRmkId: actorUserId }
        : { kaprodiId: actorUserId }),
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      tahunAkademik: true,
      status: true,
      versionNo: true,
      updatedAt: true,
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
      approvalLogs: {
        where: {
          action: submissionAction,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          createdAt: true,
        },
      },
    },
  });

  const items: ReviewQueueItem[] = records.map((record) => ({
    id: record.id,
    tahunAkademik: record.tahunAkademik,
    status: record.status,
    versionNo: record.versionNo,
    updatedAt: record.updatedAt,
    submittedAt: record.approvalLogs[0]?.createdAt ?? null,
    mataKuliah: record.mataKuliah,
    dosenPengembang: record.dosenPengembang,
  }));

  return {
    pending: items.filter((item) => item.status === pendingStatus),
    other: items.filter((item) => item.status !== pendingStatus),
  };
}
