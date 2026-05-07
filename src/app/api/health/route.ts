import { NextResponse } from "next/server";

import { hasDatabaseUrl } from "@/backend/state/database-state";
import { prisma } from "@/backend/db/prisma";

export async function GET() {
  const startedAt = Date.now();

  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      {
        ok: false,
        service: "cheques",
        db: "missing-config",
        message: "DATABASE_URL no esta configurada",
      },
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,
        service: "cheques",
        db: "up",
        latencyMs: Date.now() - startedAt,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "cheques",
        db: "down",
        message: error instanceof Error ? error.message : "No se pudo consultar la base",
      },
      { status: 503 },
    );
  }
}
