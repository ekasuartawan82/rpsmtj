import { prisma } from "@/db/prisma";

export async function getAdminDashboardSummary() {
  const [
    usersCount,
    activeUsersCount,
    kurikulumCount,
    activeKurikulumCount,
    mataKuliahCount,
    cplCount,
    rumpunCount,
    whitelistCount,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.kurikulumVersi.count(),
    prisma.kurikulumVersi.count({ where: { isActive: true } }),
    prisma.mataKuliah.count(),
    prisma.cplProdi.count(),
    prisma.rumpunMk.count(),
    prisma.whitelistKataKerjaOperasional.count(),
  ]);

  return {
    usersCount,
    activeUsersCount,
    kurikulumCount,
    activeKurikulumCount,
    mataKuliahCount,
    cplCount,
    rumpunCount,
    whitelistCount,
  };
}
