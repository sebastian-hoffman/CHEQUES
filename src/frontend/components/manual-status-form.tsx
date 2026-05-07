"use client";

import { useState, useTransition } from "react";

import { updateChequeManualStatusAction } from "@/app/actions";

type ManualStatusOption = {
  value: "CUSTODY" | "ENDORSED" | "DISCOUNTED";
  label: string;
};

const statusOptions: ManualStatusOption[] = [
  { value: "CUSTODY", label: "En nuestro poder" },
  { value: "ENDORSED", label: "Endosado" },
  { value: "DISCOUNTED", label: "Descontado" },
];

export function ManualStatusForm({ chequeId, currentStatus }: { chequeId: string; currentStatus: string }) {
  const [nextStatus, setNextStatus] = useState<ManualStatusOption["value"]>(
    currentStatus === "CUSTODY" || currentStatus === "ENDORSED" || currentStatus === "DISCOUNTED"
      ? (currentStatus as ManualStatusOption["value"])
      : "CUSTODY",
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("chequeId", chequeId);
        formData.set("nextStatus", nextStatus);
        await updateChequeManualStatusAction(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
      }
    });
  };

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2">
        <select
          className="select !w-auto !min-w-[9.5rem] !py-1.5 !text-xs"
          value={nextStatus}
          onChange={(event) => setNextStatus(event.target.value as ManualStatusOption["value"])}
          disabled={isPending}
          aria-label="Estado manual"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button button-secondary !px-3 !py-1.5 !text-xs"
          disabled={isPending}
          onClick={submit}
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
