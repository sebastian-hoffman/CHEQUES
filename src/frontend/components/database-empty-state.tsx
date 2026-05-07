type DatabaseEmptyStateProps = {
  title: string;
  message?: string;
};

export function DatabaseEmptyState({ title, message }: DatabaseEmptyStateProps) {
  return (
    <section className="card p-6">
      <p className="eyebrow">Base pendiente</p>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold">{title}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        {message ?? "Todavia no hay conexion con PostgreSQL. Cuando definas DATABASE_URL vas a poder importar Excel, ver la cartera y guardar historial."}
      </p>
      <div className="mt-5 rounded-2xl border border-black/5 bg-white/60 p-4 text-sm text-[var(--muted)]">
        Configura un archivo <strong>.env</strong> con <strong>DATABASE_URL</strong> y luego ejecuta <strong>npm run db:push</strong>.
      </div>
    </section>
  );
}
