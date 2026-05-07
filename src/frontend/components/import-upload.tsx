"use client";

import { useState } from "react";
import { FileSpreadsheet, LoaderCircle } from "lucide-react";

type ImportResult = {
  batchId: string;
  imported: number;
  updated: number;
  created: number;
  changedStatuses: number;
  sourceKind: string;
};

export function ImportUpload() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);

    try {
      const response = await fetch("/api/imports", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const raw = await response.text();
      const payload = raw ? (JSON.parse(raw) as ImportResult | { error: string }) : null;

      if (!response.ok) {
        const fallback = raw ? "No se pudo importar el archivo" : "El servidor devolvio una respuesta vacia";
        const message = payload && typeof payload === "object" && "error" in payload ? payload.error : fallback;
        throw new Error(message);
      }

      if (!payload || typeof payload !== "object") {
        throw new Error("El servidor devolvio una respuesta invalida");
      }

      setResult(payload as ImportResult);
    } catch (submitError) {
      if (submitError instanceof Error && submitError.name === "AbortError") {
        setError("La importacion demoro demasiado. Intenta con un archivo mas chico o volve a intentar.");
      } else {
        setError(submitError instanceof Error ? submitError.message : "No se pudo importar el archivo");
      }
    } finally {
      clearTimeout(timeout);
      setPending(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent-strong)]">
          <FileSpreadsheet size={22} />
        </div>
        <div>
          <p className="eyebrow">Importacion operativa</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold">
            Subi un Excel y el sistema reconcilia estados automaticamente
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
            Se detecta si el archivo corresponde a recibidos, endosados, custodiados o emitidos. Si un cheque ya existe y su estado cambia,
            se agrega una entrada al historial sin tocar tus datos manuales de proyecto o quien lo entrego.
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(new FormData(event.currentTarget));
        }}
        className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]"
      >
        <input className="field" name="file" type="file" accept=".xls,.xlsx" required />
        <button className="button button-primary inline-flex items-center justify-center gap-2" type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" size={16} /> : null}
          {pending ? "Importando" : "Importar archivo"}
        </button>
      </form>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {result ? (
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="card kpi bg-white/60">
            <span className="text-sm text-[var(--muted)]">Tipo detectado</span>
            <strong>{result.sourceKind}</strong>
          </div>
          <div className="card kpi bg-white/60">
            <span className="text-sm text-[var(--muted)]">Nuevos</span>
            <strong>{result.created}</strong>
          </div>
          <div className="card kpi bg-white/60">
            <span className="text-sm text-[var(--muted)]">Actualizados</span>
            <strong>{result.updated}</strong>
          </div>
          <div className="card kpi bg-white/60">
            <span className="text-sm text-[var(--muted)]">Estados cambiados</span>
            <strong>{result.changedStatuses}</strong>
          </div>
        </div>
      ) : null}
    </div>
  );
}
