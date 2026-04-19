import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError, ValidationError } from "@/lib/errors";

function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Payload tidak valid.",
          details: formatZodIssues(error),
        },
      },
      { status: 422 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json(
      {
        error: {
          code: "UNIQUE_CONSTRAINT",
          message: "Data duplikat terdeteksi pada field yang harus unik.",
        },
      },
      { status: 409 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    return NextResponse.json(
      {
        error: {
          code: "RELATION_NOT_FOUND",
          message: "Relasi data tidak ditemukan.",
        },
      },
      { status: 422 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Data tidak ditemukan.",
        },
      },
      { status: 404 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.statusCode }
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Terjadi kesalahan internal.",
      },
    },
    { status: 500 }
  );
}

export function ensureRecordId(recordId: string | undefined) {
  if (!recordId) {
    throw new ValidationError("ID record wajib ada.");
  }

  return recordId;
}
