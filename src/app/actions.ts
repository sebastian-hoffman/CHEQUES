"use server";

import { ChequeStatus, DiscountStatus, ImportSource, OwnBank } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { hasDatabaseUrl } from "@/backend/state/database-state";
import {
  clearIvaClientFromChequesSafe,
  deleteIvaClientSafe,
  setChequeIvaContextSafe,
  upsertIvaClientByNameSafe,
} from "@/backend/services/iva-client-safe";
import { prisma } from "@/backend/db/prisma";
import { getChequeModelFieldNames } from "@/backend/capabilities/prisma-capabilities";

export async function updateChequeContextAction(formData: FormData) {
  if (!hasDatabaseUrl()) {
    throw new Error("Configura DATABASE_URL antes de guardar datos manuales");
  }

  const chequeId = String(formData.get("chequeId") ?? "").trim();
  const counterpartyName = String(formData.get("counterpartyName") ?? "").trim();
  const projectName = String(formData.get("projectName") ?? "").trim();
  const ownBank = String(formData.get("ownBank") ?? "").trim();
  const hasIvaClient = String(formData.get("hasIvaClient") ?? "NO").trim() === "SI";
  const ivaClientName = String(formData.get("ivaClientName") ?? "").trim();

  if (!chequeId) {
    throw new Error("Falta el cheque a actualizar");
  }

  const fieldNames = getChequeModelFieldNames();
  const supportsHasIvaClient = fieldNames.has("hasIvaClient");
  const supportsIvaClientRelation = fieldNames.has("ivaClient");
  const supportsOwnBank = fieldNames.has("ownBank");

  const [counterparty, project, ivaClient] = await Promise.all([
    counterpartyName
      ? prisma.counterparty.upsert({
          where: { name: counterpartyName },
          update: {},
          create: { name: counterpartyName },
        })
      : Promise.resolve(null),
    projectName
      ? prisma.project.upsert({
          where: { name: projectName },
          update: {},
          create: { name: projectName },
        })
      : Promise.resolve(null),
    hasIvaClient && ivaClientName
      ? upsertIvaClientByNameSafe(ivaClientName)
      : Promise.resolve(null),
  ]);

  const data: Record<string, unknown> = {
    assignedBy: counterparty ? { connect: { id: counterparty.id } } : { disconnect: true },
    project: project ? { connect: { id: project.id } } : { disconnect: true },
  };

  if (supportsOwnBank) {
    data.ownBank = ownBank ? (ownBank as OwnBank) : null;
  }
  if (supportsHasIvaClient) {
    data.hasIvaClient = hasIvaClient;
  }
  if (supportsIvaClientRelation) {
    data.ivaClient = hasIvaClient && ivaClient ? { connect: { id: ivaClient.id } } : { disconnect: true };
  }

  await prisma.cheque.update({
    where: { id: chequeId },
    data,
  });

  if (!supportsHasIvaClient || !supportsIvaClientRelation) {
    await setChequeIvaContextSafe(chequeId, hasIvaClient, ivaClient?.id ?? null);
  }

  revalidatePath(`/cheques/${chequeId}`);
  revalidatePath("/");
  revalidatePath("/cheques");
}

export async function bulkAssignProjectAction(formData: FormData) {
  if (!hasDatabaseUrl()) {
    throw new Error("Configura DATABASE_URL antes de asignar proyectos");
  }

  const chequeIds = formData
    .getAll("chequeIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const projectName = String(formData.get("projectName") ?? "").trim();

  if (chequeIds.length === 0) {
    throw new Error("Selecciona al menos un cheque");
  }

  if (!projectName) {
    throw new Error("Ingresa un proyecto para asignar");
  }

  const project = await prisma.project.upsert({
    where: { name: projectName },
    update: {},
    create: { name: projectName },
  });

  const fieldNames = getChequeModelFieldNames();

  if (fieldNames.has("projectId")) {
    await prisma.cheque.updateMany({
      where: { id: { in: chequeIds } },
      data: { projectId: project.id },
    });
  } else {
    await Promise.all(
      chequeIds.map((chequeId) =>
        prisma.cheque.update({
          where: { id: chequeId },
          data: { project: { connect: { id: project.id } } },
        }),
      ),
    );
  }

  revalidatePath("/cheques");
  revalidatePath("/");
}

export async function createCounterpartyAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Nombre obligatorio");
  }
  await prisma.counterparty.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  revalidatePath("/catalogos");
}

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Nombre obligatorio");
  }
  await prisma.project.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  revalidatePath("/catalogos");
}

export async function createIvaClientAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Nombre obligatorio");
  }
  await upsertIvaClientByNameSafe(name);
  revalidatePath("/catalogos");
}

export async function deleteCounterpartyAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return;
  }
  await prisma.cheque.updateMany({ where: { assignedById: id }, data: { assignedById: null } });
  await prisma.counterparty.delete({ where: { id } });
  revalidatePath("/catalogos");
}

export async function deleteProjectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return;
  }
  await prisma.cheque.updateMany({ where: { projectId: id }, data: { projectId: null } });
  await prisma.project.delete({ where: { id } });
  revalidatePath("/catalogos");
}

export async function deleteIvaClientAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return;
  }

  await clearIvaClientFromChequesSafe(id);
  await deleteIvaClientSafe(id);
  revalidatePath("/catalogos");
}

export async function createDiscountAction(formData: FormData) {
  if (!hasDatabaseUrl()) {
    throw new Error("Configura DATABASE_URL antes de registrar descuentos");
  }

  const chequeId = String(formData.get("chequeId") ?? "").trim();
  const bank = String(formData.get("bank") ?? "").trim();

  if (!chequeId || !bank) {
    throw new Error("Cheque y banco son obligatorios");
  }

  const requestedAtRaw = String(formData.get("requestedAt") ?? "").trim();
  const settledAtRaw = String(formData.get("settledAt") ?? "").trim();
  const feeAmountRaw = String(formData.get("feeAmount") ?? "").trim();
  const netAmountRaw = String(formData.get("netAmount") ?? "").trim();
  const grossAmountRaw = String(formData.get("grossAmount") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const status = String(formData.get("status") ?? DiscountStatus.REQUESTED) as DiscountStatus;

  await prisma.discount.create({
    data: {
      chequeId,
      bank,
      requestedAt: requestedAtRaw ? new Date(requestedAtRaw) : null,
      settledAt: settledAtRaw ? new Date(settledAtRaw) : null,
      feeAmount: feeAmountRaw || null,
      netAmount: netAmountRaw || null,
      grossAmount: grossAmountRaw || null,
      reference: reference || null,
      notes: notes || null,
      status,
    },
  });

  revalidatePath(`/cheques/${chequeId}`);
  revalidatePath("/");
  revalidatePath("/cheques");
}

export async function updateChequeManualStatusAction(formData: FormData) {
  if (!hasDatabaseUrl()) {
    throw new Error("Configura DATABASE_URL antes de actualizar estados");
  }

  const chequeId = String(formData.get("chequeId") ?? "").trim();
  const nextStatusRaw = String(formData.get("nextStatus") ?? "").trim();

  if (!chequeId) {
    throw new Error("Falta el cheque a actualizar");
  }

  const allowedStatuses: ChequeStatus[] = [ChequeStatus.CUSTODY, ChequeStatus.ENDORSED, ChequeStatus.DISCOUNTED];
  if (!allowedStatuses.includes(nextStatusRaw as ChequeStatus)) {
    throw new Error("Estado manual no permitido");
  }

  const nextStatus = nextStatusRaw as ChequeStatus;
  const cheque = await prisma.cheque.findUnique({
    where: { id: chequeId },
    select: { id: true, status: true },
  });

  if (!cheque) {
    throw new Error("Cheque no encontrado");
  }

  if (cheque.status === nextStatus) {
    return;
  }

  await prisma.cheque.update({
    where: { id: chequeId },
    data: { status: nextStatus },
  });

  await prisma.chequeStatusHistory.create({
    data: {
      chequeId,
      fromStatus: cheque.status,
      toStatus: nextStatus,
      source: ImportSource.MANUAL,
      note: "Cambio manual desde listado de cheques",
    },
  });

  revalidatePath("/cheques");
  revalidatePath(`/cheques/${chequeId}`);
  revalidatePath("/");
}
