import { ChequeStatus } from "@prisma/client";
import { addDays, isWithinInterval, startOfDay } from "date-fns";

import { getDatabaseSetupMessage, hasDatabaseUrl, isDatabaseSetupError } from "@/backend/state/database-state";
import { prisma } from "@/backend/db/prisma";

export async function getDashboardData() {
  if (!hasDatabaseUrl()) {
    return emptyDashboardData(getDatabaseSetupMessage());
  }

  let cheques;

  try {
    cheques = await prisma.cheque.findMany({
      include: {
        project: true,
        counterparty: true,
      },
      orderBy: {
        paymentDate: "asc",
      },
    });
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return emptyDashboardData(getDatabaseSetupMessage());
    }

    throw error;
  }

  const today = startOfDay(new Date());
  const next15 = addDays(today, 15);

  const totalAmount = cheques.reduce((sum, cheque) => sum + Number(cheque.amount ?? 0), 0);
  const upcoming = cheques.filter((cheque) =>
    cheque.paymentDate
      ? isWithinInterval(cheque.paymentDate, {
          start: today,
          end: next15,
        })
      : false,
  );

  const statusCounts = cheques.reduce<Record<string, number>>((accumulator, cheque) => {
    accumulator[cheque.status] = (accumulator[cheque.status] ?? 0) + 1;
    return accumulator;
  }, {});

  const bankCounts = cheques.reduce<Record<string, number>>((accumulator, cheque) => {
    const key = cheque.bankCanonical ?? "Sin banco";
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    databaseReady: true,
    databaseMessage: null,
    cheques,
    metrics: {
      totalCheques: cheques.length,
      totalAmount,
      upcomingCount: upcoming.length,
      custodyCount: statusCounts[ChequeStatus.CUSTODY] ?? 0,
      discountedCount: statusCounts[ChequeStatus.DISCOUNTED] ?? 0,
    },
    statusCounts,
    bankCounts,
    upcoming: upcoming.slice(0, 8),
  };
}

function emptyDashboardData(message: string) {
  return {
    databaseReady: false,
    databaseMessage: message,
    cheques: [],
    metrics: {
      totalCheques: 0,
      totalAmount: 0,
      upcomingCount: 0,
      custodyCount: 0,
      discountedCount: 0,
    },
    statusCounts: {},
    bankCounts: {},
    upcoming: [],
  };
}
