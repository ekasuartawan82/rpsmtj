import { compare } from "bcryptjs";
import type { UserRole } from "@prisma/client";

import { prisma } from "@/db/prisma";

type CredentialsInput = {
  email: string;
  password: string;
};

type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export async function authenticateUser(
  input: CredentialsInput
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      nama: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isPasswordValid = await compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.nama,
    role: user.role,
  };
}
