export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function isDatabaseSetupError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("DATABASE_URL") ||
    error.message.includes("PrismaClientInitializationError") ||
    error.message.includes("Can't reach database server") ||
    error.message.includes("Can't reach")
  );
}

export function getDatabaseSetupMessage() {
  if (!hasDatabaseUrl()) {
    return "Falta configurar DATABASE_URL para conectar PostgreSQL.";
  }

  return "La aplicacion tiene DATABASE_URL, pero no pudo conectarse a la base de datos.";
}
