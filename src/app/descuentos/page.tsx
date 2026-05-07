export const dynamic = "force-dynamic";

import Link from "next/link";
import { BarChart3, Landmark, Wallet } from "lucide-react";

import { SetupNotice } from "@/frontend/components/setup-notice";
import { StatusPill } from "@/frontend/components/status-pill";
import { getDiscountDashboardData } from "@/backend/services/discount-dashboard";
import { formatCurrency, formatDate, formatStatusLabel } from "@/shared/format";

export default async function DiscountsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    bank?: string;
    dateField?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
}) {
  const filters = await searchParams;
  const data = await getDiscountDashboardData(filters);

  return (
    <div className="space-y-6 pb-10">
      {!data.databaseReady ? <SetupNotice description={data.databaseMessage ?? undefined} /> : null}

      <section className="card overflow-hidden px-6 py-8 md:px-8 md:py-10">
        <div className="layout-grid items-start">
          <div>
            <p className="eyebrow">Reporte operativo</p>
            <h2 className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Seguimiento de operaciones de descuento
            </h2>
            <p className="mt-5 max-w-2xl text-base text-[var(--muted)]">
              Vista consolidada para tesoreria: volumen operado, estado de cada descuento, bancos involucrados y ultimos movimientos.
            </p>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-white/60 bg-white/60 p-4">
            <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/70 px-4 py-3">
              <Wallet size={18} className="text-[var(--accent)]" />
              <span className="text-sm font-medium">Monto neto operado: {formatCurrency(data.metrics.netAmount)}</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/70 px-4 py-3">
              <BarChart3 size={18} className="text-[var(--accent)]" />
              <span className="text-sm font-medium">Operaciones totales: {data.metrics.totalOperations}</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/70 px-4 py-3">
              <Landmark size={18} className="text-[var(--accent)]" />
              <span className="text-sm font-medium">Pendientes de liquidar: {data.metrics.pendingCount}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        <div className="card kpi">
          <span className="text-sm text-[var(--muted)]">Operaciones</span>
          <strong>{data.metrics.totalOperations}</strong>
        </div>
        <div className="card kpi">
          <span className="text-sm text-[var(--muted)]">Monto bruto</span>
          <strong>{formatCurrency(data.metrics.grossAmount)}</strong>
        </div>
        <div className="card kpi">
          <span className="text-sm text-[var(--muted)]">Comisiones</span>
          <strong>{formatCurrency(data.metrics.feeAmount)}</strong>
        </div>
        <div className="card kpi">
          <span className="text-sm text-[var(--muted)]">Monto neto</span>
          <strong>{formatCurrency(data.metrics.netAmount)}</strong>
        </div>
        <div className="card kpi">
          <span className="text-sm text-[var(--muted)]">Pendientes</span>
          <strong>{data.metrics.pendingCount}</strong>
        </div>
        <div className="card kpi">
          <span className="text-sm text-[var(--muted)]">Liquidadas</span>
          <strong>{data.metrics.settledCount}</strong>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Filtros operativos</p>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold">Analisis por periodo y banco</h3>
          </div>

          <form className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto_auto]">
            <input
              className="field"
              name="q"
              placeholder="Buscar por cheque, referencia, emisor o notas"
              defaultValue={data.activeFilters.q}
            />

            <select className="select" name="status" defaultValue={data.activeFilters.status}>
              <option value="">Todos los estados</option>
              {data.filterOptions.statuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>

            <select className="select" name="bank" defaultValue={data.activeFilters.bank}>
              <option value="">Todos los bancos</option>
              {data.filterOptions.banks.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>

            <select className="select" name="dateField" defaultValue={data.activeFilters.dateField}>
              <option value="createdAt">Fecha de carga</option>
              <option value="requestedAt">Fecha de solicitud</option>
              <option value="settledAt">Fecha de liquidacion</option>
            </select>

            <input className="field" name="dateFrom" type="date" defaultValue={data.activeFilters.dateFrom} />
            <input className="field" name="dateTo" type="date" defaultValue={data.activeFilters.dateTo} />

            <select className="select" name="sortBy" defaultValue={data.activeFilters.sortBy}>
              <option value="createdAt">Ordenar por carga</option>
              <option value="requestedAt">Ordenar por solicitud</option>
              <option value="settledAt">Ordenar por liquidacion</option>
              <option value="grossAmount">Ordenar por bruto</option>
              <option value="feeAmount">Ordenar por comision</option>
              <option value="netAmount">Ordenar por neto</option>
            </select>

            <select className="select" name="sortDir" defaultValue={data.activeFilters.sortDir}>
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>

            <button className="button button-primary" type="submit">
              Filtrar
            </button>
            <Link className="button button-secondary" href="/descuentos">
              Limpiar
            </Link>
          </form>
        </div>
      </section>

      <section className="layout-grid">
        <div className="card p-6">
          <p className="eyebrow">Estados del descuento</p>
          <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold">Distribucion actual</h3>
          <div className="mt-5 space-y-3">
            {Object.entries(data.statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/70 px-4 py-3">
                <StatusPill status={status} />
                <span className="font-semibold">{count}</span>
              </div>
            ))}
            {Object.keys(data.statusCounts).length === 0 ? <p className="text-sm text-[var(--muted)]">Todavia no hay descuentos registrados.</p> : null}
          </div>
        </div>

        <div className="card p-6">
          <p className="eyebrow">Bancos de descuento</p>
          <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold">Concentracion por banco</h3>
          <div className="mt-5 space-y-3">
            {Object.entries(data.bankCounts).map(([bank, count]) => (
              <div key={bank} className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-sm">
                <span>{bank}</span>
                <span>{count} operaciones</span>
              </div>
            ))}
            {Object.keys(data.bankCounts).length === 0 ? <p className="text-sm text-[var(--muted)]">Sin operaciones para mostrar.</p> : null}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <p className="eyebrow">Ultimas operaciones</p>
        <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold">Detalle operativo</h3>

        <div className="mt-5 table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cheque</th>
                <th>Banco descuento</th>
                <th>Solicitud</th>
                <th>Liquidacion</th>
                <th>Bruto</th>
                <th>Comision</th>
                <th>Neto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.latest.map((discount) => (
                <tr key={discount.id}>
                  <td>
                    <Link href={`/cheques/${discount.chequeId}`} className="font-medium underline decoration-black/10 underline-offset-4">
                      {discount.cheque.number ?? discount.cheque.echeqId ?? discount.cheque.canonicalKey}
                    </Link>
                  </td>
                  <td>{discount.bank}</td>
                  <td>{formatDate(discount.requestedAt)}</td>
                  <td>{formatDate(discount.settledAt)}</td>
                  <td>{formatCurrency(discount.grossAmount?.toString())}</td>
                  <td>{formatCurrency(discount.feeAmount?.toString())}</td>
                  <td>{formatCurrency(discount.netAmount?.toString())}</td>
                  <td>
                    <StatusPill status={discount.status} />
                  </td>
                </tr>
              ))}
              {data.latest.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-sm text-[var(--muted)]">
                    No hay operaciones de descuento cargadas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
