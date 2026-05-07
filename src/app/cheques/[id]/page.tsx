export const dynamic = "force-dynamic";

import { DiscountStatus, OwnBank } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createDiscountAction, updateChequeContextAction } from "@/app/actions";
import { DatabaseEmptyState } from "@/frontend/components/database-empty-state";
import { StatusPill } from "@/frontend/components/status-pill";
import { getDatabaseSetupMessage, hasDatabaseUrl, isDatabaseSetupError } from "@/backend/state/database-state";
import { formatCurrency, formatDate, formatStatusLabel } from "@/shared/format";
import { getIvaClientDelegate } from "@/backend/capabilities/prisma-capabilities";
import { prisma } from "@/backend/db/prisma";

const ownBankLabels: Record<OwnBank, string> = {
  SANTANDER: "Santander",
  BBVA: "BBVA",
  BAPRO: "Bapro",
  OTHER: "Otro",
};

export default async function ChequeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!hasDatabaseUrl()) {
    return <DatabaseEmptyState title="El detalle del cheque requiere una base conectada" message={getDatabaseSetupMessage()} />;
  }

  let cheque;
  let ivaClients: Array<{ id: string; name: string }> = [];
  let selectedIvaClientName: string | null = null;

  try {
    cheque = await prisma.cheque.findUnique({
      where: { id },
      include: {
        project: true,
        counterparty: true,
        chequeStatusHistory: {
          orderBy: { observedAt: "desc" },
        },
        discounts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const ivaClientDelegate = getIvaClientDelegate();
    if (ivaClientDelegate?.findMany) {
      const [options, selected] = await Promise.all([
        ivaClientDelegate.findMany({
          orderBy: { name: "asc" },
        }),
        cheque?.ivaClientId && ivaClientDelegate.findUnique
          ? ivaClientDelegate.findUnique({
              where: { id: cheque.ivaClientId },
              select: { name: true },
            })
          : Promise.resolve(null),
      ]);
      ivaClients = options;
      selectedIvaClientName = selected?.name ?? null;
    }
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return <DatabaseEmptyState title="El detalle del cheque requiere una base conectada" message={getDatabaseSetupMessage()} />;
    }

    throw error;
  }

  if (!cheque) {
    notFound();
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/cheques" className="button button-secondary inline-flex items-center gap-2 px-3 py-2">
          <ArrowLeft size={14} />
          Volver
        </Link>
        <Link href="/cheques" className="underline decoration-black/10 underline-offset-4">
          Cheques
        </Link>
        <span>/</span>
        <span>{cheque.number ?? cheque.echeqId ?? cheque.canonicalKey}</span>
      </div>

      <section className="card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="eyebrow">Ficha del cheque</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold">
              {cheque.number ?? cheque.echeqId ?? cheque.canonicalKey}
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)]">Banco emisor: {cheque.bankCanonical ?? cheque.bankName ?? "-"}</p>
          </div>
          <StatusPill status={cheque.status} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Info label="Proyecto" value={cheque.project?.name ?? "-"} highlight />
          <Info label="Fecha vencimiento" value={formatDate(cheque.paymentDate)} highlight />
          <Info label="Emisor" value={cheque.issuerName ?? "-"} highlight />
          <Info label="Estado" value={formatStatusLabel(cheque.status)} highlight />
          <Info label="Importe" value={formatCurrency(cheque.amount?.toString())} highlight />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Info label="Importe" value={formatCurrency(cheque.amount?.toString())} />
          <Info label="Fecha emision" value={formatDate(cheque.issueDate)} />
          <Info label="Quien lo dio" value={cheque.counterparty?.name ?? "-"} />
          <Info label="Cliente IVA" value={cheque.hasIvaClient ? selectedIvaClientName ?? "SI (sin nombre)" : "NO"} />
          <Info label="Flujo" value={cheque.flow} />
          <Info label="eCheq ID" value={cheque.echeqId ?? cheque.sourceChequeId ?? "-"} />
          <Info label="CMC7" value={cheque.cmc7 ?? "-"} />
          <Info label="Banco emisor" value={cheque.bankCanonical ?? cheque.bankName ?? "-"} />
          <Info label="Banco mio" value={cheque.ownBank ? ownBankLabels[cheque.ownBank] : "-"} />
          <Info label="Estado informado por banco" value={cheque.sourceStatus ?? "-"} />
        </div>
      </section>

      <section className="layout-grid">
        <div className="space-y-6">
          <div className="card p-6">
            <p className="eyebrow">Historial automatico</p>
            <div className="mt-5 space-y-3">
              {cheque.chequeStatusHistory.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-black/5 bg-white/65 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill status={entry.toStatus} />
                    <span className="text-sm text-[var(--muted)]">{formatDate(entry.observedAt)}</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{entry.source}</span>
                  </div>
                  <p className="mt-3 text-sm">
                    {entry.fromStatus ? `Cambio desde ${entry.fromStatus}` : "Alta inicial detectada por importacion"}
                  </p>
                  {entry.toStatus === "ENDORSED" && !entry.endorseeName && (
                    <div className="mt-3 rounded-lg bg-[var(--warning)] bg-opacity-15 p-3 border border-[var(--warning)] border-opacity-30">
                      <p className="text-xs font-medium text-[var(--warning)]">⚠ Datos de endosatario no disponibles en el archivo importado</p>
                    </div>
                  )}
                  {entry.endorseeName && (
                    <div className="mt-3 rounded-lg bg-[var(--accent-soft)] p-3">
                      <p className="text-xs font-medium uppercase text-[var(--accent-strong)]">Endosado a:</p>
                      <p className="mt-1 text-sm font-medium">{entry.endorseeName}</p>
                      {entry.endorseeTaxId && <p className="text-xs text-[var(--muted)]">CUIT/CUIL: {entry.endorseeTaxId}</p>}
                    </div>
                  )}
                </div>
              ))}
              {cheque.chequeStatusHistory.length === 0 ? <p className="text-sm text-[var(--muted)]">Todavia no hay historial registrado.</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <p className="eyebrow">Contexto manual</p>
            <form action={updateChequeContextAction} className="mt-5 space-y-4">
              <input type="hidden" name="chequeId" value={cheque.id} />
              <div>
                <label className="mb-2 block text-sm font-medium">Quien te lo dio</label>
                <input className="field" name="counterpartyName" defaultValue={cheque.counterparty?.name ?? ""} placeholder="Empresa o persona" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Proyecto / negocio</label>
                <input className="field" name="projectName" defaultValue={cheque.project?.name ?? ""} placeholder="Ej. Obra Norte / Mayorista Abril" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Banco mio de la operacion</label>
                <select className="select" name="ownBank" defaultValue={cheque.ownBank ?? ""}>
                  <option value="">Sin asignar</option>
                  {Object.entries(ownBankLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Cliente IVA</label>
                <select className="select" name="hasIvaClient" defaultValue={cheque.hasIvaClient ? "SI" : "NO"}>
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Nombre cliente IVA</label>
                <input
                  className="field"
                  list="iva-clients-list"
                  name="ivaClientName"
                  defaultValue={selectedIvaClientName ?? ""}
                  placeholder="Nombre del cliente IVA"
                />
                <datalist id="iva-clients-list">
                  {ivaClients.map((client) => (
                    <option key={client.id} value={client.name} />
                  ))}
                </datalist>
              </div>
              <button className="button button-primary w-full" type="submit">
                Guardar contexto
              </button>
            </form>
          </div>

          <div className="card p-6">
            <p className="eyebrow">Descuento bancario</p>
            <form action={createDiscountAction} className="mt-5 space-y-4">
              <input type="hidden" name="chequeId" value={cheque.id} />
              <div>
                <label className="mb-2 block text-sm font-medium">Banco donde se descuenta</label>
                <input className="field" name="bank" defaultValue={cheque.bankCanonical ?? ""} required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Fecha solicitud</label>
                  <input className="field" name="requestedAt" type="date" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Fecha liquidacion</label>
                  <input className="field" name="settledAt" type="date" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Importe bruto</label>
                  <input className="field" name="grossAmount" defaultValue={cheque.amount?.toString() ?? ""} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Comision / gasto</label>
                  <input className="field" name="feeAmount" placeholder="0.00" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Importe neto</label>
                  <input className="field" name="netAmount" placeholder="0.00" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Estado</label>
                  <select className="select" name="status" defaultValue={DiscountStatus.REQUESTED}>
                    {Object.values(DiscountStatus).map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Referencia</label>
                <input className="field" name="reference" placeholder="Operacion, ticket o comprobante" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Notas</label>
                <textarea className="textarea" name="notes" placeholder="Observaciones del descuento" />
              </div>
              <button className="button button-primary w-full" type="submit">
                Registrar descuento
              </button>
            </form>
          </div>

          <div className="card p-6">
            <p className="eyebrow">Descuentos registrados</p>
            <div className="mt-5 space-y-3">
              {cheque.discounts.map((discount) => (
                <div key={discount.id} className="rounded-2xl border border-black/5 bg-white/65 p-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <strong>{discount.bank}</strong>
                    <StatusPill status={discount.status} />
                  </div>
                  <p className="mt-2 text-[var(--muted)]">
                    Solicitud {formatDate(discount.requestedAt)} · Neto {formatCurrency(discount.netAmount?.toString())}
                  </p>
                  {discount.reference ? <p className="mt-2">Ref: {discount.reference}</p> : null}
                </div>
              ))}
              {cheque.discounts.length === 0 ? <p className="text-sm text-[var(--muted)]">No hay descuentos cargados para este cheque.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-2xl border border-[var(--accent)]/15 bg-[var(--accent-soft)]/55 p-4" : "rounded-2xl border border-black/5 bg-white/65 p-4"}>
      <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</span>
      <p className={highlight ? "mt-2 text-base font-semibold" : "mt-2 text-sm font-medium"}>{value}</p>
    </div>
  );
}
