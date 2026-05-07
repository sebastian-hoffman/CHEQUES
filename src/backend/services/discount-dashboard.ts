import { DiscountStatus, Prisma } from "@prisma/client";

import { getDatabaseSetupMessage, hasDatabaseUrl, isDatabaseSetupError } from "@/backend/state/database-state";
import { prisma } from "@/backend/db/prisma";

export type DiscountDashboardFilters = {
  q?: string;
  status?: string;
  bank?: string;
  dateField?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: string;
};

export async function getDiscountDashboardData(filters: DiscountDashboardFilters = {}) {
  if (!hasDatabaseUrl()) {
    return emptyDiscountData(getDatabaseSetupMessage());
  }

  const sortBy = filters.sortBy ?? "createdAt";
  const sortDir: Prisma.SortOrder = filters.sortDir === "asc" ? "asc" : "desc";
  const dateField = filters.dateField === "requestedAt" || filters.dateField === "settledAt" ? filters.dateField : "createdAt";
  const dateFrom = parseDateStart(filters.dateFrom);
  const dateTo = parseDateEnd(filters.dateTo);

  const where: Prisma.DiscountWhereInput = {
    AND: [
      filters.status ? { status: filters.status as DiscountStatus } : {},
      filters.bank ? { bank: filters.bank } : {},
      dateFrom || dateTo
        ? {
            [dateField]: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {},
      filters.q
        ? {
            OR: [
              { bank: { contains: filters.q, mode: "insensitive" } },
              { reference: { contains: filters.q, mode: "insensitive" } },
              { notes: { contains: filters.q, mode: "insensitive" } },
              { cheque: { number: { contains: filters.q, mode: "insensitive" } } },
              { cheque: { echeqId: { contains: filters.q, mode: "insensitive" } } },
              { cheque: { canonicalKey: { contains: filters.q, mode: "insensitive" } } },
              { cheque: { issuerName: { contains: filters.q, mode: "insensitive" } } },
              { cheque: { project: { name: { contains: filters.q, mode: "insensitive" } } } },
              { cheque: { counterparty: { name: { contains: filters.q, mode: "insensitive" } } } },
            ],
          }
        : {},
    ],
  };

  const orderBy: Prisma.DiscountOrderByWithRelationInput[] =
    sortBy === "requestedAt"
      ? [{ requestedAt: sortDir }, { createdAt: "desc" }]
      : sortBy === "settledAt"
        ? [{ settledAt: sortDir }, { createdAt: "desc" }]
        : sortBy === "grossAmount"
          ? [{ grossAmount: sortDir }, { createdAt: "desc" }]
          : sortBy === "feeAmount"
            ? [{ feeAmount: sortDir }, { createdAt: "desc" }]
            : sortBy === "netAmount"
              ? [{ netAmount: sortDir }, { createdAt: "desc" }]
              : [{ createdAt: sortDir }];

  let discounts;
  let banks;

  try {
    [discounts, banks] = await Promise.all([
      prisma.discount.findMany({
        where,
        include: {
          cheque: {
            include: {
              project: true,
              counterparty: true,
            },
          },
        },
        orderBy,
      }),
      prisma.discount.findMany({
        distinct: ["bank"],
        where: { bank: { not: "" } },
        select: { bank: true },
        orderBy: { bank: "asc" },
      }),
    ]);
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return emptyDiscountData(getDatabaseSetupMessage());
    }

    throw error;
  }

  const totals = discounts.reduce(
    (acc, item) => {
      acc.gross += Number(item.grossAmount ?? 0);
      acc.fee += Number(item.feeAmount ?? 0);
      acc.net += Number(item.netAmount ?? 0);
      return acc;
    },
    { gross: 0, fee: 0, net: 0 },
  );

  const statusCounts = discounts.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  const bankCounts = discounts.reduce<Record<string, number>>((acc, item) => {
    const key = item.bank || "Sin banco";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const pending = discounts.filter((item) => item.status === DiscountStatus.REQUESTED);
  const settled = discounts.filter((item) => item.status === DiscountStatus.SETTLED);
  const rejected = discounts.filter((item) => item.status === DiscountStatus.REJECTED);
  const cancelled = discounts.filter((item) => item.status === DiscountStatus.CANCELLED);

  return {
    databaseReady: true,
    databaseMessage: null,
    discounts,
    metrics: {
      totalOperations: discounts.length,
      pendingCount: pending.length,
      settledCount: settled.length,
      rejectedCount: rejected.length,
      cancelledCount: cancelled.length,
      grossAmount: totals.gross,
      feeAmount: totals.fee,
      netAmount: totals.net,
    },
    statusCounts,
    bankCounts,
    filterOptions: {
      banks: banks.map((entry) => entry.bank),
      statuses: Object.values(DiscountStatus),
    },
    activeFilters: {
      q: filters.q ?? "",
      status: filters.status ?? "",
      bank: filters.bank ?? "",
      dateField,
      dateFrom: filters.dateFrom ?? "",
      dateTo: filters.dateTo ?? "",
      sortBy,
      sortDir,
    },
    latest: discounts.slice(0, 20),
  };
}

function parseDateStart(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function emptyDiscountData(message: string) {
  return {
    databaseReady: false,
    databaseMessage: message,
    discounts: [],
    metrics: {
      totalOperations: 0,
      pendingCount: 0,
      settledCount: 0,
      rejectedCount: 0,
      cancelledCount: 0,
      grossAmount: 0,
      feeAmount: 0,
      netAmount: 0,
    },
    statusCounts: {},
    bankCounts: {},
    filterOptions: {
      banks: [],
      statuses: Object.values(DiscountStatus),
    },
    activeFilters: {
      q: "",
      status: "",
      bank: "",
      dateField: "createdAt",
      dateFrom: "",
      dateTo: "",
      sortBy: "createdAt",
      sortDir: "desc",
    },
    latest: [],
  };
}
