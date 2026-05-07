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
    dueDateFrom?: string;
    dueDateTo?: string;
  };
  ownBankLabels: Record<string, string>;
}

export function ChequeFilterForm({ projects, statuses, banks, current, ownBankLabels }: Props) {
  const router = useRouter();
  const statusRef = useRef<HTMLSelectElement>(null);
  const bankRef = useRef<HTMLSelectElement>(null);
  const ownBankRef = useRef<HTMLSelectElement>(null);
  const hasIvaClientRef = useRef<HTMLSelectElement>(null);
  const projectRef = useRef<HTMLSelectElement>(null);

  const selectedStatuses = current.status ? current.status.split(",").filter(Boolean) : [];
  const selectedBanks = current.bank ? current.bank.split(",").filter(Boolean) : [];
  const selectedOwnBanks = current.ownBank ? current.ownBank.split(",").filter(Boolean) : [];
  const selectedHasIvaClient = current.hasIvaClient ? current.hasIvaClient.split(",").filter(Boolean) : [];
  const selectedProjects = current.project ? current.project.split(",").filter(Boolean) : [];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const params = new URLSearchParams();

    const q = data.get("q") as string;
    const status = statusRef.current ? Array.from(statusRef.current.selectedOptions).map((o) => o.value) : [];
    const bank = bankRef.current ? Array.from(bankRef.current.selectedOptions).map((o) => o.value) : [];
    const ownBank = ownBankRef.current ? Array.from(ownBankRef.current.selectedOptions).map((o) => o.value) : [];
    const hasIvaClient = hasIvaClientRef.current
      ? Array.from(hasIvaClientRef.current.selectedOptions).map((o) => o.value)
      : [];
    const dueDateFrom = data.get("dueDateFrom") as string;
    const dueDateTo = data.get("dueDateTo") as string;

    if (q) params.set("q", q);
    if (status.length > 0) params.set("status", status.join(","));
    if (bank.length > 0) params.set("bank", bank.join(","));
    if (ownBank.length > 0) params.set("ownBank", ownBank.join(","));
    if (hasIvaClient.length > 0) params.set("hasIvaClient", hasIvaClient.join(","));
    if (dueDateFrom) params.set("dueDateFrom", dueDateFrom);
    if (dueDateTo) params.set("dueDateTo", dueDateTo);

    // Multi-select projects
    const selected = projectRef.current
      ? Array.from(projectRef.current.selectedOptions).map((o) => o.value)
      : [];
    if (selected.length > 0) params.set("project", selected.join(","));

    // Preserve sort
    if (current.sortBy) params.set("sortBy", current.sortBy);
    if (current.sortDir) params.set("sortDir", current.sortDir);

    router.push(`/cheques?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] md:grid-rows-[1fr_auto]">
      <input
        className="field"
        name="q"
        placeholder="Buscar por numero, eCheq o emisor"
        defaultValue={current.q ?? ""}
      />
      <select
        ref={statusRef}
        className="select"
        multiple
        size={1}
        defaultValue={selectedStatuses}
        title="Mantené Cmd/Ctrl para seleccionar varios"
        style={{ minHeight: "2.25rem" }}
      >
        {statuses.map((entry) => (
          <option key={entry.status} value={entry.status}>
            {entry.status}
          </option>
        ))}
      </select>
      <select
        ref={bankRef}
        className="select"
        multiple
        size={1}
        defaultValue={selectedBanks}
        title="Mantené Cmd/Ctrl para seleccionar varios"
        style={{ minHeight: "2.25rem" }}
      >
        {banks.map((entry) => (
          <option key={entry.bankCanonical} value={entry.bankCanonical ?? ""}>
            {entry.bankCanonical}
          </option>
        ))}
      </select>
      <select
        ref={ownBankRef}
        className="select"
        multiple
        size={1}
        defaultValue={selectedOwnBanks}
        title="Mantené Cmd/Ctrl para seleccionar varios"
        style={{ minHeight: "2.25rem" }}
      >
        {Object.entries(ownBankLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        ref={hasIvaClientRef}
        className="select"
        multiple
        size={1}
        defaultValue={selectedHasIvaClient}
        title="Mantené Cmd/Ctrl para seleccionar varios"
        style={{ minHeight: "2.25rem" }}
      >
        <option value="SI">Cliente IVA: SI</option>
        <option value="NO">Cliente IVA: NO</option>
      </select>
      {/* Multi-select proyecto */}
      <select
        ref={projectRef}
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
      <div className="flex items-center gap-2 md:col-span-7">
        <span className="text-xs text-[var(--muted)] whitespace-nowrap">Vence entre</span>
        <input
          className="field"
          type="date"
          name="dueDateFrom"
          defaultValue={current.dueDateFrom ?? ""}
        />
        <span className="text-xs text-[var(--muted)]">y</span>
        <input
          className="field"
          type="date"
          name="dueDateTo"
          defaultValue={current.dueDateTo ?? ""}
        />
      </div>
    </form>
  );
}
