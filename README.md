# Cheques

Aplicacion web para seguimiento de cheques recibidos y emitidos, con importacion de Excel bancario, estados automaticos e historial por cheque.

## Stack

- Next.js 16 + TypeScript + App Router
- Prisma ORM
- PostgreSQL
- Railway

## Estructura del proyecto

El proyecto quedo organizado con separacion clara entre frontend y backend dentro de `src`:

```text
src/
   app/                    # Rutas Next.js (UI y endpoints API)
   frontend/
      components/           # Componentes de interfaz
   backend/
      db/                   # Cliente Prisma y acceso a datos
      state/                # Estado y checks de configuracion backend
      capabilities/         # Capacidades runtime de Prisma
      importers/            # Parsing/importacion de Excel
      services/             # Servicios de dominio y consultas
   shared/                 # Utilidades compartidas (formato, helpers puros)
```

## Que resuelve

- Importa archivos `.xls` y `.xlsx` bajados del banco.
- Detecta automaticamente si el archivo corresponde a cheques recibidos, endosados, custodiados o emitidos.
- Reconcilia cada cheque por `eCheq ID`, `CMC7` o una clave compuesta.
- Actualiza el estado automaticamente segun el snapshot importado.
- Guarda historial cada vez que el estado cambia.
- Permite asignar manualmente `quien me lo dio` y `a que proyecto corresponde`.
- Permite registrar descuentos bancarios asociados a un cheque.

## Estados automaticos

La importacion interpreta el estado tomando en cuenta el tipo de archivo y el contenido del banco.

- `RECIBIDOS`: cuando el archivo es de recibidos o el estado indica activo/pendiente.
- `ENDORSED`: cuando el archivo es de endosados o el estado contiene referencias a endoso.
- `CUSTODY`: cuando el archivo es de custodia o el estado contiene custodia.
- `ACCEPTED`: cuando el estado del banco contiene aceptado.
- `REJECTED`: cuando el estado del banco contiene rechazado.
- `DISCOUNTED`: se conserva cuando el cheque ya tiene descuentos cargados y el banco todavia lo reporta como recibido.
- `PAID`: cuando el banco informa pagado o cobrado.
- `ISSUED`: cuando el archivo detectado es de emitidos.

## Puesta en marcha

1. Instalar dependencias:
   `npm install`
2. Elegir entorno de base de datos:
   - Local: copiar `.env.local.example` a `.env.local`
   - Railway: crear `.env.local` con tu `DATABASE_URL` de Railway
3. Generar cliente Prisma:
   `npm run prisma:generate`
4. Validar conexion DB para el entorno actual:
   `npm run db:doctor`
5. Crear estructura de base:
   `npm run db:migrate:deploy`
6. Levantar entorno local:
   `npm run dev`

Si ves errores recurrentes de Prisma en runtime (campos/modelos desconocidos con Turbopack), reinicia limpio:
`npm run dev:clean`

## Desarrollo local completo (PostgreSQL local)

1. Levantar PostgreSQL local:
   `docker compose up -d`
2. Copiar variables locales:
   `cp .env.local.example .env.local`
3. Verificar conexion:
   `npm run db:doctor`
4. Crear tablas:
   `npm run db:migrate:deploy`
5. Iniciar app:
   `npm run dev`

La aplicacion quedara en `http://localhost:3000` y la base local en `localhost:5432`.

## Railway

Variables necesarias:

- `DATABASE_URL`

Nota importante sobre Railway:

- `postgres.railway.internal` funciona para conexiones internas entre servicios dentro de Railway.
- Desde tu computadora local, usa la URL publica de PostgreSQL (Public Networking) y, de ser necesario, `sslmode=require`.

Mejor practica para costos y performance:

- En el servicio Web de Railway, usa referencia privada de la DB (`DATABASE_URL` del servicio PostgreSQL), no `DATABASE_PUBLIC_URL`.
- Deja la URL publica solo para tu desarrollo local.

Comandos recomendados:

- Build: `npm install && npm run build`
- Start: `npm run db:migrate:deploy && npm run start`

Sugerencia para primer despliegue:

1. Crear servicio PostgreSQL en Railway.
2. En el servicio Web, agregar una referencia de variable hacia `DATABASE_URL` del servicio PostgreSQL (privada).
3. Deployar la app: el start ejecuta `db:deploy` automaticamente antes de levantar Next.js.

## Ir a produccion hoy (checklist rapido)

1. Subir repo a GitHub.
2. En Railway crear servicio Web desde ese repo.
3. Verificar variable `DATABASE_URL` privada (referenciada desde el servicio PostgreSQL).
4. Confirmar comandos:
   - Build: `npm install && npm run build`
   - Start: `npm run db:migrate:deploy && npm run start`
5. Deploy y abrir la URL publica del servicio.
6. Verificar salud tecnica:
   - `GET /api/health` debe responder `ok: true` y `db: up`.
7. Si falla por conexion DB, ejecutar `npm run db:doctor` para diagnostico rapido.

## Prisma y .env.local

Los comandos `npm run prisma:generate`, `npm run db:migrate:deploy` y `npm run db:push` leen `DATABASE_URL` desde `.env.local` (ademas de variables del entorno si existen). Esto permite usar la misma conexion de Railway en local sin duplicar configuracion en `.env`.

## Migraciones

- Se incluyo una migracion inicial en `prisma/migrations/20260503120000_init`.
- Produccion usa `prisma migrate deploy` para cambios reproducibles y auditables.
- Reserva `db:push` para desarrollo puntual cuando estes prototipando.

## Estructura funcional

- `/import`: carga de Excel y conciliacion automatica
- `/cheques`: cartera filtrable
- `/cheques/[id]`: detalle, historial, proyecto, quien lo entrego y descuentos
- `/descuentos`: reporte operativo para seguimiento de descuentos

## Observaciones

- Los campos manuales del cheque no se pisan al reimportar el Excel.
- El historial solo registra cambios de estado, como pediste.
- La deteccion para bancos deja normalizados `Santander`, `BBVA` y `Bapro`, y conserva otros nombres cuando aparezcan.
