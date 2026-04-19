import type {
  Prisma,
  PrismaClient,
  RpsNotificationType,
} from "@prisma/client";

import { prisma } from "@/db/prisma";
import { NotFoundError } from "@/lib/errors";

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export type NotificationItem = {
  id: string;
  type: RpsNotificationType;
  title: string;
  message: string;
  href: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  rps: {
    id: string;
    status: string;
    mataKuliah: {
      kode: string;
      nama: string;
    };
  };
};

export type CreateNotificationInput = {
  recipientUserId: string;
  rpsId: string;
  type: RpsNotificationType;
  title: string;
  message: string;
  href: string;
};

export async function createNotifications(
  client: PrismaClientLike,
  notifications: CreateNotificationInput[]
) {
  if (notifications.length === 0) {
    return;
  }

  await client.rpsNotification.createMany({
    data: notifications,
  });
}

export async function listNotifications(actorUserId: string) {
  const [items, unreadCount] = await Promise.all([
    prisma.rpsNotification.findMany({
      where: {
        recipientUserId: actorUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        href: true,
        isRead: true,
        readAt: true,
        createdAt: true,
        rps: {
          select: {
            id: true,
            status: true,
            mataKuliah: {
              select: {
                kode: true,
                nama: true,
              },
            },
          },
        },
      },
    }),
    prisma.rpsNotification.count({
      where: {
        recipientUserId: actorUserId,
        isRead: false,
      },
    }),
  ]);

  return {
    items,
    unreadCount,
  };
}

export async function getUnreadNotificationCount(actorUserId: string) {
  return prisma.rpsNotification.count({
    where: {
      recipientUserId: actorUserId,
      isRead: false,
    },
  });
}

export async function markNotificationAsRead(
  notificationId: string,
  actorUserId: string
) {
  const notification = await prisma.rpsNotification.findFirst({
    where: {
      id: notificationId,
      recipientUserId: actorUserId,
    },
    select: {
      id: true,
      isRead: true,
    },
  });

  if (!notification) {
    throw new NotFoundError("Notifikasi tidak ditemukan.");
  }

  if (!notification.isRead) {
    await prisma.rpsNotification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: {
        id: true,
      },
    });
  }

  return {
    id: notificationId,
    success: true,
  };
}
