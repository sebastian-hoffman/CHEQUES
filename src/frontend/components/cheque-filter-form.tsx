"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

interface Props {
  projects: { name: string }[];
  statuses: { status: string }[];
  banks: { bankCanonical: string | null }[];
  current: {
    q?: string;
    status?: string;
    bank?: string;
    ownBank?: string;
    hasIvaClient?: string;
    sortBy?: string;
    sortDir?: string;
    project?: string; // comma-separated
  };
  ownBankLabels: Record<string, string>;
}

export function ChequeFilterForm({ projects, statuses, banks, current, ownBankLabels }: Props) {
  const router = useRouter();
  const selectRef = useRef<HTMLSelectElement>(null);

  const selectedProjects = current.project ? current.project.split(",").filter(Boolean) : [];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const params = new URLSearchParams();

    const q = data.get("q") as string;
    const status = data.get("status") as string;
    const bank = data.get("bank") as string;
    const ownBank = data.get("ownBank") as string;
    const hasIvaClient = data.get("hasIvaClient") as string;

    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (bank) params.set("bank", bank);
    if (ownBank) params.set("ownBank", ownBank);
    if (hasIvaClient) params.set("hasIvaClient", hasIvaClient);

    // Multi-select projects
    const selected = selectRef.current
      ? Array.from(selectRef.current.selectedOptions).map((o) => o.value)
      : [];
    if (selected.length > 0) params.set("project", selected.join(","));

    // Preserve sort
    if (current.sortBy) params.set("sortBy", current.sortBy);
    if (current.sortDir) params.set("sortDir", current.sortDir);

    router.push(`/cheques?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]">
      <input
        className="field"
        name="q"
        placeholder="Buscar por numero, eCheq o emisor"
        defaultValue={current.q ?? ""}
      />
      <select className="select" name="status" defaultValue={current.status ?? ""}>
        <option value="">Todos los estados</option>
        {statuses.map((entry) => (
          <option key={entry.status} value={entry.status}>
            {entry.status}
          </option>
        ))}
      </select>
      <select className="select" name="bank" defaultValue={current.bank ?? ""}>
        <option value="">Todos los bancos</option>
        {banks.map((entry) => (
          <option key={entry.bankCanonical} value={entry.bankCanonical ?? ""}>
            {entry.bankCanonical}
          </option>
        ))}
      </select>
      <select className="select" name="ownBank" defaultValue={current.ownBank ?? ""}>
        <option value="">Todos mis bancos</option>
        {Object.entries(ownBankLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select className="select" name="hasIvaClient" defaultValue={current.hasIvaClient ?? ""}>
        <option value="">Cliente IVA: todos</option>
        <option value="SI">Cliente IVA: SI</option>
        <option value="NO">Cliente IVA: NO</option>
      </select>
      {/* Multi-select proyecto */}
      <select
        ref={selectRef}
        className="select"
        multiple
        size={1}
        defaultValue={selectedProjects}
        title="Mantené Cmd/Ctrl para seleccionar varios"
        style={{ minHeight: "2.25rem" }}
      >
        <option value="__SIN_PROYECTO__">(Sin proyecto)</option>
        {projects.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>
      <button className="button button-primary" type="submit">
        Filtrar
      </button>
    </form>
  );
}
