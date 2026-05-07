type SetupNoticeProps = {
  title?: string;
  description?: string;
};

export function SetupNotice({
  title = "Falta configurar la base de datos",
  description = "Defini DATABASE_URL en tu archivo .env o en Railway para habilitar importaciones, listados e historial.",
}: SetupNoticeProps) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5 text-amber-950">
      <p className="eyebrow bg-white/70">Configuracion pendiente</p>
      <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold">{title}</h3>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-900">{description}</p>
      <div className="mt-4 rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 text-sm text-amber-900">
        Paso minimo: crear un archivo <strong>.env</strong> con <strong>DATABASE_URL=\"postgresql://...\"</strong> y luego correr <strong>npm run db:push</strong>.
      </div>
    </div>
  );
}
