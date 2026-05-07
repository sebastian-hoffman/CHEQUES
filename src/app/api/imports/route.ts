import { ChequeStatus, ImportSource } from "@prisma/client";
import { NextResponse } from "next/server";

import { parseWorkbook } from "@/backend/importers/cheque-import";
import { getDatabaseSetupMessage, hasDatabaseUrl } from "@/backend/state/database-state";
import { getChequeModelFieldNames } from "@/backend/capabilities/prisma-capabilities";
import { prisma } from "@/backend/db/prisma";

export async function POST(request: Request) {
  try {
    if (!hasDatabaseUrl()) {
      return NextResponse.json({ error: getDatabaseSetupMessage() }, { status: 503 });
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "La solicitud debe ser multipart/form-data" }, { status: 400 });
    }

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Debes adjuntar un archivo Excel" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { records, sourceKind } = parseWorkbook(file.name, buffer);

    if (records.length === 0) {
      return NextResponse.json({ error: "El archivo no tiene filas importables" }, { status: 400 });
    }

    const batch = await prisma.importBatch.create({
      data: {
        fileName: file.name,
        source: sourceKind,
        rowCount: records.length,
      },
    });

    const canonicalKeys = Array.from(new Set(records.map((record) => record.canonicalKey)));
    const existingCheques = await prisma.cheque.findMany({
      where: {
        canonicalKey: {
          in: canonicalKeys,
        },
      },
      include: {
        discounts: {
          select: { id: true },
        },
      },
    });
    const existingByCanonicalKey = new Map(existingCheques.map((cheque) => [cheque.canonicalKey, cheque]));

    let created = 0;
    let updated = 0;
    let changedStatuses = 0;
    const chequeFieldNames = getChequeModelFieldNames();
    const supportsOwnBank = chequeFieldNames.has("ownBank");
    const supportsHasIvaClient = chequeFieldNames.has("hasIvaClient");
    const supportsIvaClientId = chequeFieldNames.has("ivaClientId");

    for (const record of records) {
      const existing = existingByCanonicalKey.get(record.canonicalKey);

      if (!existing) {
        const cheque = await prisma.cheque.create({
          data: {
            ...record,
            lastImportedAt: new Date(),
          },
        });

        await prisma.chequeStatusHistory.create({
          data: {
            chequeId: cheque.id,
            fromStatus: null,
            toStatus: record.status,
            source: sourceKind,
            note: `Alta detectada desde ${file.name}`,
            ...(record.status === 'ENDORSED' ? {
              endorseeName: record.endorseeName,
              endorseeTaxId: record.endorseeTaxId,
            } : {}),
          },
        });

        created += 1;
        changedStatuses += 1;
        continue;
      }

      const nextStatus = mergeStatus(existing.status, record.status, sourceKind, existing.discounts.length > 0);
      const statusChanged = existing.status !== nextStatus;

      await prisma.cheque.update({
        where: { id: existing.id },
        data: {
          ...record,
          status: nextStatus,
          ...(supportsOwnBank ? { ownBank: existing.ownBank } : {}),
          ...(supportsHasIvaClient ? { hasIvaClient: (existing as { hasIvaClient?: boolean }).hasIvaClient ?? false } : {}),
          ...(supportsIvaClientId ? { ivaClientId: (existing as { ivaClientId?: string | null }).ivaClientId ?? null } : {}),
          lastImportedAt: new Date(),
        },
      });

      if (statusChanged) {
        await prisma.chequeStatusHistory.create({
          data: {
            chequeId: existing.id,
            fromStatus: existing.status,
            toStatus: nextStatus,
            source: sourceKind,
            note: `Cambio detectado al importar ${file.name}`,
            ...(nextStatus === 'ENDORSED' ? {
              endorseeName: record.endorseeName,
              endorseeTaxId: record.endorseeTaxId,
            } : {}),
            details: {
              previousStatus: existing.status,
              importedStatus: record.status,
            },
          },
        });
        changedStatuses += 1;
      }

      updated += 1;
    }

    return NextResponse.json({
      batchId: batch.id,
      imported: records.length,
      updated,
      created,
      changedStatuses,
      sourceKind,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar el archivo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function mergeStatus(
  currentStatus: ChequeStatus,
  importedStatus: ChequeStatus,
  sourceKind: ImportSource,
  hasDiscounts: boolean,
) {
  if (hasDiscounts && sourceKind === ImportSource.RECEIVED_FILE && importedStatus === ChequeStatus.RECEIVED) {
    return ChequeStatus.DISCOUNTED;
  }

  if (currentStatus === ChequeStatus.DISCOUNTED && importedStatus === ChequeStatus.RECEIVED) {
    return currentStatus;
  }

  return importedStatus;
}
