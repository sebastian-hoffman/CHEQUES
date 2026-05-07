export const dynamic = "force-dynamic";

import Link from "next/link";
import { OwnBank, Prisma } from "@prisma/client";

import { BulkAssignForm } from "@/frontend/components/bulk-assign-form";
import { ChequeFilterForm } from "@/frontend/components/cheque-filter-form";
import { DatabaseEmptyState } from "@/frontend/components/database-empty-state";
import { StatusPill } from "@/frontend/components/status-pill";
import { getDatabaseSetupMessage, hasDatabaseUrl, isDatabaseSetupError } from "@/backend/state/database-state";
import { formatCurrency, formatDate } from "@/shared/format";
import { hasChequeField } from "@/backend/capabilities/prisma-capabilities";
import { prisma } from "@/backend/db/prisma";

const ownBankLabels: Record<OwnBank, string> = {
  SANTANDER: "Santander",
  BBVA: "BBVA",
  BAPRO: "Bapro",
  OTHER: "Otro",
};

export default async function ChequesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    bank?: string;
    ownBank?: string;
    hasIvaClient?: string;
    sortBy?: string;
    sortDir?: string;
    project?: string;
  }>;
}) {
  const filters = await searchParams;
  const sortBy = filters.sortBy ?? "paymentDate";
  const sortDir: Prisma.SortOrder = filters.sortDir === "asc" ? "asc" : "desc";
  const amountQuery = parseAmountQuery(filters.q);
  const supportsOwnBank = hasChequeField("ownBank");
  const supportsHasIvaClient = hasChequeField("hasIvaClient");

  if (!hasDatabaseUrl()) {
    return <DatabaseEmptyState title="La cartera todavia no esta disponible" message={getDatabaseSetupMessage()} />;
  }

  const where: Prisma.ChequeWhereInput = {
    AND: [
      filters.q
        ? {
            OR: [
              { number: { contains: filters.q, mode: "insensitive" } },
              { echeqId: { contains: filters.q, mode: "insensitive" } },
              { issuerName: { contains: filters.q, mode: "insensitive" } },
              ...(amountQuery !== null ? [{ amount: { equals: new Prisma.Decimal(amountQuery) } }] : []),
            ],
          }
        : {},
      filters.status ? { status: filters.status as never } : {},
      filters.bank ? { bankCanonical: filters.bank } : {},
      supportsOwnBank && filters.ownBank ? { ownBank: filters.ownBank as OwnBank } : {},
      supportsHasIvaClient && filters.hasIvaClient === "SI" ? { hasIvaClient: true } : {},
      supportsHasIvaClient && filters.hasIvaClient === "NO" ? { hasIvaClient: false } : {},
      filters.project
        ? {
            OR: [
              ...(filters.project.split(",").filter((v) => v !== "__SIN_PROYECTO__").length > 0
                ? [{ project: { name: { in: filters.project.split(",").filter((v) => v !== "__SIN_PROYECTO__") } } }]
                : []),
              ...(filters.project.split(",").includes("__SIN_PROYECTO__")
                ? [{ projectId: null }]
                : []),
            ],
          }
        : {},
    ],
  };

  let cheques;
  let statuses;
  let banks;
  let projects;

  const orderBy: Prisma.ChequeOrderByWithRelationInput[] =
    sortBy === "issueDate"
      ? [{ issueDate: sortDir }, { paymentDate: "asc" }]
      : sortBy === "amount"
        ? [{ amount: sortDir }, { paymentDate: "asc" }]
      : sortBy === "issuerName"
        ? [{ issuerName: sortDir }, { paymentDate: "asc" }]
        : sortBy === "projectName"
          ? [{ project: { name: sortDir } }, { paymentDate: "asc" }]
          : [{ paymentDate: sortDir }, { createdAt: "desc" }];

  try {
    [cheques, statuses, banks, projects] = await Promise.all([
      prisma.cheque.findMany({
        where,
        include: {
          project: true,
          counterparty: true,
        },
        orderBy,
      }),
      prisma.cheque.findMany({
        distinct: ["status"],
        select: { status: true },
        orderBy: { status: "asc" },
      }),
      prisma.cheque.findMany({
        distinct: ["bankCanonical"],
        where: { bankCanonical: { not: null } },
        select: { bankCanonical: true },
        orderBy: { bankCanonical: "asc" },
      }),
      prisma.project.findMany({
        orderBy: { name: "asc" },
        select: { name: true },
      }),
    ]);
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return <DatabaseEmptyState title="La cartera todavia no esta disponible" message={getDatabaseSetupMessage()} />;
    }

    throw error;
  }

  const sortLink = (column: string) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.bank) params.set("bank", filters.bank);
    if (filters.ownBank) params.set("ownBank", filters.ownBank);
    if (filters.hasIvaClient) params.set("hasIvaClient", filters.hasIvaClient);

    const nextDir: Prisma.SortOrder = sortBy === column && sortDir === "asc" ? "desc" : "asc";
    params.set("sortBy", column);
    params.set("sortDir", nextDir);

    return `/cheques?${params.toString()}`;
  };

  const sortMarker = (column: string) => {
    if (sortBy !== column) {
      return "";
    }
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  return (
    <div className="space-y-6 pb-10">
      <section className="card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Cartera viva</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold">Cheques importados</h2>
          </div>
          <ChequeFilterForm
            projects={projects}
            statuses={statuses}
            banks={banks}
            current={filters}
            ownBankLabels={ownBankLabels}
          />
        </div>

        <BulkAssignForm projects={projects}>
          <table className="table">
            <thead>
              <tr>
                <th>Sel</th>
                <th>
                  <Link href={sortLink("issuerName")} className="underline decoration-black/10 underline-offset-4">
                    Cheque{sortMarker("issuerName")}
                  </Link>
                </th>
                <th>
                  <Link href={sortLink("issuerName")} className="underline decoration-black/10 underline-offset-4">
                    Emisor{sortMarker("issuerName")}
                  </Link>
                </th>
                <th>Banco mio</th>
                <th>Cliente IVA</th>
                <th>
                  <Link href={sortLink("projectName")} className="underline decoration-black/10 underline-offset-4">
                    Proyecto{sortMarker("projectName")}
                  </Link>
                </th>
                <th>Quien lo dio</th>
                <th>
                  <Link href={sortLink("paymentDate")} className="underline decoration-black/10 underline-offset-4">
                    Vence{sortMarker("paymentDate")}
                  </Link>
                </th>
                <th>
                  <Link href={sortLink("amount")} className="underline decoration-black/10 underline-offset-4">
                    Importe{sortMarker("amount")}
                  </Link>
                </th>
                <th>Banco emisor</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cheques.map((cheque) => (
                <tr key={cheque.id}>
                  <td>
                    <input type="checkbox" name="chequeIds" value={cheque.id} />
                  </td>
                  <td>
                    <Link href={`/cheques/${cheque.id}`} className="font-medium underline decoration-black/10 underline-offset-4">
                      {cheque.number ?? cheque.echeqId ?? cheque.canonicalKey}
                    </Link>
                  </td>
                  <td>{cheque.issuerName ?? "-"}</td>
                  <td>{supportsOwnBank && cheque.ownBank ? ownBankLabels[cheque.ownBank] : "-"}</td>
                  <td>{supportsHasIvaClient && cheque.hasIvaClient ? "SI" : "NO"}</td>
                  <td>{cheque.project?.name ?? "Sin proyecto"}</td>
                  <td>{cheque.counterparty?.name ?? "Sin asignar"}</td>
                  <td>{formatDate(cheque.paymentDate)}</td>
                  <td>{formatCurrency(cheque.amount?.toString())}</td>
                  <td>{cheque.bankCanonical ?? cheque.bankName ?? "-"}</td>
                  <td>
                    <StatusPill status={cheque.status} />
                  </td>
                </tr>
              ))}
              {cheques.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-sm text-[var(--muted)]">
                    No hay cheques para este filtro.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </BulkAssignForm>
      </section>
    </div>
  );
}

function parseAmountQuery(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "");
  if (!normalized || normalized === "-" || normalized === ".") {
    return null;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}
