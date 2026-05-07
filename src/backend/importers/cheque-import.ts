import { ChequeFlow, ChequeStatus, ImportSource, Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { z } from "zod";

const incomingRowSchema = z.record(z.string(), z.unknown());

const bankAliases = [
  { matcher: /bbva/i, canonical: "BBVA" },
  { matcher: /santander/i, canonical: "Santander" },
  { matcher: /provincia|bapro/i, canonical: "Bapro" },
];

export type ImportedChequeRecord = {
  canonicalKey: string;
  sourceKind: ImportSource;
  flow: ChequeFlow;
  status: ChequeStatus;
  sourceStatus: string | null;
  sourceActionStatus: string | null;
  sourceChequeId: string | null;
  number: string | null;
  cmc7: string | null;
  echeqId: string | null;
  issueType: string | null;
  issuerTaxId: string | null;
  issuerName: string | null;
  bankRaw: string | null;
  bankCode: string | null;
  bankName: string | null;
  bankCanonical: string | null;
  endosoHistory: string | null;
  issueDate: Date | null;
  paymentDate: Date | null;
  amount: Prisma.Decimal | null;
  currency: string | null;
  account: string | null;
  endorseeTaxId: string | null;
  endorseeName: string | null;
  rawData: Prisma.InputJsonValue;
};

export function parseWorkbook(fileName: string, buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: null,
    raw: false,
  });

  const sourceKind = detectSourceKind(fileName, rows);
  const records = rows.map((row) => normalizeRow(row, sourceKind));

  return {
    sourceKind,
    records,
  };
}

function detectSourceKind(fileName: string, rows: Record<string, unknown>[]) {
  const joinedColumns = rows[0] ? Object.keys(rows[0]).join(" ").toLowerCase() : "";
  const sampleStatus = rows[0]
    ? `${String(rows[0]["Estado del Cheque"] ?? "")} ${String(rows[0]["Estado del ECHEQ"] ?? "")}`.toLowerCase()
    : "";
  const loweredName = fileName.toLowerCase();

  if (loweredName.includes("custodi") || sampleStatus.includes("custodia")) {
    return ImportSource.CUSTODY_FILE;
  }

  if (loweredName.includes("endos") || joinedColumns.includes("beneficiario de endoso")) {
    return ImportSource.ENDORSED_FILE;
  }

  if (loweredName.includes("emit") || loweredName.includes("librad")) {
    return ImportSource.ISSUED_FILE;
  }

  return ImportSource.RECEIVED_FILE;
}

function parseEndosoHistory(historyString: string): { name: string; taxId: string } | null {
  if (!historyString || historyString.trim().length === 0) {
    return null;
  }

  // Try to extract CUIT/CUIL pattern (XX-XXXXXXX-X or XXXXXXXX)
  const cuitMatch = historyString.match(/(\d{2}-\d{6,8}-\d|\d{11})/);
  const taxId = cuitMatch ? cuitMatch[1].replace(/[^0-9-]/g, "") : null;

  // Extract name: try to get everything before the CUIT, or the first meaningful segment
  let name = historyString;
  if (taxId) {
    // Remove the CUIT from the string and get what remains
    name = historyString.replace(taxId, "").trim();
    // Remove common separators
    name = name.replace(/^[-–—\s]+|[-–—\s]+$/g, "").trim();
  }

  // Clean up the name: remove extra spaces and get the first meaningful part
  name = name.split(/[,;|\/]/)[0].trim();

  if (name.length > 0 && taxId) {
    return { name, taxId };
  }

  if (name.length > 0) {
    return { name, taxId: "" };
  }

  return null;
}

function normalizeRow(row: Record<string, unknown>, sourceKind: ImportSource): ImportedChequeRecord {
  const parsedRow = incomingRowSchema.parse(row);
  const normalized = normalizeKeys(parsedRow);
  const sourceStatus = firstString(getValue(normalized, "estadodeecheq"), getValue(normalized, "estadodelcheque"));
  const sourceActionStatus = firstString(getValue(normalized, "estadodesolicitudaccion"));
  const sourceChequeId = firstString(getValue(normalized, "echeqid"), getValue(normalized, "idcheque"));
  const number = firstString(getValue(normalized, "numerodeecheq"), getValue(normalized, "numeroecheq"), getValue(normalized, "numero"));
  const cmc7 = firstString(getValue(normalized, "cmc7"));
  const issueDate = parseDate(firstString(getValue(normalized, "fechadeemision"), getValue(normalized, "fechaemision")));
  const paymentDate = parseDate(firstString(getValue(normalized, "fechadepago"), getValue(normalized, "fechapago")));
  const amountValue = firstString(getValue(normalized, "importe"));
  const bankRaw = firstString(getValue(normalized, "bancoemisor"), getValue(normalized, "bancoemision"));
  const bankCode = bankRaw?.split("/")[0]?.trim() ?? null;
  const bankName = bankRaw?.split("/").slice(1).join("/").trim() || bankRaw || null;
  const canonicalKey = buildCanonicalKey({
    sourceChequeId,
    cmc7,
    number,
    issueDate,
    amount: amountValue,
  });

  const endosoHistoryRaw = firstString(getValue(normalized, "historialdeendosos"));
  let endorseeTaxId = firstString(getValue(normalized, "cuitcuilbeneficiariodeendoso"));
  let endorseeName = firstString(getValue(normalized, "nombreorazonsocialbeneficiarioendoso"));

  // If endorsee data not found in dedicated columns, try parsing from endosoHistory
  if (!endorseeName && !endorseeTaxId && endosoHistoryRaw) {
    const parsed = parseEndosoHistory(endosoHistoryRaw);
    if (parsed) {
      endorseeName = parsed.name;
      endorseeTaxId = parsed.taxId;
    }
  }

  return {
    canonicalKey,
    sourceKind,
    flow: sourceKind === ImportSource.ISSUED_FILE ? ChequeFlow.ISSUED : ChequeFlow.RECEIVED,
    status: deriveStatus(sourceKind, sourceStatus, sourceActionStatus),
    sourceStatus,
    sourceActionStatus,
    sourceChequeId,
    number,
    cmc7,
    echeqId: firstString(getValue(normalized, "echeqid")),
    issueType: firstString(getValue(normalized, "tipodeemision")),
    issuerTaxId: firstString(getValue(normalized, "cuitcuilemisor")),
    issuerName: firstString(
      getValue(normalized, "nombrerazonsocialemisor"),
      getValue(normalized, "razonsocialemisor"),
      getValue(normalized, "nombreorazonsocialemisor"),
      getValue(normalized, "nombreorazonsocialdelemisor"),
      getValue(normalized, "razonsocialdelemisor"),
      getValue(normalized, "nombreemisor"),
      getValue(normalized, "emisor"),
    ),
    bankRaw,
    bankCode,
    bankName,
    bankCanonical: canonicalizeBank(bankRaw),
    endosoHistory: endosoHistoryRaw,
    issueDate,
    paymentDate,
    amount: amountValue ? new Prisma.Decimal(parseNumber(amountValue)) : null,
    currency: firstString(getValue(normalized, "moneda")),
    account: firstString(getValue(normalized, "cuenta")),
    endorseeTaxId,
    endorseeName,
    rawData: parsedRow as Prisma.InputJsonObject,
  };
}

function normalizeKeys(row: Record<string, unknown>) {
  return Object.entries(row).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
    const normalizedKey = key
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
    accumulator[normalizedKey] = value;
    return accumulator;
  }, {});
}

function getValue(normalized: Record<string, unknown>, key: string) {
  return normalized[key];
}

function buildCanonicalKey(input: {
  sourceChequeId: string | null;
  cmc7: string | null;
  number: string | null;
  issueDate: Date | null;
  amount: string | null;
}) {
  if (input.sourceChequeId) {
    return `id:${input.sourceChequeId}`;
  }

  if (input.cmc7) {
    return `cmc7:${input.cmc7}`;
  }

  return [input.number ?? "sin-numero", input.issueDate?.toISOString().slice(0, 10) ?? "sin-fecha", input.amount ?? "sin-importe"].join(":");
}

function deriveStatus(sourceKind: ImportSource, sourceStatus: string | null, actionStatus: string | null) {
  const combined = `${sourceStatus ?? ""} ${actionStatus ?? ""}`.toLowerCase();

  if (combined.includes("rechaz")) {
    return ChequeStatus.REJECTED;
  }

  if (combined.includes("pagad") || combined.includes("cobrad")) {
    return ChequeStatus.PAID;
  }

  if (combined.includes("descont")) {
    return ChequeStatus.DISCOUNTED;
  }

  if (combined.includes("custodia") || sourceKind === ImportSource.CUSTODY_FILE) {
    return ChequeStatus.CUSTODY;
  }

  if (combined.includes("acept")) {
    return ChequeStatus.ACCEPTED;
  }

  if (combined.includes("endos") || sourceKind === ImportSource.ENDORSED_FILE) {
    return ChequeStatus.ENDORSED;
  }

  if (sourceKind === ImportSource.ISSUED_FILE) {
    return ChequeStatus.ISSUED;
  }

  if (combined.includes("pendient") || combined.includes("activo")) {
    return ChequeStatus.RECEIVED;
  }

  return ChequeStatus.UNKNOWN;
}

function canonicalizeBank(bankRaw: string | null) {
  if (!bankRaw) {
    return null;
  }

  const found = bankAliases.find((candidate) => candidate.matcher.test(bankRaw));
  return found?.canonical ?? bankRaw.trim();
}

function parseDate(raw: string | null) {
  if (!raw) {
    return null;
  }

  const [day, month, year] = raw.split("/").map((value) => Number(value));
  if (!day || !month || !year) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function parseNumber(raw: string) {
  const s = raw.trim().replace(/[^0-9.,-]/g, "");
  // Argentine format: comma present → dots are thousands separators, comma is decimal
  if (s.includes(",")) {
    return Number(s.replace(/\./g, "").replace(",", "."));
  }
  // JS float or integer: dot is already the decimal separator
  return Number(s);
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized.length > 0 && normalized !== "-") {
      return normalized;
    }
  }

  return null;
}
