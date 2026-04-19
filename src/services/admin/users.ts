import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/db/prisma";
import { USER_ROLES } from "@/lib/constants/roles";
import { NotFoundError, ValidationError } from "@/lib/errors";

const nullableString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z.string().nullable()
);

export const createUserSchema = z.object({
  nama: z.string().trim().min(3, "Nama minimal 3 karakter."),
  email: z.email("Email tidak valid."),
  nidn: nullableString,
  role: z.enum(USER_ROLES),
  password: z.string().min(8, "Password minimal 8 karakter."),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  nama: z.string().trim().min(3, "Nama minimal 3 karakter."),
  email: z.email("Email tidak valid."),
  nidn: nullableString,
  role: z.enum(USER_ROLES),
  password: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? undefined : value))
    .pipe(z.string().min(8, "Password minimal 8 karakter.").optional()),
  isActive: z.boolean(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
type UpdateUserOptions = {
  actorUserId: string;
};

function mapUniqueConstraintError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ValidationError("Email atau NIDN sudah digunakan oleh akun lain.");
  }

  throw error;
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      nama: true,
      email: true,
      nidn: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function createUser(input: CreateUserInput) {
  try {
    const passwordHash = await hash(input.password, 10);

    return await prisma.user.create({
      data: {
        nama: input.nama,
        email: input.email,
        nidn: input.nidn,
        role: input.role,
        isActive: input.isActive,
        passwordHash,
      },
      select: {
        id: true,
        nama: true,
        email: true,
        nidn: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  } catch (error) {
    mapUniqueConstraintError(error);
  }
}

export async function updateUser(userId: string, input: UpdateUserInput, options: UpdateUserOptions) {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!existingUser) {
    throw new NotFoundError("User tidak ditemukan.");
  }

  if (options.actorUserId === userId && existingUser.role === "admin") {
    if (input.role !== "admin") {
      throw new ValidationError("Admin tidak dapat mengubah role dirinya sendiri dari admin.");
    }

    if (!input.isActive) {
      throw new ValidationError("Admin tidak dapat menonaktifkan akun dirinya sendiri.");
    }
  }

  try {
    const passwordHash = input.password ? await hash(input.password, 10) : undefined;

    return await prisma.user.update({
      where: { id: userId },
      data: {
        nama: input.nama,
        email: input.email,
        nidn: input.nidn,
        role: input.role,
        isActive: input.isActive,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        nama: true,
        email: true,
        nidn: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  } catch (error) {
    mapUniqueConstraintError(error);
  }
}
