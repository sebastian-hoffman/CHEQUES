export const dynamic = "force-dynamic";

import { ImportUpload } from "@/frontend/components/import-upload";

const steps = [
  "Subis un .xls o .xlsx descargado del banco.",
  "El sistema detecta si corresponde a recibidos, endosados, custodiados o emitidos.",
  "Cada cheque se busca por ID de eCheq, CMC7 o una clave compuesta si no hay identificador directo.",
  "Si el estado cambió respecto de la ultima importacion, se agrega al historial automaticamente.",
  "Tus campos manuales, como proyecto y quien te lo dio, se preservan.",
];

export default function ImportPage() {
  return (
    <div className="space-y-6 pb-10">
      <ImportUpload />

      <section className="card p-6">
        <p className="eyebrow">Como funciona</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {steps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-black/5 bg-white/65 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Paso {index + 1}</span>
              <p className="mt-2 text-sm leading-6">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
