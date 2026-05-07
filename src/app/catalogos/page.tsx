export const dynamic = "force-dynamic";

import {
  createCounterpartyAction,
  createIvaClientAction,
  createProjectAction,
  deleteCounterpartyAction,
  deleteIvaClientAction,
  deleteProjectAction,
} from "@/app/actions";
import { DatabaseEmptyState } from "@/frontend/components/database-empty-state";
import { getDatabaseSetupMessage, hasDatabaseUrl, isDatabaseSetupError } from "@/backend/state/database-state";
import { listIvaClientsSafe } from "@/backend/services/iva-client-safe";
import { prisma } from "@/backend/db/prisma";

export default async function CatalogosPage() {
  if (!hasDatabaseUrl()) {
    return <DatabaseEmptyState title="Catalogos requieren base conectada" message={getDatabaseSetupMessage()} />;
  }

  let counterparties;
  let projects;
  let ivaClients: Array<{ id: string; name: string }> = [];

  try {
    [counterparties, projects, ivaClients] = await Promise.all([
      prisma.counterparty.findMany({ orderBy: { name: "asc" } }),
      prisma.project.findMany({ orderBy: { name: "asc" } }),
      listIvaClientsSafe(),
    ]);
  } catch (error) {
    if (isDatabaseSetupError(error)) {
      return <DatabaseEmptyState title="Catalogos requieren base conectada" message={getDatabaseSetupMessage()} />;
    }

    throw error;
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="card p-6">
        <p className="eyebrow">ABM</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold">Catalogos maestros</h2>
        <p className="mt-3 text-sm text-[var(--muted)]">Gestiona quien te dio cheques, proyectos/negocios y clientes IVA.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <CatalogBlock
          title="Quien te lo dio"
          placeholder="Nombre de persona o empresa"
          items={counterparties.map((item) => ({ id: item.id, name: item.name }))}
          createAction={createCounterpartyAction}
          deleteAction={deleteCounterpartyAction}
        />
        <CatalogBlock
          title="Proyectos / negocios"
          placeholder="Nombre del proyecto"
          items={projects.map((item) => ({ id: item.id, name: item.name }))}
          createAction={createProjectAction}
          deleteAction={deleteProjectAction}
        />
        <CatalogBlock
          title="Clientes IVA"
          placeholder="Nombre de cliente IVA"
          items={ivaClients.map((item) => ({ id: item.id, name: item.name }))}
          createAction={createIvaClientAction}
          deleteAction={deleteIvaClientAction}
        />
      </section>
    </div>
  );
}

function CatalogBlock({
  title,
  placeholder,
  items,
  createAction,
  deleteAction,
}: {
  title: string;
  placeholder: string;
  items: Array<{ id: string; name: string }>;
  createAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <article className="card p-6">
      <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{title}</h3>
      <form action={createAction} className="mt-4 flex gap-2">
        <input className="field" name="name" placeholder={placeholder} required />
        <button className="button button-primary" type="submit">
          Agregar
        </button>
      </form>

      <div className="mt-5 space-y-2">
        {items.map((item) => (
          <form key={item.id} action={deleteAction} className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/65 px-3 py-2">
            <input type="hidden" name="id" value={item.id} />
            <span className="text-sm">{item.name}</span>
            <button className="button button-secondary px-3 py-1 text-sm" type="submit">
              Eliminar
            </button>
          </form>
        ))}
        {items.length === 0 ? <p className="text-sm text-[var(--muted)]">Sin datos cargados.</p> : null}
      </div>
    </article>
  );
}
