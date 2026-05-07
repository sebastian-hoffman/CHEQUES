import { Prisma } from "@prisma/client";

import { getIvaClientDelegate } from "@/backend/capabilities/prisma-capabilities";
import { prisma } from "@/backend/db/prisma";

type IvaClientItem = { id: string; name: string };

export async function listIvaClientsSafe(): Promise<IvaClientItem[]> {
  const delegate = getIvaClientDelegate();
  if (delegate?.findMany) {
    return delegate.findMany({ orderBy: { name: "asc" } });
  }

  return prisma.$queryRaw<IvaClientItem[]>`
    SELECT "id", "name"
    FROM "IvaClient"
    ORDER BY "name" ASC
  `;
}

export async function findIvaClientNameByIdSafe(id: string): Promise<string | null> {
  const delegate = getIvaClientDelegate();
  if (delegate?.findUnique) {
    const item = await delegate.findUnique({
      where: { id },
      select: { name: true },
    });
    return item?.name ?? null;
  }

  const rows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT "name"
    FROM "IvaClient"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  return rows[0]?.name ?? null;
}

export async function upsertIvaClientByNameSafe(name: string): Promise<{ id: string }> {
  const delegate = getIvaClientDelegate();
  if (delegate?.upsert) {
    return delegate.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const id = crypto.randomUUID();
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "IvaClient" ("id", "name", "createdAt", "updatedAt")
    VALUES (${id}, ${name}, NOW(), NOW())
    ON CONFLICT ("name") DO UPDATE
      SET "updatedAt" = NOW()
    RETURNING "id"
  `;

  return { id: rows[0].id };
}

export async function clearIvaClientFromChequesSafe(ivaClientId: string) {
  const chequeFields = (prisma as unknown as { _runtimeDataModel?: { models?: Record<string, { fields?: Array<{ name: string }> }> } })._runtimeDataModel?.models?.Cheque?.fields ?? [];
  const fieldNames = new Set(chequeFields.map((field) => field.name));

  const supportsIvaClientId = fieldNames.has("ivaClientId");
  const supportsHasIvaClient = fieldNames.has("hasIvaClient");

  if (supportsIvaClientId) {
    const data: Record<string, unknown> = { ivaClientId: null };
    if (supportsHasIvaClient) {
      data.hasIvaClient = false;
    }

    await prisma.cheque.updateMany({
      where: { ivaClientId },
      data,
    });
    return;
  }

  await prisma.$executeRaw`
    UPDATE "Cheque"
    SET "ivaClientId" = NULL,
        "hasIvaClient" = FALSE,
        "updatedAt" = NOW()
    WHERE "ivaClientId" = ${ivaClientId}
  `;
}

export async function deleteIvaClientSafe(id: string) {
  const delegate = getIvaClientDelegate();
  if (delegate?.delete) {
    await delegate.delete({ where: { id } });
    return;
  }

  await prisma.$executeRaw`
    DELETE FROM "IvaClient"
    WHERE "id" = ${id}
  `;
}

export async function setChequeIvaContextSafe(chequeId: string, hasIvaClient: boolean, ivaClientId: string | null) {
  const fields = (prisma as unknown as { _runtimeDataModel?: { models?: Record<string, { fields?: Array<{ name: string }> }> } })._runtimeDataModel?.models?.Cheque?.fields ?? [];
  const fieldNames = new Set(fields.map((field) => field.name));

  const supportsHasIvaClient = fieldNames.has("hasIvaClient");
  const supportsIvaClientRelation = fieldNames.has("ivaClient");

  if (supportsHasIvaClient && supportsIvaClientRelation) {
    await prisma.cheque.update({
      where: { id: chequeId },
      data: {
        hasIvaClient,
        ivaClient: hasIvaClient && ivaClientId ? { connect: { id: ivaClientId } } : { disconnect: true },
      },
    });
    return;
  }

  await prisma.$executeRaw`
    UPDATE "Cheque"
    SET "hasIvaClient" = ${hasIvaClient},
        "ivaClientId" = ${hasIvaClient ? ivaClientId : null},
        "updatedAt" = NOW()
    WHERE "id" = ${chequeId}
  `;
}
