import process from "node:process";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("[db:doctor] DATABASE_URL no esta definida.");
  console.error("[db:doctor] Define DATABASE_URL en .env.local (local) o Variables de Railway (produccion).");
  process.exit(1);
}

let parsed;

try {
  parsed = new URL(dbUrl);
} catch {
  console.error("[db:doctor] DATABASE_URL no tiene formato valido de URL.");
  process.exit(1);
}

const host = parsed.hostname;
const isRailwayInternal = host.endsWith(".railway.internal");
const isRunningOnRailway = Boolean(process.env.RAILWAY_ENVIRONMENT);

if (isRailwayInternal && !isRunningOnRailway) {
  console.error("[db:doctor] Detectado host interno de Railway desde entorno local.");
  console.error("[db:doctor] Ese host solo funciona dentro de Railway.");
  console.error("[db:doctor] En local usa la URL publica de PostgreSQL (Public Networking), idealmente con sslmode=require.");
  process.exit(2);
}

console.log("[db:doctor] DATABASE_URL valida para este entorno.");
console.log(`[db:doctor] Host: ${host}`);
