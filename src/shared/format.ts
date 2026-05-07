import { format } from "date-fns";
import { es } from "date-fns/locale";

export function formatCurrency(value: number | string | null | undefined, currency = "ARS") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return format(date, "dd/MM/yyyy", { locale: es });
}

export function formatStatusLabel(status: string) {
  const labels: Record<string, string> = {
    RECEIVED: "Recibido",
    ENDORSED: "Endosado",
    CUSTODY: "Custodia",
    ACCEPTED: "Aceptado",
    REJECTED: "Rechazado",
    DISCOUNTED: "Descontado",
    PAID: "Pagado",
    ISSUED: "Emitido",
    PENDING: "Pendiente",
    UNKNOWN: "Sin definir",
    REQUESTED: "Solicitado",
    SETTLED: "Liquidado",
    CANCELLED: "Cancelado",
  };

  return labels[status] ?? status;
}
