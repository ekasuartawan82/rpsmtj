import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const operationalVerbs = [
  "mengidentifikasi",
  "menjelaskan",
  "menganalisis",
  "menghitung",
  "membandingkan",
  "menyusun",
  "mengevaluasi",
  "mengoperasikan",
];

const bootstrapUsers = [
  {
    nama: "Admin MTJ",
    email: "admin@mtj.local",
    nidn: null,
    role: "admin" as const,
  },
  {
    nama: "Ka Prodi MTJ",
    email: "kaprodi@mtj.local",
    nidn: "900000001",
    role: "kaprodi" as const,
  },
  {
    nama: "Koordinator RMK MTJ",
    email: "rmk@mtj.local",
    nidn: "900000002",
    role: "koordinator_rmk" as const,
  },
  {
    nama: "Dosen MTJ",
    email: "dosen@mtj.local",
    nidn: "900000003",
    role: "dosen" as const,
  },
];

async function main() {
  const passwordHash = await hash("Password123!", 10);

  for (const kata of operationalVerbs) {
    await prisma.whitelistKataKerjaOperasional.upsert({
      where: { kata },
      update: {},
      create: { kata },
    });
  }

  for (const user of bootstrapUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        nama: user.nama,
        nidn: user.nidn,
        role: user.role,
        isActive: true,
        passwordHash,
      },
      create: {
        nama: user.nama,
        email: user.email,
        nidn: user.nidn,
        role: user.role,
        isActive: true,
        passwordHash,
      },
    });
  }

  console.log(
    "Seed bootstrap selesai. Akun tersedia: admin@mtj.local, kaprodi@mtj.local, rmk@mtj.local, dosen@mtj.local dengan password Password123!."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
