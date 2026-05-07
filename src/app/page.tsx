export const dynamic = "force-dynamic";

import Link from "next/link";
import { BanknoteArrowDown, CalendarDays, HandCoins } from "lucide-react";

import { SetupNotice } from "@/frontend/components/setup-notice";
import { getDashboardData } from "@/backend/services/dashboard";
import { formatCurrency, formatDate } from "@/shared/format";

export default async function HomePage() {
  const data = await getDashboardData();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateRange = Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    return day;
  });

  const dailyFlowsByProject = dateRange.flatMap((day) => {
    const chequesOfDay = data.cheques.filter((cheque) => isSameDay(cheque.paymentDate, day));
    const projectNames = Array.from(new Set(chequesOfDay.map((cheque) => cheque.project?.name ?? "Sin proyecto"))).sort((a, b) =>
      a.localeCompare(b, "es"),
    );

    return projectNames.map((projectName) => {
      const projectCheques = chequesOfDay.filter((cheque) => (cheque.project?.name ?? "Sin proyecto") === projectName);

      const ingresos = projectCheques
        .filter((cheque) => cheque.flow === "RECEIVED")
        .reduce((sum, cheque) => sum + Number(cheque.amount ?? 0), 0);

      const egresos = projectCheques
        .filter((cheque) => cheque.flow === "ISSUED")
        .reduce((sum, cheque) => sum + Number(cheque.amount ?? 0), 0);

      return {
        key: `${day.toISOString()}-${projectName}`,
        dateLabel: formatDate(day),
        projectName,
        ingresos,
        egresos,
        saldoNeto: ingresos - egresos,
      };
    });
  });

  const inThreeDays = new Date(today);
  inThreeDays.setDate(inThreeDays.getDate() + 3);

  const criticalDue = data.cheques
    .filter((cheque) => cheque.paymentDate && cheque.paymentDate >= today && cheque.paymentDate <= inThreeDays)
    .sort((a, b) => {
      const aTime = a.paymentDate ? new Date(a.paymentDate).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.paymentDate ? new Date(b.paymentDate).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });

  const criticalTotal = criticalDue.reduce((sum, cheque) => sum + Number(cheque.amount ?? 0), 0);

  const custodyOpportunities = data.cheques
    .filter((cheque) => cheque.status === "CUSTODY" && cheque.paymentDate && cheque.paymentDate >= today)
    .sort((a, b) => {
      const aTime = a.paymentDate ? new Date(a.paymentDate).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.paymentDate ? new Date(b.paymentDate).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    })
    .slice(0, 8);

  const custodyTotal = custodyOpportunities.reduce((sum, cheque) => sum + Number(cheque.amount ?? 0), 0);

  return (
    <div className="space-y-6 pb-10">
      {!data.databaseReady ? <SetupNotice description={data.databaseMessage ?? undefined} /> : null}

      <section className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Posicion</p>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold">Flujo de cheques</h3>
          </div>
          <BanknoteArrowDown className="text-[var(--accent)]" />
        </div>

        <div className="mt-5 table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proyecto</th>
                <th>Ingresos</th>
                <th>Egresos</th>
                <th>Saldo neto</th>
              </tr>
            </thead>
            <tbody>
              {dailyFlowsByProject.map((row) => (
                <tr key={row.key}>
                  <td className="font-medium">{row.dateLabel}</td>
                  <td>{row.projectName}</td>
                  <td className="text-emerald-700">+ {formatCurrency(row.ingresos)}</td>
                  <td className="text-red-700">- {formatCurrency(row.egresos)}</td>
                  <td className={row.saldoNeto >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                    {row.saldoNeto >= 0 ? "+ " : "- "}
                    {formatCurrency(Math.abs(row.saldoNeto))}
                  </td>
                </tr>
              ))}
              {dailyFlowsByProject.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-sm text-[var(--muted)]">
                    No hay movimientos para los proximos 7 dias.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Urgente</p>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold">Vencimientos proximas 72 horas</h3>
          </div>
          <CalendarDays className="text-[var(--accent)]" />
        </div>

        <div className="mt-5 table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cheque</th>
                <th>Emisor</th>
                <th>Proyecto</th>
                <th>Vence</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              {criticalDue.map((cheque) => (
                <tr key={cheque.id}>
                  <td>
                    <Link href={`/cheques/${cheque.id}`} className="font-medium underline decoration-black/10 underline-offset-4">
                      {cheque.number ?? cheque.echeqId ?? cheque.canonicalKey}
                    </Link>
                  </td>
                  <td>{cheque.issuerName ?? "-"}</td>
                  <td>{cheque.project?.name ?? "Sin asignar"}</td>
                  <td>{formatDate(cheque.paymentDate)}</td>
                  <td>{formatCurrency(cheque.amount?.toString())}</td>
                </tr>
              ))}
              {criticalDue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-sm text-[var(--muted)]">
                    Sin vencimientos en proximas 72 horas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">Total comprometido proximas 72h: {formatCurrency(criticalTotal)}</p>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Capitalizable</p>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold">Cheques en custodia listos para descuento</h3>
          </div>
          <HandCoins className="text-[var(--accent)]" />
        </div>

        <div className="mt-5 table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cheque</th>
                <th>Emisor</th>
                <th>Proyecto</th>
                <th>Stock</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              {custodyOpportunities.map((cheque) => (
                <tr key={cheque.id}>
                  <td>
                    <Link href={`/cheques/${cheque.id}`} className="font-medium underline decoration-black/10 underline-offset-4">
                      {cheque.number ?? cheque.echeqId ?? cheque.canonicalKey}
                    </Link>
                  </td>
                  <td>{cheque.issuerName ?? "-"}</td>
                  <td>{cheque.project?.name ?? "Sin asignar"}</td>
                  <td>{daysUntil(cheque.paymentDate, today)} dias</td>
                  <td>{formatCurrency(cheque.amount?.toString())}</td>
                </tr>
              ))}
              {custodyOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-sm text-[var(--muted)]">
                    No hay cheques en custodia disponibles para descuento.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">Maximo capitalizable estimado: {formatCurrency(custodyTotal)}</p>
      </section>
    </div>
  );
}

function isSameDay(value: Date | string | null | undefined, target: Date) {
  if (!value) {
    return false;
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);

  return date.getTime() === target.getTime();
}

function daysUntil(value: Date | string | null | undefined, from: Date) {
  if (!value) {
    return 0;
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);

  const diff = date.getTime() - base.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
